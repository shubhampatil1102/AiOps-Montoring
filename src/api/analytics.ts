import { API_URL } from "./config";

export interface AnalyticsMetricDefinition {
  metric_name: string;
  unit: string | null;
  aggregation_type: string;
  description: string | null;
}

export interface AnalyticsHistoryPoint {
  value: number;
  collected_at: number;
}

export interface AnalyticsAggregatePoint {
  bucket_start: number;
  avg_value: number | null;
  min_value: number | null;
  max_value: number | null;
  sample_count: number;
}

export interface AnalyticsBaseline {
  mean_value: number;
  stddev_value: number;
  sample_count: number;
  updated_at: number | null;
}

export interface AnalyticsAnomaly {
  value: number;
  baseline_mean: number | null;
  z_score: number | null;
  detected_at: number;
}

export interface AnalyticsTrend {
  currentAvg: number | null;
  previousAvg: number | null;
  changePercent: number | null;
}

export type AnalyticsGranularity = "hour" | "day" | "week" | "month" | "year";
export type AnalyticsRange = "1h" | "1d" | "1w" | "1m" | "1y";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);

  if (!response.ok) {
    throw new Error(`Analytics request failed: ${path}`);
  }

  return response.json();
}

export function fetchMetricDefinitions() {
  return getJson<AnalyticsMetricDefinition[]>("/analytics/metrics/definitions");
}

export function fetchMetricHistory(deviceId: string, metric: string, range: AnalyticsRange = "1h") {
  return getJson<AnalyticsHistoryPoint[]>(
    `/analytics/devices/${encodeURIComponent(deviceId)}/metrics/${encodeURIComponent(metric)}/history?range=${range}`
  );
}

export function fetchMetricAggregate(
  deviceId: string,
  metric: string,
  granularity: AnalyticsGranularity = "hour",
  range: AnalyticsRange = "1d"
) {
  return getJson<AnalyticsAggregatePoint[]>(
    `/analytics/devices/${encodeURIComponent(deviceId)}/metrics/${encodeURIComponent(metric)}/aggregate?granularity=${granularity}&range=${range}`
  );
}

export function fetchMetricBaseline(deviceId: string, metric: string) {
  return getJson<AnalyticsBaseline | null>(
    `/analytics/devices/${encodeURIComponent(deviceId)}/metrics/${encodeURIComponent(metric)}/baseline`
  );
}

export function fetchMetricAnomalies(deviceId: string, metric: string, range: AnalyticsRange = "1d") {
  return getJson<AnalyticsAnomaly[]>(
    `/analytics/devices/${encodeURIComponent(deviceId)}/metrics/${encodeURIComponent(metric)}/anomalies?range=${range}`
  );
}

export function fetchMetricTrend(deviceId: string, metric: string, period: "week" | "month" = "week") {
  return getJson<AnalyticsTrend>(
    `/analytics/devices/${encodeURIComponent(deviceId)}/metrics/${encodeURIComponent(metric)}/trend?period=${period}`
  );
}
