export type DeviceHealthStatus = "Healthy" | "Warning" | "Critical" | "Offline";

interface DeviceHealthInput {
  cpu?: number;
  ram?: number;
  time?: number;
}

const ONLINE_THRESHOLD_MS = 20000;
const CPU_CRITICAL = 90;
const RAM_CRITICAL = 90;
const CPU_WARNING = 70;
const RAM_WARNING = 80;

export function isDeviceOnline(device: DeviceHealthInput) {
  return Date.now() - Number(device.time || 0) < ONLINE_THRESHOLD_MS;
}

export function getDeviceHealthStatus(device: DeviceHealthInput): DeviceHealthStatus {
  if (!isDeviceOnline(device)) return "Offline";

  const cpu = Number(device.cpu || 0);
  const ram = Number(device.ram || 0);

  if (cpu > CPU_CRITICAL || ram > RAM_CRITICAL) return "Critical";
  if (cpu > CPU_WARNING || ram > RAM_WARNING) return "Warning";
  return "Healthy";
}

export function getDeviceHealthReason(device: DeviceHealthInput): string {
  if (!isDeviceOnline(device)) return "Agent not reporting";

  const cpu = Number(device.cpu || 0);
  const ram = Number(device.ram || 0);

  if (cpu > CPU_CRITICAL) return "CPU critically high";
  if (ram > RAM_CRITICAL) return "Memory critically high";
  if (cpu > CPU_WARNING) return "CPU elevated";
  if (ram > RAM_WARNING) return "Memory elevated";
  return "Healthy";
}

export function getDeviceState(state?: string) {

  switch (state) {
    case "ONLINE":
      return { label: "Online", color: "#22c55e" };

    case "IDLE":
      return { label: "Inactive", color: "#f59e0b" };

    case "EXPECTED_OFFLINE":
      return { label: "Powered Off", color: "#9ca3af" };

    case "LOST":
      return { label: "Not Reporting", color: "#ef4444" };

    default:
      return { label: "Unknown", color: "#6b7280" };
  }
}
