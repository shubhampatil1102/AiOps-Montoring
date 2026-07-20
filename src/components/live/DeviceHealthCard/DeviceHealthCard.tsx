import { memo } from "react";
import styles from "./DeviceHealthCard.module.css";
import Card from "../../ui/Card";
import Badge from "../../ui/Badge/Badge";
import UsageBar from "../../UsageBar";
import { getDeviceHealthStatus } from "@/utils/deviceState";
import { timeAgo } from "@/utils/time";
import type { Device, DeviceHardware } from "@/types/dashboard";

interface DeviceHealthCardProps {
  device: Device;
  hardware?: DeviceHardware;
}

const badgeVariant = {
  Healthy: "success",
  Warning: "warning",
  Critical: "danger",
  Offline: "default",
} as const;

function DeviceHealthCard({ device, hardware }: DeviceHealthCardProps) {
  const status = getDeviceHealthStatus(device);
  const cpu = Number(device.cpu || 0);
  const ram = Number(device.ram || 0);
  const disk = Number(hardware?.disk || 0);

  return (
    <Card fill>
      <div className={styles.card}>

        <div className={styles.header}>
          <div className={styles.id}>{device.id}</div>
          <Badge variant={badgeVariant[status]}>{status}</Badge>
        </div>

        <div className={styles.metric}>
          <div className={styles.metricLabel}>
            <span>CPU</span>
            <span>{cpu.toFixed(0)}%</span>
          </div>
          <UsageBar value={cpu} />
        </div>

        <div className={styles.metric}>
          <div className={styles.metricLabel}>
            <span>Memory</span>
            <span>{ram.toFixed(0)}%</span>
          </div>
          <UsageBar value={ram} />
        </div>

        <div className={styles.metric}>
          <div className={styles.metricLabel}>
            <span>Disk</span>
            <span>{hardware ? `${disk.toFixed(0)}%` : "--"}</span>
          </div>
          <UsageBar value={disk} />
        </div>

        <div className={styles.footer}>
          <div className={styles.footerRow}>
            <span>Heartbeat</span>
            <span>{device.time ? timeAgo(Number(device.time)) : "--"}</span>
          </div>

          <div className={styles.footerRow}>
            <span>Booted</span>
            <span>
              {device.boot_time ? timeAgo(Number(device.boot_time)) : "--"}
            </span>
          </div>

          <div className={styles.footerRow}>
            <span>Network</span>
            <span className={styles.notCollected}>Not collected</span>
          </div>
        </div>

      </div>
    </Card>
  );
}

export default memo(DeviceHealthCard);
