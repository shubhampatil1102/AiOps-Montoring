import { query } from "./db.repository";

export interface UpdateCatalogEntry {
  deviceId: string;
  updateId: string;
  revisionNumber: number | null;
  kb: string | null;
  title: string;
  description: string | null;
  category: string | null;
  severity: string | null;
  sizeBytes: number | null;
  isDownloaded: boolean;
  isHidden: boolean;
  isMandatory: boolean;
  rebootBehavior: string | null;
  state: string;
  failureHresult: string | null;
}

// Upserts one KB's catalog row, tracking first/last seen and clearing
// removed_at — mirrors upsertInventoryEntry's shape in application.repository.ts.
export async function upsertUpdateCatalogEntry(entry: UpdateCatalogEntry) {
  const now = Date.now();

  const existing = await query<{ id: number; state: string }>(
    `SELECT id, state FROM device_update_catalog WHERE device_id=$1 AND update_id=$2`,
    [entry.deviceId, entry.updateId]
  );

  if (existing.rows[0]) {
    await query(
      `UPDATE device_update_catalog
       SET revision_number=$1, kb=$2, title=$3, description=$4, category=$5, severity=$6,
           size_bytes=$7, is_downloaded=$8, is_hidden=$9, is_mandatory=$10, reboot_behavior=$11,
           state=$12, failure_hresult=$13, last_seen_at=$14, removed_at=NULL
       WHERE id=$15`,
      [
        entry.revisionNumber, entry.kb, entry.title, entry.description, entry.category, entry.severity,
        entry.sizeBytes, entry.isDownloaded, entry.isHidden, entry.isMandatory, entry.rebootBehavior,
        entry.state, entry.failureHresult, now, existing.rows[0].id,
      ]
    );
    return { id: existing.rows[0].id, isNew: false, previousState: existing.rows[0].state };
  }

  const inserted = await query<{ id: number }>(
    `INSERT INTO device_update_catalog
       (device_id, update_id, revision_number, kb, title, description, category, severity, size_bytes,
        is_downloaded, is_hidden, is_mandatory, reboot_behavior, state, failure_hresult, first_seen_at, last_seen_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$16)
     RETURNING id`,
    [
      entry.deviceId, entry.updateId, entry.revisionNumber, entry.kb, entry.title, entry.description,
      entry.category, entry.severity, entry.sizeBytes, entry.isDownloaded, entry.isHidden, entry.isMandatory,
      entry.rebootBehavior, entry.state, entry.failureHresult, now,
    ]
  );
  return { id: inserted.rows[0].id, isNew: true, previousState: null };
}

export async function findActiveUpdateCatalogIds(deviceId: string) {
  return query<{ id: number; update_id: string; title: string }>(
    `SELECT id, update_id, title FROM device_update_catalog WHERE device_id=$1 AND removed_at IS NULL`,
    [deviceId]
  );
}

export async function markUpdateCatalogRemoved(ids: number[], removedAt: number) {
  if (ids.length === 0) return;
  await query(`UPDATE device_update_catalog SET removed_at=$1 WHERE id = ANY($2::int[])`, [removedAt, ids]);
}

export async function findDeviceUpdateCatalog(deviceId: string) {
  return query(
    `SELECT * FROM device_update_catalog WHERE device_id=$1 AND removed_at IS NULL ORDER BY severity DESC NULLS LAST, title ASC`,
    [deviceId]
  );
}

export async function insertUpdateHistoryEntry(
  deviceId: string,
  updateId: string | null,
  kb: string | null,
  title: string | null,
  success: boolean,
  hresult: string | null,
  source: string,
  occurredAt: number
) {
  return query(
    `INSERT INTO device_update_history (device_id, update_id, kb, title, success, hresult, source, occurred_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [deviceId, updateId, kb, title, success, hresult, source, occurredAt]
  );
}

export async function findUpdateHistoryEvent(deviceId: string, updateId: string | null, occurredAt: number) {
  return query(
    `SELECT id FROM device_update_history WHERE device_id=$1 AND update_id IS NOT DISTINCT FROM $2 AND occurred_at=$3`,
    [deviceId, updateId, occurredAt]
  );
}

export async function findDeviceUpdateHistory(deviceId: string, limit = 100) {
  return query(
    `SELECT * FROM device_update_history WHERE device_id=$1 ORDER BY occurred_at DESC LIMIT $2`,
    [deviceId, limit]
  );
}

// Used by the agent's post-install/post-reboot verification: did this
// specific KB succeed in install history without any recorded failure?
export async function findSuccessfulHistoryForUpdate(deviceId: string, updateId: string) {
  return query<{ id: number }>(
    `SELECT id FROM device_update_history WHERE device_id=$1 AND update_id=$2 AND success=true ORDER BY occurred_at DESC LIMIT 1`,
    [deviceId, updateId]
  );
}

export async function insertUpdateEvent(
  deviceId: string,
  eventType: string,
  message: string | null,
  rawEventId: number | null,
  occurredAt: number
) {
  return query(
    `INSERT INTO device_update_events (device_id, event_type, message, raw_event_id, occurred_at)
     VALUES ($1,$2,$3,$4,$5)`,
    [deviceId, eventType, message, rawEventId, occurredAt]
  );
}

export async function findEventByOccurrence(deviceId: string, rawEventId: number | null, occurredAt: number) {
  return query(
    `SELECT id FROM device_update_events WHERE device_id=$1 AND raw_event_id IS NOT DISTINCT FROM $2 AND occurred_at=$3`,
    [deviceId, rawEventId, occurredAt]
  );
}

export async function findDeviceUpdateEvents(deviceId: string, limit = 100) {
  return query(
    `SELECT * FROM device_update_events WHERE device_id=$1 ORDER BY occurred_at DESC LIMIT $2`,
    [deviceId, limit]
  );
}

export async function findDeviceUpdateInfo(deviceId: string) {
  return query(`SELECT * FROM device_updates WHERE device_id=$1`, [deviceId]);
}
