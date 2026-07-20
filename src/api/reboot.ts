import { API_URL } from "./config";
import type { RebootFacts, RebootFleetSummary, RebootHistoryEntry } from "@/types/device";

async function fetchJson<T>(url: string, fallback: T, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const data = await response.json();
  return (data ?? fallback) as T;
}

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function fetchDeviceRebootFacts(deviceId: string) {
  return fetchJson<RebootFacts | null>(
    `${API_URL}/devices/${encodeURIComponent(deviceId)}/reboot`,
    null
  );
}

export async function fetchDeviceRebootHistory(deviceId: string) {
  return ensureArray<RebootHistoryEntry>(
    await fetchJson(`${API_URL}/devices/${encodeURIComponent(deviceId)}/reboot/history`, [])
  );
}

export async function fetchRebootFleetSummary() {
  return fetchJson<RebootFleetSummary>(`${API_URL}/devices/reboot/dashboard`, {
    healthy: 0,
    due: 0,
    overdue: 0,
    pendingRestart: 0,
    avgUptimeDays: null,
    highestUptimeDays: null,
    lowestUptimeDays: null,
    recommendedToday: 0,
  });
}

export async function createAdHocReboot(deviceId: string) {
  return fetchJson<{ job_id: number }>(`${API_URL}/devices/${encodeURIComponent(deviceId)}/reboot`, { job_id: 0 }, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
}
