import * as applicationRepository from "../repositories/application.repository";
import * as dependencyRepository from "../repositories/dependency.repository";
import { matchPluginByExecutable } from "../constants/applicationPlugins";
import { Logger } from "./logger.service";

// Layers scheduled tasks / startup items / drivers / network / DNS /
// authentication signals on top of the existing application_processes and
// application_services tables (not duplicated here — see
// applicationDiscovery.service.ts) to build a dependency graph per app.
// Only real, agent-collected signals are stored; nothing here is inferred
// or fabricated when the agent can't observe it (e.g. no per-app OAuth
// token state, no TLS certificate validation).

interface ScheduledTaskPayload {
  task_name?: string;
  task_path?: string;
  state?: string;
  exe_path?: string;
  last_run_time?: number;
}

interface StartupItemPayload {
  name?: string;
  command?: string;
  source?: string;
}

interface SystemDriverPayload {
  name?: string;
  display_name?: string;
  state?: string;
  start_mode?: string;
  path_name?: string;
}

interface AuthenticationStatusPayload {
  azure_ad_joined?: string;
  domain_joined?: string;
  workplace_joined?: string;
  azure_ad_prt?: string;
  tenant_name?: string;
}

interface NetworkConnectionPayload {
  local_port?: number;
  remote_address?: string;
  remote_port?: number;
  state?: string;
  pid?: number;
  process_name?: string;
}

interface DnsCacheEntryPayload {
  record_name?: string;
  record_type?: string;
  data?: string;
  status?: string;
}

function basename(path: string | undefined | null): string | undefined {
  if (!path) return undefined;
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1];
}

// Best-effort application match for a startup mechanism's target
// executable — reuses the same process-matching plugin lookup rather than
// a separate matcher. Falls back to unmapped (application_id = null),
// exactly like a generic process.
async function resolveApplicationIdFromPath(path: string | undefined | null): Promise<number | null> {
  const plugin = matchPluginByExecutable(basename(path));
  if (plugin.id === "generic") return null;
  return applicationRepository.findOrCreateApplication(
    plugin.displayName,
    plugin.publisher,
    plugin.category,
    plugin.id,
    plugin.cloudProvider ?? null
  );
}

export async function ingestDependencyData(
  deviceId: string,
  body: {
    scheduled_tasks?: ScheduledTaskPayload[];
    startup_items?: StartupItemPayload[];
    system_drivers?: SystemDriverPayload[];
    authentication_status?: AuthenticationStatusPayload | null;
    network_connections?: NetworkConnectionPayload[];
    dns_cache?: DnsCacheEntryPayload[];
  }
) {
  const now = Date.now();

  if (Array.isArray(body.scheduled_tasks)) {
    await ingestScheduledTasks(deviceId, body.scheduled_tasks, now);
  }
  if (Array.isArray(body.startup_items)) {
    await ingestStartupItems(deviceId, body.startup_items, now);
  }
  if (Array.isArray(body.system_drivers)) {
    await ingestSystemDrivers(deviceId, body.system_drivers, now);
  }
  if (body.authentication_status) {
    await ingestAuthenticationStatus(deviceId, body.authentication_status, now);
  }
  if (Array.isArray(body.network_connections)) {
    await ingestNetworkConnections(deviceId, body.network_connections, now);
  }
  if (Array.isArray(body.dns_cache)) {
    await ingestDnsCache(deviceId, body.dns_cache, now);
  }
}

// Generic "diff against previously active nodes of this type" removal
// detection, mirroring ingestInventory's active/touched-set pattern in
// applicationDiscovery.service.ts.
async function detectRemovals(deviceId: string, nodeType: string, touchedIds: Set<number>, now: number) {
  const active = await dependencyRepository.findActiveDependencyNodeIds(deviceId, nodeType);
  const removed = active.rows.filter((row) => !touchedIds.has(row.id));
  if (removed.length === 0) return;

  await dependencyRepository.markDependencyNodesRemoved(removed.map((r) => r.id), now);
  for (const row of removed) {
    await dependencyRepository.insertDependencyEvent(
      deviceId, row.application_id, nodeType, row.node_key, "REMOVED", row.display_name, now
    );
  }
}

