import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { API_URL } from "@/api/config";
import GlassCard from "../components/GlassCard";
import styles from "./Dashboard.module.css";
import useDashboardData from "../hooks/useDashboardData";
import UsageBar from "../components/UsageBar";
import StatCard from "../components/StatCard";
import { sidebarColors } from "../themes/colors";
// import { TriangleAlert, OfflineIcon } from "lucide-react";
import Card from "../components/ui/Card";
import PageHeader from "../layouts/PageHeader";
// import Button from "../components/ui/Button";
// import Badge from "../components/ui/Badge";
import Badge from "../components/ui/Badge/Badge";
import DeviceTable from "../components/dashboard/DeviceTable";
import DeviceWidget from "../components/dashboard/widgets/DeviceWidget";
import RecentAlertsWidget from "../components/dashboard/widgets/RecentAlertsWidget";


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
  // const { data: devices = [] } = useQuery<Device[]>({
  //   queryKey: ["devices"],
  //   queryFn: async () => {
  //     const r = await fetch(`${API_URL}/devices`);
  //     return r.json();
  //   },
  //   refetchInterval: 5000,
  // });
  const {
    devices,
    alerts,
    hardware,
    healthy,
    warning,
    critical,
    offline,
  } = useDashboardData();
  const [, forceTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => forceTick((tick) => tick + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // const { data: alerts = [] } = useQuery<Alert[]>({
  //   queryKey: ["alerts"],
  //   queryFn: async () => {
  //     const r = await fetch(`${API_URL}/alerts`);
  //     return r.json();
  //   },
  //   refetchInterval: 5000,
  // });

  // const { data: hardware = {} } = useQuery<HardwareMap>({
  //   queryKey: ["hardware", devices.map((device) => device.id).join(",")],
  //   queryFn: async () => {
  //     const ids = devices.map((device) => device.id).join(",");
  //     if (!ids) return {};

  //     const r = await fetch(`${API_URL}/devices/hardware?ids=${encodeURIComponent(ids)}`);
  //     return r.json();
  //   },
  //   refetchInterval: 4000,
  //   enabled: devices.length > 0,
  // });

  function getReason(device: Device) {
    if (Date.now() - Number(device.time || 0) > 20000) return "Agent not reporting";
    if (Number(device.cpu || 0) > 90) return "CPU critically high";
    if (Number(device.ram || 0) > 90) return "Memory critically high";
    if (Number(device.cpu || 0) > 75) return "CPU elevated";
    if (Number(device.ram || 0) > 80) return "Memory elevated";
    return "Healthy";
  }

  // const healthy = devices.filter(
  //   (device) =>
  //     Date.now() - Number(device.time || 0) < 20000 &&
  //     Number(device.cpu || 0) < 70 &&
  //     Number(device.ram || 0) < 80
  // );

  // const warning = devices.filter(
  //   (device) =>
  //     Date.now() - Number(device.time || 0) < 20000 &&
  //     ((Number(device.cpu || 0) >= 70 && Number(device.cpu || 0) < 90) ||
  //       (Number(device.ram || 0) >= 80 && Number(device.ram || 0) < 90))
  // );

  // const critical = devices.filter(
  //   (device) =>
  //     Date.now() - Number(device.time || 0) < 20000 &&
  //     (Number(device.cpu || 0) >= 90 || Number(device.ram || 0) >= 90)
  // );

  // const offline = devices.filter((device) => Date.now() - Number(device.time || 0) >= 20000);

  return (
    <div style={{ padding: 10 }}>
      <PageHeader
        title="Dashboard"
        description="Monitor your infrastructure health in real time."
      />

      <div className={styles.kpiGrid}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 20,
          marginBottom: 30,
        }}
      >
        {/* <HealthCard title="Healthy" value={healthy.length} color="#22c55e" />
        <HealthCard title="Warning" value={warning.length} color="#f59e0b" />
        <HealthCard title="Critical" value={critical.length} color="#ef4444" />
        <HealthCard title="Offline" value={offline.length} color="#6b7280" /> */}
        <StatCard title="Total Devices" value={devices.length} />
        <StatCard title="Healthy" value={healthy.length} />
        <StatCard title="Critical" value={critical.length} />
        <StatCard title="Offline" value={offline.length} />

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
        <DeviceWidget
          devices={devices}
          hardware={hardware}
          getReason={getReason}
        />
        {/* <Card title="Devices" >

          <DeviceTable
            devices={devices}
            hardware={hardware}
            getReason={getReason}
          />

        </Card> */}

        {/* <Card title="Live Events" >
          <div
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="pulse-dot" />

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
        </Card> */}
        <RecentAlertsWidget
          alerts={alerts}
        />
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
        // padding: 28,
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
