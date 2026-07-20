export type DeviceStatus = "Healthy" | "Warning" | "Critical" | "Offline";

export interface Device {
  id: string;
  cpu?: number;
  ram?: number;
  time?: number;
  boot_time?: number;
  last_seen?: number;
  state?: string;
}

export interface DeviceHardware {
  device_id?: string;
  cpu_temp?: number;
  disk?: number;
  disk_free?: number;
  battery_health?: string;
  battery_health_percent?: number;
  fan_status?: string;
  health_score?: number;
  risk?: "LOW" | "MEDIUM" | "HIGH" | string;
  updated_at?: number;
}

export type HardwareMap = Record<string, DeviceHardware>;

export interface DeviceCompliance {
  bitlocker?: string | boolean;
  tpm?: string | boolean;
  secureboot?: string | boolean;
  secureBoot?: string | boolean;
  defender?: string | boolean;
  updated_at?: number;
}

export interface DeviceUpdate {
  windows_update_status?: string;
  pending_updates?: number | string;
  failed_updates?: number | string;
  driver_status?: string;
  outdated_drivers?: number | string;
  registry_reboot_pending?: boolean;
  device_class?: string;
  last_checked?: number;
}

export interface ProcessItem {
  name: string;
  cpu?: number | string;
  ram?: number | string;
  time?: number;
}

export interface DeviceEvent {
  type: string;
  message: string;
  time: number;
}

export interface AlertItem {
  id: string;
  message: string;
  time: number;
  severity?: string;
  acknowledged?: boolean;
  resolved?: boolean;
  suggestion_id?: number | null;
}

export interface HealSuggestion {
  id: number;
  device_id: string;
  alert_type?: string;
  reason?: string;
  suggested_action?: string;
  script?: string;
  status?: string;
  created_at?: number;
}

export interface DeviceInventory {
  updated_at?: number;
  services_summary?: {
    auto_running_issue_count?: number;
    recent_failure_count?: number;
    auto_stopped?: Array<{
      name: string;
      display_name: string;
      start_mode: string;
      state: string;
    }>;
    recent_failures?: Array<{
      time: number;
      id: number;
      message: string;
    }>;
  };
  drivers_summary?: {
    problem_count?: number;
    outdated_count?: number;
    problems?: Array<{
      name: string;
      status?: string;
      error_code?: number;
      device_id?: string;
    }>;
    outdated?: Array<{
      device_name?: string;
      manufacturer?: string;
      version?: string;
      driver_date?: string;
    }>;
  };
}

export interface MetricPoint {
  cpu: number;
  ram: number;
  time: number;
}

export interface ScriptJob {
  id: number;
  device_id: string;
  script?: string;
  status?: string;
  created_at?: number;
  started_at?: number;
  finished_at?: number;
}

export type PatchAction = "SCAN" | "INSTALL" | "REBOOT";

export type PatchJobStatus =
  | "PENDING"
  | "QUEUED"
  | "PREPARING"
  | "DOWNLOADING"
  | "INSTALLING"
  | "WAITING_FOR_REBOOT"
  | "REBOOTING"
  | "VERIFYING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface PatchJob {
  id: number;
  device_id: string;
  action: PatchAction;
  status: PatchJobStatus;
  related_job_id?: number | null;
  percent_complete?: number | null;
  current_step_detail?: string | null;
  updates_total?: number | null;
  updates_processed?: number | null;
  updates_failed?: number | null;
  reboot_required?: boolean;
  error?: string | null;
  requested_by?: string | null;
  created_at?: number;
  started_at?: number;
  finished_at?: number;
}

export interface PatchHistoryEntry {
  id: number;
  device_id: string;
  patch_job_id?: number | null;
  action: PatchAction;
  status: "COMPLETED" | "FAILED" | "CANCELLED";
  updates_installed?: number;
  updates_failed?: number;
  reboot_required?: boolean;
  summary?: string | null;
  occurred_at: number;
}

export interface PatchSummary {
  upToDate: number;
  pending: number;
  failed: number;
  activeJobs: number;
}

export interface RebootFacts {
  device_id: string;
  boot_time?: number;
  state?: string;
  last_seen?: number;
  cpu?: number;
  ram?: number;
  registry_reboot_pending?: boolean;
  device_class: string;
  windows_update_status?: string;
  pending_updates?: number | string;
  failed_updates?: number | string;
  max_uptime_days: number;
}

export interface RebootHistoryEntry {
  id: number;
  device_id: string;
  previous_boot_time?: number | null;
  new_boot_time: number;
  uptime_before_reboot_ms?: number | null;
  detected_at: number;
}

export interface RebootFleetSummary {
  healthy: number;
  due: number;
  overdue: number;
  pendingRestart: number;
  avgUptimeDays: number | null;
  highestUptimeDays: number | null;
  lowestUptimeDays: number | null;
  recommendedToday: number;
}
