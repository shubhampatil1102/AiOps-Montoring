import { API_URL } from "./config";
import type {
  HealSuggestion,
  HealTimelineEntry,
  RunScriptPayload,
  ScriptJob,
  ScriptLibraryItem,
} from "@/types/autoHeal";

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

export async function fetchHealSuggestions() {
  return ensureArray<HealSuggestion>(
    await fetchJson(`${API_URL}/heal/suggestions`, [])
  );
}

export async function approveHealSuggestion(id: number) {
  return fetchJson<{ ok: boolean }>(
    `${API_URL}/heal/approve/${id}`,
    { ok: true },
    { method: "POST" }
  );
}

export async function rejectHealSuggestion(id: number) {
  return fetchJson<{ ok: boolean }>(
    `${API_URL}/heal/reject/${id}`,
    { ok: true },
    { method: "POST" }
  );
}

export async function fetchHealTimeline() {
  return ensureArray<HealTimelineEntry>(
    await fetchJson(`${API_URL}/heal/timeline`, [])
  );
}

export async function fetchScriptJobs() {
  return ensureArray<ScriptJob>(
    await fetchJson(`${API_URL}/scripts/jobs`, [])
  );
}

export async function fetchScriptLibrary() {
  return ensureArray<ScriptLibraryItem>(
    await fetchJson(`${API_URL}/scripts/library`, [])
  );
}

export async function runAutoHealScript({ deviceId, script }: RunScriptPayload) {
  return fetchJson<{ job_id: number }>(
    `${API_URL}/scripts/run`,
    { job_id: 0 },
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_id: deviceId,
        script,
      }),
    }
  );
}
