import { sidebarColors } from "../../../themes/colors";
function StatCard({
  title,
  value,
  color = sidebarColors.Card1,
}: {
  title: string;
  value: number;
  color?: string;
}) {
  const isCritical = title === "Offline" && value > 0;

  return (
    <div
      className={`glass ${isCritical ? "pulse-critical" : ""}`}
      style={{
        padding: 28,
        position: "relative",
        overflow: "hidden",
        transition: "all .25s ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-8px) scale(1.03)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0px) scale(1)";
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at top left, ${color}55, transparent 65%)`,
        }}
      />

      <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 8 }}>{title}</div>

      <div style={{ fontSize: 48, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}