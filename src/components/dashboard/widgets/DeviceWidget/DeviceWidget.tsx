import styles from "./DeviceWidget.module.css";

import { Search, RefreshCcw } from "lucide-react";

import Button from "../../../ui/Button";
import DashboardWidget from "../../DashboardWidget";
import DeviceTable from "../../DeviceTable";

import type {
  Device,
  HardwareMap,
} from "../../DeviceTable/DeviceTable";

interface DeviceWidgetProps {
  devices: Device[];
  hardware: HardwareMap;
  getReason: (device: Device) => string;
}

export default function DeviceWidget({
  devices,
  hardware,
  getReason,
}: DeviceWidgetProps) {
  return (
    <DashboardWidget
      title="Devices"
      subtitle={`${devices.length} Managed Devices`}
      actions={
        <Button variant="secondary">
          <RefreshCcw size={16} />
          Refresh
        </Button>
      }
      toolbar={
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />

          <input
            type="text"
            placeholder="Search devices..."
            className={styles.search}
          />
        </div>
      }
      footer={
        <Button>
          View All Devices ({devices.length})
        </Button>
      }
    >
      <div className={styles.tableContainer}>
        <DeviceTable
          devices={devices}
          hardware={hardware}
          getReason={getReason}
        />
      </div>
    </DashboardWidget>
  );
}