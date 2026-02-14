export default function StatusPill({ online }: { online: boolean }) {
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        color: online ? "#22c55e" : "#ef4444",
        background: online ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
      }}
    >
      {online ? "ONLINE" : "OFFLINE"}
    </span>
  );
}
