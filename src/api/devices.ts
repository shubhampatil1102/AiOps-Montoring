import { API_URL } from "./config";
import type {
  AlertItem,
  Device,
  DeviceCompliance,
  DeviceEvent,
  DeviceHardware,
  DeviceInventory,
  DeviceUpdate,
  HardwareMap,
  HealSuggestion,
  MetricPoint,
  ProcessItem,
} from "@/types/device";

async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const data = await response.json();
  return (data ?? fallback) as T;
}

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function fetchDevices() {
  return ensureArray<Device>(await fetchJson(`${API_URL}/devices`, []));
}

export async function fetchDevice(id: string) {
  return fetchJson<Device>(`${API_URL}/devices/${encodeURIComponent(id)}`, {} as Device);
}

export async function fetchDevicesHardware(ids: string[]) {
  if (ids.length === 0) {
    return {};
  }

  return fetchJson<HardwareMap>(
    `${API_URL}/devices/hardware?ids=${encodeURIComponent(ids.join(","))}`,
    {}
  );
}

export async function fetchDeviceHardware(id: string) {
  return fetchJson<DeviceHardware>(
    `${API_URL}/devices/${encodeURIComponent(id)}/hardware`,
    {}
  );
}

export async function fetchDeviceCompliance(id: string) {
  return fetchJson<DeviceCompliance>(
    `${API_URL}/devices/${encodeURIComponent(id)}/compliance`,
    {}
  );
}

export async function fetchDeviceUpdates(id: string) {
  return fetchJson<DeviceUpdate>(
    `${API_URL}/devices/${encodeURIComponent(id)}/updates`,
    {}
  );
}

export async function fetchDeviceInventory(id: string) {
  return fetchJson<DeviceInventory>(
    `${API_URL}/devices/${encodeURIComponent(id)}/inventory`,
    {}
  );
}

export async function fetchDeviceHistory(id: string, range: string) {
  return ensureArray<MetricPoint>(
    await fetchJson(
      `${API_URL}/devices/${encodeURIComponent(id)}/history?range=${encodeURIComponent(range)}`,
      []
    )
  );
}

export async function fetchDeviceEvents(id: string) {
  return ensureArray<DeviceEvent>(
    await fetchJson(`${API_URL}/devices/${encodeURIComponent(id)}/events`, [])
  );
}

export async function fetchDeviceTopProcesses(id: string) {
  return ensureArray<ProcessItem>(
    await fetchJson(`${API_URL}/devices/${encodeURIComponent(id)}/top-processes`, [])
  );
}

export async function fetchDeviceAlerts(id: string) {
  const alerts = ensureArray<AlertItem>(await fetchJson(`${API_URL}/alerts`, []));
  return alerts.filter((alert) => alert.id === id);
}

export async function fetchDeviceSuggestions(id: string) {
  const suggestions = ensureArray<HealSuggestion>(
    await fetchJson(`${API_URL}/heal/suggestions`, [])
  );

  return suggestions.filter((suggestion) => suggestion.device_id === id);
}
