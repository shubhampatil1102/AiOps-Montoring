import * as updateRepository from "../repositories/windowsUpdateInventory.repository";
import { Logger } from "./logger.service";

// Per-KB Windows Update tracking, layered on top of the existing
// device_updates snapshot (extended, not replaced) and patch_jobs/
// patch_history (job orchestration, unchanged). Real multi-source data
// only — no fabricated fields (no "Superseded", no acting "user" on
// automatic installs, no numeric WU-Client event IDs asserted as fact).

interface UpdateCatalogPayload {
  update_id?: string;
  revision_number?: number;
  kb?: string;
  title?: string;
  description?: string;
  category?: string;
  severity?: string;
  size_bytes?: number;
  is_downloaded?: boolean;
  is_hidden?: boolean;
  is_mandatory?: boolean;
  reboot_behavior?: string;
  state?: string;
  failure_hresult?: string;
}

interface UpdateHistoryPayload {
  update_id?: string;
  kb?: string;
  title?: string;
  success?: boolean;
  hresult?: string;
  source?: string;
  occurred_at?: number;
}

interface UpdateEventPayload {
  event_type?: string;
  message?: string;
  raw_event_id?: number;
  occurred_at?: number;
}

export async function ingestWindowsUpdateData(
  deviceId: string,
  body: {
    update_catalog?: UpdateCatalogPayload[];
    update_history_entries?: UpdateHistoryPayload[];
    update_events?: UpdateEventPayload[];
  }
) {
  const now = Date.now();

  if (Array.isArray(body.update_catalog)) {
    await ingestCatalog(deviceId, body.update_catalog, now);
  }
  if (Array.isArray(body.update_history_entries) && body.update_history_entries.length > 0) {
    await ingestHistory(deviceId, body.update_history_entries);
  }
  if (Array.isArray(body.update_events) && body.update_events.length > 0) {
    await ingestEvents(deviceId, body.update_events);
  }
}

async function ingestCatalog(deviceId: string, items: UpdateCatalogPayload[], now: number) {
  const active = await updateRepository.findActiveUpdateCatalogIds(deviceId);
  const touchedIds = new Set<number>();

  for (const item of items) {
    if (!item.update_id || !item.title || !item.state) continue;

    const result = await updateRepository.upsertUpdateCatalogEntry({
      deviceId,
      updateId: item.update_id,
      revisionNumber: item.revision_number ?? null,
      kb: item.kb ?? null,
      title: item.title,
      description: item.description ?? null,
      category: item.category ?? null,
      severity: item.severity ?? null,
      sizeBytes: item.size_bytes ?? null,
      isDownloaded: item.is_downloaded ?? false,
      isHidden: item.is_hidden ?? false,
      isMandatory: item.is_mandatory ?? false,
      rebootBehavior: item.reboot_behavior ?? null,
      state: item.state,
      failureHresult: item.failure_hresult ?? null,
    });
    touchedIds.add(result.id);

    if (!result.isNew && result.previousState && result.previousState !== item.state) {
      await updateRepository.insertUpdateEvent(
        deviceId, "STATE_CHANGED", `${item.kb ?? item.title}: ${result.previousState} -> ${item.state}`, null, now
      );
    }
  }

  const removed = active.rows.filter((row) => !touchedIds.has(row.id));
  if (removed.length > 0) {
    await updateRepository.markUpdateCatalogRemoved(removed.map((r) => r.id), now);
  }
}

async function ingestHistory(deviceId: string, items: UpdateHistoryPayload[]) {
  for (const item of items) {
    if (item.success === undefined || !item.occurred_at || !item.source) continue;

    const existing = await updateRepository.findUpdateHistoryEvent(deviceId, item.update_id ?? null, item.occurred_at);
    if (existing.rows.length > 0) continue;

    await updateRepository.insertUpdateHistoryEntry(
      deviceId,
      item.update_id ?? null,
      item.kb ?? null,
      item.title ?? null,
      item.success,
      item.hresult ?? null,
      item.source,
      item.occurred_at
    );
  }
}

async function ingestEvents(deviceId: string, items: UpdateEventPayload[]) {
  for (const item of items) {
    if (!item.event_type || !item.occurred_at) continue;

    const existing = await updateRepository.findEventByOccurrence(deviceId, item.raw_event_id ?? null, item.occurred_at);
    if (existing.rows.length > 0) continue;

    await updateRepository.insertUpdateEvent(
      deviceId, item.event_type, item.message ?? null, item.raw_event_id ?? null, item.occurred_at
    );
  }
}

// Verification used by the agent's install/reboot-verification flow: is
// this specific KB confirmed installed (present in success history AND no
// longer in the active/available catalog)?
export async function isUpdateVerifiedInstalled(deviceId: string, updateId: string) {
  try {
    const [history, catalog] = await Promise.all([
      updateRepository.findSuccessfulHistoryForUpdate(deviceId, updateId),
      updateRepository.findDeviceUpdateCatalog(deviceId),
    ]);
    const stillAvailable = catalog.rows.some((row: { update_id: string; is_downloaded: boolean }) => row.update_id === updateId);
    return history.rows.length > 0 && !stillAvailable;
  } catch (err) {
    Logger.info("UPDATE VERIFICATION ERROR:", err);
    return false;
  }
}

// Assembles the normalized { device, summary, updates } shape from
// device_updates (existing snapshot, extended) + the new catalog/history
// tables — computed live on read, not persisted as its own document.
export async function getDeviceUpdateSummary(deviceId: string) {
  const [infoResult, catalog, history] = await Promise.all([
    updateRepository.findDeviceUpdateInfo(deviceId),
    updateRepository.findDeviceUpdateCatalog(deviceId),
    updateRepository.findDeviceUpdateHistory(deviceId, 200),
  ]);

  const info = infoResult.rows[0] ?? {};
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  const available = catalog.rows.filter((u: { state: string }) => u.state !== "INSTALLED").length;
  const failed = catalog.rows.filter((u: { state: string }) => u.state === "FAILED").length;
  const installedToday = history.rows.filter(
    (h: { success: boolean; occurred_at: number }) => h.success && h.occurred_at >= oneDayAgo
  ).length;

  return {
    device: {
      lastScan: info.last_scan_at ?? null,
      lastInstall: info.last_install_at ?? null,
      lastSuccessfulScan: info.last_successful_scan_at ?? null,
      lastFailedScan: info.last_failed_scan_at ?? null,
      rebootRequired: Boolean(info.registry_reboot_pending),
      rebootReason: info.reboot_reason ?? null,
      updateSource: info.update_source ?? null,
      wuServiceStatus: info.wu_service_status ?? null,
      bitsServiceStatus: info.bits_service_status ?? null,
      updateMedicStatus: info.update_medic_status ?? null,
      scanDurationMs: info.scan_duration_ms ?? null,
    },
    summary: {
      available,
      failed,
      installedToday,
      restartRequired: Boolean(info.registry_reboot_pending),
    },
    updates: catalog.rows.map((u: Record<string, unknown>) => ({
      kb: u.kb,
      title: u.title,
      classification: u.category,
      severity: u.severity,
      state: u.state,
      downloaded: u.is_downloaded,
      hidden: u.is_hidden,
      mandatory: u.is_mandatory,
      rebootBehavior: u.reboot_behavior,
      failureHresult: u.failure_hresult,
      firstSeenAt: u.first_seen_at,
      lastSeenAt: u.last_seen_at,
    })),
  };
}
