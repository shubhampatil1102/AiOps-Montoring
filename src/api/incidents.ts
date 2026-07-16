import { API_URL } from "./config";
import type { Incident, IncidentAlert } from "@/types/incident";

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

export async function fetchIncidents() {
  return ensureArray<Incident>(await fetchJson(`${API_URL}/issues`, []));
}

export async function fetchIncidentAlerts() {
  return ensureArray<IncidentAlert>(await fetchJson(`${API_URL}/alerts`, []));
}

export async function resolveIncident(id: string) {
  return fetchJson<{ ok: boolean }>(
    `${API_URL}/issues/${encodeURIComponent(id)}/resolve`,
    { ok: true },
    { method: "POST" }
  );
}

export async function escalateIncident(id: string) {
  return fetchJson<{ ok: boolean }>(
    `${API_URL}/issues/${encodeURIComponent(id)}/escalate`,
    { ok: true },
    { method: "POST" }
  );
}

export async function remediateIncident(id: string) {
  return fetchJson<{ ok: boolean }>(
    `${API_URL}/issues/${encodeURIComponent(id)}/remediate`,
    { ok: true },
    { method: "POST" }
  );
}
