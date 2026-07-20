import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Card from "../../ui/Card";
import EmptyState from "@/components/common/EmptyState";
import ConfidenceBadge from "../ConfidenceBadge";
import type { Prediction, TimeSeriesPoint } from "@/lib/intelligence/types";
import styles from "./ForecastWidget.module.css";

interface ForecastWidgetProps {
  title: string;
  series: TimeSeriesPoint[];
  prediction: Prediction;
  thresholdValue?: number;
  color?: string;
}

export default function ForecastWidget({
  title,
  series,
  prediction,
  thresholdValue,
  color = "#2563eb",
}: ForecastWidgetProps) {
  if (prediction.insufficientData || !prediction.predictedDate) {
    return (
      <Card fill>
        <div className={styles.header}>{title}</div>
        <EmptyState message={prediction.reason} />
      </Card>
    );
  }

  const sorted = [...series].sort((a, b) => a.time - b.time);
  const last = sorted[sorted.length - 1];

  const chartData: { label: string; actual: number | null; projected: number | null }[] =
    sorted.map((p) => ({
      label: new Date(p.time).toLocaleDateString(),
      actual: p.value,
      projected: null,
    }));

  if (chartData.length > 0) {
    chartData[chartData.length - 1].projected = last.value;
  }

  chartData.push({
    label: new Date(prediction.predictedDate).toLocaleDateString(),
    actual: null,
    projected: thresholdValue ?? last.value,
  });

  return (
    <Card fill>
      <div className={styles.header}>{title}</div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Line dataKey="actual" stroke={color} strokeWidth={2} dot={false} />
          <Line
            dataKey="projected"
            stroke={color}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>

      <div className={styles.summary}>
        <p className={styles.reason}>{prediction.reason}</p>
        <ConfidenceBadge confidence={prediction.confidence} />
      </div>
    </Card>
  );
}
