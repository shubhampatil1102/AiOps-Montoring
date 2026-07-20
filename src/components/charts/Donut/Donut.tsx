import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import EmptyState from "@/components/common/EmptyState";
import styles from "./Donut.module.css";

export interface DonutDatum {
  name: string;
  value: number;
  color: string;
}

interface DonutProps {
  data: DonutDatum[];
  emptyMessage?: string;
  outerRadius?: number;
  /** Defaults to a proportion of outerRadius (a real ring) rather than 0
   * (a solid pie) — this is the shared house style: every donut gets
   * a center total, which needs a hollow center. Pass 0 explicitly for
   * the old solid-pie look. */
  innerRadius?: number;
  centerLabel?: string;
  /** External leader-line labels need real estate around the ring — turn
   * off in compact/dense layouts (e.g. a donut sharing a small card with
   * other content) where they'd overflow or overlap. The ring + center
   * total + tooltip stay on either way. */
  showLabels?: boolean;
}

const RADIAN = Math.PI / 180;

function renderOuterLabel(props: {
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
  name: string;
  value: number;
  fill: string;
}) {
  const { cx, cy, midAngle, outerRadius, name, value, fill } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);

  const sx = cx + outerRadius * cos;
  const sy = cy + outerRadius * sin;
  const mx = cx + (outerRadius + 16) * cos;
  const my = cy + (outerRadius + 16) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 12;
  const ey = my;
  const textAnchor = cos >= 0 ? "start" : "end";

  return (
    <g>
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text
        x={ex + (cos >= 0 ? 6 : -6)}
        y={ey}
        textAnchor={textAnchor}
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
        fill={fill}
      >
        {`${name}: ${value}`}
      </text>
    </g>
  );
}

function CustomTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: DonutDatum }[];
  total: number;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const item = payload[0];
  const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0";

  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTitle} style={{ color: item.payload.color }}>
        {item.name}
      </div>
      <div className={styles.tooltipRow}>
        <span>Value:</span>
        <strong>{item.value}</strong>
      </div>
      <div className={styles.tooltipRow}>
        <span>Percentage:</span>
        <strong>{percent}%</strong>
      </div>
    </div>
  );
}

export default function Donut({
  data,
  emptyMessage = "No data available.",
  outerRadius = 110,
  innerRadius,
  centerLabel = "Total",
  showLabels = true,
}: DonutProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  const resolvedInnerRadius = innerRadius ?? Math.round(outerRadius * 0.62);

  return (
    <div className={styles.wrapper}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={resolvedInnerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            label={showLabels ? (renderOuterLabel as any) : false}
            labelLine={false}
          >
            {data.map((item) => (
              <Cell key={item.name} fill={item.color} />
            ))}
          </Pie>

          <Tooltip content={<CustomTooltip total={total} />} />
        </PieChart>
      </ResponsiveContainer>

      {resolvedInnerRadius > 0 && (
        <div className={styles.center}>
          <div className={styles.centerLabel}>{centerLabel}</div>
          <div className={styles.centerValue}>{total}</div>
        </div>
      )}
    </div>
  );
}
