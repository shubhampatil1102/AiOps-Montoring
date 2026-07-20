import { Sparkles } from "lucide-react";
import DashboardWidget from "../../DashboardWidget";
import styles from "./AiSummaryCard.module.css";
import type { Alert } from "@/types/dashboard";

interface AiSummaryCardProps {
  totalDevices: number;
  healthy: number;
  critical: number;
  activeAlerts: Alert[];
}

function buildSummary({
  totalDevices,
  healthy,
  critical,
  activeAlerts,
}: AiSummaryCardProps) {
  if (totalDevices === 0) {
    return "No devices are reporting yet. Once agents check in, this summary will reflect fleet health automatically.";
  }

  const healthyPart = `${healthy} of ${totalDevices} device${totalDevices === 1 ? "" : "s"} are healthy`;
  const criticalPart =
    critical > 0
      ? `, ${critical} device${critical === 1 ? "" : "s"} need${critical === 1 ? "s" : ""} immediate attention`
      : ", none are in a critical state";

  const topAlert = activeAlerts[0];
  const issuePart = topAlert
    ? ` Top open issue: ${topAlert.message} on ${topAlert.id}.`
    : " No unacknowledged alerts right now.";

  return `${healthyPart}${criticalPart}.${issuePart}`;
}

export default function AiSummaryCard(props: AiSummaryCardProps) {
  return (
    <DashboardWidget
      title="AI Executive Summary"
      subtitle="Computed from live fleet data"
    >
      <div className={styles.summary}>
        <Sparkles size={18} className={styles.icon} />
        <p>{buildSummary(props)}</p>
      </div>
    </DashboardWidget>
  );
}
