/**
 * Health Score Engine — one configurable weighted-average scorer used by
 * every Intelligence Service. Each caller supplies its own components
 * (already normalized to a 0-100 "healthiness" scale, 100 = perfectly
 * healthy) and weights; this engine does the combining and level bucketing.
 *
 * This generalizes the score formula originally written inline in
 * OrgHealthCard (bucket-count based) and in Dashboard's Performance/
 * Battery/Storage calculations (metric-value based) — both are the same
 * shape: a weighted average of {value, weight} pairs.
 */
import type { HealthLevel, HealthScore } from "./types";

export interface WeightedComponent {
  label: string;
  value: number;
  weight: number;
}

export interface HealthLevelThresholds {
  healthy: number;
  good: number;
  warning: number;
}

export const DEFAULT_HEALTH_THRESHOLDS: HealthLevelThresholds = {
  healthy: 85,
  good: 65,
  warning: 40,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function scoreToLevel(
  score: number,
  thresholds: HealthLevelThresholds = DEFAULT_HEALTH_THRESHOLDS
): HealthLevel {
  if (Number.isNaN(score)) return "Unknown";
  if (score >= thresholds.healthy) return "Healthy";
  if (score >= thresholds.good) return "Good";
  if (score >= thresholds.warning) return "Warning";
  return "Critical";
}

export function calculateHealthScore(
  components: WeightedComponent[],
  thresholds?: HealthLevelThresholds
): HealthScore {
  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);

  const rawScore =
    totalWeight > 0
      ? components.reduce((sum, c) => sum + c.value * c.weight, 0) / totalWeight
      : NaN;

  const score = Number.isNaN(rawScore) ? 0 : clamp(rawScore, 0, 100);
  const breakdown = Object.fromEntries(components.map((c) => [c.label, c.value]));

  return {
    score,
    level: Number.isNaN(rawScore) ? "Unknown" : scoreToLevel(score, thresholds),
    breakdown,
  };
}

/**
 * Convenience wrapper matching a plain metrics/weights record shape —
 * equivalent to calculateHealthScore, for callers that already have their
 * data as two parallel Records rather than a component array.
 */
export function calculateHealthScoreFromMetrics(
  metrics: Record<string, number>,
  weights: Record<string, number>,
  thresholds?: HealthLevelThresholds
): HealthScore {
  const components: WeightedComponent[] = Object.keys(metrics).map((key) => ({
    label: key,
    value: metrics[key],
    weight: weights[key] ?? 1,
  }));

  return calculateHealthScore(components, thresholds);
}
