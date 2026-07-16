import { API_URL } from "./config";
import type { Alert, Device, HardwareMap } from "@/types/dashboard";

async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const data = await response.json();
  return data ?? fallback;
}

export async function fetchDashboardDevices() {
  const data = await fetchJson<Device[]>(`${API_URL}/devices`, []);
  return Array.isArray(data) ? data : [];
}

export async function fetchDashboardAlerts() {
  const data = await fetchJson<Alert[]>(`${API_URL}/alerts`, []);
  return Array.isArray(data) ? data : [];
}

export async function fetchDashboardHardware(deviceIds: string[]) {
  if (deviceIds.length === 0) {
    return {};
  }

  const ids = deviceIds.join(",");
  return fetchJson<HardwareMap>(
    `${API_URL}/devices/hardware?ids=${encodeURIComponent(ids)}`,
    {}
  );
}