async function ingestScheduledTasks(deviceId: string, items: ScheduledTaskPayload[], now: number) {
  const touchedIds = new Set<number>();

  for (const item of items) {
    if (!item.task_name || !item.task_path) continue;

    const nodeKey = `${item.task_path}${item.task_name}`;
    const applicationId = await resolveApplicationIdFromPath(item.exe_path);

    const result = await dependencyRepository.upsertDependencyNode({
      deviceId,
      applicationId,
      nodeType: "SCHEDULED_TASK",
      nodeKey,
      displayName: item.task_name,
      status: item.state ?? null,
      metadata: { taskPath: item.task_path, exePath: item.exe_path ?? null, lastRunTime: item.last_run_time ?? null },
    });
    touchedIds.add(result.id);

    if (!result.isNew && result.previousStatus && item.state && result.previousStatus !== item.state) {
      await dependencyRepository.insertDependencyEvent(
        deviceId, applicationId, "SCHEDULED_TASK", nodeKey, "STATUS_CHANGED",
        `${result.previousStatus} -> ${item.state}`, now
      );
    }

    if (applicationId !== null) {
      await recomputeScheduledTaskHealth(deviceId, applicationId, nodeKey, item.task_name, item.state ?? null);
    }
  }

  await detectRemovals(deviceId, "SCHEDULED_TASK", touchedIds, now);
}

async function recomputeScheduledTaskHealth(
  deviceId: string, applicationId: number, nodeKey: string, displayName: string, state: string | null
) {
  const disabled = state === "Disabled";
  const score = disabled ? 60 : 100;
  const level = disabled ? "Warning" : "Healthy";
  await dependencyRepository.upsertDependencyHealth(
    deviceId, "SCHEDULED_TASK", nodeKey, applicationId, score, level,
    disabled ? { taskDisabled: -40 } : {}
  );
}

async function ingestStartupItems(deviceId: string, items: StartupItemPayload[], now: number) {
  const touchedIds = new Set<number>();

  for (const item of items) {
    if (!item.name || !item.source) continue;

    const nodeKey = `${item.source}:${item.name}`;
    const applicationId = await resolveApplicationIdFromPath(item.command);

    const result = await dependencyRepository.upsertDependencyNode({
      deviceId,
      applicationId,
      nodeType: "STARTUP_ITEM",
      nodeKey,
      displayName: item.name,
      status: "Active",
      metadata: { command: item.command ?? null, source: item.source },
    });
    touchedIds.add(result.id);
  }

  await detectRemovals(deviceId, "STARTUP_ITEM", touchedIds, now);
}

async function ingestSystemDrivers(deviceId: string, items: SystemDriverPayload[], now: number) {
  const touchedIds = new Set<number>();

  for (const item of items) {
    if (!item.name) continue;

    const result = await dependencyRepository.upsertDependencyNode({
      deviceId,
      applicationId: null,
      nodeType: "DRIVER",
      nodeKey: item.name,
      displayName: item.display_name ?? item.name,
      status: item.state ?? null,
      metadata: { startMode: item.start_mode ?? null, pathName: item.path_name ?? null },
    });
    touchedIds.add(result.id);
  }

  await detectRemovals(deviceId, "DRIVER", touchedIds, now);
}

async function ingestAuthenticationStatus(deviceId: string, status: AuthenticationStatusPayload, now: number) {
  const nodeKey = "entra-id";
  const joined = status.azure_ad_joined === "YES" || status.domain_joined === "YES" || status.workplace_joined === "YES";
  const ssoTokenPresent = status.azure_ad_prt === "YES";

  const displayStatus = joined
    ? (ssoTokenPresent ? "Joined" : "Joined, SSO Token Missing")
    : "Not Joined";

  const result = await dependencyRepository.upsertDependencyNode({
    deviceId,
    applicationId: null,
    nodeType: "AUTH_PROVIDER",
    nodeKey,
    displayName: "Windows / Entra ID Authentication",
    status: displayStatus,
    metadata: {
      azureAdJoined: status.azure_ad_joined ?? null,
      domainJoined: status.domain_joined ?? null,
      workplaceJoined: status.workplace_joined ?? null,
      azureAdPrt: status.azure_ad_prt ?? null,
      tenantName: status.tenant_name ?? null,
    },
  });

  if (!result.isNew && result.previousStatus && result.previousStatus !== displayStatus) {
    await dependencyRepository.insertDependencyEvent(
      deviceId, null, "AUTH_PROVIDER", nodeKey, "STATUS_CHANGED",
      `${result.previousStatus} -> ${displayStatus}`, now
    );
  }

  // Only score as degraded when the device IS joined but the SSO token
  // cache is broken — an unjoined/workgroup device isn't inherently
  // unhealthy, so it isn't penalized just for not being managed.
  const score = joined && !ssoTokenPresent ? 60 : 100;
  const level = score === 100 ? "Healthy" : "Warning";
  await dependencyRepository.upsertDependencyHealth(
    deviceId, "AUTH_PROVIDER", nodeKey, null, score, level,
    score === 100 ? {} : { ssoTokenMissing: -40 }
  );
}

