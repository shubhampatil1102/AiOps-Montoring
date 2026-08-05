import { API_URL } from "./config";
import type { ApplicationDependencyGraph, DependencyEvent, DependencyNode } from "@/types/application";

async function fetchJson<T>(url: string, fallback: T, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  const data = await response.json();
  return (data ?? fallback) as T;
}

function postJson<T>(url: string, body?: Record<string, unknown>) {
  return fetchJson<T>(url, {} as T, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

const emptyGraph: ApplicationDependencyGraph = {
  processes: [],
  services: [],
  scheduledTasks: [],
  startupItems: [],
  network: [],
  dns: [],
  authentication: null,
  health: [],
  events: [],
  edges: [],
};

export async function fetchApplicationDependencyGraph(deviceId: string, applicationId: number) {
  return fetchJson<ApplicationDependencyGraph>(
    `${API_URL}/devices/${encodeURIComponent(deviceId)}/applications/${applicationId}/dependencies`,
    emptyGraph
  );
}

export async function fetchApplicationDependencyTimeline(deviceId: string, applicationId: number) {
  const data = await fetchJson<DependencyEvent[]>(
    `${API_URL}/devices/${encodeURIComponent(deviceId)}/applications/${applicationId}/dependencies/timeline`,
    []
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchDeviceAuthenticationStatus(deviceId: string) {
  return fetchJson<DependencyNode | null>(
    `${API_URL}/devices/${encodeURIComponent(deviceId)}/dependencies/authentication`,
    null
  );
}

export async function flushDns(deviceId: string) {
  return postJson<{ job_id: number }>(`${API_URL}/devices/${encodeURIComponent(deviceId)}/dependencies/flush-dns`);
}

export async function scheduledTaskAction(
  deviceId: string,
  taskPath: string,
  taskName: string,
  action: "enable" | "disable" | "run"
) {
  return postJson<{ job_id: number }>(
    `${API_URL}/devices/${encodeURIComponent(deviceId)}/dependencies/scheduled-task/${action}`,
    { taskPath, taskName }
  );
}

export async function collectDependencyLogs(deviceId: string, processName: string) {
  return postJson<{ job_id: number }>(
    `${API_URL}/devices/${encodeURIComponent(deviceId)}/dependencies/collect-logs`,
    { processName }
  );
}
