import styles from "./ActivityFeed.module.css";
import { Circle } from "lucide-react";
import DashboardWidget from "@/components/dashboard/DashboardWidget";
import EmptyState from "../EmptyState";
import { timeAgo } from "@/utils/time";

export interface ActivityItem {
  id: string;
  message: string;
  time: number;
  severityLabel: "CRITICAL" | "WARNING" | "INFO" | string;
  meta?: string;
}

interface ActivityFeedProps {
  title: string;
  subtitle?: string;
  items: ActivityItem[];
  emptyMessage?: string;
  limit?: number;
}

const severityClass: Record<string, string> = {
  CRITICAL: "critical",
  WARNING: "warning",
  INFO: "info",
};

export default function ActivityFeed({
  title,
  subtitle,
  items,
  emptyMessage = "No recent activity.",
  limit = 15,
}: ActivityFeedProps) {
  const visible = items.slice(0, limit);

  return (
    <DashboardWidget title={title} subtitle={subtitle}>
      <div className={styles.list}>

        {visible.length === 0 && (
          <EmptyState message={emptyMessage} />
        )}

        {visible.map((item, index) => (
          <div key={`${item.id}-${index}`} className={styles.row}>

            <Circle
              size={10}
              fill="currentColor"
              className={`${styles.dot} ${styles[severityClass[item.severityLabel] || "info"]}`}
            />

            <div className={styles.content}>
              <div className={styles.message}>{item.message}</div>
              {item.meta && (
                <div className={styles.meta}>{item.meta}</div>
              )}
            </div>

            <div className={styles.time}>{timeAgo(item.time)}</div>

          </div>
        ))}

      </div>
    </DashboardWidget>
  );
}
