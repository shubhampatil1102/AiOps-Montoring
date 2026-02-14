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

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <h1 style={{ fontSize: 28 }}>Device: {id}</h1>
      <hr />

      {/* Info */}
      <div style={{ display: "flex", gap: 50, width: 150 }}>
        <Info title="CPU" value={`${device?.cpu?.toFixed(1) ?? 0}%`} />
        <Info title="RAM" value={`${device?.ram?.toFixed(1) ?? 0}%`} />
        <Info
          title="Status"
          value={Date.now() - (device?.time ?? 0) < 20000 ? "ONLINE" : "OFFLINE"}
          color={Date.now() - (device?.time ?? 0) < 20000 ? "#22c55e" : "#ef4444"}
        />
      </div>

      {/* Range buttons */}
      <div style={{ display: "flex", gap: 20, background: "#9ca3af", padding: 10, borderRadius: 8, width: "fit-content" }}>
        <button onClick={() => setRange("1h")}>1H</button>
        <button onClick={() => setRange("1d")}>1D</button>
        <button onClick={() => setRange("1w")}>1W</button>
      </div>

      {/* Charts */}
      <Chart title="CPU Usage %" data={history} dataKey="cpu" color="#22c55e" />
      <Chart title="RAM Usage %" data={history} dataKey="ram" color="#3b82f6" />

      {/* TOP PROCESSES PANEL */}
      <div
        style={{
          background: "#7a7d8b",
          border: "1px solid #1f2937",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <h3 style={{ marginBottom: 12 }}>Top CPU Consuming Processes</h3>

        {processes.length === 0 && (
          <div style={{ color: "#6b7280" }}>No process data yet</div>
        )}

        {processes.map((p: any, i: number) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "6px 0",
              borderBottom: "1px solid #111827",
            }}
          >
            <span>{p.name}</span>
            <span style={{ color: "#f59e0b" }}>{p.cpu}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- small components ---------- */

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
          <XAxis dataKey="time" stroke="#9ca3af" minTickGap={40} />
          <YAxis stroke="#9ca3af" />
          <Tooltip />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
