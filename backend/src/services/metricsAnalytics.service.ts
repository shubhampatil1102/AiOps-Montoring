import * as analyticsRepository from "../repositories/metricsAnalytics.repository";

const LEGACY_METRICS = new Set(["cpu", "ram"]);

export function parseRangeToSince(range: unknown, now = Date.now()): number {
  let durationSeconds = 3600;
  if (range === "1d") durationSeconds = 86400;
  if (range === "1w") durationSeconds = 604800;
  if (range === "1m") durationSeconds = 2592000;
  if (range === "1y") durationSeconds = 31536000;

  return now - durationSeconds * 1000;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

interface MetricsIngestPayload {
  hardware?: {
    disk?: unknown;
    disk_free?: unknown;
    cpu_temp?: unknown;
    battery_health_percent?: unknown;
  };
  boot_time?: unknown;
  updates?: {
    pending_updates?: unknown;
    failed_updates?: unknown;
  };
}

/** Extracts the metrics already present in today's POST /metrics payload that
 * have no history table of their own, and records them as generic samples.
 * cpu/ram are intentionally excluded — they remain solely in metrics_history. */
export async function recordMetricSamples(deviceId: string, body: MetricsIngestPayload, now: number) {
  const rows: { deviceId: string; metricName: string; value: number; collectedAt: number }[] = [];

  const push = (metricName: string, value: unknown) => {
    if (value === undefined || value === null || Number.isNaN(Number(value))) return;
    rows.push({ deviceId, metricName, value: Number(value), collectedAt: now });
  };

  if (body.hardware) {
    push("disk", body.hardware.disk);
    push("disk_free", body.hardware.disk_free);
    push("cpu_temp", body.hardware.cpu_temp);
    push("battery_health_percent", body.hardware.battery_health_percent);
  }

  if (body.boot_time) {
    push("uptime_seconds", Math.max(0, Math.floor((now - Number(body.boot_time)) / 1000)));
  }

  if (body.updates) {
    push("pending_updates", body.updates.pending_updates);
    push("failed_updates", body.updates.failed_updates);
  }

  await analyticsRepository.insertMetricSamples(rows);
}

export async function getMetricDefinitions() {
  const result = await analyticsRepository.findMetricDefinitions();
  return result.rows;
}

export async function getMetricHistory(deviceId: string, metricName: string, since: number) {
  const result = LEGACY_METRICS.has(metricName)
    ? await analyticsRepository.findLegacyMetricHistory(deviceId, metricName as "cpu" | "ram", since)
    : await analyticsRepository.findMetricSamplesSince(deviceId, metricName, since);

  return result.rows.map((r) => ({ value: Number(r.value), collected_at: Number(r.collected_at) }));
}

export async function getMetricAggregate(
  deviceId: string,
  metricName: string,
  granularity: "hour" | "day" | "week" | "month" | "year",
  since: number
) {
  if (granularity === "hour" || granularity === "day") {
    const result = await analyticsRepository.findAggregates(deviceId, metricName, granularity, since);
    return result.rows.map(mapAggregateRow);
  }

  const bucketMs = granularity === "week" ? WEEK_MS : granularity === "month" ? MONTH_MS : YEAR_MS;
  const result = await analyticsRepository.findDayAggregatesGroupedByPeriod(deviceId, metricName, since, bucketMs);
  return result.rows.map(mapAggregateRow);
}

interface AggregateRow {
  bucket_start: string | number;
  avg_value: string | number | null;
  min_value: string | number | null;
  max_value: string | number | null;
  sample_count: string | number;
}

function mapAggregateRow(r: AggregateRow) {
  return {
    bucket_start: Number(r.bucket_start),
    avg_value: r.avg_value === null ? null : Number(r.avg_value),
    min_value: r.min_value === null ? null : Number(r.min_value),
    max_value: r.max_value === null ? null : Number(r.max_value),
    sample_count: Number(r.sample_count),
  };
}

export async function getMetricBaseline(deviceId: string, metricName: string) {
  const result = await analyticsRepository.getBaseline(deviceId, metricName);
  const row = result.rows[0];
  if (!row) return null;

  return {
    mean_value: Number(row.mean_value),
    stddev_value: Number(row.stddev_value),
    sample_count: Number(row.sample_count),
    updated_at: row.updated_at === null ? null : Number(row.updated_at),
  };
}

export async function getMetricAnomalies(deviceId: string, metricName: string, since: number) {
  const result = await analyticsRepository.findAnomalies(deviceId, metricName, since);
  return result.rows.map((r) => ({
    value: Number(r.value),
    baseline_mean: r.baseline_mean === null ? null : Number(r.baseline_mean),
    z_score: r.z_score === null ? null : Number(r.z_score),
    detected_at: Number(r.detected_at),
  }));
}

export async function getMetricTrend(
  deviceId: string,
  metricName: string,
  period: "week" | "month",
  now = Date.now()
) {
  const periodMs = period === "week" ? WEEK_MS : MONTH_MS;

  const [current, previous] = await Promise.all([
    analyticsRepository.findAverageInRange(deviceId, metricName, "day", now - periodMs, now),
    analyticsRepository.findAverageInRange(deviceId, metricName, "day", now - 2 * periodMs, now - periodMs),
  ]);

  const currentAvg = current.rows[0]?.avg_value === null || current.rows[0]?.avg_value === undefined
    ? null
    : Number(current.rows[0].avg_value);
  const previousAvg = previous.rows[0]?.avg_value === null || previous.rows[0]?.avg_value === undefined
    ? null
    : Number(previous.rows[0].avg_value);

  const changePercent =
    currentAvg !== null && previousAvg !== null && previousAvg !== 0
      ? Number((((currentAvg - previousAvg) / previousAvg) * 100).toFixed(2))
      : null;

  return { currentAvg, previousAvg, changePercent };
}
