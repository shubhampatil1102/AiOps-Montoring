import { useState } from "react";

export default function UsageBar({ value }: { value: number }) {

    const [hover, setHover] = useState(false);

    const level =
        value > 90 ? "critical" :
        value > 75 ? "warning" :
        "healthy";

    const color =
        level === "critical" ? "#ef4444" :
        level === "warning" ? "#f59e0b" :
        "#22c55e";

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: 12,
                background: "#e5e7eb",
                borderRadius: 20,
                overflow: "visible",
                zIndex:50
            }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >

            {/* animated fill */}
            <div className={`usage-fill ${level}`}
                style={{
                    width: value + "%",
                    background: color
                }}
            />

            {/* tooltip */}
            {hover && (
                <div className="usage-tooltip">
                    {value.toFixed(1)}%
                </div>
            )}

        </div>
    );
}
