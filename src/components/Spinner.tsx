import { Loader2 } from "lucide-react";

export default function Spinner({ label }: { label?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 140,
        gap: 10,
        color: "#38bdf8",
        width: "100%",
      }}
    >
      <Loader2 className="spinner-icon" size={32} />
      {label && <div style={{ fontSize: 15, fontWeight: 500 }}>{label}</div>}
    </div>
  );
}
