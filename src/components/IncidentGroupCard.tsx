import { useState } from "react";
import AlertCard from "./AlertCard";

export default function IncidentGroupCard({ group }: any) {
    const [open, setOpen] = useState(group.defaultOpen);

    return (
        <div style={{
            background: "#545767",
            border: "1px solid #1f2937",
            borderRadius: 12,
            marginBottom: 14
        }}>

            {/* HEADER */}
            <div
                onClick={() => setOpen(!open)}
                style={{
                    padding: 14,
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid #1f2937"
                }}
            ><span style={{
                marginLeft: 10,
                fontSize: 12,
                color: group.defaultOpen ? "#ef4444" : "#22c55e"
            }}>
                    {group.defaultOpen ? "ACTIVE" : "RESOLVED"}
                </span>

                <div style={{ fontWeight: 600 }}>
                    {open ? "▾" : "▸"} {group.device}
                </div>

                <div style={{
                    background: "#f7f9fb",
                    padding: "4px 10px",
                    borderRadius: 20,
                    fontSize: 12
                }}>
                    {group.items.length} events
                </div>
            </div>

            {/* CONTENT */}
            {open && (
                <div style={{
                    maxHeight: 300,
                    overflowY: "auto"
                }}>
                    {group.items.map((a: any) => (
                        <AlertCard key={a.time} alert={a} />
                    ))}
                </div>
            )}

        </div>
    );
}
