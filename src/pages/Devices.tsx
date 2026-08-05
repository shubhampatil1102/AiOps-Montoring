import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardWidget from "../components/dashboard/DashboardWidget";
import {
  DeviceTable,
  DeviceTableSkeleton,
  DeviceToolbar,
  type DeviceSortKey,
} from "../components/devices";
import { getDeviceStatus } from "../components/devices/deviceUtils";
import PageHeader from "../layouts/PageHeader";
import { useDevices, useDevicesHardware } from "@/hooks/useDevices";
import type { Device, DeviceStatus, HardwareMap } from "@/types/device";
import styles from "./Devices.module.css";

const PAGE_SIZE = 12;

export default function Devices() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DeviceStatus | "All">("All");
  const [sortKey, setSortKey] = useState<DeviceSortKey>("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const devicesQuery = useDevices();
  const devices = devicesQuery.data || [];
  const hardwareQuery = useDevicesHardware(devices.map((device) => device.id));
  const hardware = hardwareQuery.data || {};

  const filteredDevices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return devices.filter((device) => {
      const matchesSearch = !query || device.id.toLowerCase().includes(query);
      const deviceStatus = getDeviceStatus(device);
      const matchesStatus = status === "All" || status === deviceStatus;

      return matchesSearch && matchesStatus;
    });
  }, [devices, search, status]);

  const sortedDevices = useMemo(
    () => sortDevices(filteredDevices, hardware, sortKey, sortDirection),
    [filteredDevices, hardware, sortDirection, sortKey]
  );

  const totalPages = Math.max(1, Math.ceil(sortedDevices.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedDevices = sortedDevices.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function handleSort(key: DeviceSortKey) {
    if (key === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(value: DeviceStatus | "All") {
    setStatus(value);
    setPage(1);
  }

  async function handleRefresh() {
    await Promise.all([
      devicesQuery.refetch(),
      hardwareQuery.refetch(),
    ]);
  }

  return (
    <div className={styles.page}>
      {/* <PageHeader
        title="Devices"
        description="Monitor managed devices, hardware health, compliance, and remediation signals."
      /> */}

      <DashboardWidget
        title="Managed Devices"
        subtitle={`${filteredDevices.length} devices`}
        toolbar={(
          <DeviceToolbar
            isRefreshing={devicesQuery.isFetching || hardwareQuery.isFetching}
            onRefresh={handleRefresh}
            onSearchChange={handleSearchChange}
            onStatusChange={handleStatusChange}
            search={search}
            status={status}
          />
        )}
      >
        {devicesQuery.isLoading ? (
          <DeviceTableSkeleton />
        ) : devicesQuery.isError ? (
          <div className={styles.state}>Unable to load devices.</div>
        ) : (
          <DeviceTable
            devices={pagedDevices}
            hardware={hardware}
            onPageChange={setPage}
            onSelectDevice={(device) => navigate(`/devices/${encodeURIComponent(device.id)}`)}
            onSort={handleSort}
            page={currentPage}
            pageSize={PAGE_SIZE}
            sortDirection={sortDirection}
            sortKey={sortKey}
            total={sortedDevices.length}
          />
        )}
      </DashboardWidget>
    </div>
  );
}

function sortDevices(
  devices: Device[],
  hardware: HardwareMap,
  sortKey: DeviceSortKey,
  direction: "asc" | "desc"
) {
  const modifier = direction === "asc" ? 1 : -1;

  return [...devices].sort((a, b) => {
    const aValue = getSortValue(a, hardware, sortKey);
    const bValue = getSortValue(b, hardware, sortKey);

    if (typeof aValue === "number" && typeof bValue === "number") {
      return (aValue - bValue) * modifier;
    }

    return String(aValue).localeCompare(String(bValue)) * modifier;
  });
}

function getSortValue(
  device: Device,
  hardware: HardwareMap,
  sortKey: DeviceSortKey
) {
  if (sortKey === "cpu") return Number(device.cpu || 0);
  if (sortKey === "ram") return Number(device.ram || 0);
  if (sortKey === "status") return getDeviceStatus(device);
  if (sortKey === "cpuTemp") return Number(hardware[device.id]?.cpu_temp || 0);
  if (sortKey === "disk") return Number(hardware[device.id]?.disk || 0);
  if (sortKey === "lastSeen") return Number(device.last_seen || device.time || 0);

  return device.id;
}
