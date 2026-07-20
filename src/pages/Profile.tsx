import PageHeader from "../layouts/PageHeader";
import DashboardWidget from "../components/dashboard/DashboardWidget";
import Badge from "../components/ui/Badge/Badge";
import { useAuth } from "@/AuthContext";
import { timeAgo } from "@/utils/time";
import { formatRole } from "@/constants/roles";
import styles from "./Profile.module.css";

export default function Profile() {
  const { user } = useAuth();

  return (
    <div className={styles.page}>
      <PageHeader title="Profile" description="Your account details and access level." />

      <DashboardWidget title="Account" subtitle="Real fields from your authenticated session">
        <div className={styles.fieldsGrid}>
          <Field label="Display Name" value={user?.displayName || user?.username || "—"} />
          <Field label="Username" value={user?.username || "—"} />
          <Field label="Email" value={user?.email || "—"} />

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Role</span>
            <Badge variant="info">{formatRole(user?.role)}</Badge>
          </div>

          <Field label="Last Login" value={user?.lastLoginAt ? timeAgo(user.lastLoginAt) : "This session"} />
        </div>
      </DashboardWidget>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{value}</span>
    </div>
  );
}
