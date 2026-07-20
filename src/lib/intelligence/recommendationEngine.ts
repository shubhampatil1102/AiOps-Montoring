/**
 * Recommendation Engine — a normalizer plus a small generic rule evaluator.
 * The engine has no domain rules of its own; each Intelligence Service
 * supplies its own `RecommendationRule[]` (condition + builder), and this
 * module guarantees every recommendation that comes out has the same shape.
 */
import type { Recommendation, RiskSeverity } from "./types";

export type RecommendationInput = Recommendation;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function buildRecommendation(input: RecommendationInput): Recommendation {
  return { ...input, confidence: clamp(input.confidence, 0, 1) };
}

export interface RecommendationRule<TContext> {
  id: string;
  condition: (context: TContext) => boolean;
  build: (context: TContext) => RecommendationInput;
}

export function evaluateRules<TContext>(
  rules: RecommendationRule<TContext>[],
  context: TContext
): Recommendation[] {
  return rules
    .filter((rule) => rule.condition(context))
    .map((rule) => buildRecommendation(rule.build(context)));
}

export function highestSeverityFirst(recommendations: Recommendation[]): Recommendation[] {
  const order: Record<RiskSeverity, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  return [...recommendations].sort((a, b) => order[a.severity] - order[b.severity]);
}
