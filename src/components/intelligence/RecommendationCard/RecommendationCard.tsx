import Card from "../../ui/Card";
import Badge from "../../ui/Badge/Badge";
import ConfidenceBadge from "../ConfidenceBadge";
import type { Recommendation, RiskSeverity } from "@/lib/intelligence/types";
import styles from "./RecommendationCard.module.css";

interface RecommendationCardProps {
  recommendation: Recommendation;
}

const severityVariant: Record<RiskSeverity, "success" | "warning" | "danger" | "info"> = {
  Low: "info",
  Medium: "warning",
  High: "danger",
  Critical: "danger",
};

export default function RecommendationCard({ recommendation }: RecommendationCardProps) {
  return (
    <Card fill>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.title}>{recommendation.title}</div>
          <Badge variant={severityVariant[recommendation.severity]}>
            {recommendation.category}
          </Badge>
        </div>

        <p className={styles.description}>{recommendation.description}</p>
        <p className={styles.reason}>{recommendation.reason}</p>

        <div className={styles.footer}>
          <span className={styles.benefit}>{recommendation.expectedBenefit}</span>
          <ConfidenceBadge confidence={recommendation.confidence} />
        </div>

        <div className={styles.action}>{recommendation.suggestedAction}</div>
      </div>
    </Card>
  );
}
