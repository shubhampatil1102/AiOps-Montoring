import { useQuery } from "@tanstack/react-query";
import UsageBar from "../components/UsageBar";
import { formatTime } from "../utils/time";
import alertSound from "../assets/alert.mp3";
import { useState, useEffect, useRef } from "react";


export default function Dashboard() {

    const { data: devices = [] } = useQuery({
        queryKey: ["devices"],
        queryFn: async () => {
            const r = await fetch("http://localhost:4000/devices");
            return r.json();
        },
        refetchInterval: 5000
    });

    const sortedDevices = [...devices].sort((a: any, b: any) => {

        const aOffline = Date.now() - (a.time || 0) > 20000;
        const bOffline = Date.now() - (b.time || 0) > 20000;

        // offline first
        if (aOffline !== bOffline) return aOffline ? -1 : 1;

        // then highest cpu
        return (b.cpu || 0) - (a.cpu || 0);
    });



    const { data: alerts = [] } = useQuery({
        queryKey: ["alerts"],
        queryFn: async () => {
            const r = await fetch("http://localhost:4000/alerts");
            return r.json();
        },
        refetchInterval: 5000
    });

    const lastAlertKey = useRef<string | null>(null);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [toast, setToast] = useState<any>(null);


    useEffect(() => {
        audioRef.current = new Audio(alertSound);
        audioRef.current.volume = 0.5;

        const unlock = () => {
            audioRef.current?.play().then(() => {
                audioRef.current?.pause();
                audioRef.current!.currentTime = 0;
                console.log("Audio unlocked");
            }).catch(() => { });
            document.removeEventListener("click", unlock);
        };

        document.addEventListener("click", unlock);
    }, []);

    useEffect(() => {
        if (!alerts || alerts.length === 0) return;

        const newest = alerts[0];
        const key = newest.time + newest.message + newest.id;

        if (lastAlertKey.current === null) {
            lastAlertKey.current = key;
            return;
        }

        if (key !== lastAlertKey.current) {
            audioRef.current?.play().catch(() => { });

            setToast(newest);
            setTimeout(() => setToast(null), 5000);

            lastAlertKey.current = key;
        }



    }, [alerts]);

    {
        toast && (
            <div style={{
                position: "fixed",
                top: 20,
                right: 20,
                background: "#111827",
                color: "white",
                padding: "14px 18px",
                borderRadius: 10,
                boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
                borderLeft: `6px solid ${toast.message.includes("OFFLINE") ? "#ef4444" :
                    toast.message.includes("CPU") ? "#f97316" :
                        "#eab308"
                    }`,
                zIndex: 9999,
                animation: "slideIn 0.4s ease"
            }}>
                <div style={{ fontWeight: 600 }}>{toast.id}</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>{toast.message}</div>
            </div>
        )
    }

    const online = devices.filter((d: any) => Date.now() - (d.time || 0) < 20000);
    const offline = devices.length - online.length;

    return (
        <div style={{ padding: 10 }}>

            <h1 style={{ fontSize: 26, marginBottom: 30 }}>System Overview</h1>

            {/* SUMMARY CARDS */}
            <div style={{ display: "flex", gap: 20, marginBottom: 30 }}>
                <Card title="Total Devices" value={devices.length} color="#2563eb" />
                <Card title="Online" value={online.length} color="#16a34a" />
                <Card title="Offline" value={offline} color="#dc2626" />
                <Card title="Alerts" value={alerts.length} color="#f59e0b" />
            </div>

            {/* MAIN GRID */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>

                {/* DEVICES PANEL */}
                <div style={{ background: "white", padding: 15, borderRadius: 12 }}>
                    <h3 style={{ marginBottom: 10 }}>Live Devices</h3>

                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "#f1f5f9" }}>
                                <th style={th}>Device</th>
                                <th style={th}>CPU</th>
                                <th style={th}>RAM</th>
                                <th style={th}>Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {sortedDevices.map((d: any) => {
                                const isOnline = Date.now() - (d.time || 0) < 20000;

                                return (
                                    <tr key={d.id}>
                                        <td style={td}>{d.id || "Unknown"}</td>

                                        <td style={td}>
                                            <UsageBar value={Number(d.cpu || 0)} />
                                        </td>

                                        <td style={td}>
                                            <UsageBar value={Number(d.ram || 0)} />
                                        </td>

                                        <td style={td}>
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                                                <span style={{
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: "50%",
                                                    background:
                                                        !isOnline ? "#6b7280" :
                                                            d.cpu > 85 || d.ram > 90 ? "#ef4444" :
                                                                d.cpu > 70 || d.ram > 80 ? "#f59e0b" :
                                                                    "#22c55e"
                                                }} />

                                                {
                                                    !isOnline ? "OFFLINE" :
                                                        d.cpu > 85 || d.ram > 90 ? "CRITICAL" :
                                                            d.cpu > 70 || d.ram > 80 ? "WARNING" :
                                                                "HEALTHY"
                                                }

                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* ALERT PANEL */}
                <div style={{
                    background: "white",
                    padding: 15,
                    borderRadius: 12,
                    height: 420,
                    display: "flex",
                    flexDirection: "column"
                }}>
                    <h3 style={{ marginBottom: 10 }}>Live Incidents</h3>

                    <div style={{ overflowY: "auto", flex: 1 }}>
                        {alerts.map((a: any, i: number) => (
                            <div key={a.time} style={{
                                borderBottom: "1px solid #e5e7eb",
                                padding: "8px 0",
                                background: i === 0 ? "#fee2e2" : "transparent",
                                animation: i === 0 ? "pulse 1s ease-in-out 2" : "none"
                            }}>
                                <div style={{ fontWeight: 600 }}>{a.id}</div>
                                <div
                                    style={{
                                        color: a.message.includes("OFFLINE") ? "#ef4444" :
                                            a.message.includes("CPU") ? "#f97316" :
                                                "#eab308",
                                        fontSize: 13,
                                        fontWeight: 600,
                                        ...(a.message.includes("OFFLINE") ? blinkStyle : {})
                                    }}
                                >
                                    {a.message}
                                </div>


                                <div style={{ color: "#6b7280", fontSize: 12 }}>
                                    {formatTime(Number(a.time))}
                                </div>

                            </div>
                        ))}

                        {alerts.length === 0 && (
                            <div style={{ color: "#6b7280" }}>No active incidents 🎉</div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

function Card({ title, value, color }: any) {
    return (
        <div style={{
            background: "white",
            padding: 18,
            borderRadius: 10,
            borderLeft: `6px solid ${color}`,
            minWidth: 150
        }}>
            <div style={{ color: "#6b7280" }}>{title}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
        </div>
    );
}

const th = { padding: 12, textAlign: "left" as const };
const td = { padding: 12, borderTop: "1px solid #e2e8f0" };


const blinkStyle = {
    animation: "blink 1s linear infinite"
};


const style = document.createElement("style");
style.innerHTML = `
@keyframes pulse {
  0% { background: #fee2e2; }
  50% { background: #fecaca; }
  100% { background: #fee2e2; }
}
`;
document.head.appendChild(style);

