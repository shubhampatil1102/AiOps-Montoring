import { useQuery } from "@tanstack/react-query";
import { fetchDevices } from "@/api/devices";

export default function Devices() {

  const { data: devices = [], isLoading, isError } = useQuery({
    queryKey: ["devices"],
    queryFn: fetchDevices,
    refetchInterval: 5000,
  });

  if (isLoading) return <h2 style={{ padding: 40 }}>Loading devices...</h2>;
  if (isError) return <h2 style={{ padding: 40 }}>API Error</h2>;

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 20 }}>Devices</h2>

      <table style={{
        width: "100%",
        background: "white",
        borderRadius: 10,
        borderCollapse: "collapse"
      }}>
        <thead>
          <tr style={{ background: "#f1f5f9" }}>
            <th style={th}>Device</th>
            <th style={th}>CPU</th>
            <th style={th}>RAM</th>
            <th style={th}>Status</th>
          </tr>
        </thead>

        <tbody>
          {devices.map((d:any) => {
            const online = Date.now() - d.time < 20000;

            return (
              <tr key={d.id}>
                <td style={td}>{d.id}</td>
                <td style={td}>{d.cpu?.toFixed(1)}%</td>
                <td style={td}>{d.ram?.toFixed(1)}%</td>
                <td style={{...td, color: online ? "green" : "red"}}>
                  {online ? "ONLINE" : "OFFLINE"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const th = { padding: 12, textAlign: "left" as const };
const td = { padding: 12, borderTop: "1px solid #e2e8f0" };
