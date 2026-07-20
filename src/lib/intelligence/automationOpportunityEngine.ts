/**
 * Automation Opportunity Engine — matches a known issue category against a
 * small, extensible action catalog. Returns a suggestion only; it does not
 * execute anything. The action shapes intentionally mirror the existing
 * heal/script pipeline (backend/src/services/script.service.ts,
 * heal_rules/script_jobs tables) so a future Automation Hub can consume
 * these suggestions without translation.
 */
import type { AutomationSuggestion } from "./types";

export interface AutomationCatalogEntry {
  category: string;
  suggestion: AutomationSuggestion;
}

export const DEFAULT_AUTOMATION_CATALOG: AutomationCatalogEntry[] = [
  {
    category: "service-down",
    suggestion: {
      title: "Restart service",
      description: "The affected service is not responding and can be restarted automatically.",
      actionType: "restart-service",
      confidence: 0.8,
      riskLevel: "Low",
    },
  },
  {
    category: "disk-full",
    suggestion: {
      title: "Clean temporary files",
      description: "Free disk space by clearing temp, cache, and old update files.",
      actionType: "clean-temp-files",
      confidence: 0.7,
      riskLevel: "Low",
    },
  },
  {
    category: "updates-pending",
    suggestion: {
      title: "Install pending updates",
      description: "Apply queued OS/driver updates during the next maintenance window.",
      actionType: "install-updates",
      confidence: 0.6,
      riskLevel: "Medium",
    },
  },
  {
    category: "security-noncompliant",
    suggestion: {
      title: "Notify administrator",
      description: "A compliance control is disabled and needs manual review before remediation.",
      actionType: "notify-admin",
      confidence: 0.9,
      riskLevel: "Low",
    },
  },
  {
    category: "custom-remediation",
    suggestion: {
      title: "Run remediation script",
      description: "A known PowerShell remediation exists for this issue type.",
      actionType: "run-script",
      confidence: 0.65,
      riskLevel: "Medium",
    },
  },
  {
    category: "requires-downtime",
    suggestion: {
      title: "Schedule maintenance window",
      description: "This fix requires a reboot or downtime and should be scheduled, not run immediately.",
      actionType: "schedule-maintenance",
      confidence: 0.75,
      riskLevel: "Medium",
    },
  },
  {
    category: "battery-replacement",
    suggestion: {
      title: "Schedule battery replacement",
      description: "Battery health has dropped below a safe threshold and physical replacement should be planned.",
      actionType: "schedule-maintenance",
      confidence: 0.7,
      riskLevel: "Medium",
    },
  },
];

export function matchAutomationOpportunity(
  category: string,
  catalog: AutomationCatalogEntry[] = DEFAULT_AUTOMATION_CATALOG
): AutomationSuggestion | null {
  const entry = catalog.find((e) => e.category === category);
  return entry ? entry.suggestion : null;
}
