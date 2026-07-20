/**
 * Device-specific extension point for the (domain-agnostic) Shared
 * Intelligence Framework. Nothing in src/lib/intelligence/ changes here —
 * this file just assembles real per-device data into the generic
 * IntelligencePipelineConfig shape each domain's useIntelligence() call
 * consumes. See src/lib/intelligence/README.md's "Extension points" section.
 */
import type { IntelligencePipelineConfig } from "@/lib/intelligence/pipeline";
import type { TimeSeriesPoint, RiskSeverity } from "@/lib/intelligence/types";
import type { WeightedComponent } from "@/lib/intelligence/healthScoreEngine";
import type { RecommendationRule } from "@/lib/intelligence/recommendationEngine";
import { calculateRebootHealthValue } from "./rebootIntelligence";
import type {
  Device,
  DeviceCompliance,
  DeviceHardware,
  DeviceUpdate,
  MetricPoint,
} from "@/types/device";

export function deviceHistoryToSeries(history: MetricPoint[], key: "cpu" | "ram"): TimeSeriesPoint[] {
  return history.map((point) => ({ time: Number(point.time), value: Number(point[key] ?? 0) }));
}

export function normalizeComplianceFlag(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "").trim().toUpperCase();
  return ["TRUE", "ENABLED", "ON", "YES"].includes(text);
}

function complianceScore(compliance: DeviceCompliance): number | undefined {
  const flags = [
    compliance.bitlocker,
    compliance.tpm,
    compliance.secureboot ?? compliance.secureBoot,
    compliance.defender,
  ];
  const knownFlags = flags.filter((flag) => flag !== undefined && flag !== null);
  if (knownFlags.length === 0) return undefined;

  const enabledCount = knownFlags.filter(normalizeComplianceFlag).length;
  return (enabledCount / knownFlags.length) * 100;
}

function updatesScore(update: DeviceUpdate): number {
  const pending = Number(update.pending_updates ?? 0);
  const failed = Number(update.failed_updates ?? 0);
  const outdatedDrivers = Number(update.outdated_drivers ?? 0);
  const penalty = Math.min(100, pending * 5 + failed * 15 + outdatedDrivers * 5);
  return Math.max(0, 100 - penalty);
}

export function buildPerformanceConfig(device: Device, series: TimeSeriesPoint[]): IntelligencePipelineConfig {
  const cpu = Number(device.cpu ?? 0);
  const ram = Number(device.ram ?? 0);

  return {
    domain: "performance",
    series,
    healthComponents: [
      { label: "cpu", value: 100 - cpu, weight: 1 },
      { label: "ram", value: 100 - ram, weight: 1 },
    ],
    predictionThreshold: { value: 90, direction: "above" },
    predictionOptions: { metric: "cpu" },
  };
}

interface BatteryContext {
  batteryHealthPercent: number;
}

const batteryRules: RecommendationRule<BatteryContext>[] = [
  {
    id: "battery-replace-now",
    condition: (ctx) => ctx.batteryHealthPercent < 20,
    build: (ctx) => ({
      title: "Replace battery",
      description: `Battery health is at ${ctx.batteryHealthPercent.toFixed(0)}%, below the safe operating threshold.`,
      reason: "Battery capacity has degraded to a critical level.",
      expectedBenefit: "Restores reliable runtime and avoids unexpected shutdowns.",
      estimatedImpact: "Critical",
      confidence: 0.85,
      suggestedAction: "Schedule a physical battery replacement.",
      category: "Battery",
      severity: "Critical",
      relatedMetric: "battery_health_percent",
    }),
  },
  {
    id: "battery-plan-replacement",
    condition: (ctx) => ctx.batteryHealthPercent >= 20 && ctx.batteryHealthPercent < 30,
    build: (ctx) => ({
      title: "Plan battery replacement",
      description: `Battery health is at ${ctx.batteryHealthPercent.toFixed(0)}%, approaching the replacement threshold.`,
      reason: "Battery capacity is trending toward end-of-life.",
      expectedBenefit: "Avoids a reactive, unplanned replacement.",
      estimatedImpact: "High",
      confidence: 0.75,
      suggestedAction: "Add this device to the next hardware refresh cycle.",
      category: "Battery",
      severity: "High",
      relatedMetric: "battery_health_percent",
    }),
  },
  {
    id: "battery-monitor",
    condition: (ctx) => ctx.batteryHealthPercent >= 30 && ctx.batteryHealthPercent < 50,
    build: (ctx) => ({
      title: "Monitor battery health",
      description: `Battery health is at ${ctx.batteryHealthPercent.toFixed(0)}%, below the healthy range.`,
      reason: "Battery capacity is degrading faster than typical wear.",
      expectedBenefit: "Early detection before the device needs urgent replacement.",
      estimatedImpact: "Medium",
      confidence: 0.6,
      suggestedAction: "Re-check battery health in the next 30 days.",
      category: "Battery",
      severity: "Medium",
      relatedMetric: "battery_health_percent",
    }),
  },
];

