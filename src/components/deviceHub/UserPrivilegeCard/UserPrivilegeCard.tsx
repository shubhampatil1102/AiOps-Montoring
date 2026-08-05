import DashboardWidget from "@/components/dashboard/DashboardWidget";
import { RecommendationCard } from "@/components/intelligence";
import Badge from "@/components/ui/Badge/Badge";
import { timeAgo } from "@/utils/time";
import {
  adminBadgeVariant,
  elevationBadgeVariant,
  evaluateUserPrivilegeRecommendations,
} from "@/lib/intelligence/userPrivilegeIntelligence";
import type { DeviceUserPrivilegeSummary } from "@/types/userPrivilege";
import styles from "./UserPrivilegeCard.module.css";

interface UserPrivilegeCardProps {
  summary?: DeviceUserPrivilegeSummary;
}

function Field({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={muted ? styles.fieldValueMuted : styles.fieldValue}>{value}</span>
    </div>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

export default function UserPrivilegeCard({ summary }: UserPrivilegeCardProps) {
  const device = summary?.device;
  const sessions = summary?.sessions ?? [];
  const localAdministrators = summary?.localAdministrators ?? [];

  const builtInAdministratorEnabled = localAdministrators.some((a) => a.sid.endsWith("-500") && a.enabled === true);
  const disabledAdminCount = localAdministrators.filter((a) => a.enabled === false).length;
  const recentlyAddedAdminCount = (summary?.events ?? []).filter(
    (e) => e.event_type === "ADDED" && e.occurred_at >= Date.now() - 30 * DAY_MS
  ).length;

  const staleAdmins = localAdministrators.filter((a) => a.enabled === true && a.last_logon);
  const staleAdminDaysSinceLogon = staleAdmins.length
    ? Math.max(...staleAdmins.map((a) => (Date.now() - Number(a.last_logon)) / DAY_MS))
    : null;

  const recommendations = device
    ? evaluateUserPrivilegeRecommendations({
        primaryUsername: device.primary_username,
        primaryIsAdministrator: device.primary_is_administrator,
        primaryIsElevated: device.primary_is_elevated,
        localAdministratorCount: localAdministrators.length,
        builtInAdministratorEnabled,
        staleAdminDaysSinceLogon,
        recentlyAddedAdminCount,
        disabledAdminCount,
      })
    : [];

  return (
    <DashboardWidget
      title="User & Privilege"
      subtitle="Real session/token inspection — never determined by group membership alone"
      isEmpty={!device}
      emptyMessage="No user/privilege data reported for this device yet."
    >
      {device && (
        <>
          <div className={styles.fieldsGrid}>
            <Field label="Current User" value={device.primary_username ?? "--"} />
            <Field label="Domain" value={device.primary_domain ?? "--"} />
            <Field label="Account Type" value={device.primary_account_type ?? "--"} />
            <Field label="Session Type" value={device.primary_session_type ?? "--"} />

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Administrator</span>
              <Badge variant={adminBadgeVariant(device.primary_is_administrator)}>
                {device.primary_is_administrator === null ? "Unknown" : device.primary_is_administrator ? "Yes" : "No"}
              </Badge>
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Elevated</span>
              <Badge variant={elevationBadgeVariant(device.primary_is_elevated)}>
                {device.primary_is_elevated === null ? "Unknown" : device.primary_is_elevated ? "Yes" : "No"}
              </Badge>
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>UAC</span>
              <Badge variant={device.uac_enabled ? "success" : "warning"}>
                {device.uac_enabled === null ? "Unknown" : device.uac_enabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>

            <Field label="Local Administrators" value={String(localAdministrators.length)} />
            <Field label="Active Sessions" value={String(sessions.filter((s) => s.is_active).length)} />
            <Field label="Last Scan" value={device.last_scan_at ? timeAgo(device.last_scan_at) : "--"} />
          </div>

          {sessions.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Sessions</div>
              <div className={styles.list}>
                {sessions.map((s) => (
                  <div key={s.id} className={styles.listRow}>
                    <span className={styles.listPrimary}>{s.username ?? "--"}</span>
                    <span className={styles.listMuted}>{s.session_name ?? "--"}</span>
                    <Badge variant={s.is_active ? "success" : "default"}>{s.state ?? "--"}</Badge>
                    {s.is_administrator && (
                      <Badge variant={elevationBadgeVariant(s.is_elevated)}>
                        {s.is_elevated ? "Elevated Admin" : "Admin (not elevated)"}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {localAdministrators.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Local Administrators</div>
              <div className={styles.list}>
                {localAdministrators.map((a) => (
                  <div key={a.id} className={styles.listRow}>
                    <span className={styles.listPrimary}>{a.username ?? a.sid}</span>
                    <span className={styles.listMuted}>{a.source ?? "--"}</span>
                    <Badge variant={a.enabled === false ? "warning" : a.enabled === true ? "success" : "default"}>
                      {a.enabled === null ? "Unknown" : a.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recommendations.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>AI Insights</div>
              <div className={styles.list}>
                {recommendations.map((r) => (
                  <RecommendationCard key={r.title} recommendation={r} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </DashboardWidget>
  );
}
