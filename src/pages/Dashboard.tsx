import { useEffect, useState } from "react";
import useDashboardData from "../hooks/useDashboardData";
import StatCard from "../components/StatCard";
import PageHeader from "../layouts/PageHeader";
import AnalyticsSection from "../components/AnalyticsSection";
import DeviceWidget from "../components/dashboard/widgets/DeviceWidget";
import RecentAlertsWidget from "../components/dashboard/widgets/RecentAlertsWidget";
import type { Device } from "@/types/dashboard";
import styles from "./Dashboard.module.css";
import {
  Monitor,
  AlertTriangle,
  ShieldAlert,
  WifiOff
} from "lucide-react";

function getDeviceReason(device: Device) {
  if (Date.now() - Number(device.time || 0) > 20000) return "Agent not reporting";
  if (Number(device.cpu || 0) > 90) return "CPU critically high";
  if (Number(device.ram || 0) > 90) return "Memory critically high";
  if (Number(device.cpu || 0) > 75) return "CPU elevated";
  if (Number(device.ram || 0) > 80) return "Memory elevated";
  return "Healthy";
}

export default function Dashboard() {
  const {
    devices,
    alerts,
    hardware,
    healthy,
    warning,
    critical,
    offline,
    isLoading,
  } = useDashboardData();

  const [, forceTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => forceTick((tick) => tick + 1), 1000);
    return () => clearInterval(timer);
  }, []);
if (isLoading) {
  return (
    <div className={styles.page}>
      <PageHeader
        title="Dashboard"
        description="Loading dashboard..."
      />

      <p>Loading dashboard data...</p>
    </div>
  );
}
  return (
    <div className={styles.page}>
      <PageHeader
        title="Dashboard"
        description="Monitor your infrastructure health in real time."
      />

      <div className={styles.kpiGrid}>
        <StatCard
          title="Healthy Devices"
          value={healthy.length}
          icon={<Monitor size={24} color="#10b981" />}
          trend={8.2}
          trendLabel="vs yesterday"
          description="All monitored endpoints"
          color="#10b981"
        />

        <StatCard
          title="Warning"
          value={warning.length}
          icon={<AlertTriangle size={24} color="#f59e0b" />}
          trend={-1.3}
          trendLabel="vs yesterday"
          description="Devices requiring attention"
          color="#f59e0b"
        />

        <StatCard
          title="Critical"
          value={critical.length}
          icon={<ShieldAlert size={24} color="#ef4444" />}
          trend={2.8}
          trendLabel="vs yesterday"
          description="Immediate action required"
          color="#ef4444"
        />

        <StatCard
          title="Offline"
          value={offline.length}
          icon={<WifiOff size={24} color="#64748b" />}
          trend={0}
          trendLabel="vs yesterday"
          description="Agents currently unreachable"
          color="#64748b"
        />
      </div>


      <div className={styles.contentGrid}>
        <DeviceWidget
          devices={devices}
          hardware={hardware}
          getReason={getDeviceReason}
        />

        <RecentAlertsWidget
          alerts={alerts}
        />

        <AnalyticsSection
          healthy={healthy.length}
          warning={warning.length}
          critical={critical.length}
          offline={offline.length}
        />
      </div>
    </div>
  );
}
