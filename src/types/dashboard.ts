export type { Device, DeviceHardware, HardwareMap } from "./device";

export interface Alert {
  id: string;
  message: string;
  time: number;
}

export interface MetricsHistoryPoint {
  time: number | string;
  cpu: number | string;
  ram: number | string;
}

export interface HealthSummary {
  healthy: number;
  warning: number;
  critical: number;
  offline: number;
}
