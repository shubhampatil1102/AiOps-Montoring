import { Circle } from "lucide-react";
import Card from "../../ui/Card";
import type { Insight, RiskSeverity } from "@/lib/intelligence/types";
import styles from "./InsightCard.module.css";

interface InsightCardProps {
  insight: Insight;
}

const severityColor: Record<RiskSeverity, string> = {
  Low: "#3b82f6",
  Medium: "#f59e0b",
  High: "#ef4444",
  Critical: "#dc2626",
};

export default function InsightCard({ insight }: InsightCardProps) {
  return (
    <Card fill>
      <div className={styles.row}>
        <Circle
          size={8}
          fill="currentColor"
          style={{ color: severityColor[insight.severity] }}
        />
        <span className={styles.message}>{insight.message}</span>
      </div>
    </Card>
  );
}
