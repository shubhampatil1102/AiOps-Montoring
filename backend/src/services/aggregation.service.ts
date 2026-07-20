import { query } from "../repositories/db.repository";
import * as analyticsRepository from "../repositories/metricsAnalytics.repository";
import { Logger } from "./logger.service";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MIN_BASELINE_SAMPLES = 10;
const ANOMALY_Z_THRESHOLD = 3;

function bucketStartFor(ts: number, sizeMs: number) {
  return Math.floor(ts / sizeMs) * sizeMs;
}

/** Fully rescans one bounded hour bucket and upserts its aggregate — bounded
 * and idempotent, safe to repeat every cycle (never scans full history). */
async function rescanHourBucket(deviceId: string, metricName: string, bucketStart: number, legacy: boolean) {
  const bucketEnd = bucketStart + HOUR_MS;
  const result = legacy
    ? await analyticsRepository.findLegacyHistoryInRange(deviceId, metricName as "cpu" | "ram", bucketStart, bucketEnd)
    : await analyticsRepository.findMetricSamplesInRange(deviceId, metricName, bucketStart, bucketEnd);

  const values = result.rows.map((r: { value: string | number }) => Number(r.value));
  if (values.length === 0) return;

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  await analyticsRepository.upsertHourAggregate(
    deviceId,
    metricName,
    bucketStart,
    avg,
    Math.min(...values),
    Math.max(...values),
    values.length
  );
}

async function rollUpHourAggregates() {
  const now = Date.now();
  const currentHourStart = bucketStartFor(now, HOUR_MS);
  const previousHourStart = currentHourStart - HOUR_MS;

  const [samplePairs, legacyDevices] = await Promise.all([
    analyticsRepository.findDistinctSampleDevicesAndMetrics(previousHourStart),
    analyticsRepository.findDistinctLegacyDevices(previousHourStart),
  ]);

  const tasks: Promise<void>[] = [];

  for (const row of samplePairs.rows) {
    tasks.push(rescanHourBucket(row.device_id, row.metric_name, currentHourStart, false));
    tasks.push(rescanHourBucket(row.device_id, row.metric_name, previousHourStart, false));
  }

  for (const row of legacyDevices.rows) {
    for (const metricName of ["cpu", "ram"] as const) {
      tasks.push(rescanHourBucket(row.device_id, metricName, currentHourStart, true));
      tasks.push(rescanHourBucket(row.device_id, metricName, previousHourStart, true));
    }
  }

  await Promise.all(tasks);
}

async function rollUpDayAggregates() {
  const now = Date.now();
  const dayStart = bucketStartFor(now, DAY_MS);
  const previousDayStart = dayStart - DAY_MS;

  const [samplePairs, legacyDevices] = await Promise.all([
    analyticsRepository.findDistinctSampleDevicesAndMetrics(previousDayStart),
    analyticsRepository.findDistinctLegacyDevices(previousDayStart),
  ]);

  const tasks: Promise<void>[] = [];

  for (const row of samplePairs.rows) {
    tasks.push(analyticsRepository.upsertDayAggregateFromHours(row.device_id, row.metric_name, previousDayStart, dayStart));
  }

  for (const row of legacyDevices.rows) {
    for (const metricName of ["cpu", "ram"]) {
      tasks.push(analyticsRepository.upsertDayAggregateFromHours(row.device_id, metricName, previousDayStart, dayStart));
    }
  }

  await Promise.all(tasks);
}

interface BaselineState {
  mean: number;
  stddev: number;
  count: number;
}

/** Welford's online algorithm — updates mean/stddev incrementally without
 * re-reading the full sample history on every cycle. */
function updateBaseline(previous: BaselineState | null, newValues: number[]): BaselineState {
  let mean = previous?.mean ?? 0;
  let count = previous?.count ?? 0;
  let m2 = previous ? previous.stddev ** 2 * Math.max(count - 1, 0) : 0;

  for (const value of newValues) {
    count += 1;
    const delta = value - mean;
    mean += delta / count;
    m2 += delta * (value - mean);
  }

  return { mean, stddev: count > 1 ? Math.sqrt(m2 / (count - 1)) : 0, count };
}

