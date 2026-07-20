import { Cpu, HardDrive, MemoryStick } from "lucide-react";
import Card from "../../../ui/Card";
import Sparkline from "@/components/charts/Sparkline";
import useMetricsHistory from "@/hooks/useMetricsHistory";
import type { HardwareMap } from "@/types/dashboard";
import styles from "./SystemHealthWidget.module.css";

interface SystemHealthWidgetProps {
  hardware: HardwareMap;
}

const SPARKLINE_POINTS = 15;

function TileTrend({
  isLoading,
  sparkline,
  color,
}: {
  isLoading: boolean;
  sparkline: number[] | null;
  color: string;
}) {
  if (!sparkline) {
    return <div className={styles.noTrend}>Live snapshot</div>;
  }

  if (isLoading || sparkline.length < 2) {
    return <div className={styles.noTrend}>Collecting trend...</div>;
  }

  return <Sparkline data={sparkline} color={color} />;
}

export default function SystemHealthWidget({
  hardware,
}: SystemHealthWidgetProps) {
  const { data: history = [], isLoading } = useMetricsHistory();

  const recent = history.slice(-SPARKLINE_POINTS);
  const cpuSeries = recent.map((point) => Number(point.cpu || 0));
  const ramSeries = recent.map((point) => Number(point.ram || 0));

  const latestCpu = cpuSeries.length > 0 ? cpuSeries[cpuSeries.length - 1] : 0;
  const latestRam = ramSeries.length > 0 ? ramSeries[ramSeries.length - 1] : 0;

  const diskValues = Object.values(hardware)
    .map((h) => Number(h.disk))
    .filter((value) => !Number.isNaN(value));

  const avgDisk =
    diskValues.length > 0
      ? diskValues.reduce((sum, value) => sum + value, 0) / diskValues.length
      : 0;

  const tiles: {
    label: string;
    value: number;
    icon: typeof Cpu;
    color: string;
    sparkline: number[] | null;
  }[] = [
    {
      label: "CPU Usage",
      value: latestCpu,
      icon: Cpu,
      color: "#2563eb",
      sparkline: cpuSeries,
    },
    {
      label: "Memory Usage",
      value: latestRam,
      icon: MemoryStick,
      color: "#f59e0b",
      sparkline: ramSeries,
    },
    {
      label: "Disk Usage",
      value: avgDisk,
      icon: HardDrive,
      color: "#22c55e",
      sparkline: null,
    },
  ];

  return (
    <div className={styles.grid}>
      {tiles.map((tile) => (
        <Card key={tile.label} fill>
          <div className={styles.tile}>
            <div className={styles.header}>
              <div className={styles.iconWrapper}>
                <tile.icon size={18} color={tile.color} />
              </div>

              <div>
                <div className={styles.label}>{tile.label}</div>
                <div className={styles.value}>{tile.value.toFixed(0)}%</div>
              </div>
            </div>

            <TileTrend
              isLoading={isLoading}
              sparkline={tile.sparkline}
              color={tile.color}
            />
          </div>
        </Card>
      ))}
    </div>
  );
}