export function buildBatteryConfig(hardware: DeviceHardware, series: TimeSeriesPoint[]): IntelligencePipelineConfig<BatteryContext> {
  const batteryPercent = Number(hardware.battery_health_percent ?? 0);

  return {
    domain: "battery",
    series,
    healthComponents: [{ label: "battery_health_percent", value: batteryPercent, weight: 1 }],
    predictionThreshold: { value: 20, direction: "below" },
    predictionOptions: { metric: "battery_health_percent" },
    recommendationRules: batteryRules,
    recommendationContext: { batteryHealthPercent: batteryPercent },
    automationCategory: batteryPercent < 30 ? "battery-replacement" : undefined,
  };
}

interface StorageContext {
  diskUsagePercent: number;
}

const storageRules: RecommendationRule<StorageContext>[] = [
  {
    id: "disk-growth",
    condition: (ctx) => ctx.diskUsagePercent >= 80,
    build: (ctx) => {
      const critical = ctx.diskUsagePercent >= 95;
      const severity: RiskSeverity = critical ? "Critical" : "High";

      return {
        title: "Free up disk space",
        description: `Disk usage is at ${ctx.diskUsagePercent.toFixed(0)}%, above the recommended 80% threshold.`,
        reason: "Disk usage is trending toward capacity.",
        expectedBenefit: "Avoids disk-full failures and restores headroom.",
        estimatedImpact: severity,
        confidence: 0.75,
        suggestedAction: "Run disk cleanup or archive old files.",
        category: "Storage",
        severity,
        relatedMetric: "disk",
      };
    },
  },
];

export function buildStorageConfig(
  hardware: DeviceHardware,
  series: TimeSeriesPoint[]
): IntelligencePipelineConfig<StorageContext> {
  const disk = Number(hardware.disk ?? 0);

  return {
    domain: "storage",
    series,
    healthComponents: [{ label: "disk", value: 100 - disk, weight: 1 }],
    predictionThreshold: { value: 95, direction: "above" },
    predictionOptions: { metric: "disk" },
    recommendationRules: storageRules,
    recommendationContext: { diskUsagePercent: disk },
    automationCategory: disk >= 90 ? "disk-full" : undefined,
  };
}

export function buildSecurityConfig(compliance: DeviceCompliance): IntelligencePipelineConfig {
  const score = complianceScore(compliance);
  const flags = [
    compliance.bitlocker,
    compliance.tpm,
    compliance.secureboot ?? compliance.secureBoot,
    compliance.defender,
  ].filter((flag) => flag !== undefined && flag !== null);

  const noncompliant = flags.some((flag) => !normalizeComplianceFlag(flag));

  return {
    domain: "security",
    series: [],
    healthComponents: [{ label: "compliance", value: score ?? 0, weight: 1 }],
    automationCategory: noncompliant ? "security-noncompliant" : undefined,
  };
}

export function buildUpdatesConfig(update: DeviceUpdate): IntelligencePipelineConfig {
  const pending = Number(update.pending_updates ?? 0);
  const failed = Number(update.failed_updates ?? 0);

  return {
    domain: "updates",
    series: [],
    healthComponents: [{ label: "updates", value: updatesScore(update), weight: 1 }],
    automationCategory: pending > 0 || failed > 0 ? "updates-pending" : undefined,
  };
}

/** The 6-category composite for the page's Overall Health Overview — only
 * categories with real data contribute; Network/Asset have no data source
 * and are never included here (see the Intelligence Cards, which render
 * them as `comingSoon` instead of a fabricated score). */
export function buildOverallHealthComponents(
  device: Device,
  hardware: DeviceHardware,
  compliance: DeviceCompliance,
  update: DeviceUpdate
): WeightedComponent[] {
  const cpu = Number(device.cpu ?? 0);
  const ram = Number(device.ram ?? 0);
  const components: WeightedComponent[] = [
    { label: "Performance", value: 100 - (cpu + ram) / 2, weight: 1 },
  ];

  if (hardware.battery_health_percent !== undefined) {
    components.push({ label: "Battery", value: Number(hardware.battery_health_percent), weight: 1 });
  }

  if (hardware.disk !== undefined) {
    components.push({ label: "Storage", value: 100 - Number(hardware.disk), weight: 1 });
  }

  if (hardware.health_score !== undefined) {
    components.push({ label: "Hardware", value: Number(hardware.health_score), weight: 1 });
  }

  const security = complianceScore(compliance);
  if (security !== undefined) {
    components.push({ label: "Security", value: security, weight: 1 });
  }

  if (update.pending_updates !== undefined || update.failed_updates !== undefined) {
    components.push({ label: "Updates", value: updatesScore(update), weight: 1 });
  }

  if (device.boot_time !== undefined) {
    const daysSinceRestart = Math.max(0, (Date.now() - Number(device.boot_time)) / 86400000);
    const windowsUpdatePending = Number(update.pending_updates ?? 0) > 0;
    components.push({
      label: "Reboot",
      value: calculateRebootHealthValue(daysSinceRestart, Boolean(update.registry_reboot_pending), windowsUpdatePending),
      weight: 1,
    });
  }

  return components;
}
