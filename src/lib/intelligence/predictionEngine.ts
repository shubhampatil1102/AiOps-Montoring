/**
 * Prediction Engine — generic threshold-crossing forecasting via linear
 * regression. This module has zero knowledge of what the series represents
 * (battery %, disk %, CPU %, days-until-certificate-expiry — all the same
 * math). It is deliberately conservative: below a minimum sample size or
 * time span, or when the trend isn't moving toward the threshold, it
 * returns `insufficientData: true` / a null predicted date rather than
 * inventing a number. See examples/batteryIntelligenceExample.ts for what
 * this looks like fed real (sparse) vs real (rich) data.
 */
import { calculateSlope } from "./trendEngine";
import { calculateConfidence } from "./confidenceCalculator";
import type { Prediction, TimeSeriesPoint } from "./types";

const MS_PER_DAY = 86_400_000;
const DEFAULT_MIN_SAMPLES = 5;
const DEFAULT_MIN_SPAN_MS = 60 * 60 * 1000;

export interface PredictionOptions {
  minSamples?: number;
  minSpanMs?: number;
  metric?: string;
}

function linearFit(points: TimeSeriesPoint[]) {
  const slopePerDay = calculateSlope(points);
  const slopePerMs = slopePerDay / MS_PER_DAY;

  const n = points.length;
  const meanX = points.reduce((sum, p) => sum + p.time, 0) / n;
  const meanY = points.reduce((sum, p) => sum + p.value, 0) / n;
  const intercept = meanY - slopePerMs * meanX;

  const ssTot = points.reduce((sum, p) => sum + (p.value - meanY) ** 2, 0);
  const ssRes = points.reduce((sum, p) => {
    const predicted = intercept + slopePerMs * p.time;
    return sum + (p.value - predicted) ** 2;
  }, 0);

  const rSquared = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  return { slopePerDay, slopePerMs, intercept, rSquared };
}

function insufficientResult(metric: string, reason: string): Prediction {
  return {
    metric,
    insufficientData: true,
    predictedDate: null,
    confidence: 0,
    reason,
  };
}

export interface HorizonProjection {
  days: number;
  projectedValue: number | null;
  insufficientData: boolean;
  reason: string;
}

/** Projects the metric's value N days from now via the same linear trend
 * `predictThresholdCrossing` uses — domain-agnostic (any metric, any
 * horizon), honest below the same minimum sample/span this module already
 * enforces. Does not clamp the result; callers with a bounded domain
 * (e.g. a 0-100 percentage) clamp for display. */
export function projectValueAtHorizon(
  series: TimeSeriesPoint[],
  horizonDays: number,
  options: PredictionOptions = {}
): HorizonProjection {
  const minSamples = options.minSamples ?? DEFAULT_MIN_SAMPLES;
  const minSpanMs = options.minSpanMs ?? DEFAULT_MIN_SPAN_MS;
  const sorted = [...series].sort((a, b) => a.time - b.time);

  if (sorted.length < minSamples) {
    return {
      days: horizonDays,
      projectedValue: null,
      insufficientData: true,
      reason: `Not enough historical data points (${sorted.length}/${minSamples} minimum) to build a reliable trend.`,
    };
  }

  const span = sorted[sorted.length - 1].time - sorted[0].time;
  if (span < minSpanMs) {
    return {
      days: horizonDays,
      projectedValue: null,
      insufficientData: true,
      reason: "Historical data doesn't yet span enough time to extrapolate a trend.",
    };
  }

  const slopePerDay = calculateSlope(sorted);
  const lastPoint = sorted[sorted.length - 1];
  const projectedValue = lastPoint.value + slopePerDay * horizonDays;

  return {
    days: horizonDays,
    projectedValue,
    insufficientData: false,
    reason: `Projected from a ${slopePerDay >= 0 ? "+" : ""}${slopePerDay.toFixed(2)}/day trend over ${sorted.length} data points.`,
  };
}

export function predictThresholdCrossing(
  series: TimeSeriesPoint[],
  threshold: number,
  direction: "above" | "below",
  options: PredictionOptions = {}
): Prediction {
  const metric = options.metric ?? "value";
  const minSamples = options.minSamples ?? DEFAULT_MIN_SAMPLES;
  const minSpanMs = options.minSpanMs ?? DEFAULT_MIN_SPAN_MS;

  const sorted = [...series].sort((a, b) => a.time - b.time);

  if (sorted.length < minSamples) {
    return insufficientResult(
      metric,
      `Not enough historical data points (${sorted.length}/${minSamples} minimum) to build a reliable trend.`
    );
  }

  const span = sorted[sorted.length - 1].time - sorted[0].time;
  if (span < minSpanMs) {
    return insufficientResult(
      metric,
      "Historical data doesn't yet span enough time to extrapolate a trend."
    );
  }

  const { slopePerDay, slopePerMs, intercept, rSquared } = linearFit(sorted);
  const lastPoint = sorted[sorted.length - 1];

  const movingTowardThreshold =
    (direction === "above" && slopePerDay > 0) ||
    (direction === "below" && slopePerDay < 0);

  const confidence = calculateConfidence({
    sampleSize: sorted.length,
    dataRecencyMs: Math.max(0, Date.now() - lastPoint.time),
    varianceStability: rSquared,
  });

  if (!movingTowardThreshold || slopePerMs === 0) {
    return {
      metric,
      insufficientData: false,
      predictedDate: null,
      confidence,
      reason: `Current trend is not moving toward the ${direction} ${threshold} threshold.`,
      slopePerDay,
    };
  }

  const crossingTime = (threshold - intercept) / slopePerMs;

  if (!Number.isFinite(crossingTime) || crossingTime <= lastPoint.time) {
    return {
      metric,
      insufficientData: false,
      predictedDate: null,
      confidence,
      reason: "Unable to project a future crossing date from the current trend.",
      slopePerDay,
    };
  }

  return {
    metric,
    insufficientData: false,
    predictedDate: crossingTime,
    confidence,
    reason: `Based on a ${slopePerDay >= 0 ? "+" : ""}${slopePerDay.toFixed(2)}/day trend over ${sorted.length} data points.`,
    slopePerDay,
  };
}
