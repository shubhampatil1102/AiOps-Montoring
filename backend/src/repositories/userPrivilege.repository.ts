import { query } from "./db.repository";

export interface DeviceSessionEntry {
  sessionId: number | null;
  username: string | null;
  domain: string | null;
  sid: string | null;
  sessionName: string | null;
  state: string | null;
  logonType: number | null;
  logonTime: number | null;
  idleTimeMs: number | null;
  isActive: boolean;
  isLocalAccount: boolean | null;
  isAzureAdAccount: boolean | null;
  isMicrosoftAccount: boolean | null;
  accountType: string | null;
  isAdministrator: boolean | null;
  isElevated: boolean | null;
  elevationSource: string | null;
}

// Snapshot-replace-per-device-per-cycle — mirrors replaceProcessSnapshot in
// application.repository.ts. Sessions are live state, not a log.
export async function replaceDeviceSessions(deviceId: string, sessions: DeviceSessionEntry[]) {
  const now = Date.now();
  await query(`DELETE FROM device_sessions WHERE device_id=$1`, [deviceId]);

  for (const s of sessions) {
    await query(
      `INSERT INTO device_sessions
       (device_id, session_id, username, domain, sid, session_name, state, logon_type, logon_time,
        idle_time_ms, is_active, is_local_account, is_azure_ad_account, is_microsoft_account,
        account_type, is_administrator, is_elevated, elevation_source, collected_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      [
        deviceId, s.sessionId, s.username, s.domain, s.sid, s.sessionName, s.state, s.logonType, s.logonTime,
        s.idleTimeMs, s.isActive, s.isLocalAccount, s.isAzureAdAccount, s.isMicrosoftAccount,
        s.accountType, s.isAdministrator, s.isElevated, s.elevationSource, now,
      ]
    );
  }
}

export async function findDeviceSessions(deviceId: string) {
  return query(
    `SELECT * FROM device_sessions WHERE device_id=$1 ORDER BY is_active DESC, session_id ASC`,
    [deviceId]
  );
}

export interface LocalAdministratorEntry {
  deviceId: string;
  sid: string;
  username: string | null;
  domain: string | null;
  source: string | null;
  enabled: boolean | null;
  lastLogon: number | null;
  passwordLastSet: number | null;
}

// Upsert + removal detection — mirrors upsertInventoryEntry in
// application.repository.ts.
export async function upsertLocalAdministrator(entry: LocalAdministratorEntry) {
  const now = Date.now();

  const existing = await query<{ id: number; enabled: boolean | null }>(
    `SELECT id, enabled FROM device_local_administrators WHERE device_id=$1 AND sid=$2`,
    [entry.deviceId, entry.sid]
  );

  if (existing.rows[0]) {
    await query(
      `UPDATE device_local_administrators
       SET username=$1, domain=$2, source=$3, enabled=$4, last_logon=$5, password_last_set=$6,
           last_seen_at=$7, removed_at=NULL
       WHERE id=$8`,
      [entry.username, entry.domain, entry.source, entry.enabled, entry.lastLogon, entry.passwordLastSet, now, existing.rows[0].id]
    );
    return { id: existing.rows[0].id, isNew: false, previousEnabled: existing.rows[0].enabled };
  }

  const inserted = await query<{ id: number }>(
    `INSERT INTO device_local_administrators
       (device_id, sid, username, domain, source, enabled, last_logon, password_last_set, first_seen_at, last_seen_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
     RETURNING id`,
    [entry.deviceId, entry.sid, entry.username, entry.domain, entry.source, entry.enabled, entry.lastLogon, entry.passwordLastSet, now]
  );
  return { id: inserted.rows[0].id, isNew: true, previousEnabled: null };
}

export async function findActiveLocalAdministratorIds(deviceId: string) {
  return query<{ id: number; sid: string; username: string | null }>(
    `SELECT id, sid, username FROM device_local_administrators WHERE device_id=$1 AND removed_at IS NULL`,
    [deviceId]
  );
}

export async function markLocalAdministratorsRemoved(ids: number[], removedAt: number) {
  if (ids.length === 0) return;
  await query(`UPDATE device_local_administrators SET removed_at=$1 WHERE id = ANY($2::int[])`, [removedAt, ids]);
}

export async function findDeviceLocalAdministrators(deviceId: string) {
  return query(
    `SELECT * FROM device_local_administrators WHERE device_id=$1 AND removed_at IS NULL ORDER BY username ASC`,
    [deviceId]
  );
}

export async function insertAdminEvent(
  deviceId: string,
  sid: string | null,
  username: string | null,
  eventType: string,
  detail: string | null,
  occurredAt: number
) {
  return query(
    `INSERT INTO device_admin_events (device_id, sid, username, event_type, detail, occurred_at)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [deviceId, sid, username, eventType, detail, occurredAt]
  );
}

export async function findDeviceAdminEvents(deviceId: string, limit = 100) {
  return query(
    `SELECT * FROM device_admin_events WHERE device_id=$1 ORDER BY occurred_at DESC LIMIT $2`,
    [deviceId, limit]
  );
}

export interface UserPrivilegeSnapshot {
  uacEnabled: boolean | null;
  primaryUsername: string | null;
  primaryDomain: string | null;
  primaryAccountType: string | null;
  primaryIsAdministrator: boolean | null;
  primaryIsElevated: boolean | null;
  primarySessionType: string | null;
}

export async function upsertUserPrivilegeSnapshot(deviceId: string, snapshot: UserPrivilegeSnapshot) {
  const now = Date.now();
  await query(
    `INSERT INTO device_user_privilege
       (device_id, uac_enabled, primary_username, primary_domain, primary_account_type,
        primary_is_administrator, primary_is_elevated, primary_session_type, last_scan_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (device_id) DO UPDATE SET
       uac_enabled=$2, primary_username=$3, primary_domain=$4, primary_account_type=$5,
       primary_is_administrator=$6, primary_is_elevated=$7, primary_session_type=$8, last_scan_at=$9`,
    [
      deviceId, snapshot.uacEnabled, snapshot.primaryUsername, snapshot.primaryDomain, snapshot.primaryAccountType,
      snapshot.primaryIsAdministrator, snapshot.primaryIsElevated, snapshot.primarySessionType, now,
    ]
  );
}

export async function findUserPrivilegeSnapshot(deviceId: string) {
  return query(`SELECT * FROM device_user_privilege WHERE device_id=$1`, [deviceId]);
}