/** Processes only samples since the last run (tracked via analytics_cursor)
 * so baselines are never double-counted, then flags strong outliers. */
async function updateBaselinesAndDetectAnomalies() {
  const now = Date.now();
  const cursorResult = await analyticsRepository.getBaselineCursor();
  const windowStart = cursorResult.rows[0]?.last_baseline_at
    ? Number(cursorResult.rows[0].last_baseline_at)
    : now - 5 * 60 * 1000;

  const [samplePairs, legacyDevices] = await Promise.all([
    analyticsRepository.findDistinctSampleDevicesAndMetrics(windowStart),
    analyticsRepository.findDistinctLegacyDevices(windowStart),
  ]);

  const pairs: { deviceId: string; metricName: string; legacy: boolean }[] = [];
  for (const row of samplePairs.rows) pairs.push({ deviceId: row.device_id, metricName: row.metric_name, legacy: false });
  for (const row of legacyDevices.rows) {
    pairs.push({ deviceId: row.device_id, metricName: "cpu", legacy: true });
    pairs.push({ deviceId: row.device_id, metricName: "ram", legacy: true });
  }

  for (const pair of pairs) {
    const result = pair.legacy
      ? await analyticsRepository.findLegacyHistoryInRange(pair.deviceId, pair.metricName as "cpu" | "ram", windowStart, now)
      : await analyticsRepository.findMetricSamplesInRange(pair.deviceId, pair.metricName, windowStart, now);

    const values = result.rows.map((r: { value: string | number }) => Number(r.value));
    if (values.length === 0) continue;

    const baselineResult = await analyticsRepository.getBaseline(pair.deviceId, pair.metricName);
    const existing: BaselineState | null = baselineResult.rows[0]
      ? {
          mean: Number(baselineResult.rows[0].mean_value),
          stddev: Number(baselineResult.rows[0].stddev_value),
          count: Number(baselineResult.rows[0].sample_count),
        }
      : null;

    // Compare against the PRE-update baseline so an anomalous point doesn't mask itself.
    if (existing && existing.count >= MIN_BASELINE_SAMPLES && existing.stddev > 0) {
      const latestValue = values[values.length - 1];
      const zScore = (latestValue - existing.mean) / existing.stddev;

      if (Math.abs(zScore) > ANOMALY_Z_THRESHOLD) {
        await analyticsRepository.insertAnomaly(pair.deviceId, pair.metricName, latestValue, existing.mean, zScore, now);
        await query(
          "INSERT INTO alerts(id,message,time,acknowledged,resolved) VALUES ($1,$2,$3,false,false)",
          [
            pair.deviceId,
            `Anomalous ${pair.metricName}: ${latestValue.toFixed(2)} (baseline ${existing.mean.toFixed(2)} ± ${existing.stddev.toFixed(2)})`,
            now,
          ]
        );
      }
    }

    const updated = updateBaseline(existing, values);
    await analyticsRepository.upsertBaseline(pair.deviceId, pair.metricName, updated.mean, updated.stddev, updated.count, now);
  }

  await analyticsRepository.setBaselineCursor(now);
}

export async function runAggregationCycle() {
  try {
    await rollUpHourAggregates();
    await updateBaselinesAndDetectAnomalies();
  } catch (err) {
    Logger.info("AGGREGATION CYCLE ERROR:", err);
  }
}

export async function runDailyRollup() {
  try {
    await rollUpDayAggregates();
  } catch (err) {
    Logger.info("DAILY ROLLUP ERROR:", err);
  }
}

export function startAggregationJobs() {
  setInterval(runAggregationCycle, 5 * 60 * 1000);
  setInterval(runDailyRollup, 24 * 60 * 60 * 1000);
}
