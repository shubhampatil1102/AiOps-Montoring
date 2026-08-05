/**
 * Application/Cloud correlation — reuses the existing Intelligence
 * Framework (evaluateRules/RecommendationRule), same as
 * rebootIntelligence.ts. Health scoring itself is computed and persisted
 * backend-side (applicationDiscovery.service.ts) because
 * application_health_history needs real server-side history for trend
 * charts — this module only covers the live correlation/recommendation
 * layer, which (like every other Intelligence Service in this app) stays
 * client-side and stateless.
 */
import { evaluateRules, type RecommendationRule } from "@/lib/intelligence/recommendationEngine";
import type { Recommendation } from "@/lib/intelligence/types";
import type { CloudProviderStatusValue } from "@/types/application";

export interface ApplicationContext {
  appName: string;
  isRunning: boolean;
  requiredServiceDown: boolean;
  cloudProviderStatus?: CloudProviderStatusValue;
  cloudIncidentTitle?: string;
}

function hasLocalFailureSignal(ctx: ApplicationContext) {
  return !ctx.isRunning || ctx.requiredServiceDown;
}

function isCloudImpaired(status?: CloudProviderStatusValue) {
  return status === "ADVISORY" || status === "DEGRADED" || status === "MAJOR_OUTAGE";
}

const applicationRules: RecommendationRule<ApplicationContext>[] = [
  {
    id: "app-global-cloud-incident",
    condition: (ctx) => hasLocalFailureSignal(ctx) && isCloudImpaired(ctx.cloudProviderStatus),
    build: (ctx) => {
      const bothSignals = !ctx.isRunning && ctx.requiredServiceDown;
      return {
        title: `Global ${ctx.appName} incident`,
        description: ctx.cloudIncidentTitle
          ? `${ctx.appName} is failing locally while the cloud provider reports: "${ctx.cloudIncidentTitle}".`
          : `${ctx.appName} is failing locally while the mapped cloud provider is reporting a service issue.`,
        reason: "Local failure signal coincides with an active cloud provider incident for the same service.",
        expectedBenefit: "No local troubleshooting needed — this resolves when the provider's incident is resolved.",
        estimatedImpact: "High",
        confidence: bothSignals ? 0.9 : 0.8,
        suggestedAction: "Monitor the provider's status page; no local action recommended.",
        category: "Application",
        severity: "High",
        relatedMetric: "cloud_correlation",
      };
    },
  },
  {
    id: "app-likely-local-issue",
    condition: (ctx) => hasLocalFailureSignal(ctx) && !isCloudImpaired(ctx.cloudProviderStatus),
    build: (ctx) => ({
      title: `${ctx.appName}: likely local device issue`,
      description: `${ctx.appName} is failing locally, but the mapped cloud provider reports no active incident.`,
      reason: "No corresponding cloud incident found — the issue is most likely device-side.",
      expectedBenefit: "Narrows troubleshooting to the device instead of waiting on a provider fix that isn't coming.",
      estimatedImpact: "Medium",
      confidence: 0.65,
      suggestedAction: "Check DNS, firewall/VPN/proxy rules, cached credentials, and the related Windows service.",
      category: "Application",
      severity: "Medium",
      relatedMetric: "local_troubleshooting",
    }),
  },
];

export function evaluateApplicationRecommendations(context: ApplicationContext): Recommendation[] {
  return evaluateRules(applicationRules, context);
}

export function healthLevelVariant(level: string): "success" | "warning" | "danger" | "info" | "default" {
  if (level === "Healthy" || level === "Good") return "success";
  if (level === "Warning") return "warning";
  if (level === "Critical") return "danger";
  return "default";
}

export function cloudStatusVariant(status: CloudProviderStatusValue): "success" | "warning" | "danger" | "info" | "default" {
  if (status === "OPERATIONAL") return "success";
  if (status === "ADVISORY" || status === "MAINTENANCE") return "warning";
  if (status === "DEGRADED" || status === "MAJOR_OUTAGE") return "danger";
  return "default";
}
