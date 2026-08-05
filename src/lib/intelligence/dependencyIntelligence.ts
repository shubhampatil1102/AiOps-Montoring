/**
 * Application Dependency Intelligence — root-cause correlation. Reuses the
 * existing Intelligence Framework (evaluateRules/RecommendationRule), the
 * same pattern as applicationIntelligence.ts and rebootIntelligence.ts.
 * Every signal here comes from data the agent actually collected (process/
 * service state, dependency_nodes, cloud_services, dsregcmd output) — there
 * is no true root-cause ML model, just honest rule-based correlation with
 * rounded confidence (0.6-0.9), matching every other Intelligence Service
 * in this codebase.
 */
import { evaluateRules, highestSeverityFirst, type RecommendationRule } from "@/lib/intelligence/recommendationEngine";
import type { Recommendation } from "@/lib/intelligence/types";
import type { CloudProviderStatusValue } from "@/types/application";

export interface DependencyContext {
  appName: string;
  isRunning: boolean;
  requiredServiceDown: boolean;
  scheduledTaskDisabled: boolean;
  cloudProviderStatus?: CloudProviderStatusValue;
  cloudIncidentTitle?: string;
  authStatus?: string | null;
  hasEstablishedConnections: boolean;
  dnsFailureCount: number;
}

function hasLocalFailureSignal(ctx: DependencyContext) {
  return !ctx.isRunning || ctx.requiredServiceDown || ctx.scheduledTaskDisabled;
}

function isCloudImpaired(status?: CloudProviderStatusValue) {
  return status === "ADVISORY" || status === "DEGRADED" || status === "MAJOR_OUTAGE";
}

function isAuthDegraded(status?: string | null) {
  return status === "Joined, SSO Token Missing";
}

const dependencyRules: RecommendationRule<DependencyContext>[] = [
  {
    id: "dep-cloud-incident",
    condition: (ctx) => hasLocalFailureSignal(ctx) && isCloudImpaired(ctx.cloudProviderStatus),
    build: (ctx) => ({
      title: "Root cause: cloud provider incident",
      description: ctx.cloudIncidentTitle
        ? `${ctx.appName} is failing while its cloud provider reports: "${ctx.cloudIncidentTitle}".`
        : `${ctx.appName} is failing while its mapped cloud provider reports a service issue.`,
      reason: "Local failure signal coincides with an active cloud provider incident for the mapped service.",
      expectedBenefit: "No local troubleshooting needed — resolves when the provider's incident clears.",
      estimatedImpact: "High",
      confidence: 0.85,
      suggestedAction: "Monitor the provider's status page; no local action recommended.",
      category: "Dependency",
      severity: "High",
      relatedMetric: "cloud_dependency",
    }),
  },
  {
    id: "dep-auth-failure",
    condition: (ctx) => hasLocalFailureSignal(ctx) && isAuthDegraded(ctx.authStatus) && !isCloudImpaired(ctx.cloudProviderStatus),
    build: (ctx) => ({
      title: "Root cause: expired authentication token",
      description: `${ctx.appName} is failing while this device's SSO token cache looks broken (Entra-joined, but no primary refresh token).`,
      reason: "dsregcmd reports the device is joined but AzureAdPrt is NO — sign-in-dependent apps fail this way even when the network and cloud service are fine.",
      expectedBenefit: "Refreshing the SSO token typically restores cloud-dependent app sign-in without touching the app itself.",
      estimatedImpact: "Medium",
      confidence: 0.7,
      suggestedAction: "Sign the user out and back in, or run `dsregcmd /refreshprt` on the device.",
      category: "Dependency",
      severity: "Medium",
      relatedMetric: "authentication_dependency",
    }),
  },
  {
    id: "dep-dns-failure",
    condition: (ctx) => hasLocalFailureSignal(ctx) && ctx.dnsFailureCount > 0 && !isCloudImpaired(ctx.cloudProviderStatus),
    build: (ctx) => ({
      title: "Root cause: network name resolution",
      description: `${ctx.appName} is failing while ${ctx.dnsFailureCount} DNS lookup(s) on this device are not resolving successfully.`,
      reason: "Local failure signal coincides with failed entries in the device's DNS client cache.",
      expectedBenefit: "Fixing DNS resolution can restore connectivity without any change to the application.",
      estimatedImpact: "Medium",
      confidence: 0.65,
      suggestedAction: "Flush DNS and verify the device's configured DNS servers or VPN split-tunnel rules.",
      category: "Dependency",
      severity: "Medium",
      relatedMetric: "network_dependency",
    }),
  },
  {
    id: "dep-blocked-connection",
    condition: (ctx) =>
      ctx.isRunning && !ctx.hasEstablishedConnections && !isCloudImpaired(ctx.cloudProviderStatus) && ctx.dnsFailureCount === 0,
    build: (ctx) => ({
      title: "Root cause: blocked outbound connection",
      description: `${ctx.appName} is running but currently has no established outbound network connections.`,
      reason: "The process is active with zero ESTABLISHED TCP connections while DNS resolution looks fine — more consistent with a firewall/proxy block than a name-resolution or cloud problem.",
      expectedBenefit: "Narrows troubleshooting to firewall/proxy rules instead of the application itself.",
      estimatedImpact: "Medium",
      confidence: 0.6,
      suggestedAction: "Check local firewall rules, proxy configuration, and VPN routing for this application's executable.",
      category: "Dependency",
      severity: "Medium",
      relatedMetric: "network_dependency",
    }),
  },
  {
    id: "dep-service-failure",
    condition: (ctx) => ctx.requiredServiceDown && !isCloudImpaired(ctx.cloudProviderStatus),
    build: (ctx) => ({
      title: "Root cause: dependent service stopped",
      description: `${ctx.appName} has a required Windows service that is not running.`,
      reason: "A service this application depends on is stopped, and no cloud incident explains the failure.",
      expectedBenefit: "Restarting the dependent service is usually sufficient to restore the application.",
      estimatedImpact: "Medium",
      confidence: 0.75,
      suggestedAction: "Restart the dependent service from the Services tab.",
      category: "Dependency",
      severity: "Medium",
      relatedMetric: "service_dependency",
    }),
  },
];

export function evaluateDependencyRootCause(context: DependencyContext): Recommendation[] {
  return highestSeverityFirst(evaluateRules(dependencyRules, context)).sort((a, b) => b.confidence - a.confidence);
}
