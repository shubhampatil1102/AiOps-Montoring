import * as userPrivilegeRepository from "../repositories/userPrivilege.repository";
import { Logger } from "./logger.service";

// Real multi-source session/privilege ingest. Mirrors
// applicationDiscovery.service.ts's shape: snapshot-replace for live
// session state, upsert-with-removal-detection + event logging for local
// administrators (a meaningful lifecycle, worth tracking additions/
// removals/enabled-changes for).

interface UserSessionPayload {
  session_id?: number;
  username?: string;
  domain?: string;
  sid?: string;
  session_name?: string;
  state?: string;
  logon_type?: number;
  logon_time?: number;
  idle_time_ms?: number;
  is_active?: boolean;
  is_local_account?: boolean;
  is_azure_ad_account?: boolean;
  is_microsoft_account?: boolean;
  account_type?: string;
  is_administrator?: boolean;
  is_elevated?: boolean;
  elevation_source?: string;
}

interface LocalAdministratorPayload {
  sid?: string;
  username?: string;
  domain?: string;
  source?: string;
  enabled?: boolean;
  last_logon?: number;
  password_last_set?: number;
}

interface UacStatusPayload {
  uac_enabled?: boolean;
}

export async function ingestUserPrivilegeData(
  deviceId: string,
  body: {
    user_sessions?: UserSessionPayload[];
    local_administrators?: LocalAdministratorPayload[];
    uac_status?: UacStatusPayload;
  }
) {
  let sessions: UserSessionPayload[] = [];

  if (Array.isArray(body.user_sessions)) {
    sessions = body.user_sessions;
    await ingestSessions(deviceId, sessions);
  }

  if (Array.isArray(body.local_administrators)) {
    await ingestLocalAdministrators(deviceId, body.local_administrators);
  }

  if (Array.isArray(body.user_sessions) || body.uac_status) {
    await updatePrivilegeSnapshot(deviceId, sessions, body.uac_status);
  }
}

async function ingestSessions(deviceId: string, items: UserSessionPayload[]) {
  const entries = items
    .filter((item) => item.username)
    .map((item) => ({
      sessionId: item.session_id ?? null,
      username: item.username ?? null,
      domain: item.domain ?? null,
      sid: item.sid ?? null,
      sessionName: item.session_name ?? null,
      state: item.state ?? null,
      logonType: item.logon_type ?? null,
      logonTime: item.logon_time ?? null,
      idleTimeMs: item.idle_time_ms ?? null,
      isActive: item.is_active ?? false,
      isLocalAccount: item.is_local_account ?? null,
      isAzureAdAccount: item.is_azure_ad_account ?? null,
      isMicrosoftAccount: item.is_microsoft_account ?? null,
      accountType: item.account_type ?? null,
      isAdministrator: item.is_administrator ?? null,
      isElevated: item.is_elevated ?? null,
      elevationSource: item.elevation_source ?? null,
    }));

  await userPrivilegeRepository.replaceDeviceSessions(deviceId, entries);
}

async function ingestLocalAdministrators(deviceId: string, items: LocalAdministratorPayload[]) {
  const active = await userPrivilegeRepository.findActiveLocalAdministratorIds(deviceId);
  const touchedIds = new Set<number>();
  const now = Date.now();

  for (const item of items) {
    if (!item.sid) continue;

    const result = await userPrivilegeRepository.upsertLocalAdministrator({
      deviceId,
      sid: item.sid,
      username: item.username ?? null,
      domain: item.domain ?? null,
      source: item.source ?? null,
      enabled: item.enabled ?? null,
      lastLogon: item.last_logon ?? null,
      passwordLastSet: item.password_last_set ?? null,
    });
    touchedIds.add(result.id);

    if (result.isNew) {
      await userPrivilegeRepository.insertAdminEvent(deviceId, item.sid, item.username ?? null, "ADDED", item.username ?? item.sid, now);
    } else if (result.previousEnabled !== null && item.enabled !== undefined && result.previousEnabled !== item.enabled) {
      await userPrivilegeRepository.insertAdminEvent(
        deviceId, item.sid, item.username ?? null,
        item.enabled ? "ENABLED" : "DISABLED",
        item.username ?? item.sid, now
      );
    }
  }

  const removed = active.rows.filter((row) => !touchedIds.has(row.id));
  if (removed.length > 0) {
    await userPrivilegeRepository.markLocalAdministratorsRemoved(removed.map((r) => r.id), now);
    for (const row of removed) {
      await userPrivilegeRepository.insertAdminEvent(deviceId, row.sid, row.username, "REMOVED", row.username ?? row.sid, now);
    }
  }
}

// The "primary" user for the device-level snapshot is the active
// console/RDP session — preferring an is_active row, falling back to the
// first session reported, never fabricated when no session exists.
async function updatePrivilegeSnapshot(deviceId: string, sessions: UserSessionPayload[], uacStatus?: UacStatusPayload) {
  try {
    const primary = sessions.find((s) => s.is_active) ?? sessions[0];

    await userPrivilegeRepository.upsertUserPrivilegeSnapshot(deviceId, {
      uacEnabled: uacStatus?.uac_enabled ?? null,
      primaryUsername: primary?.username ?? null,
      primaryDomain: primary?.domain ?? null,
      primaryAccountType: primary?.account_type ?? null,
      primaryIsAdministrator: primary?.is_administrator ?? null,
      primaryIsElevated: primary?.is_elevated ?? null,
      primarySessionType: primary?.session_name ?? null,
    });
  } catch (err) {
    Logger.info("USER PRIVILEGE SNAPSHOT UPDATE ERROR:", err);
  }
}

export async function getDeviceUserPrivilegeSummary(deviceId: string) {
  const [snapshot, sessions, admins, events] = await Promise.all([
    userPrivilegeRepository.findUserPrivilegeSnapshot(deviceId),
    userPrivilegeRepository.findDeviceSessions(deviceId),
    userPrivilegeRepository.findDeviceLocalAdministrators(deviceId),
    userPrivilegeRepository.findDeviceAdminEvents(deviceId, 50),
  ]);

  return {
    device: snapshot.rows[0] ?? null,
    sessions: sessions.rows,
    localAdministrators: admins.rows,
    events: events.rows,
  };
}
