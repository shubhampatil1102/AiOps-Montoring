import { API_URL } from "./config";
import type {
  Application,
  ApplicationDetail,
  ApplicationDeviceBreakdown,
  ApplicationHealth,
  ApplicationHistoryEntry,
  ApplicationInsights,
  ApplicationProcess,
  ApplicationServiceStatus,
  ApplicationSummary,
  InstalledApplication,
} from "@/types/application";

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

function postJson<T>(url: string) {
  return fetchJson<T>(url, {} as T, { method: "POST" });
}

export async function fetchApplications() {
  return ensureArray<Application>(await fetchJson(`${API_URL}/applications`, []));
}

export async function fetchApplicationCategories() {
  return ensureArray<string>(await fetchJson(`${API_URL}/applications/categories`, []));
}

export async function fetchApplicationSummary() {
  return fetchJson<ApplicationSummary>(`${API_URL}/applications/summary`, {
    installedApplications: 0,
    healthy: 0,
    warning: 0,
    critical: 0,
    topCpu: [],
    topMemory: [],
  });
}

export async function fetchDeviceApplications(deviceId: string) {
  return ensureArray<InstalledApplication>(
    await fetchJson(`${API_URL}/devices/${encodeURIComponent(deviceId)}/applications`, [])
  );
}

export async function fetchDeviceApplicationProcesses(deviceId: string, applicationId: number) {
  return ensureArray<ApplicationProcess>(
    await fetchJson(`${API_URL}/devices/${encodeURIComponent(deviceId)}/applications/${applicationId}/processes`, [])
  );
}

export async function fetchDeviceProcesses(deviceId: string) {
  return ensureArray<ApplicationProcess>(
    await fetchJson(`${API_URL}/devices/${encodeURIComponent(deviceId)}/processes`, [])
  );
}

export async function fetchDeviceApplicationServices(deviceId: string, applicationId: number) {
  return ensureArray<ApplicationServiceStatus>(
    await fetchJson(`${API_URL}/devices/${encodeURIComponent(deviceId)}/applications/${applicationId}/services`, [])
  );
}

export async function fetchDeviceApplicationHealth(deviceId: string, applicationId: number) {
  return fetchJson<ApplicationHealth | null>(
    `${API_URL}/devices/${encodeURIComponent(deviceId)}/applications/${applicationId}/health`,
    null
  );
}

export async function fetchDeviceApplicationHistory(deviceId: string, applicationId: number) {
  return ensureArray<ApplicationHistoryEntry>(
    await fetchJson(`${API_URL}/devices/${encodeURIComponent(deviceId)}/applications/${applicationId}/history`, [])
  );
}

export async function fetchApplicationDetail(applicationId: number) {
  return fetchJson<ApplicationDetail | null>(`${API_URL}/applications/${applicationId}`, null);
}

export async function fetchApplicationDevices(applicationId: number) {
  return ensureArray<ApplicationDeviceBreakdown>(
    await fetchJson(`${API_URL}/applications/${applicationId}/devices`, [])
  );
}

export async function fetchApplicationHistoryFleetWide(applicationId: number) {
  return ensureArray<ApplicationHistoryEntry>(
    await fetchJson(`${API_URL}/applications/${applicationId}/history`, [])
  );
}

export async function fetchApplicationHealthHistory(applicationId: number, days: number) {
  return ensureArray<{ device_id: string; health_score: number; recorded_at: number }>(
    await fetchJson(`${API_URL}/applications/${applicationId}/health-history?days=${days}`, [])
  );
}

export async function fetchApplicationInsights() {
  return fetchJson<ApplicationInsights>(`${API_URL}/applications/insights`, {
    mostInstalled: [],
    mostVersionChanged: [],
    mostServiceRestarts: [],
    recentlyInstalled: [],
    unsignedSoftware: [],
    topCpu: [],
    topMemory: [],
    publisherBreakdown: [],
    categoryBreakdown: [],
  });
}

export async function killProcess(deviceId: string, pid: number) {
  return postJson<{ job_id: number }>(`${API_URL}/devices/${encodeURIComponent(deviceId)}/processes/${pid}/kill`);
}

export async function restartProcess(deviceId: string, pid: number) {
  return postJson<{ job_id: number; relaunched: boolean }>(
    `${API_URL}/devices/${encodeURIComponent(deviceId)}/processes/${pid}/restart`
  );
}

export async function serviceAction(deviceId: string, serviceName: string, action: "restart" | "stop" | "start") {
  return postJson<{ job_id: number }>(
    `${API_URL}/devices/${encodeURIComponent(deviceId)}/services/${encodeURIComponent(serviceName)}/${action}`
  );
}
