import { API_URL } from "./config";

export interface AlertPolicy {
  cpu_threshold: number;
  ram_threshold: number;
  offline_seconds: number;
}

const DEFAULT_POLICY: AlertPolicy = {
  cpu_threshold: 80,
  ram_threshold: 85,
  offline_seconds: 20,
};

async function fetchJson<T>(url: string, fallback: T, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const data = await response.json();
  return (data ?? fallback) as T;
}

export async function fetchAlertPolicy() {
  return fetchJson<AlertPolicy>(`${API_URL}/policies`, DEFAULT_POLICY);
}

export async function saveAlertPolicy(policy: AlertPolicy) {
  return fetchJson<AlertPolicy>(`${API_URL}/policies`, policy, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(policy),
  });
}
