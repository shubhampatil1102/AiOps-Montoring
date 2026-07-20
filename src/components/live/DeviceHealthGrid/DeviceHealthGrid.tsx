import styles from "./DeviceHealthGrid.module.css";
import DeviceHealthCard from "../DeviceHealthCard";
import EmptyState from "@/components/common/EmptyState";
import Card from "../../ui/Card";
import type { Device, HardwareMap } from "@/types/dashboard";

interface DeviceHealthGridProps {
  devices: Device[];
  hardware: HardwareMap;
  isLoading?: boolean;
}

const SKELETON_COUNT = 6;

export default function DeviceHealthGrid({
  devices,
  hardware,
  isLoading = false,
}: DeviceHealthGridProps) {
  if (isLoading) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
          <Card key={index} fill>
            <div className={styles.skeletonCard} />
          </Card>
        ))}
      </div>
    );
  }

  if (devices.length === 0) {
    return <EmptyState message="No devices match your search." />;
  }

  return (
    <div className={styles.grid}>
      {devices.map((device) => (
        <DeviceHealthCard
          key={device.id}
          device={device}
          hardware={hardware[device.id]}
        />
      ))}
    </div>
  );
}
