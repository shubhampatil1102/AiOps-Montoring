import Button from "../ui/Button";
import styles from "./DeviceToolbar.module.css";
import type { DeviceStatus } from "@/types/device";

interface DeviceToolbarProps {
  search: string;
  status: DeviceStatus | "All";
  onSearchChange: (value: string) => void;
  onStatusChange: (value: DeviceStatus | "All") => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

const statusOptions: Array<DeviceStatus | "All"> = [
  "All",
  "Healthy",
  "Warning",
  "Critical",
  "Offline",
];

export default function DeviceToolbar({
  search,
  status,
  onSearchChange,
  onStatusChange,
  onRefresh,
  isRefreshing = false,
}: DeviceToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <input
        className={styles.search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search devices..."
        type="search"
        value={search}
      />

      <select
        className={styles.select}
        onChange={(event) => onStatusChange(event.target.value as DeviceStatus | "All")}
        value={status}
      >
        {statusOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <Button
        disabled={isRefreshing}
        onClick={onRefresh}
        type="button"
        variant="secondary"
      >
        {isRefreshing ? "Refreshing..." : "Refresh"}
      </Button>
    </div>
  );
}
