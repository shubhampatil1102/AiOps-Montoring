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
  };
  drivers_summary?: {
    problem_count?: number;
    outdated_count?: number;
  };
}

export interface MetricPoint {
  cpu: number;
  ram: number;
  time: number;
}
