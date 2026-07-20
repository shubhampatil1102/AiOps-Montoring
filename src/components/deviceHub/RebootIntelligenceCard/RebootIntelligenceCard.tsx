import DashboardWidget from "@/components/dashboard/DashboardWidget";
import { HealthScoreCard, RecommendationCard } from "@/components/intelligence";
import Badge from "@/components/ui/Badge/Badge";
import Button from "@/components/ui/Button";
import { formatUptime } from "@/components/devices/deviceUtils";
import { timeAgo } from "@/utils/time";
import type { HealthScore, Recommendation } from "@/lib/intelligence/types";
import type { RebootFacts, RebootHistoryEntry } from "@/types/device";
import styles from "./RebootIntelligenceCard.module.css";

// Fields the brief asks for that the agent has no real telemetry for
// (no user-session/idle-time collection exists) — shown explicitly rather
// than fabricated or hidden, matching BatteryDetails.tsx's precedent.
const NOT_AVAILABLE_FIELDS = ["Current User Active", "Unsaved Sessions"];

interface RebootIntelligenceCardProps {
  facts?: RebootFacts;
  daysSinceRestart?: number;
  healthScore: HealthScore;
  recommendation?: Recommendation;
  historyEntries: RebootHistoryEntry[];
  isSafeToRestart: boolean;
  safetyReasons: string[];
  showSmartRestart: boolean;
  canExecute: boolean;
  isRestartPending: boolean;
  onSmartRestart: () => void;
}

function Field({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={muted ? styles.fieldValueMuted : styles.fieldValue}>{value}</span>
    </div>
  );
}

export default function RebootIntelligenceCard({
  facts,
  daysSinceRestart,
  healthScore,
  recommendation,
  historyEntries,
  isSafeToRestart,
  safetyReasons,
  showSmartRestart,
  canExecute,
  isRestartPending,
  onSmartRestart,
}: RebootIntelligenceCardProps) {
  const lastRestart = historyEntries[0]?.new_boot_time ?? facts?.boot_time;
  const windowsUpdatePending = Number(facts?.pending_updates ?? 0) > 0;

  return (
    <DashboardWidget
      title="Reboot Intelligence"
      subtitle="Uptime health, pending-reboot signals, and restart recommendation"
      isEmpty={!facts}
      emptyMessage="No uptime data reported for this device yet."
    >
      <div className={styles.topRow}>
        <HealthScoreCard title="Reboot Health" healthScore={healthScore} />
        {recommendation && <RecommendationCard recommendation={recommendation} />}
      </div>

      <div className={styles.fieldsGrid}>
        <Field label="Uptime" value={facts?.boot_time ? formatUptime(facts.boot_time) : "--"} />
        <Field label="Last Restart" value={lastRestart ? timeAgo(lastRestart) : "No detected restarts yet"} />
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Pending Restart</span>
          <Badge variant={facts?.registry_reboot_pending ? "warning" : "success"}>
            {facts?.registry_reboot_pending ? "Yes" : "No"}
          </Badge>
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Windows Update Pending</span>
          <Badge variant={windowsUpdatePending ? "warning" : "success"}>
            {windowsUpdatePending ? "Yes" : "No"}
          </Badge>
        </div>
        <Field label="Device Class" value={facts?.device_class ?? "unknown"} />
        <Field label="Policy Threshold" value={facts ? `${facts.max_uptime_days} days` : "--"} />

        {NOT_AVAILABLE_FIELDS.map((label) => (
          <Field key={label} label={label} value="Not available" muted />
        ))}
      </div>

      <div className={styles.footNote}>
        User-session/idle-time telemetry is not collected by the current agent — activity signals above
        are derived from device state, current CPU/RAM load, and time of day only.
      </div>

      {showSmartRestart && (
        <div className={styles.smartRestart}>
          <div className={styles.smartRestartHeader}>
            <Badge variant={isSafeToRestart ? "success" : "warning"}>
              {isSafeToRestart ? "Safe to Restart" : "Warning"}
            </Badge>
            {daysSinceRestart !== undefined && (
              <span className={styles.footNote}>{Math.floor(daysSinceRestart)} days since last restart</span>
            )}
          </div>

          {safetyReasons.length > 0 && (
            <ul className={styles.safetyList}>
              {safetyReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          )}

          {canExecute && (
            <Button type="button" variant="primary" onClick={onSmartRestart} disabled={isRestartPending}>
              {isRestartPending ? "Requesting..." : "Smart Restart"}
            </Button>
          )}
        </div>
      )}
    </DashboardWidget>
  );
}
