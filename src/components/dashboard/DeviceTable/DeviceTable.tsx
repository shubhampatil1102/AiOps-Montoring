import styles from "./DeviceTable.module.css";
import UsageBar from "../../UsageBar";
import Badge from "../../ui/Badge/Badge";
import { Circle } from "lucide-react";
import { Thermometer } from "lucide-react";
import { getDeviceHealthStatus } from "@/utils/deviceState";

export type Device = {
    id: string;
    cpu?: number;
    ram?: number;
    time?: number;
};

export type DeviceHardware = {
    cpu_temp?: number;
};

export type HardwareMap = Record<string, DeviceHardware>;

interface DeviceTableProps {
    devices: Device[];
    hardware: HardwareMap;
    getReason: (device: Device) => string;
}

const badgeVariant = {
    Healthy: "success",
    Warning: "warning",
    Critical: "danger",
    Offline: "default",
} as const;

export default function DeviceTable({
    devices,
    hardware,
    getReason,
}: DeviceTableProps) {
    if (!devices.length) {
        return (
            <div className={styles.empty}>
                No devices connected.

                <br />

                Waiting for agents...
            </div>
        );
    }
    return (

        <table className={styles.table}>
            <thead>
                <tr className={styles.tableHeader}>
                    <th className={styles.th}>Device</th>
                    <th className={styles.th}>CPU</th>
                    <th className={styles.th}>RAM</th>
                    <th className={styles.th}>Status</th>
                    <th className={styles.th}>CPU Temp</th>
                </tr>
            </thead>

            <tbody>

                {devices.map((device) => {
                    const status = getDeviceHealthStatus(device);

                    return (
                        <tr key={device.id} className={styles.row}>
                            <td className={styles.td}>{device.id}</td>

                            <td className={styles.td}>
                                <UsageBar value={Number(device.cpu || 0)} />
                            </td>

                            <td className={styles.td}>
                                <UsageBar value={Number(device.ram || 0)} />
                            </td>

                            <td className={styles.td} title={getReason(device)}>
                                <div className={styles.status}>
                                    <Circle
                                        size={10}
                                        fill="currentColor"
                                        className={`${styles.statusIcon} ${styles[status.toLowerCase()]}`}
                                    />

                                    <Badge variant={badgeVariant[status]}>
                                        {status}
                                    </Badge>
                                </div>
                            </td>

                            <td className={styles.td}>
                                <Thermometer size={16} />
                                {hardware?.[device.id]?.cpu_temp !== undefined
                                    ? `${hardware[device.id].cpu_temp} °C`
                                    : "--"}
                            </td>

                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}