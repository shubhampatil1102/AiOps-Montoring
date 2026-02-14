export default function SeverityBadge({ msg }: { msg: string }) {
  let color = "#22c55e";
  let label = "INFO";

  if (msg.includes("OFFLINE")) {
    color = "#ef4444";
    label = "CRITICAL";
  } else if (msg.includes("CPU")) {
    color = "#f59e0b";
    label = "WARNING";
  } else if (msg.includes("anomaly")) {
    color = "#a855f7";
    label = "ANOMALY";
  }

  return (
    <span
      style={{
        color,
        background: `${color}20`,
        padding: "4px 8px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}