async function ingestNetworkConnections(deviceId: string, items: NetworkConnectionPayload[], now: number) {
  const touchedIds = new Set<number>();

  for (const item of items) {
    if (item.local_port === undefined || !item.remote_address || item.remote_port === undefined) continue;

    const nodeKey = `${item.local_port}:${item.remote_address}:${item.remote_port}`;
    const plugin = matchPluginByExecutable(item.process_name);
    const applicationId = plugin.id !== "generic"
      ? await applicationRepository.findOrCreateApplication(plugin.displayName, plugin.publisher, plugin.category, plugin.id, plugin.cloudProvider ?? null)
      : null;

    const result = await dependencyRepository.upsertDependencyNode({
      deviceId,
      applicationId,
      nodeType: "NETWORK_ENDPOINT",
      nodeKey,
      displayName: `${item.remote_address}:${item.remote_port}`,
      status: item.state ?? null,
      metadata: { pid: item.pid ?? null, processName: item.process_name ?? null },
    });
    touchedIds.add(result.id);

    if (item.pid) {
      await dependencyRepository.upsertDependencyEdge(
        deviceId, applicationId, "PROCESS", String(item.pid), "NETWORK_ENDPOINT", nodeKey, "CONNECTS_TO"
      );
    }
  }

  await detectRemovals(deviceId, "NETWORK_ENDPOINT", touchedIds, now);
}

async function ingestDnsCache(deviceId: string, items: DnsCacheEntryPayload[], now: number) {
  const touchedIds = new Set<number>();

  for (const item of items) {
    if (!item.record_name) continue;

    const nodeKey = `${item.record_name}:${item.record_type ?? "?"}`;

    const result = await dependencyRepository.upsertDependencyNode({
      deviceId,
      applicationId: null,
      nodeType: "DNS_RECORD",
      nodeKey,
      displayName: item.record_name,
      status: item.status ?? null,
      metadata: { recordType: item.record_type ?? null, data: item.data ?? null },
    });
    touchedIds.add(result.id);
  }

  await detectRemovals(deviceId, "DNS_RECORD", touchedIds, now);
}

// Assembles the full per-device, per-application dependency picture the
// "Dependencies" tab needs: process tree + services come straight from the
// existing application_processes/application_services tables (not
// duplicated), layered with this module's new node/edge/health/event data.
export async function getApplicationDependencyGraph(deviceId: string, applicationId: number) {
  try {
    const [processes, services, tasks, startupItems, network, dns, auth, health, events, edges] = await Promise.all([
      applicationRepository.findDeviceApplicationProcesses(deviceId, applicationId),
      applicationRepository.findDeviceApplicationServices(deviceId, applicationId),
      dependencyRepository.findDeviceDependencyNodes(deviceId, "SCHEDULED_TASK", applicationId),
      dependencyRepository.findDeviceDependencyNodes(deviceId, "STARTUP_ITEM", applicationId),
      dependencyRepository.findDeviceDependencyNodes(deviceId, "NETWORK_ENDPOINT", applicationId),
      dependencyRepository.findDeviceDependencyNodes(deviceId, "DNS_RECORD"),
      dependencyRepository.findDeviceDependencyNodes(deviceId, "AUTH_PROVIDER"),
      dependencyRepository.findDeviceDependencyHealth(deviceId, applicationId),
      dependencyRepository.findDeviceDependencyEvents(deviceId, applicationId, 50),
      dependencyRepository.findDeviceDependencyEdges(deviceId, applicationId),
    ]);

    return {
      processes: processes.rows,
      services: services.rows,
      scheduledTasks: tasks.rows,
      startupItems: startupItems.rows,
      network: network.rows,
      dns: dns.rows,
      authentication: auth.rows[0] ?? null,
      health: health.rows,
      events: events.rows,
      edges: edges.rows,
    };
  } catch (err) {
    Logger.info("DEPENDENCY GRAPH ASSEMBLE ERROR:", err);
    return {
      processes: [], services: [], scheduledTasks: [], startupItems: [],
      network: [], dns: [], authentication: null, health: [], events: [], edges: [],
    };
  }
}

export async function getDeviceAuthenticationStatus(deviceId: string) {
  const auth = await dependencyRepository.findDeviceDependencyNodes(deviceId, "AUTH_PROVIDER");
  return auth.rows[0] ?? null;
}
