import Button from "../ui/Button";
import type { IncidentSeverity, IncidentStatus } from "@/types/incident";
import styles from "./IncidentToolbar.module.css";

interface IncidentToolbarProps {
  search: string;
  status: IncidentStatus | "all";
  severity: IncidentSeverity | "all";
  onSearchChange: (value: string) => void;
  onStatusChange: (value: IncidentStatus | "all") => void;
  onSeverityChange: (value: IncidentSeverity | "all") => void;
  onExport: () => void;
}

export default function IncidentToolbar({
  search,
  status,
  severity,
  onSearchChange,
  onStatusChange,
  onSeverityChange,
  onExport,
}: IncidentToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <input
        className={styles.search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search incidents, root cause, devices..."
        type="search"
        value={search}
      />

      <select
        className={styles.select}
        onChange={(event) => onStatusChange(event.target.value as IncidentStatus | "all")}
        value={status}
      >
        <option value="all">All Status</option>
        <option value="open">Open</option>
        <option value="pending">Pending</option>
        <option value="in-progress">In Progress</option>
        <option value="resolved">Resolved</option>
      </select>

      <select
        className={styles.select}
        onChange={(event) => onSeverityChange(event.target.value as IncidentSeverity | "all")}
        value={severity}
      >
        <option value="all">All Severity</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      <Button onClick={onExport} type="button" variant="secondary">
        Export
      </Button>
    </div>
  );
}
