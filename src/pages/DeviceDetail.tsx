import { lazy, Suspense, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  fetchDevice,
  fetchDeviceAlerts,
  fetchDeviceCompliance,
  fetchDeviceEvents,
  fetchDeviceHardware,
  fetchDeviceHistory,
  fetchDeviceInventory,
  fetchDeviceScriptJobs,
  fetchDeviceSuggestions,
  fetchDeviceTopProcesses,
  fetchDeviceUpdates,
} from "@/api/devices";
import {
  useCancelPatchJob,
  useCreatePatchInstall,
  useCreatePatchScan,
  useCreateRebootJob,
  useDevicePatchHistory,
  useDevicePatchJobs,
  useRetryPatchJob,
} from "@/hooks/usePatch";
import { useCreateAdHocReboot, useDeviceRebootFacts, useDeviceRebootHistory } from "@/hooks/useReboot";
import { usePermissions } from "@/hooks/usePermissions";
import { useMetricAnomalies, useMetricHistory } from "@/hooks/useMetricAnalytics";
import useIntelligence from "@/hooks/useIntelligence";
import { adaptAnalyticsHistoryToSeries } from "@/lib/intelligence/adapters";
import { predictThresholdCrossing, projectValueAtHorizon } from "@/lib/intelligence/predictionEngine";
import { matchAutomationOpportunity } from "@/lib/intelligence/automationOpportunityEngine";
import { calculateHealthScore } from "@/lib/intelligence/healthScoreEngine";
import {
  buildBatteryConfig,
  buildOverallHealthComponents,
  buildPerformanceConfig,
  buildSecurityConfig,
  buildStorageConfig,
  buildUpdatesConfig,
  deviceHistoryToSeries,
  normalizeComplianceFlag,
} from "@/lib/deviceIntelligence/buildDeviceIntelligenceConfig";
import {
  calculateRebootHealthValue,
  evaluateRebootRecommendations,
  isRebootRecommended,
  type RebootContext,
} from "@/lib/deviceIntelligence/rebootIntelligence";
import DashboardWidget from "@/components/dashboard/DashboardWidget";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ActivityFeed, { type ActivityItem } from "@/components/common/ActivityFeed";
import Loading from "@/components/common/Loading";
import ErrorState from "@/components/common/ErrorState";
import AreaChart from "@/components/charts/AreaChart";
import RadarChart from "@/components/charts/RadarChart";
import DeviceHeader from "@/components/deviceHub/DeviceHeader";
import DeviceExecutiveSummary from "@/components/deviceHub/DeviceExecutiveSummary";
import DeviceHealthOverview from "@/components/deviceHub/DeviceHealthOverview";
import BatteryDetails from "@/components/deviceHub/BatteryDetails";
import RebootIntelligenceCard from "@/components/deviceHub/RebootIntelligenceCard";
import UserPrivilegeCard from "@/components/deviceHub/UserPrivilegeCard";
import { useDeviceUserPrivilege } from "@/hooks/useUserPrivilege";
import { getSeverity } from "@/utils/severity";
import type {
  Device,
  DeviceCompliance,
  DeviceEvent,
  DeviceHardware,
  DeviceInventory,
  DeviceUpdate,
  HealSuggestion,
  MetricPoint,
  PatchJobStatus,
  ProcessItem,
} from "@/types/device";
import type { Recommendation, RiskSeverity } from "@/lib/intelligence/types";
import styles from "./DeviceDetail.module.css";

const IntelligenceCardsSection = lazy(() => import("./deviceDetail/IntelligenceCardsSection"));
const PredictionsSection = lazy(() => import("./deviceDetail/PredictionsSection"));
const RecommendationsSection = lazy(() => import("./deviceDetail/RecommendationsSection"));
const AutomationSection = lazy(() => import("./deviceDetail/AutomationSection"));

const PATCH_TERMINAL_STATUSES = new Set<PatchJobStatus>(["COMPLETED", "FAILED", "CANCELLED"]);
const PATCH_CANCELLABLE_STATUSES = new Set<PatchJobStatus>(["PENDING", "QUEUED", "PREPARING", "DOWNLOADING"]);

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function patchStatusVariant(status: PatchJobStatus): "success" | "warning" | "danger" | "info" | "default" {
  if (status === "COMPLETED") return "success";
  if (status === "FAILED" || status === "CANCELLED") return "danger";
  if (status === "WAITING_FOR_REBOOT") return "warning";
  return "info";
}

function formatPatchAction(action: string) {
  if (action === "SCAN") return "Update scan";
  if (action === "INSTALL") return "Update install";
  if (action === "REBOOT") return "Reboot";
  return action;
}

