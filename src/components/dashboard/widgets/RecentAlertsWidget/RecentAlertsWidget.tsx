import { useEffect, useState } from "react";
import styles from "./RecentAlertsWidget.module.css";
import { Circle, RefreshCcw } from "lucide-react";
import Button from "../../../ui/Button";
import DashboardWidget from "../../DashboardWidget";
import EmptyState from "@/components/common/EmptyState";

export interface Alert {
  id: string;
  message: string;
  time: number;
}

interface RecentAlertsWidgetProps {
  alerts: Alert[];
}

function getSeverity(message: string) {
  const text = message.toLowerCase();

  if (text.includes("critical")) return "critical";
  if (text.includes("cpu")) return "warning";
  if (text.includes("ram")) return "warning";
  if (text.includes("disk")) return "medium";

  return "info";
}

function timeAgo(time: number) {
  const diff = Math.floor((Date.now() - Number(time)) / 60000);

  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff} min ago`;

  const hrs = Math.floor(diff / 60);

  if (hrs < 24) return `${hrs} hr ago`;

  return `${Math.floor(hrs / 24)} day ago`;
}

export default function RecentAlertsWidget({
  alerts,
}: RecentAlertsWidgetProps) {
  // Local tick so relative "time ago" labels stay fresh without
  // forcing the whole dashboard to re-render every second.
  const [, forceTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => forceTick((tick) => tick + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <DashboardWidget
      title="Recent Alerts"
      subtitle={`${alerts.length} Active Alerts`}
      
      actions={
        <Button variant="secondary">
          <RefreshCcw size={14} />
          Refresh
        </Button>
      }
      footer={
        <Button>
          View All Alerts ({alerts.length})
        </Button>
      }
    >

      <div className={styles.list}>

        {alerts.length === 0 && (
          <EmptyState message="No active alerts." />
        )}

        {alerts.slice(0, 5).map((alert) => {

          const severity = getSeverity(alert.message);

          return (

            <div
              key={`${alert.id}-${alert.time}`}
              className={styles.row}
            >

              <Circle
                size={10}
                fill="currentColor"
                className={`${styles.dot} ${styles[severity]}`}
              />

              <div className={styles.content}>

                <div className={styles.message}>
                  {alert.message}
                </div>

                <div className={styles.device}>
                  {alert.id}
                </div>

              </div>

              <div className={styles.time}>
                {timeAgo(alert.time)}
              </div>

            </div>

          );

        })}

      </div>

    </DashboardWidget>
  );
}