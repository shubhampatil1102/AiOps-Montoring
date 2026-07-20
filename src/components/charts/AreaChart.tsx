import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface AreaChartPoint {
  time: number;
  value: number;
}

interface AreaChartProps {
  title: string;
  data: AreaChartPoint[];
  color: string;
  unit?: string;
}

export default function AreaChart({ title, data, color, unit = "%" }: AreaChartProps) {
  const formatted = data.map((point) => ({
    ...point,
    label: new Date(point.time).toLocaleTimeString(),
  }));

  const latestValue = formatted.length > 0 ? formatted[formatted.length - 1].value.toFixed(1) : "--";
  const gradientId = `area-fill-${title.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
            Live trend for {title.toLowerCase()}
          </div>
        </div>
        <div style={{ color, fontWeight: 800, fontSize: 24 }}>
          {latestValue}
          {latestValue !== "--" ? unit : ""}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <RechartsAreaChart data={formatted} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.24} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#dbeafe" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={34} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #dbeafe",
              boxShadow: "0 12px 30px rgba(15,23,42,0.12)",
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
            fill={`url(#${gradientId})`}
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
