import styles from "./TopAlertingDevicesWidget.module.css";
import DashboardWidget from "../../DashboardWidget";
import Badge from "../../../ui/Badge/Badge";
import EmptyState from "@/components/common/EmptyState";
import { getSeverity } from "@/utils/severity";
import { timeAgo } from "@/utils/time";
import type { Alert } from "@/types/dashboard";

interface TopAlertingDevicesWidgetProps {
  alerts: Alert[];
}

const severityBadgeVariant: Record<string, "danger" | "warning" | "info"> = {
  CRITICAL: "danger",
  WARNING: "warning",
  INFO: "info",
};

const severityRank: Record<string, number> = {
  CRITICAL: 3,
  WARNING: 2,
  INFO: 1,
};

interface DeviceAlertSummary {
  deviceId: string;
  count: number;
  lastTime: number;
  severityLabel: string;
}

function summarizeByDevice(alerts: Alert[]): DeviceAlertSummary[] {
  const byDevice = new Map<string, DeviceAlertSummary>();

  for (const alert of alerts) {
    const { label } = getSeverity(alert.message);
    const existing = byDevice.get(alert.id);

    if (!existing) {
      byDevice.set(alert.id, {
        deviceId: alert.id,
        count: 1,
        lastTime: alert.time,
        severityLabel: label,
      });
      continue;
    }

    existing.count += 1;
    existing.lastTime = Math.max(existing.lastTime, alert.time);

    if (severityRank[label] > severityRank[existing.severityLabel]) {
      existing.severityLabel = label;
    }
  }

  return Array.from(byDevice.values()).sort((a, b) => b.count - a.count);
}

export default function TopAlertingDevicesWidget({
  alerts,
}: TopAlertingDevicesWidgetProps) {
  const topDevices = summarizeByDevice(alerts).slice(0, 5);

  return (
    <DashboardWidget
      title="Top Alerting Devices"
      subtitle="Most active devices by alert volume"
    >

      <div className={styles.list}>

        {topDevices.length === 0 && (
          <EmptyState message="No alerting devices right now." />
        )}

        {topDevices.map((device) => (

          <div
            key={device.deviceId}
            className={styles.row}
          >

            <div className={styles.content}>
              <div className={styles.message}>
                {device.deviceId}
              </div>

              <div className={styles.device}>
                Last alert {timeAgo(device.lastTime)}
              </div>
            </div>

            <div className={styles.right}>
              <Badge variant={severityBadgeVariant[device.severityLabel]}>
                {device.severityLabel}
              </Badge>

              <span className={styles.count}>
                {device.count}
              </span>
            </div>

          </div>

        ))}

      </div>

    </DashboardWidget>
  );
}
