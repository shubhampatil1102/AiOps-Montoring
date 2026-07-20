import Card from "../../ui/Card";
import Badge from "../../ui/Badge/Badge";
import RadialProgress from "@/components/charts/RadialProgress";
import type { HealthScore } from "@/lib/intelligence/types";
import styles from "./HealthScoreCard.module.css";

interface HealthScoreCardProps {
  title: string;
  healthScore: HealthScore;
  color?: string;
}

const levelVariant = {
  Healthy: "success",
  Good: "info",
  Warning: "warning",
  Critical: "danger",
  Unknown: "default",
} as const;

const levelColor: Record<string, string> = {
  Healthy: "#22c55e",
  Good: "#2563eb",
  Warning: "#f59e0b",
  Critical: "#ef4444",
  Unknown: "#94a3b8",
};

export default function HealthScoreCard({
  title,
  healthScore,
  color,
}: HealthScoreCardProps) {
  const ringColor = color ?? levelColor[healthScore.level];

  return (
    <Card fill>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.title}>{title}</div>
          <Badge variant={levelVariant[healthScore.level]}>
            {healthScore.level}
          </Badge>
        </div>

        <RadialProgress
          value={healthScore.score}
          label="Health Score"
          color={ringColor}
          size={120}
        />
      </div>
    </Card>
  );
}
