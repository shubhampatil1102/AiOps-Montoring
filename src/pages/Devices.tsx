import { useQuery } from "@tanstack/react-query";
import { fetchDevices } from "@/api/devices";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import UsageBar from "@/components/UsageBar";
import HealthBadge from "@/components/HealthBadge";
import DeviceStateBadge from "@/components/DeviceStateBadge";

export default function Devices() {

  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: fetchDevices,
    refetchInterval: 5000,
  });

  const filtered = devices.filter((d: any) =>
    d.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h1 style={{ fontSize: 26, marginBottom: 16 }}>Devices</h1>

      {/* SEARCH */}
      <input
        placeholder="Search device..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          padding: "8px 12px",
          background: "#020617",
          border: "1px solid #1f2937",
          borderRadius: 8,
          marginBottom: 16,
          color: "white",
        }}
      />

      {/* TABLE */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>

        <thead>
          <tr style={{ color: "#9ca3af", textAlign: "left" }}>
            <th>Health</th>
            <th>Device</th>
            <th>Agent</th>
            <th>CPU</th>
            <th>RAM</th>
          </tr>
        </thead>

        <tbody>
          {filtered.map((d: any) => {

            const online = Date.now() - d.time < 20000;

            return (
              <tr
                key={d.id}
                onClick={() => navigate(`/devices/${d.id}`)}
                style={{
                  cursor: "pointer",
                  borderTop: "1px solid #1f2937",
                }}
              >

                {/* HEALTH (resource health) */}
                <td style={{ padding: "12px 0" }}>
                  <HealthBadge cpu={d.cpu || 0} ram={d.ram || 0} online={online} />
                </td>

                {/* DEVICE NAME */}
                <td>{d.id}</td>

                {/* AGENT STATE (presence monitoring) */}
                <td>
                  <DeviceStateBadge state={d.state} />
                </td>

                {/* CPU */}
                <td>
                  <UsageBar value={d.cpu || 0} time={d.time} />
                </td>

                {/* RAM */}
                <td>
                  <UsageBar value={d.ram || 0} time={d.time} />
                </td>

              </tr>
            );
          })}
        </tbody>

      </table>
    </div>
  );
}
