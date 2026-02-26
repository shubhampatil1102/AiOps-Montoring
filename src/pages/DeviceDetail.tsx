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
import { title } from "process";
import { ActivitySquareIcon, PuzzleIcon } from "lucide-react";

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

  const { data: compliance } = useQuery({
    queryKey: ["compliance", id],
    queryFn: async () => {
      const r = await fetch(`http://localhost:4000/devices/${id}/compliance`);
      return r.json();
    },
    refetchInterval: 1000
  });

  const { data: hardware } = useQuery({
    queryKey: ["hardware", id],
    queryFn: async () => {
      const r = await fetch(
        `http://localhost:4000/devices/${id}/hardware`);
      return r.json();
    },
    refetchInterval: 4000
  });


  return (
    <div style={{ display: "grid", gap: 8 }}>
      <h1 style={{ fontSize: 15 }}>Device: {id}</h1>

      {/* Info */}

      <div style={{ display: "flex", gap: 50, fontWeight: 200, width: "fit-content" }}>

        <Info title="CPU" value={`${device?.cpu?.toFixed(1) ?? 0}%`} />
        <Info title="RAM" value={`${device?.ram?.toFixed(1) ?? 0}%`} />
        <Info
          title="Status"
          value={Date.now() - (device?.time ?? 0) < 20000 ? "ONLINE" : "OFFLINE"}
          color={Date.now() - (device?.time ?? 0) < 20000 ? "#22c55e" : "#ef4444"}
        />
      </div>
      <GlassCard>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <PuzzleIcon />
          <h4 style={{ fontWeight: 600, fontSize: 19 }}>Activity monitor </h4>
        </div>


        {/* Range */}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 3 }}>
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
          <button onClick={() => setRange("1d")} style={{
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
        <div style={{ display: "flex", gap: 8, fontSize: 12 }}>
          <Chart title="CPU Usage %" data={history} dataKey="cpu" color="#22c55e" />
          <Chart title="RAM Usage %" data={history} dataKey="ram" color="#3b82f6" />
        </div>
      </GlassCard>
      <GlassCard style={{ marginTop: 5 }}>
        <div>
          <h3>Security Compliance</h3>

          {!compliance && <div>Loading...</div>}

          {compliance && (
            <>
              <StatusRow label="Bitlocker" value={compliance.bitlocker} />
              <StatusRow label="TPM" value={compliance.tpm} />
              <StatusRow
                label="Secure Boot"
                value={compliance.secureboot ?? compliance.secureBoot}
              />
              <StatusRow label="Windows Defender" value={compliance.defender} />

              <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
                Last checked: {
                  compliance.updated_at
                    ? new Date(Number(compliance.updated_at)).toLocaleString()
                    : "-"
                }
              </div>
            </>
          )}
        </div>
      </GlassCard>

      <GlassCard>
        <h3>🧠 Hardware Health AI</h3>

        <StatusRow label="CPU Temp"
          value={`${hardware?.cpu_temp ?? "--"} °C`} />

        <StatusRow label="Disk Usage"
          value={`${hardware?.disk ?? "--"} %`} />

        <StatusRow label="Battery Health"
          value={`${hardware?.battery_health ?? "--"} ${hardware?.battery_health_percent ? `(${hardware?.battery_health_percent ?? "--"}%)` : ""}`} />
        <StatusRow label="Fan Speed"
          value={`${hardware?.fan_status ?? "--"} `} />
        <StatusRow label="Free Disk Space"
          value={`C Drive : ${hardware?.disk_free ?? "--"} GB`} />

        <div style={{
          marginTop: 15,
          fontSize: 18,
          fontWeight: 600,
          color:
            hardware?.risk === "LOW" ? "#22c55e" :
              hardware?.risk === "MEDIUM" ? "#f59e0b" :
                "#ef4444"
        }}>
          AI Health Score : {hardware?.health_score ?? "--"}/100
        </div>

      </GlassCard>


      <div style={{ display: "flex", gap: 50, justifyContent: "space-between" }}>

        <GlassCard>
          {/* Processes */}

          <div style={{ background: "#fbfcfd", padding: 16, borderRadius: 12, width: "300px" }}>
            <h3 style={{ marginBottom: 10 }}>Top Processes</h3>
            {processes.map((p: any) => (
              <div key={p.name} style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{p.name}</span>
                <span>{p.cpu}%</span>
              </div>

            ))}
          </div>

        </GlassCard>
        <GlassCard>
          {/* EVENTS TIMELINE */}
          <div style={{ background: "white", padding: 15, borderRadius: 12 }}>
            <h3>Incident Timeline</h3>

            <div style={{ maxHeight: 300, overflowY: "auto" }}>
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
                    <div style={{ fontWeight: 350 }}>{e.message}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      {new Date(Number(e.time)).toLocaleString()}
                    </div>
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

function StatusRow({ label, value, onFix }: any) {

  let ok = false;

  /* CPU TEMP */
  if (label === "CPU Temp") {
    ok = value && value < 70;
  }

  /* DISK */
  else if (label === "Disk Usage") {
    ok = value && value < 80;
  }

  /* BATTERY */
  else if (label === "Battery Health") {
    ok = ["EXCELLENT", "GOOD"].includes(value);
  }

  /* FALLBACK */
  else {
    ok = !!value;
  }

  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      padding: "10px 0",
      borderBottom: "1px solid #eee"
    }}>
      <div>{label}</div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <span style={{
          color: ok ? "#22c55e" : "#ef4444",
          fontWeight: 400
        }}>
          {ok ? "✔" : "✖"} {value}
        </span>

        {!ok && (
          <button
            onClick={onFix}
            style={{
              background: "#25eb3f",
              color: "black",
              border: "none",
              padding: "4px 10px",
              borderRadius: 6,
              cursor: "pointer"
            }}
          >
            Repair
          </button>
        )}
      </div>
    </div>
  );
}

/* small components */

function Info({ title, value, color = "black" }: any) {
  return (
    <div style={{ background: "#ececf4", padding: 20, borderRadius: 12 }}>
      <div style={{ color: "#090909" }}>{title}</div>
      <div style={{ fontFamily: "monospace", fontSize: 24, color, fontWeight: 350 }}>{value}</div>
    </div>
  );
}

function Chart({ title, data, dataKey, color }: any) {
  const formatted = data.map((d: any) => ({
    ...d,
    time: new Date(Number(d.time)).toLocaleTimeString(),
  }));

  return (
    <div style={{ background: "#e1e5fc", padding: 20, borderRadius: 12, width: "50%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h3>{title}</h3>
      <ResponsiveContainer width="80%" height={200}>
        <LineChart data={formatted}>
          <CartesianGrid stroke="#cadbf5" />
          <XAxis dataKey="time" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" />
          <Tooltip />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Device agent sends real values
fetch('http://localhost:4000/devices/DEVICE_ID/hardware', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    hardware: {
      cpu_temp: 75,
      disk: 60,
      battery: 50
    }
  })
});

