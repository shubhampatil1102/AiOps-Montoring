/**
 * User & Privilege Collector — rule-based insights. Reuses the existing
 * Intelligence Framework (evaluateRules/RecommendationRule), same pattern
 * as every other Intelligence Service in this codebase. All signals come
 * from real agent-collected data (token inspection, Get-LocalGroupMember,
 * device_admin_events) — no fabricated baseline. "Unknown local
 * administrator detected" from the original brief is intentionally NOT
 * implemented here: it would require an approved-admins allowlist/policy
 * that doesn't exist in this system, and inventing one would be
 * fabricating a baseline, not detecting against a real one.
 */
import { evaluateRules, type RecommendationRule } from "@/lib/intelligence/recommendationEngine";
import type { Recommendation } from "@/lib/intelligence/types";

export interface UserPrivilegeContext {
  primaryUsername: string | null;
  primaryIsAdministrator: boolean | null;
  primaryIsElevated: boolean | null;
  localAdministratorCount: number;
  builtInAdministratorEnabled: boolean;
  staleAdminDaysSinceLogon: number | null;
  recentlyAddedAdminCount: number;
  disabledAdminCount: number;
}

const userPrivilegeRules: RecommendationRule<UserPrivilegeContext>[] = [
  {
    id: "privilege-local-admin-in-use",
    condition: (ctx) => ctx.primaryIsAdministrator === true && ctx.primaryIsElevated === true,
    build: (ctx) => ({
      title: "Device is being used with Local Administrator privileges",
      description: `${ctx.primaryUsername ?? "The current user"} is signed in and running elevated on this device.`,
      reason: "Real-time access-token inspection confirms the active session's token is currently elevated.",
      expectedBenefit: "Flags devices where day-to-day work happens under an admin token, a common ransomware/lateral-movement risk factor.",
      estimatedImpact: "High",
      confidence: 0.85,
      suggestedAction: "Consider a standard-user account for daily use, elevating only when required.",
      category: "Privilege",
      severity: "High",
      relatedMetric: "elevated_session",
    }),
  },
  {
    id: "privilege-standard-user-compliant",
    condition: (ctx) => ctx.primaryIsAdministrator === false,
    build: (ctx) => ({
      title: "Standard user logged in — least privilege policy followed",
      description: `${ctx.primaryUsername ?? "The current user"} is signed in as a standard (non-administrator) account.`,
      reason: "Token/group inspection confirms this session is not a member of the local Administrators group.",
      expectedBenefit: "No action needed — this device follows least-privilege practice for its active session.",
      estimatedImpact: "Low",
      confidence: 0.8,
      suggestedAction: "No action needed.",
      category: "Privilege",
      severity: "Low",
      relatedMetric: "standard_user_session",
    }),
  },
  {
    id: "privilege-multiple-administrators",
    condition: (ctx) => ctx.localAdministratorCount > 2 && ctx.localAdministratorCount <= 5,
    build: (ctx) => ({
      title: "Multiple administrators exist on this device",
      description: `${ctx.localAdministratorCount} accounts are members of the local Administrators group.`,
      reason: "Local group membership count from the most recent scan.",
      expectedBenefit: "Reviewing membership can reduce the device's attack surface.",
      estimatedImpact: "Medium",
      confidence: 0.7,
      suggestedAction: "Review the Local Administrators list and remove accounts that no longer need admin rights.",
      category: "Privilege",
      severity: "Medium",
      relatedMetric: "local_admin_count",
    }),
  },
  {
    id: "privilege-excessive-administrators",
    condition: (ctx) => ctx.localAdministratorCount > 5,
    build: (ctx) => ({
      title: "Excessive privileged accounts detected",
      description: `${ctx.localAdministratorCount} accounts are members of the local Administrators group — well above a typical baseline.`,
      reason: "Local group membership count from the most recent scan, above the 5-account threshold.",
      expectedBenefit: "A large admin group is a common audit finding and a real lateral-movement risk.",
      estimatedImpact: "High",
      confidence: 0.75,
      suggestedAction: "Audit the Local Administrators list against who actually needs elevated access on this device.",
      category: "Privilege",
      severity: "High",
      relatedMetric: "local_admin_count",
    }),
  },
  {
    id: "privilege-builtin-admin-enabled",
    condition: (ctx) => ctx.builtInAdministratorEnabled,
    build: () => ({
      title: "Built-in Administrator account is enabled",
      description: "The built-in Administrator account (SID ending -500) is enabled on this device.",
      reason: "Local account state from the most recent scan, matched by SID suffix regardless of any rename.",
      expectedBenefit: "Disabling the built-in Administrator account is a standard security baseline (CIS/Microsoft).",
      estimatedImpact: "Medium",
      confidence: 0.7,
      suggestedAction: "Disable the built-in Administrator account if it isn't specifically required.",
      category: "Privilege",
      severity: "Medium",
      relatedMetric: "builtin_admin_enabled",
    }),
  },
  {
    id: "privilege-stale-admin-account",
    condition: (ctx) => ctx.staleAdminDaysSinceLogon !== null && ctx.staleAdminDaysSinceLogon > 180,
    build: (ctx) => ({
      title: "Administrator account has not logged in for over 180 days",
      description: `An enabled administrator account on this device was last used ${Math.floor(ctx.staleAdminDaysSinceLogon ?? 0)} days ago.`,
      reason: "Real LastLogon timestamp from the local account store, compared to the current scan time.",
      expectedBenefit: "Dormant privileged accounts are a common target for compromise.",
      estimatedImpact: "Medium",
      confidence: 0.65,
      suggestedAction: "Confirm the account is still needed; disable or remove it from Administrators if not.",
      category: "Privilege",
      severity: "Medium",
      relatedMetric: "stale_admin_account",
    }),
  },
  {
    id: "privilege-recently-added-admin",
    condition: (ctx) => ctx.recentlyAddedAdminCount > 0,
    build: (ctx) => ({
      title: "Recently added local administrator",
      description: `${ctx.recentlyAddedAdminCount} account(s) were added to the local Administrators group in the last 30 days.`,
      reason: "Detected from device_admin_events ADDED entries, diffed server-side on each scan.",
      expectedBenefit: "Surfaces privilege escalation shortly after it happens, rather than only during periodic audits.",
      estimatedImpact: "Medium",
      confidence: 0.7,
      suggestedAction: "Confirm this addition was expected and authorized.",
      category: "Privilege",
      severity: "Medium",
      relatedMetric: "recent_admin_addition",
    }),
  },
  {
    id: "privilege-orphaned-disabled-admin",
    condition: (ctx) => ctx.disabledAdminCount > 0,
    build: (ctx) => ({
      title: "Orphaned administrator account detected",
      description: `${ctx.disabledAdminCount} disabled account(s) remain as members of the local Administrators group.`,
      reason: "Local account Enabled=false while still present in the Administrators group membership.",
      expectedBenefit: "Removing stale disabled accounts from privileged groups reduces audit noise and residual risk.",
      estimatedImpact: "Low",
      confidence: 0.6,
      suggestedAction: "Remove disabled accounts from the Administrators group if they're no longer needed.",
      category: "Privilege",
      severity: "Low",
      relatedMetric: "orphaned_admin_account",
    }),
  },
];

export function evaluateUserPrivilegeRecommendations(context: UserPrivilegeContext): Recommendation[] {
  return evaluateRules(userPrivilegeRules, context);
}

export function adminBadgeVariant(isAdministrator: boolean | null): "success" | "warning" | "danger" | "info" | "default" {
  if (isAdministrator === true) return "warning";
  if (isAdministrator === false) return "success";
  return "default";
}

export function elevationBadgeVariant(isElevated: boolean | null): "success" | "warning" | "danger" | "info" | "default" {
  if (isElevated === true) return "warning";
  if (isElevated === false) return "success";
  return "default";
}
