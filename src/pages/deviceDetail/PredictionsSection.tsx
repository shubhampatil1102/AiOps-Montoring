import { ForecastWidget, PredictionCard, RiskCard } from "@/components/intelligence";
import type { Prediction, RiskAssessment, TimeSeriesPoint } from "@/lib/intelligence/types";

interface MetricForecast {
  series: TimeSeriesPoint[];
  prediction: Prediction;
}

interface PredictionsSectionProps {
  battery: MetricForecast;
  disk: MetricForecast;
  cpu: MetricForecast;
  ram: MetricForecast;
  updatesRisk: RiskAssessment;
}

const warrantyPrediction: Prediction = {
  metric: "warranty",
  insufficientData: true,
  predictedDate: null,
  confidence: 0,
  reason: "No warranty data is collected for this device yet.",
};

const certificatePrediction: Prediction = {
  metric: "certificate",
  insufficientData: true,
  predictedDate: null,
  confidence: 0,
  reason: "No certificate inventory is collected for this device yet.",
};

export default function PredictionsSection({ battery, disk, cpu, ram, updatesRisk }: PredictionsSectionProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 16,
      }}
    >
      <ForecastWidget
        title="Battery replacement forecast"
        series={battery.series}
        prediction={battery.prediction}
        thresholdValue={20}
        color="#16a34a"
      />

      <ForecastWidget
        title="Disk full forecast"
        series={disk.series}
        prediction={disk.prediction}
        thresholdValue={95}
        color="#f59e0b"
      />

      <ForecastWidget
        title="Performance degradation (CPU)"
        series={cpu.series}
        prediction={cpu.prediction}
        thresholdValue={90}
        color="#2563eb"
      />

      <ForecastWidget
        title="Memory exhaustion forecast"
        series={ram.series}
        prediction={ram.prediction}
        thresholdValue={95}
        color="#dc2626"
      />

      <PredictionCard prediction={warrantyPrediction} />
      <PredictionCard prediction={certificatePrediction} />

      <RiskCard risk={updatesRisk} />
    </div>
  );
}
