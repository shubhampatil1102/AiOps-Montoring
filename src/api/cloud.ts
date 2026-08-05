import { API_URL } from "./config";
import type { CloudIncident, CloudProviderStatus } from "@/types/application";

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

export async function fetchCloudStatus() {
  return ensureArray<CloudProviderStatus>(await fetchJson(`${API_URL}/cloud/status`, []));
}

export async function fetchCloudIncidents() {
  return ensureArray<CloudIncident>(await fetchJson(`${API_URL}/cloud/incidents`, []));
}
