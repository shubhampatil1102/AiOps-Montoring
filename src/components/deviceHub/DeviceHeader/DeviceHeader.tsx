import { Download, RefreshCcw } from "lucide-react";
import RadialProgress from "@/components/charts/RadialProgress";
import { getDeviceState } from "@/utils/deviceState";
import { timeAgo } from "@/utils/time";
import { scoreToColor } from "@/themes/colors";
import styles from "./DeviceHeader.module.css";

interface DeviceHeaderProps {
  deviceId: string;
  state?: string;
  lastSeen?: number;
  healthScore: number;
  onScanUpdates: () => void;
  onInstallUpdates: () => void;
  isActionPending?: boolean;
}

export default function DeviceHeader({
  deviceId,
  state,
  lastSeen,
  healthScore,
  onScanUpdates,
  onInstallUpdates,
  isActionPending = false,
}: DeviceHeaderProps) {
  const status = getDeviceState(state);

  return (
    <div className={styles.header}>
      <div className={styles.identity}>
        <h1 className={styles.name}>{deviceId}</h1>

        <div className={styles.metaRow}>
          <span className={styles.statusDot} style={{ background: status.color }} />
          <span style={{ color: status.color, fontWeight: 700 }}>{status.label}</span>
          <span className={styles.metaItem}>
            Last seen {lastSeen ? timeAgo(lastSeen) : "--"}
          </span>
        </div>

        <div className={styles.fieldsRow}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Owner</span>
            <span className={styles.fieldValueMuted}>Not available</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Operating System</span>
            <span className={styles.fieldValueMuted}>Not available</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Warranty</span>
            <span className={styles.fieldValueMuted}>Not available</span>
          </div>
        </div>
      </div>

      <div className={styles.score}>
        <RadialProgress value={healthScore} label="Health Score" color={scoreToColor(healthScore)} size={120} />
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={onScanUpdates}
          disabled={isActionPending}
        >
          <RefreshCcw size={14} />
          Check for Updates
        </button>

        <button
          type="button"
          className={`${styles.actionButton} ${styles.primary}`}
          onClick={onInstallUpdates}
          disabled={isActionPending}
        >
          <Download size={14} />
          Install Pending Updates
        </button>
      </div>
    </div>
  );
}
