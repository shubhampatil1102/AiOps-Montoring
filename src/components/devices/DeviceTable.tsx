import Badge from "../ui/Badge/Badge";
import Button from "../ui/Button";
import UsageBar from "../UsageBar";
import type { Device, HardwareMap } from "@/types/device";
import {
  formatLastSeen,
  formatPercent,
  formatUptime,
  getDeviceReason,
  getDeviceStatus,
  getStatusVariant,
} from "./deviceUtils";
import styles from "./DeviceTable.module.css";

export type DeviceSortKey =
  | "id"
  | "cpu"
  | "ram"
  | "status"
  | "cpuTemp"
  | "disk"
  | "lastSeen";

interface DeviceTableProps {
  devices: Device[];
  hardware: HardwareMap;
  page: number;
  pageSize: number;
  total: number;
  sortKey: DeviceSortKey;
  sortDirection: "asc" | "desc";
  onSort: (key: DeviceSortKey) => void;
  onPageChange: (page: number) => void;
  onSelectDevice: (device: Device) => void;
}

const columns: Array<{ key: DeviceSortKey; label: string }> = [
  { key: "id", label: "Device" },
  { key: "cpu", label: "CPU" },
  { key: "ram", label: "RAM" },
  { key: "status", label: "Status" },
  { key: "cpuTemp", label: "CPU Temp" },
  { key: "disk", label: "Disk" },
  { key: "lastSeen", label: "Last Seen" },
];

export default function DeviceTable({
  devices,
  hardware,
  page,
  pageSize,
  total,
  sortKey,
  sortDirection,
  onSort,
  onPageChange,
  onSelectDevice,
}: DeviceTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, total);

  if (total === 0) {
    return (
      <div className={styles.empty}>
        No devices found.
      </div>
    );
  }

  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>
                  <button
                    className={styles.sortButton}
                    onClick={() => onSort(column.key)}
                    type="button"
                  >
                    {column.label}
                    <span>
                      {sortKey === column.key ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                    </span>
                  </button>
                </th>
              ))}
              <th>Uptime</th>
            </tr>
          </thead>

          <tbody>
            {devices.map((device) => {
              const status = getDeviceStatus(device);
              const deviceHardware = hardware[device.id] || {};

              return (
                <tr
                  key={device.id}
                  onClick={() => onSelectDevice(device)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectDevice(device);
                    }
                  }}
                  tabIndex={0}
                  title={getDeviceReason(device)}
                >
                  <td>
                    <div className={styles.deviceCell}>
                      <span className={`${styles.dot} ${styles[status.toLowerCase()]}`} />
                      <span>{device.id}</span>
                    </div>
                  </td>

                  <td>
                    <div className={styles.metricCell}>
                      <UsageBar value={Number(device.cpu || 0)} />
                      <span>{formatPercent(device.cpu)}</span>
                    </div>
                  </td>

                  <td>
                    <div className={styles.metricCell}>
                      <UsageBar value={Number(device.ram || 0)} />
                      <span>{formatPercent(device.ram)}</span>
                    </div>
                  </td>

                  <td>
                    <Badge variant={getStatusVariant(status)}>
                      {status}
                    </Badge>
                  </td>

                  <td>{deviceHardware.cpu_temp !== undefined ? `${deviceHardware.cpu_temp} °C` : "-"}</td>
                  <td>{deviceHardware.disk !== undefined ? `${deviceHardware.disk}%` : "-"}</td>
                  <td>{formatLastSeen(device.last_seen || device.time)}</td>
                  <td>{formatUptime(device.boot_time)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <span>
          {firstItem}-{lastItem} of {total}
        </span>

        <div className={styles.pageActions}>
          <Button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            type="button"
            variant="secondary"
          >
            Previous
          </Button>
          <span>
            Page {page} of {totalPages}
          </span>
          <Button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            type="button"
            variant="secondary"
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
