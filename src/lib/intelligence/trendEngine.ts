/**
 * Trend Engine — pure statistics over a time series. No domain knowledge:
 * it doesn't know if the series is CPU load, battery health, or anything
 * else. Every Intelligence Service feeds it a normalized
 * TimeSeriesPoint[] (see adapters.ts) and gets the same shape back.
 */
import type { AnomalyPoint, TimeSeriesPoint, TrendDirection, TrendResult } from "./types";

const MS_PER_DAY = 86_400_000;
const FLAT_SLOPE_EPSILON = 0.01;

function sortByTime(points: TimeSeriesPoint[]): TimeSeriesPoint[] {
  return [...points].sort((a, b) => a.time - b.time);
}

/** Least-squares linear regression slope, expressed as value-change per day. */
export function calculateSlope(points: TimeSeriesPoint[]): number {
  if (points.length < 2) return 0;

  const n = points.length;
  const meanX = points.reduce((sum, p) => sum + p.time, 0) / n;
  const meanY = points.reduce((sum, p) => sum + p.value, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (const p of points) {
    numerator += (p.time - meanX) * (p.value - meanY);
    denominator += (p.time - meanX) ** 2;
  }

  if (denominator === 0) return 0;

  const slopePerMs = numerator / denominator;
  return slopePerMs * MS_PER_DAY;
}

/** Simple trailing moving average over the value series. */
export function movingAverage(points: TimeSeriesPoint[], window: number): number[] {
  const values = points.map((p) => p.value);
  const size = Math.max(1, window);

  return values.map((_, index) => {
    const start = Math.max(0, index - size + 1);
    const slice = values.slice(start, index + 1);
    return slice.reduce((sum, v) => sum + v, 0) / slice.length;
  });
}

/** Points whose deviation from the series mean exceeds a stddev threshold. */
export function detectAnomalies(
  points: TimeSeriesPoint[],
  thresholdStdDevs = 2
): AnomalyPoint[] {
  if (points.length < 3) return [];

  const values = points.map((p) => p.value);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);

  if (stddev === 0) return [];

  return points
    .map((p) => ({
      time: p.time,
      value: p.value,
      deviation: (p.value - mean) / stddev,
    }))
    .filter((a) => Math.abs(a.deviation) >= thresholdStdDevs);
}

/** Hours-of-day (0-23) with the highest average value, highest first. */
export function findPeakHours(points: TimeSeriesPoint[], topN = 3): number[] {
  const buckets = new Map<number, { sum: number; count: number }>();

  for (const p of points) {
    const hour = new Date(p.time).getHours();
    const bucket = buckets.get(hour) ?? { sum: 0, count: 0 };
    bucket.sum += p.value;
    bucket.count += 1;
    buckets.set(hour, bucket);
  }

  return Array.from(buckets.entries())
    .map(([hour, b]) => ({ hour, avg: b.sum / b.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, topN)
    .map((b) => b.hour);
}

/** % change between the average of `current` vs the average of `previous`. */
export function compareHistorical(
  current: TimeSeriesPoint[],
  previous: TimeSeriesPoint[]
): number | null {
  if (current.length === 0 || previous.length === 0) return null;

  const avg = (pts: TimeSeriesPoint[]) =>
    pts.reduce((sum, p) => sum + p.value, 0) / pts.length;

  const previousAvg = avg(previous);
  if (previousAvg === 0) return null;

  return ((avg(current) - previousAvg) / previousAvg) * 100;
}

/** Composes the above into one normalized TrendResult. */
export function summarizeTrend(
  points: TimeSeriesPoint[],
  previousPeriod?: TimeSeriesPoint[]
): TrendResult {
  const sorted = sortByTime(points);
  const slopePerDay = calculateSlope(sorted);

  const direction: TrendDirection =
    Math.abs(slopePerDay) < FLAT_SLOPE_EPSILON
      ? "flat"
      : slopePerDay > 0
        ? "up"
        : "down";

  return {
    direction,
    slopePerDay,
    changePercent: previousPeriod ? compareHistorical(sorted, previousPeriod) : null,
    movingAverage: movingAverage(sorted, Math.min(7, sorted.length || 1)),
    peakHours: findPeakHours(sorted),
    anomalies: detectAnomalies(sorted),
    sampleSize: sorted.length,
  };
}
