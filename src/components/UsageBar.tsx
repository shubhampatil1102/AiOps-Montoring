import { useState } from "react";
import TooltipBox from "./TooltipBox";

export default function UsageBar({ value, time }: { value: number; time?: number }) {
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const color =
    value > 85 ? "#ef4444" :
    value > 70 ? "#f59e0b" :
    "#22c55e";

  const last = time ? new Date(Number(time)).toLocaleTimeString() : "";

  return (
    <>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
        style={{ width: 120 }}
      >
        <div
          style={{
            height: 6,
            background: "#bfd6f7",
            borderRadius: 10,
            overflow: "hidden",
            
          }}
          
        >
          <div
            style={{
              width: `${value}%`,
              background: color,
              height: "100%",
            }}
          />
        </div>
      </div>

      {hover && (
        <TooltipBox
          x={pos.x}
          y={pos.y}
          text={`Usage: ${value.toFixed(1)}% ${last && `• ${last}`}`}
        />
        
      )}
    </>
  );
}