function formatPatchStatus(status: string) {
  return status.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

function mapHealSuggestionToRecommendation(suggestion: HealSuggestion): Recommendation {
  const severity: RiskSeverity = "Medium";

  return {
    title: suggestion.alert_type ? suggestion.alert_type.replace(/_/g, " ") : "Recommended action",
    description: suggestion.reason ?? "Issue detected by AI health analysis.",
    reason: suggestion.reason ?? "Detected from live device telemetry.",
    expectedBenefit: "Resolves the detected issue.",
    estimatedImpact: severity,
    // heal_suggestions doesn't carry its own confidence score — 0.65 reflects
    // "a real detected issue, moderate default confidence," not a fabricated number.
    confidence: 0.65,
    suggestedAction: suggestion.suggested_action ?? suggestion.script ?? "Review manually.",
    category: suggestion.alert_type ?? "General",
    severity,
    relatedMetric: suggestion.alert_type ?? "general",
  };
}

export default function DeviceDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const [range, setRange] = useState<"1h" | "1d" | "1w">("1h");
  const [updateActionMessage, setUpdateActionMessage] = useState("");

  const { data: device, isLoading: isDeviceLoading, isError: isDeviceError } = useQuery<Device>({
    queryKey: ["device", id],
    queryFn: () => fetchDevice(id),
    refetchInterval: 5000,
    enabled: !!id,
  });

  const { data: history = [] } = useQuery<MetricPoint[]>({
    queryKey: ["history", id, range],
    queryFn: () => fetchDeviceHistory(id, range),
    refetchInterval: 5000,
    enabled: !!id,
  });

  const { data: processes = [] } = useQuery<ProcessItem[]>({
    queryKey: ["top-processes", id],
    queryFn: () => fetchDeviceTopProcesses(id),
    refetchInterval: 5000,
    enabled: !!id,
  });

  const { data: events = [] } = useQuery<DeviceEvent[]>({
    queryKey: ["events", id],
    queryFn: () => fetchDeviceEvents(id),
    refetchInterval: 5000,
    enabled: !!id,
  });

  const { data: compliance = {} } = useQuery<DeviceCompliance>({
    queryKey: ["compliance", id],
    queryFn: () => fetchDeviceCompliance(id),
    refetchInterval: 4000,
    enabled: !!id,
  });

  const { data: hardware = {} } = useQuery<DeviceHardware>({
    queryKey: ["hardware", id],
    queryFn: () => fetchDeviceHardware(id),
    refetchInterval: 4000,
    enabled: !!id,
  });

  const { data: update = {} } = useQuery<DeviceUpdate>({
    queryKey: ["update", id],
    queryFn: () => fetchDeviceUpdates(id),
    refetchInterval: 4000,
    enabled: !!id,
  });

  const { data: inventory = {} } = useQuery<DeviceInventory>({
    queryKey: ["inventory", id],
    queryFn: () => fetchDeviceInventory(id),
    refetchInterval: 5000,
    enabled: !!id,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["device-alerts", id],
    queryFn: () => fetchDeviceAlerts(id),
    refetchInterval: 5000,
    enabled: !!id,
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ["device-suggestions", id],
    queryFn: () => fetchDeviceSuggestions(id),
    refetchInterval: 10000,
    enabled: !!id,
  });

  const { data: scriptJobs = [] } = useQuery({
    queryKey: ["device-script-jobs", id],
    queryFn: () => fetchDeviceScriptJobs(id),
    refetchInterval: 10000,
    enabled: !!id,
  });

  // Fetched once per metric, shared across the Intelligence Card, Prediction,
  // and detail chart that each need it — avoids duplicate network calls.
  const { data: batteryHistory = [] } = useMetricHistory(id, "battery_health_percent", "1w");
  const { data: diskHistory = [] } = useMetricHistory(id, "disk", "1w");
  const { data: batteryAnomalies = [] } = useMetricAnomalies(id, "battery_health_percent", "1w");
  const { data: diskAnomalies = [] } = useMetricAnomalies(id, "disk", "1w");
  const { data: cpuAnomalies = [] } = useMetricAnomalies(id, "cpu", "1w");

  const { can } = usePermissions();
  const canExecutePatch = can("devices", "execute");

  const { data: patchJobs = [] } = useDevicePatchJobs(id);
  const { data: patchHistory = [] } = useDevicePatchHistory(id);
  const { data: userPrivilegeSummary } = useDeviceUserPrivilege(id);
  const latestPatchJob = patchJobs[0];
  const isPatchJobActive = Boolean(
    latestPatchJob && !PATCH_TERMINAL_STATUSES.has(latestPatchJob.status)
  );

  const createScan = useCreatePatchScan(id);
  const createInstall = useCreatePatchInstall(id);
  const cancelPatchJobMutation = useCancelPatchJob(id);
  const retryPatchJobMutation = useRetryPatchJob(id);
  const createReboot = useCreateRebootJob(id);
  const createAdHocReboot = useCreateAdHocReboot(id);
  const [isRebootConfirmOpen, setIsRebootConfirmOpen] = useState(false);

  const { data: rebootFacts } = useDeviceRebootFacts(id);
  const { data: rebootHistory = [] } = useDeviceRebootHistory(id);

  const daysSinceRestart = useMemo(() => {
    if (!rebootFacts?.boot_time) return undefined;
    return Math.max(0, (Date.now() - Number(rebootFacts.boot_time)) / 86400000);
  }, [rebootFacts?.boot_time]);

  const rebootContext = useMemo<RebootContext | null>(() => {
    if (!rebootFacts || daysSinceRestart === undefined) return null;
    return {
      daysSinceRestart,
      maxUptimeDays: rebootFacts.max_uptime_days,
      registryRebootPending: Boolean(rebootFacts.registry_reboot_pending),
      windowsUpdatePending: Number(rebootFacts.pending_updates ?? 0) > 0,
      deviceClass: rebootFacts.device_class,
    };
  }, [rebootFacts, daysSinceRestart]);

  const rebootHealthScore = useMemo(() => {
    if (!rebootContext) return calculateHealthScore([]);
    return calculateHealthScore([
      {
        label: "Reboot",
        value: calculateRebootHealthValue(
          rebootContext.daysSinceRestart,
          rebootContext.registryRebootPending,
          rebootContext.windowsUpdatePending
        ),
        weight: 1,
      },
    ]);
  }, [rebootContext]);

  const rebootRecommendations = useMemo(
    () => (rebootContext ? evaluateRebootRecommendations(rebootContext) : []),
    [rebootContext]
  );

  const topRebootRecommendation = useMemo(
    () => [...rebootRecommendations].sort((a, b) => b.confidence - a.confidence)[0],
    [rebootRecommendations]
  );

  const rebootSafety = useMemo(() => {
    const reasons: string[] = [];
    let isSafe = true;

    const cpuLoad = Number(device?.cpu ?? 0);
    const ramLoad = Number(device?.ram ?? 0);
    if (cpuLoad > 70 || ramLoad > 85) {
      reasons.push(
        `Current load is elevated (CPU ${cpuLoad.toFixed(0)}%, RAM ${ramLoad.toFixed(0)}%) — the device may be in active use.`
      );
      isSafe = false;
    }

    const hour = new Date().getHours();
    const businessHours = hour >= 9 && hour < 18;
    if (businessHours) {
      reasons.push(
        "Currently within typical business hours (9 AM-6 PM, based on the admin's local clock) — consider waiting for a maintenance window."
      );
      isSafe = false;
    } else {
      reasons.push("Outside typical business hours — a reasonable time to restart.");
    }

    if (device?.state !== "ONLINE") {
      reasons.push("Device is currently offline — the restart will be applied once it reconnects.");
    }

    return { isSafe, reasons };
  }, [device?.state, device?.cpu, device?.ram]);

  const showSmartRestart = Boolean(
    (rebootContext && isRebootRecommended(rebootContext)) || latestPatchJob?.status === "WAITING_FOR_REBOOT"
  );

  function queueWindowsUpdateScan() {
    createScan.mutate(undefined, {
      onError: () => setUpdateActionMessage("Unable to start update scan."),
    });
  }

  function queueWindowsUpdateInstall() {
    createInstall.mutate(undefined, {
      onError: () => setUpdateActionMessage("Unable to start update install."),
    });
  }

  function handleCancelPatchJob(jobId: number) {
    cancelPatchJobMutation.mutate(jobId, {
      onError: () => setUpdateActionMessage("Unable to cancel — the job may already be past the point where it can be stopped."),
    });
  }

  function handleRetryPatchJob(jobId: number) {
    retryPatchJobMutation.mutate(jobId, {
      onError: () => setUpdateActionMessage("Unable to retry this job."),
    });
  }

  function handleConfirmReboot() {
    if (latestPatchJob?.status === "WAITING_FOR_REBOOT") {
      createReboot.mutate(latestPatchJob.id, {
        onSuccess: () => setIsRebootConfirmOpen(false),
        onError: () => setUpdateActionMessage("Unable to queue the reboot."),
      });
      return;
    }

    createAdHocReboot.mutate(undefined, {
      onSuccess: () => setIsRebootConfirmOpen(false),
      onError: () => setUpdateActionMessage("Unable to queue the reboot."),
    });
  }

  const cpuSeries = useMemo(() => deviceHistoryToSeries(history, "cpu"), [history]);
  const ramSeries = useMemo(() => deviceHistoryToSeries(history, "ram"), [history]);
  const batterySeries = useMemo(() => adaptAnalyticsHistoryToSeries(batteryHistory), [batteryHistory]);
  const diskSeries = useMemo(() => adaptAnalyticsHistoryToSeries(diskHistory), [diskHistory]);

  const performanceConfig = useMemo(
    () => buildPerformanceConfig(device ?? ({} as Device), cpuSeries),
    [device, cpuSeries]
  );
  const batteryConfig = useMemo(() => buildBatteryConfig(hardware, batterySeries), [hardware, batterySeries]);
  const storageConfig = useMemo(() => buildStorageConfig(hardware, diskSeries), [hardware, diskSeries]);
  const securityConfig = useMemo(() => buildSecurityConfig(compliance), [compliance]);
  const updatesConfig = useMemo(() => buildUpdatesConfig(update), [update]);

  const performance = useIntelligence(performanceConfig);
  const battery = useIntelligence(batteryConfig);
  const storage = useIntelligence(storageConfig);
  const security = useIntelligence(securityConfig);
  const updates = useIntelligence(updatesConfig);

  const ramPrediction = useMemo(
    () => predictThresholdCrossing(ramSeries, 95, "above", { metric: "ram" }),
    [ramSeries]
  );

  const batteryProjections = useMemo(
    () => [30, 90, 180, 365].map((days) => projectValueAtHorizon(batterySeries, days, { metric: "battery_health_percent" })),
    [batterySeries]
  );

  const batteryReplacementApproaching = useMemo(() => {
    const { insufficientData, predictedDate } = battery.prediction;
    if (insufficientData || !predictedDate) return false;
    return predictedDate - Date.now() < 30 * 24 * 60 * 60 * 1000;
  }, [battery.prediction]);

  const overallComponents = useMemo(
    () => buildOverallHealthComponents(device ?? ({} as Device), hardware, compliance, update),
    [device, hardware, compliance, update]
  );
  const overallScore = useMemo(() => calculateHealthScore(overallComponents).score, [overallComponents]);

  const recommendations = useMemo(() => {
    // heal_suggestions accumulates for the lifetime of a device with no
    // retention — show only the most recent, like every other list in this
    // app (ActivityFeed limits to 15, Dashboard's activity feed slices to 15).
    const recentSuggestions = [...suggestions]
      .sort((a, b) => Number(b.created_at ?? 0) - Number(a.created_at ?? 0))
      .slice(0, 15);

    const fromSuggestions = recentSuggestions.map(mapHealSuggestionToRecommendation);
    const fromPipeline = [
      ...performance.recommendations,
      ...battery.recommendations,
      ...storage.recommendations,
      ...security.recommendations,
      ...updates.recommendations,
    ];
    return [...fromSuggestions, ...fromPipeline, ...rebootRecommendations];
  }, [suggestions, performance, battery, storage, security, updates, rebootRecommendations]);

  const automations = useMemo(() => {
    const fromPipeline = [
      ...performance.automationOpportunities,
      ...battery.automationOpportunities,
      ...storage.automationOpportunities,
      ...security.automationOpportunities,
      ...updates.automationOpportunities,
    ];

    const hasStoppedService = (inventory.services_summary?.auto_running_issue_count ?? 0) > 0;
    const serviceOpportunity = hasStoppedService ? matchAutomationOpportunity("service-down") : null;

    return serviceOpportunity ? [...fromPipeline, serviceOpportunity] : fromPipeline;
  }, [performance, battery, storage, security, updates, inventory]);

  const securityRadarData = useMemo(
    () => [
      { axis: "BitLocker", value: normalizeComplianceFlag(compliance.bitlocker) ? 100 : 0 },
      { axis: "TPM", value: normalizeComplianceFlag(compliance.tpm) ? 100 : 0 },
      {
        axis: "Secure Boot",
        value: normalizeComplianceFlag(compliance.secureboot ?? compliance.secureBoot) ? 100 : 0,
      },
      { axis: "Defender", value: normalizeComplianceFlag(compliance.defender) ? 100 : 0 },
    ],
    [compliance]
  );

  const activityItems: ActivityItem[] = useMemo(() => {
    const eventItems: ActivityItem[] = events.map((e) => ({
      id: `event-${e.time}`,
      message: e.message,
      time: Number(e.time),
      severityLabel: getSeverity(e.message).label,
    }));

    const alertItems: ActivityItem[] = alerts.map((a) => ({
      id: `alert-${a.time}`,
      message: a.message,
      time: Number(a.time),
      severityLabel: getSeverity(a.message).label,
    }));

    const anomalyItems: ActivityItem[] = [
      ...batteryAnomalies.map((a) => ({ ...a, metricLabel: "Battery health" })),
      ...diskAnomalies.map((a) => ({ ...a, metricLabel: "Disk usage" })),
      ...cpuAnomalies.map((a) => ({ ...a, metricLabel: "CPU usage" })),
    ].map((a) => ({
      id: `anomaly-${a.metricLabel}-${a.detected_at}`,
      message: `Anomalous ${a.metricLabel.toLowerCase()}: ${a.value.toFixed(1)}`,
      time: Number(a.detected_at),
      severityLabel: "WARNING",
    }));

    const scriptItems: ActivityItem[] = scriptJobs.map((job) => ({
      id: `script-${job.id}`,
      message: `Script ${job.status?.toLowerCase() ?? "queued"}: ${(job.script ?? "").slice(0, 60) || "unnamed script"}`,
      time: Number(job.created_at ?? 0),
      severityLabel: job.status === "FAILED" ? "CRITICAL" : job.status === "SUCCESS" ? "INFO" : "WARNING",
    }));

    return [...eventItems, ...alertItems, ...anomalyItems, ...scriptItems].sort((a, b) => b.time - a.time);
  }, [events, alerts, batteryAnomalies, diskAnomalies, cpuAnomalies, scriptJobs]);

  if (!id) {
    return (
      <div className={styles.page}>
        <ErrorState message="Device ID not provided. Please select a device from the Devices list." />
      </div>
    );
  }

  if (isDeviceLoading) {
    return (
      <div className={styles.page}>
        <Loading label="Loading device details..." />
      </div>
    );
  }

  if (isDeviceError || !device || !device.id) {
    return (
      <div className={styles.page}>
        <ErrorState message="Unable to load device details. Check that the selected device exists and try again." />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <DeviceHeader
        deviceId={device.id}
        state={device.state}
        lastSeen={device.last_seen ?? device.time}
        healthScore={overallScore}
        onScanUpdates={queueWindowsUpdateScan}
        onInstallUpdates={queueWindowsUpdateInstall}
        isActionPending={createScan.isPending || createInstall.isPending || !canExecutePatch}
      />

      {updateActionMessage && (
        <Card fill>
          <div>{updateActionMessage}</div>
        </Card>
      )}

      <RebootIntelligenceCard
        facts={rebootFacts ?? undefined}
        daysSinceRestart={daysSinceRestart}
        healthScore={rebootHealthScore}
        recommendation={topRebootRecommendation}
        historyEntries={rebootHistory}
        isSafeToRestart={rebootSafety.isSafe}
        safetyReasons={rebootSafety.reasons}
        showSmartRestart={showSmartRestart}
        canExecute={canExecutePatch}
        isRestartPending={createReboot.isPending || createAdHocReboot.isPending}
        onSmartRestart={() => setIsRebootConfirmOpen(true)}
      />

      <UserPrivilegeCard summary={userPrivilegeSummary} />

      <div className={styles.topRow}>
        <div className={styles.overview}>
          <DeviceHealthOverview components={overallComponents} />
        </div>

        <div className={styles.summary}>
          <DeviceExecutiveSummary
            performanceTrend={performance.trend}
            batteryHealth={battery.healthScore}
            diskUsagePercent={hardware.disk !== undefined ? Number(hardware.disk) : undefined}
            pendingUpdates={Number(update.pending_updates ?? 0)}
            openAlertsCount={alerts.filter((a) => !a.resolved).length}
            hasData={Boolean(device)}
          />
        </div>
      </div>

      <h2 className={styles.sectionHeading}>Intelligence Services</h2>
      <Suspense
        fallback={
          <div className={styles.lazyFallback}>
            <Loading label="Loading intelligence cards..." />
          </div>
        }
      >
        <IntelligenceCardsSection
          performance={performance}
          battery={battery}
          storage={storage}
          security={security}
          updates={updates}
        />
      </Suspense>

      <h2 className={styles.sectionHeading}>Predictions</h2>
      <Suspense
        fallback={
          <div className={styles.lazyFallback}>
            <Loading label="Loading predictions..." />
          </div>
        }
      >
        <PredictionsSection
          battery={{ series: batterySeries, prediction: battery.prediction }}
          disk={{ series: diskSeries, prediction: storage.prediction }}
          cpu={{ series: cpuSeries, prediction: performance.prediction }}
          ram={{ series: ramSeries, prediction: ramPrediction }}
          updatesRisk={updates.risk}
        />
      </Suspense>

      <h2 className={styles.sectionHeading}>Recommendations</h2>
      <Suspense
        fallback={
          <div className={styles.lazyFallback}>
            <Loading label="Loading recommendations..." />
          </div>
        }
      >
        <RecommendationsSection recommendations={recommendations} />
      </Suspense>

      <h2 className={styles.sectionHeading}>Automation Suggestions</h2>
      <Suspense
        fallback={
          <div className={styles.lazyFallback}>
            <Loading label="Loading automation suggestions..." />
          </div>
        }
      >
        <AutomationSection automations={automations} />
      </Suspense>

      <ActivityFeed
        title="Health Timeline"
        subtitle="Device events, alerts, anomalies, and automation history"
        items={activityItems}
        emptyMessage="No recent activity for this device."
      />

      <h2 className={styles.sectionHeading}>Device Detail</h2>

      <DashboardWidget
        title="Activity Monitor"
        subtitle="Live CPU, memory, and disk trend"
        toolbar={
          <div className={styles.rangeBar}>
            {(["1h", "1d", "1w"] as const).map((value) => (
              <button
                key={value}
                onClick={() => setRange(value)}
                className={`${styles.rangeButton} ${range === value ? styles.rangeButtonActive : ""}`}
              >
                {value.toUpperCase()}
              </button>
            ))}
          </div>
        }
      >
        <div className={styles.chartsGrid}>
          <AreaChart title="CPU Usage" data={cpuSeries} color="#22c55e" />
          <AreaChart title="RAM Usage" data={ramSeries} color="#3b82f6" />
          <AreaChart title="Disk Usage" data={diskSeries} color="#f59e0b" />
        </div>
      </DashboardWidget>

      <div className={styles.detailGrid}>
        <BatteryDetails
          batteryHealthPercent={hardware.battery_health_percent !== undefined ? Number(hardware.battery_health_percent) : undefined}
          healthScore={battery.healthScore}
          trend={battery.trend}
          updatedAt={hardware.updated_at}
          projections={batteryProjections}
          replacementApproaching={batteryReplacementApproaching}
        />
      </div>

      <div className={styles.detailGrid}>
        <DashboardWidget title="Security Compliance">
          <StatusRow label="Bitlocker" value={compliance.bitlocker} />
          <StatusRow label="TPM" value={compliance.tpm} />
          <StatusRow label="Secure Boot" value={compliance.secureboot ?? compliance.secureBoot} />
          <StatusRow label="Windows Defender" value={compliance.defender} />
          <div className={styles.footNote}>
            Last checked: {compliance.updated_at ? new Date(Number(compliance.updated_at)).toLocaleString() : "-"}
          </div>
        </DashboardWidget>

        <DashboardWidget title="Security Posture">
          <RadarChart data={securityRadarData} color="#7c3aed" />
        </DashboardWidget>
      </div>

      <div className={styles.detailGrid}>
        <DashboardWidget title="Hardware Health">
          <StatusRow
            label="CPU Temp"
            value={hardware.cpu_temp}
            displayValue={hardware.cpu_temp !== undefined ? `${hardware.cpu_temp} °C` : "--"}
          />
          <StatusRow
            label="Disk Usage"
            value={hardware.disk}
            displayValue={hardware.disk !== undefined ? `${hardware.disk} %` : "--"}
          />
          <StatusRow
            label="Battery Health"
            value={hardware.battery_health}
            displayValue={`${hardware.battery_health ?? "--"} ${hardware.battery_health_percent ? `(${hardware.battery_health_percent}%)` : ""}`}
          />
          <StatusRow label="Fan Speed" value={hardware.fan_status} displayValue={hardware.fan_status ?? "--"} />
          <StatusRow
            label="Free Disk Space"
            value={hardware.disk_free}
            displayValue={`C Drive: ${hardware.disk_free ?? "--"} GB`}
          />

          <div className={styles.footNote}>AI Health Score: {hardware.health_score ?? "--"}/100</div>
        </DashboardWidget>

        <DashboardWidget title="System Updates & Drivers">
          {latestPatchJob && (
            <div className={styles.patchJobCard}>
              <div className={styles.patchJobHeader}>
                <Badge variant={patchStatusVariant(latestPatchJob.status)}>
                  {formatPatchAction(latestPatchJob.action)} · {formatPatchStatus(latestPatchJob.status)}
                </Badge>
                {isPatchJobActive && latestPatchJob.percent_complete !== undefined && latestPatchJob.percent_complete !== null && (
                  <span className={styles.footNote}>{latestPatchJob.percent_complete}%</span>
                )}
              </div>

              {latestPatchJob.current_step_detail && (
                <div className={styles.footNote}>{latestPatchJob.current_step_detail}</div>
              )}

              {canExecutePatch && (
                <div className={styles.patchJobActions}>
                  {PATCH_CANCELLABLE_STATUSES.has(latestPatchJob.status) && (
                    <button
                      className={styles.repairButton}
                      onClick={() => handleCancelPatchJob(latestPatchJob.id)}
                      disabled={cancelPatchJobMutation.isPending}
                    >
                      Cancel
                    </button>
                  )}

                  {latestPatchJob.status === "WAITING_FOR_REBOOT" && (
                    <button className={styles.repairButton} onClick={() => setIsRebootConfirmOpen(true)}>
                      Reboot Now
                    </button>
                  )}

                  {latestPatchJob.status === "FAILED" && (
                    <button
                      className={styles.repairButton}
                      onClick={() => handleRetryPatchJob(latestPatchJob.id)}
                      disabled={retryPatchJobMutation.isPending}
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <StatusRow label="Windows Update" value={update.windows_update_status} onFix={canExecutePatch ? queueWindowsUpdateScan : undefined} />
          <StatusRow
            label="Pending Updates"
            value={update.pending_updates}
            displayValue={String(update.pending_updates ?? "--")}
            onFix={canExecutePatch ? queueWindowsUpdateInstall : undefined}
          />
          <StatusRow
            label="Failed Updates"
            value={update.failed_updates}
            displayValue={String(update.failed_updates ?? "--")}
            onFix={canExecutePatch ? queueWindowsUpdateInstall : undefined}
          />
          <StatusRow label="Driver Health" value={update.driver_status} />
          <StatusRow
            label="Outdated Drivers"
            value={update.outdated_drivers}
            displayValue={String(update.outdated_drivers ?? "--")}
          />

          <div className={styles.footNote}>
            Last checked: {update.last_checked ? new Date(Number(update.last_checked)).toLocaleString() : "-"}
          </div>

          {patchHistory.length > 0 && (
            <div className={styles.patchHistoryList}>
              <div className={styles.issueTitle}>Recent Patch Activity</div>
              {patchHistory.slice(0, 5).map((entry) => (
                <div key={entry.id} className={styles.patchHistoryItem}>
                  <Badge variant={patchStatusVariant(entry.status)}>{formatPatchAction(entry.action)}</Badge>
                  <span>{formatPatchStatus(entry.status)}</span>
                  <span className={styles.footNote}>{new Date(entry.occurred_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </DashboardWidget>
      </div>

      <Modal
        isOpen={isRebootConfirmOpen}
        onClose={() => setIsRebootConfirmOpen(false)}
        titleId="reboot-confirm-title"
        title="Reboot this device now?"
      >
        <p className={styles.footNote}>
          {latestPatchJob?.status === "WAITING_FOR_REBOOT"
            ? "The device has updates waiting on a restart to finish installing."
            : "This device is recommended for a restart based on current uptime and reboot-health signals."}{" "}
          This will restart <strong>{device.id}</strong> immediately — make sure the user has saved their work.
        </p>
        <div className={styles.patchJobActions}>
          <Button type="button" variant="secondary" onClick={() => setIsRebootConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleConfirmReboot}
            disabled={createReboot.isPending || createAdHocReboot.isPending}
          >
            {createReboot.isPending || createAdHocReboot.isPending ? "Rebooting..." : "Reboot Now"}
          </Button>
        </div>
      </Modal>

      <DashboardWidget title="Windows Services & Drivers">
        <div className={styles.miniStatGrid}>
          <MiniStat
            title="Auto Services Stopped"
            value={inventory.services_summary?.auto_running_issue_count ?? 0}
            color={(inventory.services_summary?.auto_running_issue_count ?? 0) > 0 ? "#f59e0b" : "#22c55e"}
          />
          <MiniStat
            title="Recent Service Failures"
            value={inventory.services_summary?.recent_failure_count ?? 0}
            color={(inventory.services_summary?.recent_failure_count ?? 0) > 0 ? "#ef4444" : "#22c55e"}
          />
          <MiniStat
            title="Driver Problems"
            value={inventory.drivers_summary?.problem_count ?? 0}
            color={(inventory.drivers_summary?.problem_count ?? 0) > 0 ? "#ef4444" : "#22c55e"}
          />
          <MiniStat
            title="Outdated Drivers"
            value={inventory.drivers_summary?.outdated_count ?? 0}
            color={(inventory.drivers_summary?.outdated_count ?? 0) > 0 ? "#f59e0b" : "#22c55e"}
          />
        </div>

        <div className={styles.issueGrid}>
          <IssueList
            title="Automatic Services Not Running"
            items={ensureArray<{ name: string; display_name?: string; start_mode: string; state: string }>(
              inventory.services_summary?.auto_stopped
            ).map((service) => ({
              primary: service.display_name || service.name,
              secondary: `${service.name} • ${service.start_mode} • ${service.state}`,
            }))}
            emptyText="No automatic services are currently stopped."
          />

          <IssueList
            title="Recent Service Failures"
            items={ensureArray<{ time: number; id: number; message: string }>(
              inventory.services_summary?.recent_failures
            ).map((failure) => ({
              primary: `Event ${failure.id}`,
              secondary: `${failure.message} • ${new Date(Number(failure.time)).toLocaleString()}`,
            }))}
            emptyText="No recent service failures found."
          />

          <IssueList
            title="Driver Problems"
            items={ensureArray<{ name: string; status?: string; error_code?: number }>(
              inventory.drivers_summary?.problems
            ).map((driver) => ({
              primary: driver.name || "Unknown driver",
              secondary: `Status: ${driver.status ?? "Unknown"} • Error code: ${driver.error_code ?? "-"}`,
            }))}
            emptyText="No driver problems detected."
          />

          <IssueList
            title="Outdated Drivers"
            items={ensureArray<{ device_name?: string; manufacturer?: string; version?: string; driver_date?: string }>(
              inventory.drivers_summary?.outdated
            ).map((driver) => ({
              primary: driver.device_name || "Unknown device",
              secondary: `${driver.manufacturer ?? "Unknown vendor"} • ${driver.version ?? "-"} • ${driver.driver_date ?? "-"}`,
            }))}
            emptyText="No outdated drivers found."
          />
        </div>

        <div className={styles.footNote}>
          Last inventory refresh: {inventory.updated_at ? new Date(Number(inventory.updated_at)).toLocaleString() : "-"}
        </div>
      </DashboardWidget>

      <DashboardWidget title="Top Processes" isEmpty={processes.length === 0} emptyMessage="No process data yet.">
        {processes.map((p) => (
          <div key={p.name} className={styles.processRow}>
            <span>{p.name}</span>
            <span>{Number(p.cpu ?? 0).toFixed(1)}%</span>
          </div>
        ))}
      </DashboardWidget>
    </div>
  );
}

function StatusRow({
  label,
  value,
  displayValue,
  onFix,
}: {
  label: string;
  value: unknown;
  displayValue?: string;
  onFix?: () => void;
}) {
  const { ok, toneColor } = evaluateStatus(label, value);
  const text = displayValue ?? formatStatusValue(value);

  return (
    <div className={styles.statusRow}>
      <div className={styles.statusLabel}>{label}</div>

      <div className={styles.statusValueRow}>
        <span className={styles.statusValue} style={{ color: toneColor }}>
          {ok ? "OK" : "Check"} • {text}
        </span>

        {!ok && onFix && (
          <button className={styles.repairButton} onClick={onFix}>
            Repair
          </button>
        )}
      </div>
    </div>
  );
}

function MiniStat({ title, value, color }: { title: string; value: number | string; color: string }) {
  return (
    <div className={styles.miniStat}>
      <div className={styles.miniStatTitle}>{title}</div>
      <div className={styles.miniStatValue} style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function IssueList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: Array<{ primary: string; secondary: string }>;
  emptyText: string;
}) {
  return (
    <div className={styles.issueCard}>
      <div className={styles.issueTitle}>{title}</div>

      <div className={styles.issueList}>
        {items.length === 0 && <div className={styles.issueEmpty}>{emptyText}</div>}

        {items.map((item, index) => (
          <div key={`${item.primary}-${index}`} className={styles.issueItem}>
            <div className={styles.issueItemTitle}>{item.primary}</div>
            <div className={styles.issueItemMeta}>{item.secondary}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function evaluateStatus(label: string, value: unknown) {
  const text = String(value ?? "").trim().toUpperCase();
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;

  if (label === "CPU Temp") {
    const ok = Number.isFinite(numberValue) && numberValue < 70;
    return { ok, toneColor: ok ? "#16a34a" : "#dc2626" };
  }

  if (label === "Disk Usage") {
    const ok = Number.isFinite(numberValue) && numberValue < 80;
    return { ok, toneColor: ok ? "#16a34a" : "#dc2626" };
  }

  if (label === "Battery Health") {
    const ok = ["EXCELLENT", "GOOD", "HEALTHY", "NORMAL"].some((token) => text.includes(token));
    return { ok, toneColor: ok ? "#16a34a" : "#d97706" };
  }

  if (label === "Free Disk Space") {
    const ok = Number.isFinite(numberValue) && numberValue > 10;
    return { ok, toneColor: ok ? "#16a34a" : "#d97706" };
  }

  if (label === "Pending Updates" || label === "Outdated Drivers" || label === "Failed Updates") {
    const ok = Number.isFinite(numberValue) ? numberValue === 0 : text === "0" || text === "NONE";
    return { ok, toneColor: ok ? "#16a34a" : "#d97706" };
  }

  if (label === "Windows Update" || label === "Driver Health") {
    const ok = ["UP TO DATE", "UPDATED", "HEALTHY", "OK", "GOOD", "ENABLED"].some((token) => text.includes(token));
    return { ok, toneColor: ok ? "#16a34a" : "#d97706" };
  }

  const ok = normalizeBooleanLike(value);
  return { ok, toneColor: ok ? "#16a34a" : "#dc2626" };
}

function normalizeBooleanLike(value: unknown) {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "").trim().toUpperCase();
  return ["TRUE", "YES", "ON", "ENABLED", "READY", "ACTIVE", "OK", "GOOD", "PRESENT"].includes(text);
}

function formatStatusValue(value: unknown) {
  if (value === undefined || value === null || value === "") return "--";
  if (typeof value === "boolean") return value ? "Enabled" : "Disabled";
  return String(value);
}
