import { Sparkles } from "lucide-react";
import DashboardWidget from "@/components/dashboard/DashboardWidget";
import type { HealthScore, TrendResult } from "@/lib/intelligence/types";
import styles from "./DeviceExecutiveSummary.module.css";

interface DeviceExecutiveSummaryProps {
  performanceTrend: TrendResult;
  batteryHealth?: HealthScore;
  diskUsagePercent?: number;
  pendingUpdates: number;
  openAlertsCount: number;
  hasData: boolean;
}

function buildSentences(props: DeviceExecutiveSummaryProps): string[] {
  const sentences: string[] = [];

  if (props.performanceTrend.sampleSize > 1 && props.performanceTrend.direction !== "flat") {
    sentences.push(
      `CPU usage has been ${props.performanceTrend.direction === "up" ? "increasing" : "decreasing"} recently.`
    );
  }

  if (props.batteryHealth && props.batteryHealth.level !== "Unknown") {
    sentences.push(
      props.batteryHealth.level === "Critical" || props.batteryHealth.level === "Warning"
        ? "Battery health is degrading and may need attention."
        : "Battery health is normal."
    );
  }

  if (props.diskUsagePercent !== undefined) {
    sentences.push(
      props.diskUsagePercent >= 80
        ? `Disk usage is high at ${props.diskUsagePercent.toFixed(0)}%.`
        : "Disk usage is within normal range."
    );
  }

  if (props.pendingUpdates > 0) {
    sentences.push(
      `${props.pendingUpdates} update${props.pendingUpdates === 1 ? "" : "s"} pending installation.`
    );
  }

  sentences.push(
    props.openAlertsCount > 0
      ? `${props.openAlertsCount} open alert${props.openAlertsCount === 1 ? "" : "s"} for this device.`
      : "No open alerts for this device."
  );

  return sentences;
}

export default function DeviceExecutiveSummary(props: DeviceExecutiveSummaryProps) {
  const sentences = props.hasData
    ? buildSentences(props)
    : ["Not enough data yet to generate a summary for this device."];

  return (
    <DashboardWidget title="AI Executive Summary" subtitle="Computed from this device's live data">
      <div className={styles.summary}>
        <Sparkles size={18} className={styles.icon} />
        <p>{sentences.join(" ")}</p>
      </div>
    </DashboardWidget>
  );
}
