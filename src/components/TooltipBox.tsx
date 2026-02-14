export default function TooltipBox({ text, x, y }: any) {
  return (
    <div
      style={{
        position: "fixed",
        left: x + 12,
        top: y + 12,
        background: "#eaecf5",
        border: "1px solid #1f2937",
        padding: "6px 10px",
        borderRadius: 8,
        fontSize: 12,
        pointerEvents: "none",
        zIndex: 999,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
}
