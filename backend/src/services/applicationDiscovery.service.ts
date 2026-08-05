import * as applicationRepository from "../repositories/application.repository";
import { APPLICATION_PLUGINS, matchPluginByDisplayName, matchPluginByExecutable } from "../constants/applicationPlugins";
import { Logger } from "./logger.service";

interface InstalledApplicationPayload {
  display_name?: string;
  version?: string;
  publisher?: string;
  install_date?: number;
  install_location?: string;
  architecture?: string;
  estimated_size_kb?: number;
  install_source?: string;
  product_code?: string;
  uninstall_command?: string;
}

interface RunningProcessPayload {
  pid?: number;
  parent_pid?: number;
  process_name?: string;
  exe_path?: string;
  cpu_percent?: number;
  memory_mb?: number;
  threads?: number;
  handles?: number;
  start_time?: number;
  owner?: string;
  responding?: boolean;
  window_title?: string;
  signed?: boolean;
  publisher?: string;
  cert_issuer?: string;
  cert_expires_at?: number;
  cert_thumbprint?: string;
}

interface ApplicationServicePayload {
  service_name?: string;
  display_name?: string;
  status?: string;
  startup_type?: string;
  logon_account?: string;
}

interface CrashEventPayload {
  process_name?: string;
  occurred_at?: number;
}

export async function ingestApplicationData(
  deviceId: string,
  body: {
    installed_applications?: InstalledApplicationPayload[];
    running_processes?: RunningProcessPayload[];
    application_services?: ApplicationServicePayload[];
    crash_events?: CrashEventPayload[];
  }
) {
  const now = Date.now();

  if (Array.isArray(body.installed_applications) && body.installed_applications.length > 0) {
    await ingestInventory(deviceId, body.installed_applications, now);
  }

  let matchedPlugins = new Map<number, (typeof APPLICATION_PLUGINS)[number]>();
  if (Array.isArray(body.running_processes)) {
    matchedPlugins = await ingestProcesses(deviceId, body.running_processes);
  }

  if (Array.isArray(body.application_services) && body.application_services.length > 0) {
    await ingestServices(deviceId, body.application_services, now);
  }

  if (Array.isArray(body.crash_events) && body.crash_events.length > 0) {
    await ingestCrashEvents(deviceId, body.crash_events);
  }

  await recomputeHealthForKnownPlugins(deviceId, matchedPlugins);
}

// Crash events come from the agent scanning the last 24h of the Windows
// Application event log (Event ID 1000) — the same Get-WinEvent pattern
// already used by Get-UpdateHealth. Deduplicated against
// application_history since the agent re-sends the same 24h window every
// cycle rather than tracking its own "already reported" state.
async function ingestCrashEvents(deviceId: string, items: CrashEventPayload[]) {
  for (const item of items) {
    if (!item.process_name || !item.occurred_at) continue;

    const plugin = matchPluginByExecutable(item.process_name);
    const applicationId = plugin.id !== "generic" ? await resolveApplicationId(plugin.displayName, plugin.publisher, plugin) : null;

    const existing = await applicationRepository.findCrashHistoryEvent(deviceId, item.process_name, item.occurred_at);
    if (existing.rows.length > 0) continue;

    await applicationRepository.insertHistoryEvent(deviceId, applicationId, "CRASH", item.process_name, item.occurred_at);
  }
}

async function resolveApplicationId(
  displayName: string,
  publisher: string | null,
  pluginOverride?: ReturnType<typeof matchPluginByDisplayName>
) {
  const plugin = pluginOverride ?? matchPluginByDisplayName(displayName);
  const isGeneric = plugin.id === "generic";

  return applicationRepository.findOrCreateApplication(
    isGeneric ? displayName : plugin.displayName,
    isGeneric ? publisher : plugin.publisher,
    plugin.category,
    isGeneric ? null : plugin.id,
    plugin.cloudProvider ?? null
  );
}

