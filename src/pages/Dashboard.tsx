import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { API_URL } from "@/api/config";
import GlassCard from "../components/GlassCard";
import UsageBar from "../components/UsageBar";

type Device = {
  id: string;
  cpu?: number;
  ram?: number;
  time?: number;
};

type Alert = {
  id: string;
  message: string;
  time: number;
};

type DeviceHardware = {
  cpu_temp?: number;
};

type HardwareMap = Record<string, DeviceHardware>;

export default function Dashboard() {
  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ["devices"],
    queryFn: async () => {
      const r = await fetch(`${API_URL}/devices`);
      return r.json();
    },
    refetchInterval: 5000,
  });

  const [, forceTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => forceTick((tick) => tick + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ["alerts"],
    queryFn: async () => {
      const r = await fetch(`${API_URL}/alerts`);
      return r.json();
    },
    refetchInterval: 5000,
  });

  const { data: hardware = {} } = useQuery<HardwareMap>({
    queryKey: ["hardware", devices.map((device) => device.id).join(",")],
    queryFn: async () => {
      const ids = devices.map((device) => device.id).join(",");
      if (!ids) return {};

      const r = await fetch(`${API_URL}/devices/hardware?ids=${encodeURIComponent(ids)}`);
      return r.json();
    },
    refetchInterval: 4000,
    enabled: devices.length > 0,
  });

  function getReason(device: Device) {
    if (Date.now() - Number(device.time || 0) > 20000) return "Agent not reporting";
    if (Number(device.cpu || 0) > 90) return "CPU critically high";
    if (Number(device.ram || 0) > 90) return "Memory critically high";
    if (Number(device.cpu || 0) > 75) return "CPU elevated";
    if (Number(device.ram || 0) > 80) return "Memory elevated";
    return "Healthy";
  }

  const healthy = devices.filter(
    (device) =>
      Date.now() - Number(device.time || 0) < 20000 &&
      Number(device.cpu || 0) < 70 &&
      Number(device.ram || 0) < 80
  );

  const warning = devices.filter(
    (device) =>
      Date.now() - Number(device.time || 0) < 20000 &&
      ((Number(device.cpu || 0) >= 70 && Number(device.cpu || 0) < 90) ||
        (Number(device.ram || 0) >= 80 && Number(device.ram || 0) < 90))
  );

  const critical = devices.filter(
    (device) =>
      Date.now() - Number(device.time || 0) < 20000 &&
      (Number(device.cpu || 0) >= 90 || Number(device.ram || 0) >= 90)
  );

  const offline = devices.filter((device) => Date.now() - Number(device.time || 0) >= 20000);

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20 }}>Environment Health</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 20,
          marginBottom: 30,
        }}
      >
        <HealthCard title="Healthy" value={healthy.length} color="#22c55e" />
        <HealthCard title="Warning" value={warning.length} color="#f59e0b" />
        <HealthCard title="Critical" value={critical.length} color="#ef4444" />
        <HealthCard title="Offline" value={offline.length} color="#6b7280" />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 20,
          position: "relative",
          zIndex: 1,
        }}
      >
        <GlassCard style={{ position: "relative", zIndex: 20 }}>
          <div className="glass" style={{ padding: 20, borderRadius: 12, overflow: "visible" }}>
            <h3 style={{ marginBottom: 10 }}>Devices</h3>

            <table style={{ width: "100%", borderCollapse: "collapse", overflow: "visible" }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  <th style={th}>Device</th>
                  <th style={th}>CPU</th>
                  <th style={th}>RAM</th>
                  <th style={th}>Status</th>
                  <th style={th}>CPU Temp</th>
                </tr>
              </thead>

              <tbody>
                {devices.map((device) => {
                  const online = Date.now() - Number(device.time || 0) < 20000;

                  let status = "Healthy";
                  let color = "#22c55e";

                  if (!online) {
                    status = "Offline";
                    color = "#6b7280";
                  } else if (Number(device.cpu || 0) > 90 || Number(device.ram || 0) > 90) {
                    status = "Critical";
                    color = "#ef4444";
                  } else if (Number(device.cpu || 0) > 70 || Number(device.ram || 0) > 80) {
                    status = "Warning";
                    color = "#f59e0b";
                  }

                  return (
                    <tr key={device.id}>
                      <td style={td}>{device.id}</td>
                      <td style={td}>
                        <UsageBar value={Number(device.cpu || 0)} />
                      </td>
                      <td style={td}>
                        <UsageBar value={Number(device.ram || 0)} />
                      </td>
                      <td style={td} title={getReason(device)}>
                        <span
                          style={{
                            padding: "5px 8px",
                            borderRadius: 20,
                            background: `${color}30`,
                            color,
                            fontWeight: 700,
                            cursor: "help",
                            fontSize: 12,
                          }}
                        >
                          {status}
                        </span>
                      </td>
                      <td style={td}>
                        {hardware?.[device.id]?.cpu_temp !== undefined
                          ? `${hardware[device.id].cpu_temp} C`
                          : "--"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <GlassCard style={{ position: "relative", zIndex: 1 }}>
          <div
            className="glass"
            style={{
              padding: 20,
              borderRadius: 12,
              height: 520,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="pulse-dot" />
              <h3 style={{ margin: 0 }}>Live Events</h3>
            </div>

            <div style={{ overflowY: "auto", marginTop: 10 }}>
              {alerts.map((alert) => (
                <div
                  key={`${alert.id}-${alert.time}`}
                  style={{
                    borderBottom: "1px solid #e5e7eb",
                    padding: "10px 0",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{alert.id}</div>
                  <div style={{ color: "#ef4444", fontSize: 13 }}>{alert.message}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>
                    {new Date(Number(alert.time)).toLocaleTimeString()}
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

function HealthCard({
  title,
  value,
  color = "#3b82f6",
}: {
  title: string;
  value: number;
  color?: string;
}) {
  const isCritical = title === "Offline" && value > 0;

  return (
    <div
      className={`glass ${isCritical ? "pulse-critical" : ""}`}
      style={{
        padding: 28,
        position: "relative",
        overflow: "hidden",
        transition: "all .25s ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-8px) scale(1.03)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0px) scale(1)";
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at top left, ${color}55, transparent 65%)`,
        }}
      />

      <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 8 }}>{title}</div>

      <div style={{ fontSize: 48, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

const th = { padding: 12, textAlign: "left" as const };
const td = { padding: 12, borderTop: "1px solid #e2e8f0" };
