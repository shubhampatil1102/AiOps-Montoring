/**
 * Reboot Intelligence — plugs into the existing Intelligence Framework
 * rather than building a parallel one. Health scoring reuses
 * WeightedComponent/calculateHealthScore; recommendations reuse
 * RecommendationRule/evaluateRules. Confidence values match the existing
 * house convention (rounded 0.6-0.9, never fabricated decimal precision).
 */
import { evaluateRules, type RecommendationRule } from "@/lib/intelligence/recommendationEngine";
import type { Recommendation } from "@/lib/intelligence/types";

export interface RebootContext {
  daysSinceRestart: number;
  maxUptimeDays: number;
  registryRebootPending: boolean;
  windowsUpdatePending: boolean;
  deviceClass: string;
}

/** The brief's additive-penalty table, expressed as a 0-100 "healthiness"
 * value (100 = perfectly healthy) so it can plug into
 * buildOverallHealthComponents() like every other category. Buckets are
 * fixed (7/14/30 days) regardless of device class — the per-class policy
 * threshold governs the *recommendation*, not this score. */
export function calculateRebootHealthValue(
  daysSinceRestart: number,
  registryRebootPending: boolean,
  windowsUpdatePending: boolean
): number {
  let value = 100;

  if (daysSinceRestart > 30) value -= 20;
  else if (daysSinceRestart > 14) value -= 10;
  else if (daysSinceRestart > 7) value -= 5;

  if (windowsUpdatePending) value -= 10;
  if (registryRebootPending) value -= 15;

  return Math.max(0, Math.min(100, value));
}

const rebootRules: RecommendationRule<RebootContext>[] = [
  {
    id: "reboot-multiple-signals",
    condition: (ctx) => {
      const signals = [
        ctx.daysSinceRestart > ctx.maxUptimeDays,
        ctx.registryRebootPending,
        ctx.windowsUpdatePending,
      ].filter(Boolean).length;
      return signals >= 2;
    },
    build: (ctx) => ({
      title: "Multiple reboot signals detected",
      description: `${Math.floor(ctx.daysSinceRestart)} days of uptime combined with ${
        ctx.registryRebootPending ? "a pending Windows restart flag" : "a pending Windows Update"
      } makes this a strong restart candidate.`,
      reason: "Two or more independent reboot signals agree.",
      expectedBenefit: "Resolves multiple pending conditions in a single restart.",
      estimatedImpact: "High",
      confidence: 0.9,
      suggestedAction: "Restart during tonight's maintenance window.",
      category: "Reboot",
      severity: "High",
      relatedMetric: "uptime_days",
    }),
  },
  {
    id: "reboot-critical-overdue",
    condition: (ctx) => ctx.daysSinceRestart > ctx.maxUptimeDays * 1.5,
    build: (ctx) => ({
      title: "Restart overdue",
      description: `This device has not restarted in ${Math.floor(ctx.daysSinceRestart)} days, well past the recommended maximum of ${ctx.maxUptimeDays} days for a ${ctx.deviceClass} device.`,
      reason: "Uptime is more than 1.5x the policy threshold for this device class.",
      expectedBenefit: "Clears accumulated memory fragmentation and restores baseline stability.",
      estimatedImpact: "High",
      confidence: 0.85,
      suggestedAction: "Restart during the next maintenance window.",
      category: "Reboot",
      severity: "High",
      relatedMetric: "uptime_days",
    }),
  },
  {
    id: "reboot-due",
    condition: (ctx) => ctx.daysSinceRestart > ctx.maxUptimeDays && ctx.daysSinceRestart <= ctx.maxUptimeDays * 1.5,
    build: (ctx) => ({
      title: "Restart recommended",
      description: `Uptime is ${Math.floor(ctx.daysSinceRestart)} days, past the ${ctx.maxUptimeDays}-day recommended maximum for a ${ctx.deviceClass} device.`,
      reason: "Uptime has passed the policy threshold for this device class.",
      expectedBenefit: "Reduces the chance of memory-related slowdowns and applies any pending updates.",
      estimatedImpact: "Medium",
      confidence: 0.7,
      suggestedAction: "Schedule a restart in the next few days.",
      category: "Reboot",
      severity: "Medium",
      relatedMetric: "uptime_days",
    }),
  },
  {
    id: "reboot-windows-update-pending",
    condition: (ctx) => ctx.windowsUpdatePending,
    build: () => ({
      title: "Windows Update waiting on restart",
      description: "A Windows Update has been installed but requires a restart to finish applying.",
      reason: "The device has pending updates that require a restart to complete.",
      expectedBenefit: "Completes update installation and clears the pending state.",
      estimatedImpact: "Medium",
      confidence: 0.8,
      suggestedAction: "Restart at the next convenient opportunity.",
      category: "Reboot",
      severity: "Medium",
      relatedMetric: "windows_update_pending",
    }),
  },
  {
    id: "reboot-registry-pending",
    condition: (ctx) => ctx.registryRebootPending,
    build: () => ({
      title: "Windows reports a restart is pending",
      description: "Windows registry signals (Component Based Servicing, Windows Update, or a pending file rename) indicate a restart is required.",
      reason: "One or more native Windows pending-reboot indicators are set.",
      expectedBenefit: "Clears the pending state and finalizes in-progress system changes.",
      estimatedImpact: "Medium",
      confidence: 0.9,
      suggestedAction: "Restart as soon as convenient.",
      category: "Reboot",
      severity: "Medium",
      relatedMetric: "registry_reboot_pending",
    }),
  },
];

export function evaluateRebootRecommendations(context: RebootContext): Recommendation[] {
  return evaluateRules(rebootRules, context);
}

/** True when any Phase-1-detectable signal recommends a restart —
 * drives whether the Smart Restart trigger is shown at all. */
export function isRebootRecommended(context: RebootContext): boolean {
  return (
    context.daysSinceRestart > context.maxUptimeDays ||
    context.registryRebootPending ||
    context.windowsUpdatePending
  );
}
