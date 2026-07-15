import styles from "./RecentAlertsWidget.module.css";

import { Bell, Circle, RefreshCcw } from "lucide-react";

import Button from "../../../ui/Button";
import Card from "../../../ui/Card";
import DashboardWidget from "../../DashboardWidget";

export interface Alert {
  id: string;
  message: string;
  time: number;
}

interface RecentAlertsWidgetProps {
  alerts: Alert[];
}

export default function RecentAlertsWidget({
  alerts,
}: RecentAlertsWidgetProps) {
  if (alerts.length === 0) {
    return (
      <Card>
        <div className={styles.empty}>
          <Bell size={40} />
          <h3>No Alerts</h3>
          <p>Your environment is healthy.</p>
        </div>
      </Card>
    );
  }

  return (
    <DashboardWidget
      title="Recent Alerts"
      subtitle={`${alerts.length} Active Alerts`}
      actions={
        <Button variant="secondary">
          <RefreshCcw size={16} />
          Refresh
        </Button>
      }
      toolbar={
        <select className={styles.filter}>
          <option>All Alerts</option>
          <option>Critical</option>
          <option>Warning</option>
        </select>
      }
      footer={
        <Button>
          View All Alerts ({alerts.length})
        </Button>
      }
    >
      <div className={styles.timeline}>
        {alerts.map((alert) => (
          <div
            key={`${alert.id}-${alert.time}`}
            className={styles.alertItem}
          >
            <div className={styles.alertHeader}>
              <Circle
                size={10}
                fill="currentColor"
                className={styles.alertDot}
              />

              <strong>{alert.id}</strong>
            </div>

            <div className={styles.alertMessage}>
              {alert.message}
            </div>

            <div className={styles.alertTime}>
              {new Date(alert.time).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </DashboardWidget>
  );
}