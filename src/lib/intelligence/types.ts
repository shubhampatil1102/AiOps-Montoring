/**
 * Shared data model for the Intelligence Framework.
 * Every Intelligence Service (Battery, Storage, Performance, Security,
 * Network, Asset, Update, ...) consumes these same shapes. Nothing in this
 * file knows about any specific domain.
 */

export interface TimeSeriesPoint {
  time: number;
  value: number;
}

export type TrendDirection = "up" | "down" | "flat";

export interface AnomalyPoint {
  time: number;
  value: number;
  deviation: number;
}

export interface TrendResult {
  direction: TrendDirection;
  slopePerDay: number;
  changePercent: number | null;
  movingAverage: number[];
  peakHours: number[];
  anomalies: AnomalyPoint[];
  sampleSize: number;
}

export type HealthLevel = "Healthy" | "Good" | "Warning" | "Critical" | "Unknown";

export interface HealthScore {
  score: number;
  level: HealthLevel;
  breakdown: Record<string, number>;
}

export interface Prediction {
  metric: string;
  insufficientData: boolean;
  predictedDate: number | null;
  confidence: number;
  reason: string;
  slopePerDay?: number;
}

export type RiskSeverity = "Low" | "Medium" | "High" | "Critical";
export type RiskPriority = "P1" | "P2" | "P3" | "P4";

export interface RiskAssessment {
  riskScore: number;
  priority: RiskPriority;
  severity: RiskSeverity;
  businessImpact: string;
  urgency: RiskSeverity;
  confidence: number;
}

export interface Recommendation {
  title: string;
  description: string;
  reason: string;
  expectedBenefit: string;
  estimatedImpact: RiskSeverity;
  confidence: number;
  suggestedAction: string;
  category: string;
  severity: RiskSeverity;
  relatedMetric: string;
}

export interface Insight {
  id: string;
  message: string;
  severity: RiskSeverity;
  metric: string;
  changeValue?: number;
  changeDirection?: TrendDirection;
}

export interface AutomationSuggestion {
  title: string;
  description: string;
  actionType:
    | "restart-service"
    | "clean-temp-files"
    | "install-updates"
    | "notify-admin"
    | "run-script"
    | "schedule-maintenance";
  confidence: number;
  riskLevel: RiskSeverity;
}

export interface IntelligenceResult {
  domain: string;
  healthScore: HealthScore;
  trend: TrendResult;
  prediction: Prediction;
  risk: RiskAssessment;
  recommendations: Recommendation[];
  insights: Insight[];
  automationOpportunities: AutomationSuggestion[];
}
