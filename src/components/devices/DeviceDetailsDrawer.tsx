import Badge from "../ui/Badge/Badge";
import Button from "../ui/Button";
import Card from "../ui/Card";
import UsageBar from "../UsageBar";
import { useDeviceDetails } from "@/hooks/useDevices";
import type { Device } from "@/types/device";
import {
  formatDateTime,
  formatLastSeen,
  formatPercent,
  formatValue,
  getDeviceStatus,
  getStatusVariant,
} from "./deviceUtils";
import styles from "./DeviceDetailsDrawer.module.css";

interface DeviceDetailsDrawerProps {
  device: Device | null;
  open: boolean;
  onClose: () => void;
}

export default function DeviceDetailsDrawer({
  device,
  open,
  onClose,
}: DeviceDetailsDrawerProps) {
  const details = useDeviceDetails(device?.id ?? null, open);
  const selectedDevice = details.device.data?.id ? details.device.data : device;
  const status = selectedDevice ? getDeviceStatus(selectedDevice) : "Offline";

  if (!open || !selectedDevice) {
    return null;
  }

  return (
    <div className={styles.overlay} role="presentation">
      <aside className={styles.drawer} aria-label="Device details">
        <div className={styles.header}>
          <div>
            <h2>{selectedDevice.id}</h2>
            <p>Last seen {formatLastSeen(selectedDevice.last_seen || selectedDevice.time)}</p>
          </div>

          <Button onClick={onClose} type="button" variant="secondary">
            Close
          </Button>
        </div>

        <div className={styles.content}>
          {details.isLoading && (
            <Card>
              <div className={styles.muted}>Loading device details...</div>
            </Card>
          )}

          {details.isError && (
            <Card>
              <div className={styles.muted}>Unable to load some device details.</div>
            </Card>
          )}

          <Card title="General Information">
            <div className={styles.grid}>
              <Info label="Status">
                <Badge variant={getStatusVariant(status)}>{status}</Badge>
              </Info>
              <Info label="Device ID" value={selectedDevice.id} />
              <Info label="Last Seen" value={formatDateTime(selectedDevice.last_seen || selectedDevice.time)} />
              <Info label="State" value={formatValue(selectedDevice.state)} />
            </div>
          </Card>

          <Card title="CPU">
            <Metric value={Number(selectedDevice.cpu || 0)} />
          </Card>

          <Card title="RAM">
            <Metric value={Number(selectedDevice.ram || 0)} />
          </Card>

          <Card title="Disk">
            <div className={styles.grid}>
              <Info label="Disk Usage" value={details.hardware.data?.disk !== undefined ? `${details.hardware.data.disk}%` : "-"} />
              <Info label="Free Space" value={details.hardware.data?.disk_free !== undefined ? `${details.hardware.data.disk_free} GB` : "-"} />
              <Info label="Risk" value={formatValue(details.hardware.data?.risk)} />
              <Info label="Health Score" value={details.hardware.data?.health_score !== undefined ? `${details.hardware.data.health_score}/100` : "-"} />
            </div>
          </Card>

          <Card title="Hardware">
            <div className={styles.grid}>
              <Info label="CPU Temp" value={details.hardware.data?.cpu_temp !== undefined ? `${details.hardware.data.cpu_temp} °C` : "-"} />
              <Info label="Battery" value={formatValue(details.hardware.data?.battery_health)} />
              <Info label="Battery Health" value={details.hardware.data?.battery_health_percent !== undefined ? `${details.hardware.data.battery_health_percent}%` : "-"} />
              <Info label="Fan Status" value={formatValue(details.hardware.data?.fan_status)} />
            </div>
          </Card>

          <Card title="Compliance">
            <div className={styles.list}>
              <Row label="BitLocker" value={formatValue(details.compliance.data?.bitlocker)} />
              <Row label="TPM" value={formatValue(details.compliance.data?.tpm)} />
              <Row label="Secure Boot" value={formatValue(details.compliance.data?.secureboot ?? details.compliance.data?.secureBoot)} />
              <Row label="Defender" value={formatValue(details.compliance.data?.defender)} />
            </div>
          </Card>

          <Card title="Installed Updates">
            <div className={styles.list}>
              <Row label="Windows Update" value={formatValue(details.updates.data?.windows_update_status)} />
              <Row label="Pending Updates" value={formatValue(details.updates.data?.pending_updates)} />
              <Row label="Failed Updates" value={formatValue(details.updates.data?.failed_updates)} />
              <Row label="Driver Status" value={formatValue(details.updates.data?.driver_status)} />
              <Row label="Outdated Drivers" value={formatValue(details.updates.data?.outdated_drivers)} />
            </div>
          </Card>

          <Card title="Running Processes">
            <div className={styles.list}>
              {(details.processes.data || []).length > 0 ? (
                details.processes.data?.slice(0, 8).map((process) => (
                  <Row
                    key={process.name}
                    label={process.name}
                    value={`${formatPercent(process.cpu)} CPU / ${formatPercent(process.ram)} RAM`}
                  />
                ))
              ) : (
                <div className={styles.muted}>No process data available.</div>
              )}
            </div>
          </Card>

          <Card title="AI Suggestions">
            <div className={styles.list}>
              {(details.suggestions.data || []).length > 0 ? (
                details.suggestions.data?.slice(0, 5).map((suggestion) => (
                  <Row
                    key={suggestion.id}
                    label={suggestion.suggested_action || suggestion.alert_type || `Suggestion #${suggestion.id}`}
                    value={suggestion.reason || formatValue(suggestion.status)}
                  />
                ))
              ) : (
                <div className={styles.muted}>No AI suggestions available.</div>
              )}
            </div>
          </Card>

          <Card title="Recent Alerts">
            <div className={styles.list}>
              {(details.alerts.data || []).length > 0 ? (
                details.alerts.data?.slice(0, 6).map((alert) => (
                  <Row
                    key={`${alert.id}-${alert.time}`}
                    label={alert.message}
                    value={formatDateTime(alert.time)}
                  />
                ))
              ) : (
                <div className={styles.muted}>No recent alerts.</div>
              )}
            </div>
          </Card>
        </div>
      </aside>
    </div>
  );
}

function Info({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={styles.info}>
      <span>{label}</span>
      <strong>{children ?? value}</strong>
    </div>
  );
}

function Metric({ value }: { value: number }) {
  return (
    <div className={styles.metric}>
      <UsageBar value={value} />
      <strong>{value.toFixed(1)}%</strong>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.row}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
