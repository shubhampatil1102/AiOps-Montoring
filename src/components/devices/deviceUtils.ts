import type { Device, DeviceStatus } from "@/types/device";

export function getDeviceStatus(device: Device): DeviceStatus {
  const online = Date.now() - Number(device.time || 0) < 20000;

  if (!online) return "Offline";
  if (Number(device.cpu || 0) >= 90 || Number(device.ram || 0) >= 90) {
    return "Critical";
  }
  if (Number(device.cpu || 0) >= 70 || Number(device.ram || 0) >= 80) {
    return "Warning";
  }
  return "Healthy";
}

export function getDeviceReason(device: Device) {
  if (Date.now() - Number(device.time || 0) >= 20000) return "Agent not reporting";
  if (Number(device.cpu || 0) >= 90) return "CPU critically high";
  if (Number(device.ram || 0) >= 90) return "Memory critically high";
  if (Number(device.cpu || 0) >= 70) return "CPU elevated";
  if (Number(device.ram || 0) >= 80) return "Memory elevated";
  return "Healthy";
}

export function getStatusVariant(status: DeviceStatus) {
  if (status === "Healthy") return "success";
  if (status === "Warning") return "warning";
  if (status === "Critical") return "danger";
  return "default";
}

export function formatDateTime(value?: number) {
  return value ? new Date(Number(value)).toLocaleString() : "-";
}

export function formatLastSeen(value?: number) {
  if (!value) return "-";

  const seconds = Math.max(0, Math.floor((Date.now() - Number(value)) / 1000));
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}

export function formatUptime(bootTime?: number) {
  if (!bootTime) return "-";

  const seconds = Math.max(0, Math.floor((Date.now() - bootTime) / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return `${days}d ${hours}h ${minutes}m`;
}

export function formatPercent(value?: number | string) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export function formatValue(value: unknown) {
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "boolean") return value ? "Enabled" : "Disabled";
  return String(value);
}
