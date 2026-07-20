import DashboardWidget from "@/components/dashboard/DashboardWidget";
import RadialProgress from "@/components/charts/RadialProgress";
import { calculateHealthScore, type WeightedComponent } from "@/lib/intelligence/healthScoreEngine";
import { scoreToColor } from "@/themes/colors";
import styles from "./DeviceHealthOverview.module.css";

interface DeviceHealthOverviewProps {
  components: WeightedComponent[];
}

export default function DeviceHealthOverview({ components }: DeviceHealthOverviewProps) {
  const { score } = calculateHealthScore(components);

  return (
    <DashboardWidget
      title="Overall Health Overview"
      subtitle="Composite score across categories with real data for this device"
      isEmpty={components.length === 0}
      emptyMessage="No health data reported for this device yet."
    >
      <div className={styles.layout}>
        <RadialProgress value={score} label="Health Score" color={scoreToColor(score)} size={140} />

        <div className={styles.breakdown}>
          {components.map((component) => (
            <div className={styles.row} key={component.label}>
              <span className={styles.dot} style={{ background: scoreToColor(component.value) }} />
              {component.label} <strong>{Math.round(component.value)}</strong>
            </div>
          ))}
        </div>
      </div>
    </DashboardWidget>
  );
}