async function ingestInventory(deviceId: string, items: InstalledApplicationPayload[], now: number) {
  const active = await applicationRepository.findActiveInventoryIds(deviceId);
  const touchedIds = new Set<number>();

  for (const item of items) {
    if (!item.display_name || !item.install_source) continue;

    const plugin = matchPluginByDisplayName(item.display_name);
    const applicationId = await resolveApplicationId(item.display_name, item.publisher ?? null, plugin);

    const result = await applicationRepository.upsertInventoryEntry({
      deviceId,
      applicationId,
      displayName: item.display_name,
      version: item.version ?? null,
      publisher: item.publisher ?? null,
      installDate: item.install_date ?? null,
      installLocation: item.install_location ?? null,
      architecture: item.architecture ?? null,
      estimatedSizeKb: item.estimated_size_kb ?? null,
      installSource: item.install_source,
      productCode: item.product_code ?? item.display_name,
      uninstallCommand: item.uninstall_command ?? null,
    });

    touchedIds.add(result.id);

    if (result.isNew) {
      await applicationRepository.insertHistoryEvent(deviceId, applicationId, "INSTALLED", item.display_name, now);
    } else {
      if (result.versionChanged) {
        await applicationRepository.insertHistoryEvent(
          deviceId,
          applicationId,
          "VERSION_CHANGED",
          `${item.display_name} -> ${item.version}`,
          now
        );
      }
      if (result.publisherChanged) {
        await applicationRepository.insertHistoryEvent(
          deviceId,
          applicationId,
          "PUBLISHER_CHANGED",
          `${result.previousPublisher} -> ${item.publisher}`,
          now
        );
      }
    }
  }

  const removed = active.rows.filter((row) => !touchedIds.has(row.id));
  if (removed.length > 0) {
    await applicationRepository.markInventoryRemoved(removed.map((r) => r.id), now);
    for (const row of removed) {
      await applicationRepository.insertHistoryEvent(deviceId, row.application_id, "REMOVED", row.display_name, now);
    }
  }
}

async function ingestProcesses(
  deviceId: string,
  items: RunningProcessPayload[]
): Promise<Map<number, (typeof APPLICATION_PLUGINS)[number]>> {
  const matchedPlugins = new Map<number, (typeof APPLICATION_PLUGINS)[number]>();
  const toPersist: Parameters<typeof applicationRepository.replaceProcessSnapshot>[1] = [];

  for (const item of items) {
    if (!item.pid || !item.process_name) continue;

    const plugin = matchPluginByExecutable(item.process_name);
    let applicationId: number | null = null;

    if (plugin.id !== "generic") {
      applicationId = await resolveApplicationId(plugin.displayName, plugin.publisher, plugin);
      matchedPlugins.set(applicationId, plugin);
    }

    toPersist.push({
      applicationId,
      pid: item.pid,
      parentPid: item.parent_pid ?? null,
      processName: item.process_name,
      exePath: item.exe_path ?? null,
      cpuPercent: item.cpu_percent ?? null,
      memoryMb: item.memory_mb ?? null,
      threads: item.threads ?? null,
      handles: item.handles ?? null,
      startTime: item.start_time ?? null,
      owner: item.owner ?? null,
      responding: item.responding ?? null,
      windowTitle: item.window_title ?? null,
      signed: item.signed ?? null,
      publisher: item.publisher ?? null,
      certIssuer: item.cert_issuer ?? null,
      certExpiresAt: item.cert_expires_at ?? null,
      certThumbprint: item.cert_thumbprint ?? null,
    });
  }

  await applicationRepository.replaceProcessSnapshot(deviceId, toPersist);
  return matchedPlugins;
}

async function ingestServices(deviceId: string, items: ApplicationServicePayload[], now: number) {
  for (const item of items) {
    if (!item.service_name) continue;

    // Find which plugin (if any) declares this service name, so the
    // service row attaches to the right application.
    const owningPlugin = APPLICATION_PLUGINS.find((plugin) =>
      plugin.relatedServiceNames.some((name) => name.toLowerCase() === item.service_name!.toLowerCase())
    );
    if (!owningPlugin) continue;

    const applicationId = await resolveApplicationId(owningPlugin.displayName, owningPlugin.publisher, owningPlugin);

    const previous = await applicationRepository.findDeviceApplicationServices(deviceId, applicationId);
    const previousRow = previous.rows.find((r: { service_name: string }) => r.service_name === item.service_name);
    const wasRunning = previousRow?.status === "Running";
    const isRunning = item.status === "Running";
    const justRestarted = wasRunning === false && isRunning === true && previousRow !== undefined;

    await applicationRepository.upsertApplicationService(
      deviceId,
      applicationId,
      item.service_name,
      item.display_name ?? null,
      item.status ?? null,
      item.startup_type ?? null,
      item.logon_account ?? null,
      justRestarted
    );

    if (justRestarted) {
      await applicationRepository.insertHistoryEvent(
        deviceId,
        applicationId,
        "SERVICE_RESTART",
        item.service_name,
        now
      );
    }
  }
}

