import { useMemo } from "react";
import useDashboardData from "../hooks/useDashboardData";
import useMetricsHistory from "../hooks/useMetricsHistory";
import PageHeader from "../layouts/PageHeader";
import DashboardWidget from "../components/dashboard/DashboardWidget";
import OrgHealthCard from "../components/dashboard/widgets/OrgHealthCard";
import AiSummaryCard from "../components/dashboard/widgets/AiSummaryCard";
import IntelligenceCard from "../components/dashboard/widgets/IntelligenceCard";
import FleetBatteryWidget from "../components/dashboard/widgets/FleetBatteryWidget";
import PatchComplianceWidget from "../components/dashboard/widgets/PatchComplianceWidget";
import RebootHealthWidget from "../components/dashboard/widgets/RebootHealthWidget";
import QuickActionsBar from "../components/dashboard/widgets/QuickActionsBar";
import TopAlertingDevicesWidget from "../components/dashboard/widgets/TopAlertingDevicesWidget";
import AIInsightsWidget from "../components/dashboard/widgets/AIInsightWidget";
import DeviceHealthGrid from "../components/live/DeviceHealthGrid";
import ActivityFeed from "../components/common/ActivityFeed";
import Loading from "../components/common/Loading";
import ErrorState from "../components/common/ErrorState";
import { getSeverity } from "../utils/severity";
import { calculateHealthScore } from "@/lib/intelligence/healthScoreEngine";
import { averageDeviceMetric, averageHardwareMetric } from "@/lib/intelligence/adapters";
import {
  Cpu,
  BatteryMedium,
  HardDrive,
  ShieldCheck,
  Wifi,
  Boxes,
  NotepadTextDashedIcon,
  Crosshair
} from "lucide-react";
import styles from "./Dashboard.module.css";

export default function Dashboard() {
  const {
    devices,
    alerts,
    hardware,
    healthy,
    warning,
    critical,
    offline,
    activeAlerts,
    isLoading,
    isError,
  } = useDashboardData();

  const { data: metricsHistory = [] } = useMetricsHistory();

  const criticalDevices = useMemo(
    () => [...critical, ...warning],
    [critical, warning]
  );

  const activityItems = useMemo(
    () =>
      alerts.slice(0, 15).map((alert) => ({
        id: `${alert.id}-${alert.time}`,
        message: alert.message,
        time: alert.time,
        severityLabel: getSeverity(alert.message).label,
        meta: alert.id,
      })),
    [alerts]
  );

  const performance = useMemo(() => {
    if (devices.length === 0) return { score: undefined, trend: undefined };

    const avgCpu = averageDeviceMetric(devices, "cpu");
    const avgRam = averageDeviceMetric(devices, "ram");

    const { score } = calculateHealthScore([
      { label: "cpu", value: 100 - avgCpu, weight: 1 },
      { label: "ram", value: 100 - avgRam, weight: 1 },
    ]);

    const trend = metricsHistory.slice(-15).map((point) => Number(point.cpu || 0));

    return { score, trend };
  }, [devices, metricsHistory]);

  const battery = useMemo(() => {
    const avgBattery = averageHardwareMetric(hardware, "battery_health_percent");
    if (avgBattery === undefined) return { score: undefined };

    const { score } = calculateHealthScore([
      { label: "battery_health_percent", value: avgBattery, weight: 1 },
    ]);

    return { score };
  }, [hardware]);

  const storage = useMemo(() => {
    const avgDisk = averageHardwareMetric(hardware, "disk");
    if (avgDisk === undefined) return { score: undefined };

    const { score } = calculateHealthScore([
      { label: "disk", value: 100 - avgDisk, weight: 1 },
    ]);

    return { score };
  }, [hardware]);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <PageHeader
          title="AI Command Center"
          description="Loading organization overview..."
        />

        <div className={styles.topRow}>
          <DashboardWidget title="Organization Health"><Loading /></DashboardWidget>
          <DashboardWidget title="AI Executive Summary"><Loading /></DashboardWidget>
        </div>

        <div className={styles.attentionRow}>
          <DashboardWidget title="Devices Needing Attention"><Loading /></DashboardWidget>
          <DashboardWidget title="AI Insights"><Loading /></DashboardWidget>
        </div>

        <DashboardWidget title="Critical Devices"><Loading /></DashboardWidget>
        <DashboardWidget title="Intelligence Services Overview"><Loading /></DashboardWidget>
        <DashboardWidget title="Recent Activity"><Loading /></DashboardWidget>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.page}>
        <PageHeader
          title="AI Command Center"
          description="How healthy is the organization, and what needs attention."
        />

        <ErrorState message="Unable to load dashboard data. Please check your connection and try again." />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="AI Command Center"
        description="How healthy is the organization, and what needs attention."
      />

      <div className={styles.topRow}>
        <div className={styles.orgHealth}>
          <OrgHealthCard
            healthy={healthy.length}
            warning={warning.length}
            critical={critical.length}
            offline={offline.length}
          />
        </div>

        <div className={styles.aiSummary}>
          <AiSummaryCard
            totalDevices={devices.length}
            healthy={healthy.length}
            critical={critical.length}
            activeAlerts={activeAlerts}
          />
        </div>
      </div>
<div className={styles.criticalSection}>
        <DashboardWidget
          title="Critical Devices"
          subtitle="Devices in a warning or critical state"
          isEmpty={criticalDevices.length === 0}
          emptyMessage= "All devices are healthy. No immediate attention is required." 
        >
          <DeviceHealthGrid devices={criticalDevices} hardware={hardware} />
        </DashboardWidget>
      </div>
      <div className={styles.attentionRow}>
        <div className={styles.attention}>
          <TopAlertingDevicesWidget alerts={alerts} />
        </div>

        <div className={styles.insights}>
          <AIInsightsWidget />
        </div>
      </div>

     

      <div className={styles.intelligenceSection}>
        <h2 className={styles.intelligenceHeading}>Intelligence Services Overview</h2>

        <div className={styles.intelligenceGrid}>
          <IntelligenceCard
            title="Performance"
            icon={Cpu}
            color="#2563eb"
            score={performance.score}
            trend={performance.trend}
            summary="Fleet-wide CPU and memory load."
          />

          <IntelligenceCard
            title="Battery"
            icon={BatteryMedium}
            color="#16a34a"
            score={battery.score}
            summary="Average battery capacity health."
          />

          <IntelligenceCard
            title="Storage"
            icon={HardDrive}
            color="#f59e0b"
            score={storage.score}
            summary="Average disk usage across the fleet."
          />

          <IntelligenceCard
            title="Security"
            icon={ShieldCheck}
            color="#7c3aed"
            comingSoon
          />

          <IntelligenceCard
            title="Network"
            icon={Wifi}
            color="#0ea5e9"
            comingSoon
          />

          <IntelligenceCard
            title="Asset"
            icon={Boxes}
            color="#64748b"
            comingSoon
          />
        </div>

        <FleetBatteryWidget hardware={hardware} averageScore={battery.score} />
        <PatchComplianceWidget />
        <RebootHealthWidget />
      </div>

      <div className={styles.activitySection}>
        <ActivityFeed
          title="Recent Activity"
          subtitle="Latest device alerts"
          items={activityItems}
          emptyMessage="No recent activity."
        />
      </div>

      <div className={styles.actionsSection}>
        <QuickActionsBar />
      </div>
    </div>
  );
}
