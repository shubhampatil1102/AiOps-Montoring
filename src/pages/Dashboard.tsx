import { useQuery } from "@tanstack/react-query";
import UsageBar from "../components/UsageBar";
import GlassCard from "../components/GlassCard";

export default function Dashboard() {

    const { data: devices = [] } = useQuery({
        queryKey: ["devices"],
        queryFn: async () => {
            const r = await fetch("http://localhost:4000/devices");
            return r.json();
        },
        refetchInterval: 5000
    });

    const { data: alerts = [] } = useQuery({
        queryKey: ["alerts"],
        queryFn: async () => {
            const r = await fetch("http://localhost:4000/alerts");
            return r.json();
        },
        refetchInterval: 5000
    });

    const healthy = devices.filter((d: any) =>
        Date.now() - d.time < 20000 && d.cpu < 70 && d.ram < 80
    );

    const warning = devices.filter((d: any) =>
        Date.now() - d.time < 20000 && (
            (d.cpu >= 70 && d.cpu < 90) ||
            (d.ram >= 80 && d.ram < 90)
        )
    );

    const critical = devices.filter((d: any) =>
        Date.now() - d.time < 20000 && (
            d.cpu >= 90 || d.ram >= 90
        )
    );

    const offline = devices.filter((d: any) =>
        Date.now() - d.time >= 20000
    );

    return (

        <div style={{ padding: 20 }}>

            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20 }}>
                Environment Health
            </h1>

            {/* BIG HEALTH CARDS */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 20,
                marginBottom: 30
            }}>
                <HealthCard title="Healthy" value={healthy.length} color="#22c55e" />
                <HealthCard title="Warning" value={warning.length} color="#f59e0b" />
                <HealthCard title="Critical" value={critical.length} color="#ef4444" />
                <HealthCard title="Offline" value={offline.length} color="#6b7280" />
            </div>

            {/* MAIN PANELS */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                gap: 20,
                position: "relative",
                zIndex: 1
            }}>

                {/* DEVICES */}
                <GlassCard style={{
                    position: "relative",
                    zIndex: 20   // 🔥 bring above live events
                }}>
                    <div className="glass" style={{ padding: 20, borderRadius: 12, overflow: "visible" }}>
                        <h3 style={{ marginBottom: 10 }}>Devices</h3>

                        <table style={{ width: "100%", borderCollapse: "collapse", overflow: "visible" }}>
                            <thead>
                                <tr style={{ background: "#f1f5f9" }}>
                                    <th style={th}>Device</th>
                                    <th style={th}>CPU</th>
                                    <th style={th}>RAM</th>
                                    <th style={th}>Status</th>
                                </tr>
                            </thead>

                            <tbody>
                                {devices.map((d: any) => {
                                    const online = Date.now() - d.time < 20000;

                                    let status = "Healthy";
                                    let color = "#22c55e";

                                    if (!online) { status = "Offline"; color = "#6b7280"; }
                                    else if (d.cpu > 90 || d.ram > 90) { status = "Critical"; color = "#ef4444"; }
                                    else if (d.cpu > 70 || d.ram > 80) { status = "Warning"; color = "#f59e0b"; }

                                    return (
                                        <tr key={d.id}>
                                            <td style={td}>{d.id}</td>
                                            <td style={td}><UsageBar value={d.cpu || 0} /></td>
                                            <td style={td}><UsageBar value={d.ram || 0} /></td>
                                            <td style={td}>
                                                <span style={{
                                                    padding: "4px 10px",
                                                    borderRadius: 20,
                                                    background: color + "30",
                                                    color,
                                                    fontWeight: 600,
                                                    fontSize: 12
                                                }}>
                                                    {status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>

                {/* LIVE INCIDENTS */}
                <GlassCard style={{
                    position: "relative",
                    zIndex: 1   // 🔥 keep below tooltip
                }}>
                    <div className="glass"
                        style={{
                            padding: 20,
                            borderRadius: 12,
                            height: 520,
                            display: "flex",
                            flexDirection: "column"
                        }}>

                        <h3>Live Events</h3>

                        <div style={{ overflowY: "auto", marginTop: 10 }}>
                            {alerts.map((a: any) => (
                                <div key={a.time} style={{
                                    borderBottom: "1px solid #e5e7eb",
                                    padding: "10px 0"
                                }}>
                                    <div style={{ fontWeight: 600 }}>{a.id}</div>
                                    <div style={{ color: "#ef4444", fontSize: 13 }}>{a.message}</div>
                                    <div style={{ fontSize: 11, color: "#6b7280" }}>
                                        {new Date(Number(a.time)).toLocaleTimeString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}

function HealthCard({ title, value, color = "#3b82f6" }: any) {

    const isCritical =
        (title === "Offline" && value > 0) ||
        (title === "Alerts" && value > 0);

    return (
        <div
            className={`glass ${isCritical ? "pulse-critical" : ""}`}
            style={{
                padding: 28,
                position: "relative",
                overflow: "hidden",
                transition: "all .25s ease",
                cursor: "default"
            }}
            onMouseEnter={(e: any) => {
                e.currentTarget.style.transform = "translateY(-8px) scale(1.03)";
            }}
            onMouseLeave={(e: any) => {
                e.currentTarget.style.transform = "translateY(0px) scale(1)";
            }}
        >
            <div style={{
                position: "absolute",
                inset: 0,
                background: `radial-gradient(circle at top left, ${color || "#3b82f6"}55, transparent 65%)`
            }} />

            <div style={{ fontSize: 14, opacity: .7, marginBottom: 8 }}>
                {title}
            </div>

            <div style={{ fontSize: 48, fontWeight: 700, color }}>
                {value}
            </div>
        </div>
    );
}

const th = { padding: 12, textAlign: "left" as const };
const td = { padding: 12, borderTop: "1px solid #e2e8f0" };
