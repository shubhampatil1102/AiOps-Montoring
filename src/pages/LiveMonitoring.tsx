import { useEffect, useMemo, useState } from "react";
import { Activity, Cpu, MemoryStick, Wifi } from "lucide-react";
import useDashboardData from "../hooks/useDashboardData";
import PageHeader from "../layouts/PageHeader";
import StatCard from "../components/StatCard";
import Card from "../components/ui/Card";
import DashboardWidget from "../components/dashboard/DashboardWidget";
import Loading from "../components/common/Loading";
import ErrorState from "../components/common/ErrorState";
import DeviceToolbar from "../components/devices/DeviceToolbar";
import DeviceHealthGrid from "../components/live/DeviceHealthGrid";
import ActivityFeed from "../components/common/ActivityFeed";
import { getDeviceHealthStatus } from "../utils/deviceState";
import { getSeverity } from "../utils/severity";
import { formatTime } from "../utils/time";
import { SystemOverviewChart } from "../components/dashboard/Charts";
import type { DeviceStatus } from "@/types/device";
import styles from "./LiveMonitoring.module.css";

export default function LiveMonitoring() {
  const {
    devices,
    alerts,
    hardware,
    offline,
    activeAlerts,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useDashboardData();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DeviceStatus | "All">("All");
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  useEffect(() => {
    setLastUpdated(Date.now());
  }, [devices, alerts]);

  const filteredDevices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return devices.filter((device) => {
      const matchesSearch = !query || device.id.toLowerCase().includes(query);
      const matchesStatus =
        status === "All" || getDeviceHealthStatus(device) === status;

      return matchesSearch && matchesStatus;
    });
  }, [devices, search, status]);

  const fleetAverages = useMemo(() => {
    if (devices.length === 0) {
      return { avgCpu: 0, avgRam: 0 };
    }

    const totalCpu = devices.reduce((sum, d) => sum + Number(d.cpu || 0), 0);
    const totalRam = devices.reduce((sum, d) => sum + Number(d.ram || 0), 0);

    return {
      avgCpu: totalCpu / devices.length,
      avgRam: totalRam / devices.length,
    };
  }, [devices]);

  const activityItems = useMemo(
    () =>
      alerts.slice(0, 15).map((alert) => ({
        id: `${alert.id}-${alert.time}`,
        message: alert.message,
        time: alert.time,
        severityLabel: getSeverity(alert.message).label,
        meta: alert.id,
      })),
    [alerts]
  );

  if (isLoading) {
    return (
      <div className={styles.page}>
        <PageHeader
          title="Live Monitoring"
          description="Loading live monitoring data..."
        />

        <div className={styles.kpiGrid}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} fill>
              <Loading />
            </Card>
          ))}
        </div>

        <DeviceHealthGrid devices={[]} hardware={{}} isLoading />

        <div className={styles.bottomGrid}>
          <section className={styles.chart}>
            <DashboardWidget title="System Overview">
              <Loading />
            </DashboardWidget>
          </section>

          <section className={styles.feed}>
            <DashboardWidget title="Activity Feed">
              <Loading />
            </DashboardWidget>
          </section>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.page}>
        <PageHeader
          title="Live Monitoring"
          description="Near real-time device health and activity."
        />

        <ErrorState message="Unable to load live monitoring data. Please check your connection and try again." />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Live Monitoring"
        description="Near real-time device health and activity."
        actions={
          <span className={styles.lastUpdated}>
            Last updated {formatTime(lastUpdated)}
            {isFetching ? " · updating..." : ""}
          </span>
        }
      />

      <div className={styles.kpiGrid}>

        <StatCard
          title="Online Devices"
          value={devices.length - offline.length}
          icon={<Wifi size={24} color="#22C55E" />}
          description="Currently reporting"
          color="#22C55E"
        />

        <StatCard
          title="Avg CPU"
          value={`${fleetAverages.avgCpu.toFixed(0)}%`}
          icon={<Cpu size={24} color="#2563EB" />}
          description="Fleet average"
          color="#2563EB"
        />

        <StatCard
          title="Avg Memory"
          value={`${fleetAverages.avgRam.toFixed(0)}%`}
          icon={<MemoryStick size={24} color="#F59E0B" />}
          description="Fleet average"
          color="#F59E0B"
        />

        <StatCard
          title="Active Alerts"
          value={activeAlerts.length}
          icon={<Activity size={24} color="#EF4444" />}
          description="Not yet acknowledged"
          color="#EF4444"
        />

      </div>

      <DeviceToolbar
        search={search}
        status={status}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onRefresh={refetch}
        isRefreshing={isFetching}
      />

      <DeviceHealthGrid
        devices={filteredDevices}
        hardware={hardware}
      />

      <div className={styles.bottomGrid}>
        <section className={styles.chart}>
          <SystemOverviewChart />
        </section>

        <section className={styles.feed}>
          <ActivityFeed
            title="Activity Feed"
            subtitle="Latest device alerts"
            items={activityItems}
            emptyMessage="No recent activity."
          />
        </section>
      </div>
    </div>
  );
}
