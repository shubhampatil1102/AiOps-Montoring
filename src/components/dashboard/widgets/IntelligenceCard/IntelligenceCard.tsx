import { Cpu } from "lucide-react";
import Card from "../../../ui/Card";
import Sparkline from "@/components/charts/Sparkline";
import styles from "./IntelligenceCard.module.css";

interface IntelligenceCardProps {
  title: string;
  icon: typeof Cpu;
  color: string;
  score?: number;
  trend?: number[];
  summary?: string;
  comingSoon?: boolean;
}

export default function IntelligenceCard({
  title,
  icon: Icon,
  color,
  score,
  trend,
  summary,
  comingSoon = false,
}: IntelligenceCardProps) {
  return (
    <Card fill>
      <div className={styles.card}>
        <div className={styles.header}>
          <div
            className={styles.iconWrapper}
            style={{ background: `${color}1a`, color }}
          >
            <Icon size={16} />
          </div>
          <div className={styles.title}>{title}</div>
        </div>

        {comingSoon ? (
          <div className={styles.comingSoon}>Coming soon</div>
        ) : (
          <>
            <div className={styles.scoreRow}>
              <div className={styles.score} style={{ color }}>
                {score !== undefined ? Math.round(score) : "--"}
              </div>
              <div className={styles.scoreLabel}>Health Score</div>
            </div>

            {trend && trend.length > 1 ? (
              <Sparkline data={trend} color={color} height={28} />
            ) : (
              <div className={styles.noTrend}>No trend data yet</div>
            )}

            {summary && <p className={styles.summary}>{summary}</p>}

            <div className={styles.predictionRow}>
              <span>Prediction</span>
              <span className={styles.predictionValue}>
                Coming soon
              </span>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
