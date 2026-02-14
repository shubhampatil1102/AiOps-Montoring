export default function HealthBadge({ cpu, ram, online }: any) {
  let color = "#22c55e";
  let label = "Healthy";

  if (!online) {
    color = "#ef4444";
    label = "Critical";
  } else if (cpu > 85 || ram > 90) {
    color = "#f59e0b";
    label = "Degraded";
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: 20,
          background: color,
          boxShadow: `0 0 8px ${color}`,
        }}
      />
      <span style={{ fontSize: 13 }}>{label}</span>
    </div>
  );
}
