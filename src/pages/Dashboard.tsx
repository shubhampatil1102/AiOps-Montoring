import { useQuery } from "@tanstack/react-query";

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

    const online = devices.filter((d: any) => Date.now() - (d.time || 0) < 20000);
    const offline = devices.length - online.length;

    return (
        <div style={{ padding: 20 }}>

            <h1 style={{ fontSize: 26, marginBottom: 20 }}>System Overview</h1>

            {/* cards */}
            <div style={{ display: "flex", gap: 20, marginBottom: 30 }}>
                <Card title="Total Devices" value={devices.length} color="#2563eb" />
                <Card title="Online" value={online.length} color="#16a34a" />
                <Card title="Offline" value={offline} color="#dc2626" />
                <Card title="Alerts" value={alerts.length} color="#f59e0b" />
            </div>

            {/* devices table */}
            <table style={{ width: "100%", background: "white", borderRadius: 10 }}>
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
                        const online = Date.now() - (d.time || 0) < 20000;

                        return (
                            <tr key={d.id}>
                                <td style={td}>{d.id || "Unknown"}</td>
                                <td style={td}>{Number(d.cpu || 0).toFixed(1)}%</td>
                                <td style={td}>{Number(d.ram || 0).toFixed(1)}%</td>
                                <td style={td}>
                                    <span style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 8
                                    }}>
                                        <span style={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: "50%",
                                            background:
                                                !online ? "#6b7280" :
                                                    d.cpu > 85 || d.ram > 90 ? "#ef4444" :
                                                        d.cpu > 70 || d.ram > 80 ? "#f59e0b" :
                                                            "#22c55e"
                                        }} />
                                        {
                                            !online ? "OFFLINE" :
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
