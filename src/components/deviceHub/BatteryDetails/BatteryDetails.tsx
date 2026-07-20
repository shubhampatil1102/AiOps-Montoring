import DashboardWidget from "@/components/dashboard/DashboardWidget";
import { TrendCard } from "@/components/intelligence";
import Badge from "@/components/ui/Badge/Badge";
import type { HealthScore, TrendResult } from "@/lib/intelligence/types";
import type { HorizonProjection } from "@/lib/intelligence/predictionEngine";
import { timeAgo } from "@/utils/time";
import styles from "./BatteryDetails.module.css";

interface BatteryDetailsProps {
  batteryHealthPercent?: number;
  healthScore: HealthScore;
  trend: TrendResult;
  updatedAt?: number;
  projections: HorizonProjection[];
  replacementApproaching: boolean;
}

// Fields the brief asks for that have no data source anywhere in the
// schema or agent payload — shown explicitly rather than fabricated or hidden.
const NOT_AVAILABLE_FIELDS = [
  "Design Capacity",
  "Full Charge Capacity",
  "Cycle Count",
  "Battery Temperature",
  "Charging State",
  "Power Source",
  "Estimated Runtime",
  "Battery Age",
  "Manufacturer",
  "Model",
  "Serial Number",
];

const levelVariant = {
  Healthy: "success",
  Good: "info",
  Warning: "warning",
  Critical: "danger",
  Unknown: "default",
} as const;

function Field({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={muted ? styles.fieldValueMuted : styles.fieldValue}>{value}</span>
    </div>
  );
}

export default function BatteryDetails({
  batteryHealthPercent,
  healthScore,
  trend,
  updatedAt,
  projections,
  replacementApproaching,
}: BatteryDetailsProps) {
  return (
    <>
      <DashboardWidget
        title="Battery Overview"
        subtitle="Real fields from live telemetry — fields with no data source are marked explicitly"
        actions={replacementApproaching ? <Badge variant="danger">Replacement approaching</Badge> : undefined}
      >
        <div className={styles.fieldsGrid}>
          <Field label="Battery Health Score" value={`${Math.round(healthScore.score)}/100`} />
          <Field
            label="Current Capacity"
            value={batteryHealthPercent !== undefined ? `${batteryHealthPercent.toFixed(1)}%` : "--"}
          />
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Health Level</span>
            <Badge variant={levelVariant[healthScore.level]}>{healthScore.level}</Badge>
          </div>
          <Field label="Last Updated" value={updatedAt ? timeAgo(updatedAt) : "--"} />

          {NOT_AVAILABLE_FIELDS.map((label) => (
            <Field key={label} label={label} value="Not available" muted />
          ))}
        </div>

        <div className={styles.footNote}>
          Charging behavior (start/end %, overnight charging, drain rates) is not collected by the current agent.
        </div>
      </DashboardWidget>

      <TrendCard
        title="Battery Capacity Trend"
        subtitle="Rolling trend from real history"
        trend={trend}
        color="#16a34a"
      />

      <DashboardWidget title="Expected Capacity Projection" subtitle="Linear projection from the real historical trend">
        <div className={styles.projectionGrid}>
          {projections.map((p) => (
            <div key={p.days} className={styles.projectionCell}>
              <div className={styles.projectionDays}>{p.days} days</div>
              <div className={styles.projectionValue}>
                {p.insufficientData || p.projectedValue === null
                  ? "--"
                  : `${Math.max(0, Math.min(100, p.projectedValue)).toFixed(0)}%`}
              </div>
            </div>
          ))}
        </div>

        {projections[0]?.insufficientData && <div className={styles.footNote}>{projections[0].reason}</div>}
      </DashboardWidget>
    </>
  );
}
