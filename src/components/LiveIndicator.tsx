import { useEffect, useState } from "react";

export default function LiveIndicator() {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 400);
    }, 5000); // same as react-query refresh

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: 20,
          background: "#22c55e",
          boxShadow: pulse ? "0 0 8px #22c55e" : "none",
          transition: "0.3s",
        }}
      />
      <span style={{ fontSize: 13, color: "#070707" }}>
        Live updating
      </span>
    </div>
  );
}
