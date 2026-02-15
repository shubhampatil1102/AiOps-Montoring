import { useParams } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDevice, fetchDeviceHistory } from "@/api/devices";
import { fetchTopProcesses } from "@/api/processes";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function DeviceDetail() {
  const { id = "" } = useParams();
  const [range, setRange] = useState("1h");

  const { data: device } = useQuery({
    queryKey: ["device", id],
    queryFn: () => fetchDevice(id),
    refetchInterval: 5000,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["history", id, range],
    queryFn: () => fetchDeviceHistory(id, range),
    refetchInterval: 5000,
  });

  const { data: processes = [] } = useQuery({
    queryKey: ["top-processes", id],
    queryFn: () => fetchTopProcesses(id),
    refetchInterval: 5000,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events", id],
    queryFn: async () => {
      const r = await fetch(`http://localhost:4000/devices/${id}/events`);
      return r.json();
    },
    refetchInterval: 5000,
  });

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <h1 style={{ fontSize: 28 }}>Device: {id}</h1>
      <hr />

      {/* Info */}
      <div style={{ display: "flex", gap: 50 }}>
        <Info title="CPU" value={`${device?.cpu?.toFixed(1) ?? 0}%`} />
        <Info title="RAM" value={`${device?.ram?.toFixed(1) ?? 0}%`} />
        <Info
          title="Status"
          value={Date.now() - (device?.time ?? 0) < 20000 ? "ONLINE" : "OFFLINE"}
          color={Date.now() - (device?.time ?? 0) < 20000 ? "#22c55e" : "#ef4444"}
        />
      </div>

      {/* Range */}
      <div style={{ display: "flex", gap: 20 }}>
        <button onClick={() => setRange("1h")}>1H</button>
        <button onClick={() => setRange("1d")}>1D</button>
        <button onClick={() => setRange("1w")}>1W</button>
      </div>

      {/* Charts */}
      <Chart title="CPU Usage %" data={history} dataKey="cpu" color="#22c55e" />
      <Chart title="RAM Usage %" data={history} dataKey="ram" color="#3b82f6" />

      {/* Processes */}
      <div style={{ background: "#b6c6e8", padding: 16, borderRadius: 12 }}>
        <h3>Top Processes</h3>
        {processes.map((p: any) => (
          <div key={p.name} style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{p.name}</span>
            <span>{p.cpu}%</span>
          </div>
        ))}
      </div>

      {/* EVENTS TIMELINE */}
      <div style={{ background: "white", padding: 15, borderRadius: 12 }}>
        <h3>Incident Timeline</h3>

        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          {events.map((e: any) => (
            <div key={e.time} style={{ borderBottom: "1px solid #e5e7eb", padding: "8px 0", display: "flex", gap: 10 }}>
              <span>
                {e.type === "OFFLINE"
                  ? "🔴"
                  : e.type === "ONLINE"
                  ? "🟢"
                  : e.type.includes("CPU")
                  ? "🟠"
                  : "🟡"}
              </span>

              <div>
                <div style={{ fontWeight: 600 }}>{e.message}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {new Date(Number(e.time)).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* small components */

function Info({ title, value, color = "white" }: any) {
  return (
    <div style={{ background: "#111827", padding: 20, borderRadius: 12 }}>
      <div style={{ color: "#9ca3af" }}>{title}</div>
      <div style={{ fontSize: 22, color }}>{value}</div>
    </div>
  );
}

function Chart({ title, data, dataKey, color }: any) {
  const formatted = data.map((d: any) => ({
    ...d,
    time: new Date(Number(d.time)).toLocaleTimeString(),
  }));

  return (
    <div style={{ background: "#292b35", padding: 20, borderRadius: 12 }}>
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={formatted}>
          <CartesianGrid stroke="#374151" />
          <XAxis dataKey="time" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" />
          <Tooltip />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
