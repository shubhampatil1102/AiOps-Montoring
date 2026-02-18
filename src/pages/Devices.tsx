import { useQuery } from "@tanstack/react-query";
import { fetchDevices } from "@/api/devices";
import { useNavigate } from "react-router-dom";
import GlassCard from "../components/GlassCard";

export default function Devices() {

  const navigate = useNavigate();

  function getReason(d: any) {
    if (Date.now() - d.time > 20000) return "Agent not reporting";
    if (d.cpu > 90) return "CPU critically high";
    if (d.ram > 90) return "Memory critically high";
    if (d.cpu > 75) return "CPU elevated";
    if (d.ram > 80) return "Memory elevated";
    return "Healthy";
  }

  function formatUptime(boot: number) {
    if (!boot) return "-";

    const sec = Math.floor((Date.now() - boot) / 1000);
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);

    return `${d}d ${h}h ${m}m`;
  }

  const { data: devices = [], isLoading, isError } = useQuery({
    queryKey: ["devices"],
    queryFn: fetchDevices,
    refetchInterval: 5000,
  });

  if (isLoading) return <h2 style={{ padding: 40 }}>Loading devices...</h2>;
  if (isError) return <h2 style={{ padding: 40 }}>API Error</h2>;

  return (
    <GlassCard>
    <div style={{ padding: 20, borderRadius: 12 }}>
      <h2 style={{ marginBottom: 20 }}>Devices</h2>

      <table style={{
        width: "100%",
        background: "white",
        borderRadius: 10,
        borderCollapse: "collapse",
        
      }}>
        
        <thead>
          <tr style={{ background: "#f1f5f9" }}>
            <th style={th}>Device</th>
            <th style={th}>CPU</th>
            <th style={th}>RAM</th>
            <th style={th}>Uptime</th>
            <th style={th}>Status</th>
          </tr>
        </thead>

        <tbody>

          {devices.map((d: any) => {
            const online = Date.now() - d.time < 20000;

            return (
              <tr
                key={d.id}
                onClick={() => navigate(`/devices/${d.id}`)}
                style={{
                  cursor: "pointer",
                  transition: "0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                onMouseLeave={e => (e.currentTarget.style.background = "white")}
              >
                <td style={td}>{d.id}</td>
                <td style={td}>{Number(d.cpu || 0).toFixed(1)}%</td>
                <td style={td}>{Number(d.ram || 0).toFixed(1)}%</td>
                <td style={td}>{formatUptime(d.boot_time)}</td>

                <td style={td} title={getReason(d)}>
                  <span style={{
                    color: online ? "#16a34a" : "#ef4444",
                    fontWeight: 600,
                    cursor: "help"
                  }}>
                    {online ? "ONLINE" : "OFFLINE"}
                  </span>
                </td>
              </tr>
            );
          })}
        
        </tbody>
        
      </table>
    </div>
    </GlassCard>
  );
}

const th = { padding: 12, textAlign: "left" as const };
const td = { padding: 12, borderTop: "1px solid #e2e8f0" };
