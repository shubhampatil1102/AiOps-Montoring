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
import GlassCard from "../components/GlassCard";

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
      <h1 style={{ fontSize: 20 }}>Device: {id}</h1>
      <hr />

      {/* Info */}
      <GlassCard>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", fontWeight: 600 }}>

          <Info title="CPU" value={`${device?.cpu?.toFixed(1) ?? 0}%`} />
          <Info title="RAM" value={`${device?.ram?.toFixed(1) ?? 0}%`} />
          <Info
            title="Status"
            value={Date.now() - (device?.time ?? 0) < 20000 ? "ONLINE" : "OFFLINE"}
            color={Date.now() - (device?.time ?? 0) < 20000 ? "#22c55e" : "#ef4444"}
          />
        </div>
      </GlassCard>


      {/* Range */}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 15, maxWidth: 400 }}>
        <button onClick={() => setRange("1h")} style={{
          marginTop: 10,
          marginLeft: 10,
          padding: "10px 16px",
          borderRadius: 8,
          background: "#38fc80",
          border: "none",
          cursor: "pointer",
          fontWeight: 600,
        }}>1H</button>
        <button onClick={() => setRange("1d")}style={{
          marginTop: 10,
          marginLeft: 10,
          padding: "10px 16px",
          borderRadius: 8,
          background: "#38fc80",
          border: "none",
          cursor: "pointer",
          fontWeight: 600,
        }}>1D</button>
        <button onClick={() => setRange("1w")} style={{
          marginTop: 10,
          marginLeft: 10,
          padding: "10px 16px",
          borderRadius: 8,
          background: "#38fc80",
          border: "none",
          cursor: "pointer",
          fontWeight: 600,
        }}>1W</button>
      </div>

      {/* Charts */}

      <Chart title="CPU Usage %" data={history} dataKey="cpu" color="#22c55e" />
      <Chart title="RAM Usage %" data={history} dataKey="ram" color="#3b82f6" />

      {/* Processes */}

      <div style={{ background: "#fbfcfd", padding: 16, borderRadius: 12 }}>
        <h3 style={{ marginBottom: 10 }}>Top Processes</h3>
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

function Info({ title, value, color = "black" }: any) {
  return (
    <div style={{ background: "#ececf4", padding: 20, borderRadius: 12 }}>
      <div style={{ color: "#090909" }}>{title}</div>
      <div style={{ fontFamily: "monospace", fontSize: 24, color, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function Chart({ title, data, dataKey, color }: any) {
  const formatted = data.map((d: any) => ({
    ...d,
    time: new Date(Number(d.time)).toLocaleTimeString(),
  }));

  return (
    <div style={{ background: "#e1e5fc", padding: 20, borderRadius: 12 }}>
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
