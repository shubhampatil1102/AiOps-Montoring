import Badge from "../ui/Badge/Badge";
import Button from "../ui/Button";
import type { Incident } from "@/types/incident";
import {
  formatAgo,
  formatStatus,
  getAffectedDevices,
  getRootCause,
  getSeverityVariant,
  getStatusVariant,
} from "./incidentUtils";
import styles from "./IncidentTable.module.css";

interface IncidentTableProps {
  incidents: Incident[];
  selectedId?: string;
  onSelect: (incident: Incident) => void;
  onResolve: (id: string) => void;
  onEscalate: (id: string) => void;
  onRemediate: (id: string) => void;
}

export default function IncidentTable({
  incidents,
  selectedId,
  onSelect,
  onResolve,
  onEscalate,
  onRemediate,
}: IncidentTableProps) {
  if (!incidents.length) {
    return <div className={styles.empty}>No incidents match the current filters.</div>;
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Incident</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Affected Devices</th>
            <th>AI Root Cause</th>
            <th>Detected</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident) => (
            <tr
              className={selectedId === incident.id ? styles.active : undefined}
              key={incident.id}
              onClick={() => onSelect(incident)}
            >
              <td>
                <strong>{incident.id}</strong>
                <span>{incident.title}</span>
              </td>
              <td>
                <Badge variant={getSeverityVariant(incident.severity)}>
                  {incident.severity}
                </Badge>
              </td>
              <td>
                <Badge variant={getStatusVariant(incident.status)}>
                  {formatStatus(incident.status)}
                </Badge>
              </td>
              <td>{getAffectedDevices(incident).join(", ") || "-"}</td>
              <td>{getRootCause(incident)}</td>
              <td>{formatAgo(incident.created_at)}</td>
              <td>
                <div className={styles.actions} onClick={(event) => event.stopPropagation()}>
                  <Button
                    disabled={incident.status === "resolved"}
                    onClick={() => onResolve(incident.id)}
                    type="button"
                    variant="secondary"
                  >
                    Resolve
                  </Button>
                  <Button
                    onClick={() => onEscalate(incident.id)}
                    type="button"
                    variant="secondary"
                  >
                    Assign
                  </Button>
                  {incident.auto_remediation_available && (
                    <Button
                      onClick={() => onRemediate(incident.id)}
                      type="button"
                    >
                      Auto Fix
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
