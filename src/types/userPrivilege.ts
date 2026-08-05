export interface DeviceSession {
  id: number;
  device_id: string;
  session_id: number | null;
  username: string | null;
  domain: string | null;
  sid: string | null;
  session_name: string | null;
  state: string | null;
  logon_type: number | null;
  logon_time: number | null;
  idle_time_ms: number | null;
  is_active: boolean;
  is_local_account: boolean | null;
  is_azure_ad_account: boolean | null;
  is_microsoft_account: boolean | null;
  account_type: string | null;
  is_administrator: boolean | null;
  is_elevated: boolean | null;
  elevation_source: string | null;
  collected_at: number;
}

export interface LocalAdministrator {
  id: number;
  device_id: string;
  sid: string;
  username: string | null;
  domain: string | null;
  source: string | null;
  enabled: boolean | null;
  last_logon: number | null;
  password_last_set: number | null;
  first_seen_at: number;
  last_seen_at: number;
  removed_at?: number | null;
}

export interface AdminEvent {
  id: number;
  device_id: string;
  sid: string | null;
  username: string | null;
  event_type: "ADDED" | "REMOVED" | "ENABLED" | "DISABLED";
  detail?: string;
  occurred_at: number;
}

export interface DeviceUserPrivilegeSnapshot {
  device_id: string;
  uac_enabled: boolean | null;
  primary_username: string | null;
  primary_domain: string | null;
  primary_account_type: string | null;
  primary_is_administrator: boolean | null;
  primary_is_elevated: boolean | null;
  primary_session_type: string | null;
  last_scan_at: number | null;
}

export interface DeviceUserPrivilegeSummary {
  device: DeviceUserPrivilegeSnapshot | null;
  sessions: DeviceSession[];
  localAdministrators: LocalAdministrator[];
  events: AdminEvent[];
}
