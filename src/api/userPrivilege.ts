import { API_URL } from "./config";
import type { AdminEvent, DeviceUserPrivilegeSummary } from "@/types/userPrivilege";

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

const emptySummary: DeviceUserPrivilegeSummary = {
  device: null,
  sessions: [],
  localAdministrators: [],
  events: [],
};

export async function fetchDeviceUserPrivilege(deviceId: string) {
  return fetchJson<DeviceUserPrivilegeSummary>(
    `${API_URL}/devices/${encodeURIComponent(deviceId)}/user-privilege`,
    emptySummary
  );
}

export async function fetchDeviceUserPrivilegeEvents(deviceId: string) {
  return ensureArray<AdminEvent>(
    await fetchJson(`${API_URL}/devices/${encodeURIComponent(deviceId)}/user-privilege/events`, [])
  );
}