// Health scoring here intentionally mirrors (not imports — separate TS
// projects, backend vs. frontend) the additive-penalty shape used by
// src/lib/deviceIntelligence/*.ts on the frontend. Persisted here because
// application_health_history needs real backend-side history for trend
// charts (24h/7d/30d), unlike Reboot Intelligence's live-only client-side
// scoring, which has no history requirement.
async function recomputeHealthForKnownPlugins(
  deviceId: string,
  matchedPluginsThisCycle: Map<number, (typeof APPLICATION_PLUGINS)[number]>
) {
  try {
    const inventory = await applicationRepository.findDeviceInventory(deviceId);
    const pluginByApplicationId = new Map<number, (typeof APPLICATION_PLUGINS)[number]>(matchedPluginsThisCycle);

    for (const row of inventory.rows as { application_id: number; plugin_id: string | null }[]) {
      if (!row.plugin_id || pluginByApplicationId.has(row.application_id)) continue;
      const plugin = APPLICATION_PLUGINS.find((p) => p.id === row.plugin_id);
      if (plugin) pluginByApplicationId.set(row.application_id, plugin);
    }

    for (const [applicationId, plugin] of pluginByApplicationId) {
      const processes = await applicationRepository.findDeviceApplicationProcesses(deviceId, applicationId);
      const isRunning = processes.rows.length > 0;
      const topProcess = processes.rows[0] as { cpu_percent: number | null; memory_mb: number | null } | undefined;

      const services = await applicationRepository.findDeviceApplicationServices(deviceId, applicationId);
      const requiredServiceDown = services.rows.some((s: { status: string | null }) => s.status && s.status !== "Running");

      let score = 100;
      const breakdown: Record<string, number> = {};

      if (!isRunning) {
        score -= 30;
        breakdown.notRunning = -30;
      }
      if (topProcess?.cpu_percent !== undefined && topProcess?.cpu_percent !== null && topProcess.cpu_percent > plugin.cpuWarnPercent) {
        score -= 15;
        breakdown.highCpu = -15;
      }
      if (topProcess?.memory_mb !== undefined && topProcess?.memory_mb !== null && topProcess.memory_mb > plugin.memWarnMb) {
        score -= 15;
        breakdown.highMemory = -15;
      }
      if (requiredServiceDown) {
        score -= 25;
        breakdown.serviceDown = -25;
      }

      const recentCrashes = await applicationRepository.countRecentCrashes(deviceId, applicationId, Date.now() - 24 * 60 * 60 * 1000);
      if (recentCrashes >= 2) {
        score -= 20;
        breakdown.crashLoop = -20;
      } else if (recentCrashes === 1) {
        score -= 10;
        breakdown.recentCrash = -10;
      }

      score = Math.max(0, Math.min(100, score));
      const level = score >= 85 ? "Healthy" : score >= 65 ? "Good" : score >= 40 ? "Warning" : "Critical";

      const previous = await applicationRepository.findDeviceApplicationHealth(deviceId, applicationId);
      const previousLevel = previous.rows[0]?.level as string | undefined;

      await applicationRepository.upsertApplicationHealth(deviceId, applicationId, score, level, breakdown);

      if (previousLevel && previousLevel !== level) {
        await applicationRepository.insertHistoryEvent(
          deviceId,
          applicationId,
          "HEALTH_SCORE_CHANGED",
          `${previousLevel} -> ${level} (${score}/100)`,
          Date.now()
        );
      }
    }
  } catch (err) {
    Logger.info("APPLICATION HEALTH COMPUTE ERROR:", err);
  }
}
