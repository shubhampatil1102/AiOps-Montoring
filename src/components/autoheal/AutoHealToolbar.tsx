import styles from "./AutoHealToolbar.module.css";

interface AutoHealToolbarProps {
  search: string;
  status: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

export default function AutoHealToolbar({
  search,
  status,
  onSearchChange,
  onStatusChange,
}: AutoHealToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <input
        className={styles.search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search rules, devices, jobs, scripts..."
        type="search"
        value={search}
      />

      <select
        className={styles.select}
        onChange={(event) => onStatusChange(event.target.value)}
        value={status}
      >
        <option value="all">All Status</option>
        <option value="PENDING">Pending</option>
        <option value="RUNNING">Running</option>
        <option value="SUCCESS">Success</option>
        <option value="FAILED">Failed</option>
      </select>
    </div>
  );
}
