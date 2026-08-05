import { CLOUD_PROVIDERS, type CloudProvider } from "../constants/cloudProviders";
import * as cloudRepository from "../repositories/cloudService.repository";
import { Logger } from "./logger.service";

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

interface StatuspageStatusResponse {
  status?: { indicator?: string };
}

interface StatuspageIncident {
  id: string | number;
  name?: string;
  impact?: string;
  components?: Array<{ name?: string }>;
  started_at?: string;
  updated_at?: string;
  resolved_at?: string;
  shortlink?: string;
}

interface StatuspageIncidentsResponse {
  incidents?: StatuspageIncident[];
}

interface SlackIncident {
  id?: string | number;
  name?: string;
  title?: string;
  type?: string;
  date_created?: string;
  url?: string;
}

interface SlackStatusResponse {
  status?: string;
  active_incidents?: SlackIncident[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithRetry<T>(url: string): Promise<T> {
  try {
    return await fetchJson<T>(url);
  } catch {
    return fetchJson<T>(url);
  }
}

function mapStatuspageIndicator(indicator: string | undefined): string {
  switch (indicator) {
    case "none":
      return "OPERATIONAL";
    case "minor":
      return "ADVISORY";
    case "major":
      return "DEGRADED";
    case "critical":
      return "MAJOR_OUTAGE";
    default:
      return "OPERATIONAL";
  }
}

async function pollStatuspageProvider(provider: CloudProvider) {
  const statusPayload = await fetchWithRetry<StatuspageStatusResponse>(provider.statusApiUrl!);
  const status = mapStatuspageIndicator(statusPayload?.status?.indicator);
  await cloudRepository.upsertProviderStatus(provider.id, provider.displayName, status, provider.statusPageUrl);

  if (!provider.incidentsApiUrl) return;

  const incidentsPayload = await fetchWithRetry<StatuspageIncidentsResponse>(provider.incidentsApiUrl);
  const incidents = Array.isArray(incidentsPayload?.incidents) ? incidentsPayload.incidents : [];

  await cloudRepository.replaceProviderIncidents(
    provider.id,
    incidents.map((incident) => ({
      externalId: String(incident.id),
      title: String(incident.name ?? "Untitled incident"),
      severity: incident.impact ?? null,
      affectedServices: Array.isArray(incident.components)
        ? incident.components.map((c) => c.name).join(", ")
        : null,
      startedAt: incident.started_at ? Date.parse(incident.started_at) : null,
      updatedAt: incident.updated_at ? Date.parse(incident.updated_at) : null,
      resolvedAt: incident.resolved_at ? Date.parse(incident.resolved_at) : null,
      statusUrl: incident.shortlink ?? provider.statusPageUrl,
    }))
  );
}

async function pollSlackProvider(provider: CloudProvider) {
  const payload = await fetchWithRetry<SlackStatusResponse>(provider.statusApiUrl!);
  const status = payload?.status === "ok" ? "OPERATIONAL" : "DEGRADED";
  await cloudRepository.upsertProviderStatus(provider.id, provider.displayName, status, provider.statusPageUrl);

  const activeIncidents = Array.isArray(payload?.active_incidents) ? payload.active_incidents : [];
  await cloudRepository.replaceProviderIncidents(
    provider.id,
    activeIncidents.map((incident) => ({
      externalId: String(incident.id ?? incident.name ?? Math.random()),
      title: String(incident.title ?? incident.name ?? "Slack incident"),
      severity: incident.type ?? null,
      affectedServices: null,
      startedAt: incident.date_created ? Date.parse(incident.date_created) : null,
      updatedAt: null,
      resolvedAt: null,
      statusUrl: incident.url ?? provider.statusPageUrl,
    }))
  );
}

async function pollProvider(provider: CloudProvider) {
  try {
    if (provider.apiType === "statuspage") {
      await pollStatuspageProvider(provider);
    } else if (provider.apiType === "slack") {
      await pollSlackProvider(provider);
    } else {
      // No real API available (OAuth-gated or no clean JSON feed) — honest
      // NOT_CONFIGURED status, never fabricated data.
      const existing = await cloudRepository.findProviderStatus(provider.id);
      if (existing.rows.length === 0) {
        await cloudRepository.upsertProviderStatus(provider.id, provider.displayName, "NOT_CONFIGURED", provider.statusPageUrl);
      }
    }
  } catch (err) {
    // Deliberately does not overwrite cloud_services with an error status —
    // leaves the last-known-good value in place and just logs, so a
    // transient network blip doesn't make a provider look like it's down.
    Logger.info(`CLOUD STATUS POLL FAILED (${provider.id}):`, err);
  }
}

export async function pollCloudProviders() {
  for (const provider of CLOUD_PROVIDERS) {
    await pollProvider(provider);
  }
}

export function startCloudStatusPoller() {
  pollCloudProviders().catch((err) => Logger.info("CLOUD STATUS POLLER ERROR:", err));
  setInterval(() => {
    pollCloudProviders().catch((err) => Logger.info("CLOUD STATUS POLLER ERROR:", err));
  }, POLL_INTERVAL_MS);
}

export async function getCloudStatus() {
  const result = await cloudRepository.findAllProviderStatus();
  return result.rows;
}

export async function getCloudIncidents() {
  const result = await cloudRepository.findAllIncidents();
  return result.rows;
}
