/**
 * Confidence Calculator — one shared way to turn "how much do we trust this
 * number" into a 0-1 score, used by both the Prediction Engine and the
 * Recommendation Engine so confidence isn't computed a different way in
 * every service.
 */

export interface ConfidenceInput {
  /** Number of data points backing the calculation. */
  sampleSize: number;
  /** Age of the most recent data point, in ms. Older data lowers confidence. */
  dataRecencyMs?: number;
  /** 0-1 goodness-of-fit / stability signal (e.g. R^2 of a trend line). */
  varianceStability?: number;
}

const MIN_USEFUL_SAMPLES = 5;
const SATURATION_SAMPLES = 20;
const MAX_USEFUL_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Below MIN_USEFUL_SAMPLES this returns 0 — there simply isn't enough data
 * to be confident about anything, regardless of how "stable" it looks.
 */
export function calculateConfidence(input: ConfidenceInput): number {
  const { sampleSize, dataRecencyMs = 0, varianceStability = 1 } = input;

  if (sampleSize < MIN_USEFUL_SAMPLES) return 0;

  const sampleScore = Math.min(
    1,
    (sampleSize - MIN_USEFUL_SAMPLES) / (SATURATION_SAMPLES - MIN_USEFUL_SAMPLES)
  );
  const recencyScore = Math.max(0, 1 - dataRecencyMs / MAX_USEFUL_AGE_MS);
  const stabilityScore = Math.max(0, Math.min(1, varianceStability));

  const combined = sampleScore * 0.4 + recencyScore * 0.2 + stabilityScore * 0.4;
  return Math.round(combined * 100) / 100;
}

export type ConfidenceLevel = "Low" | "Medium" | "High";

export function confidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.7) return "High";
  if (confidence >= 0.4) return "Medium";
  return "Low";
}
