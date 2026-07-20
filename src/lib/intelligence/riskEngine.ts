/**
 * Risk Engine — combines the Health Score and Prediction Engine outputs
 * into one risk assessment. Deliberately does not interpret trend
 * direction as "good" or "bad" (an upward trend is bad for CPU load but
 * good for battery health) — that judgment is already baked into the
 * health score the caller computed, since a lower score always means
 * "less healthy" regardless of domain.
 */
import type { HealthScore, Prediction, RiskAssessment, RiskSeverity, RiskPriority, TrendResult } from "./types";

const MS_PER_DAY = 86_400_000;

export interface RiskInput {
  healthScore: HealthScore;
  trend: TrendResult;
  prediction: Prediction;
  /** 0-1, how much this domain/device matters to the business. Default 1. */
  businessWeight?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function riskScoreToSeverity(score: number): RiskSeverity {
  if (score >= 80) return "Critical";
  if (score >= 55) return "High";
  if (score >= 30) return "Medium";
  return "Low";
}

function riskScoreToPriority(score: number): RiskPriority {
  if (score >= 80) return "P1";
  if (score >= 55) return "P2";
  if (score >= 30) return "P3";
  return "P4";
}

function severityToBusinessImpact(severity: RiskSeverity): string {
  switch (severity) {
    case "Critical":
      return "Potential service disruption if unaddressed";
    case "High":
      return "Reduced reliability, action recommended soon";
    case "Medium":
      return "Minor degradation, monitor";
    default:
      return "Negligible impact currently";
  }
}

export function calculateRisk(input: RiskInput): RiskAssessment {
  const { healthScore, prediction, businessWeight = 1 } = input;

  let riskScore = clamp((100 - healthScore.score) * businessWeight, 0, 100);

  if (!prediction.insufficientData && prediction.predictedDate) {
    const daysUntil = (prediction.predictedDate - Date.now()) / MS_PER_DAY;
    const imminenceBoost =
      daysUntil <= 7 ? 20 : daysUntil <= 30 ? 10 : daysUntil <= 90 ? 5 : 0;
    riskScore = clamp(riskScore + imminenceBoost * prediction.confidence, 0, 100);
  }

  const severity = riskScoreToSeverity(riskScore);
  const priority = riskScoreToPriority(riskScore);

  const urgency: RiskSeverity =
    !prediction.insufficientData && prediction.predictedDate
      ? riskScoreToSeverity(
          clamp(
            riskScore + (prediction.predictedDate - Date.now() < 7 * MS_PER_DAY ? 15 : 0),
            0,
            100
          )
        )
      : severity;

  const healthConfidence = healthScore.level === "Unknown" ? 0 : 1;
  const confidence =
    Math.round(((healthConfidence + prediction.confidence) / 2) * 100) / 100;

  return {
    riskScore: Math.round(riskScore),
    priority,
    severity,
    businessImpact: severityToBusinessImpact(severity),
    urgency,
    confidence,
  };
}
