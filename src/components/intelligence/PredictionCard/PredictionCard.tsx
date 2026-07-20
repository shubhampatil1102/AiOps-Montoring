import Card from "../../ui/Card";
import ConfidenceBadge from "../ConfidenceBadge";
import type { Prediction } from "@/lib/intelligence/types";
import styles from "./PredictionCard.module.css";

interface PredictionCardProps {
  prediction: Prediction;
}

export default function PredictionCard({ prediction }: PredictionCardProps) {
  return (
    <Card fill>
      <div className={styles.card}>
        {prediction.insufficientData || !prediction.predictedDate ? (
          <p className={styles.reason}>{prediction.reason}</p>
        ) : (
          <>
            <div className={styles.date}>
              {new Date(prediction.predictedDate).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
            <p className={styles.reason}>{prediction.reason}</p>
          </>
        )}

        <ConfidenceBadge confidence={prediction.confidence} />
      </div>
    </Card>
  );
}
