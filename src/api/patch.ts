import { API_URL } from "./config";
import type { PatchHistoryEntry, PatchJob, PatchSummary } from "@/types/device";

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

function postJson<T>(url: string, body?: Record<string, unknown>) {
  return fetchJson<T>(url, {} as T, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

export async function fetchDevicePatchJobs(deviceId: string) {
  return ensureArray<PatchJob>(
    await fetchJson(`${API_URL}/patch/jobs?device_id=${encodeURIComponent(deviceId)}`, [])
  );
}

export async function fetchDevicePatchHistory(deviceId: string) {
  return ensureArray<PatchHistoryEntry>(
    await fetchJson(`${API_URL}/devices/${encodeURIComponent(deviceId)}/patch/history`, [])
  );
}

export async function fetchPatchSummary() {
  return fetchJson<PatchSummary>(`${API_URL}/patch/summary`, {
    upToDate: 0,
    pending: 0,
    failed: 0,
    activeJobs: 0,
  });
}

export async function createPatchScan(deviceId: string) {
  return postJson<{ job_id: number }>(`${API_URL}/patch/jobs/scan`, { device_id: deviceId });
}

export async function createPatchInstall(deviceId: string) {
  return postJson<{ job_id: number }>(`${API_URL}/patch/jobs/install`, { device_id: deviceId });
}

export async function retryPatchJob(jobId: number) {
  return postJson<{ job_id: number }>(`${API_URL}/patch/jobs/${jobId}/retry`);
}

export async function cancelPatchJob(jobId: number) {
  return postJson<{ ok: boolean }>(`${API_URL}/patch/jobs/${jobId}/cancel`);
}

export async function createRebootJob(installJobId: number) {
  return postJson<{ job_id: number }>(`${API_URL}/patch/jobs/${installJobId}/reboot`);
}
