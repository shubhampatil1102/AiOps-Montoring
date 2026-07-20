import Card from "../../ui/Card";
import Badge from "../../ui/Badge/Badge";
import type { RiskAssessment, RiskSeverity } from "@/lib/intelligence/types";
import styles from "./RiskCard.module.css";

interface RiskCardProps {
  risk: RiskAssessment;
}

const severityVariant: Record<RiskSeverity, "success" | "warning" | "danger" | "info"> = {
  Low: "success",
  Medium: "warning",
  High: "danger",
  Critical: "danger",
};

export default function RiskCard({ risk }: RiskCardProps) {
  return (
    <Card fill>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.score}>{risk.riskScore}</div>
          <Badge variant={severityVariant[risk.severity]}>{risk.severity}</Badge>
        </div>

        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.label}>Priority</span>
            <span className={styles.value}>{risk.priority}</span>
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Urgency</span>
            <span className={styles.value}>{risk.urgency}</span>
          </div>
        </div>

        <p className={styles.impact}>{risk.businessImpact}</p>
      </div>
    </Card>
  );
}
