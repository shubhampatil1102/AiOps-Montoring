import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import styles from "./RadialProgress.module.css";

interface RadialProgressProps {
  value: number;
  label?: string;
  color?: string;
  size?: number;
}

export default function RadialProgress({
  value,
  label,
  color = "#2563eb",
  size = 120,
}: RadialProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const data = [{ name: "value", value: clamped, fill: color }];

  return (
    <div className={styles.wrapper} style={{ width: size, height: size }}>
      <RadialBarChart
        width={size}
        height={size}
        cx="50%"
        cy="50%"
        innerRadius="72%"
        outerRadius="100%"
        barSize={Math.max(6, size * 0.1)}
        data={data}
        startAngle={90}
        endAngle={-270}
      >
        <PolarAngleAxis
          type="number"
          domain={[0, 100]}
          angleAxisId={0}
          tick={false}
        />
        <RadialBar background dataKey="value" cornerRadius={999} />
      </RadialBarChart>

      <div className={styles.center}>
        <div className={styles.value}>{Math.round(clamped)}</div>
        {label && <div className={styles.label}>{label}</div>}
      </div>
    </div>
  );
}
