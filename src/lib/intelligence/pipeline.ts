/**
 * Pipeline — the framework's single entry point. Every Intelligence
 * Service calls `runIntelligencePipeline` with its own data (via
 * adapters.ts) and configuration; gets back one normalized
 * IntelligenceResult. This is the only place the 8 engines are wired
 * together, so the "Raw Metrics -> ... -> Automation Opportunity" order
 * is enforced in exactly one place.
 */
import { summarizeTrend } from "./trendEngine";
import { calculateHealthScore, type HealthLevelThresholds, type WeightedComponent } from "./healthScoreEngine";
import { predictThresholdCrossing, type PredictionOptions } from "./predictionEngine";
import { calculateRisk } from "./riskEngine";
import { evaluateRules, highestSeverityFirst, type RecommendationRule } from "./recommendationEngine";
import { matchAutomationOpportunity, type AutomationCatalogEntry } from "./automationOpportunityEngine";
import type {
  AutomationSuggestion,
  Insight,
  IntelligenceResult,
  Prediction,
  TimeSeriesPoint,
} from "./types";

export interface IntelligencePipelineConfig<TContext = unknown> {
  domain: string;
  /** Primary metric history, used for trend + prediction. */
  series: TimeSeriesPoint[];
  previousPeriodSeries?: TimeSeriesPoint[];
  healthComponents: WeightedComponent[];
  healthThresholds?: HealthLevelThresholds;
  predictionThreshold?: { value: number; direction: "above" | "below" };
  predictionOptions?: PredictionOptions;
  /** 0-1, how much this domain matters to the business. Default 1. */
  businessWeight?: number;
  recommendationRules?: RecommendationRule<TContext>[];
  recommendationContext?: TContext;
  automationCategory?: string;
  automationCatalog?: AutomationCatalogEntry[];
  /** Pre-built via insightGenerator.ts; nulls are dropped. */
  insights?: (Insight | null)[];
}

export function runIntelligencePipeline<TContext = unknown>(
  config: IntelligencePipelineConfig<TContext>
): IntelligenceResult {
  const trend = summarizeTrend(config.series, config.previousPeriodSeries);
  const healthScore = calculateHealthScore(config.healthComponents, config.healthThresholds);

  const prediction: Prediction = config.predictionThreshold
    ? predictThresholdCrossing(
        config.series,
        config.predictionThreshold.value,
        config.predictionThreshold.direction,
        { ...config.predictionOptions, metric: config.predictionOptions?.metric ?? config.domain }
      )
    : {
        metric: config.domain,
        insufficientData: true,
        predictedDate: null,
        confidence: 0,
        reason: "No prediction threshold configured for this domain.",
      };

  const risk = calculateRisk({
    healthScore,
    trend,
    prediction,
    businessWeight: config.businessWeight,
  });

  const recommendations =
    config.recommendationRules && config.recommendationContext !== undefined
      ? highestSeverityFirst(
          evaluateRules(config.recommendationRules, config.recommendationContext)
        )
      : [];

  const insights = (config.insights ?? []).filter((i): i is Insight => i !== null);

  const automationOpportunities: AutomationSuggestion[] = config.automationCategory
    ? [matchAutomationOpportunity(config.automationCategory, config.automationCatalog)].filter(
        (s): s is AutomationSuggestion => s !== null
      )
    : [];

  return {
    domain: config.domain,
    healthScore,
    trend,
    prediction,
    risk,
    recommendations,
    insights,
    automationOpportunities,
  };
}
