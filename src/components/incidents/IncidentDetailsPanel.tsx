import { useMemo, useState } from "react";
import Badge from "../ui/Badge/Badge";
import Button from "../ui/Button";
import Card from "../ui/Card";
import type { Incident, IncidentAlert, IncidentNote } from "@/types/incident";
import {
  formatStatus,
  formatTime,
  getAffectedDevices,
  getLinkedAlerts,
  getResolutionHistory,
  getRootCause,
  getSeverityVariant,
  getStatusVariant,
} from "./incidentUtils";
import styles from "./IncidentDetailsPanel.module.css";

interface IncidentDetailsPanelProps {
  incident: Incident | null;
  alerts: IncidentAlert[];
  notes: IncidentNote[];
  assignment?: string;
  onAddNote: (incidentId: string, text: string) => void;
  onAssign: (incidentId: string, owner: string) => void;
}

export default function IncidentDetailsPanel({
  incident,
  alerts,
  notes,
  assignment,
  onAddNote,
  onAssign,
}: IncidentDetailsPanelProps) {
  const [noteText, setNoteText] = useState("");
  const [owner, setOwner] = useState(assignment || "");

  const linkedAlerts = useMemo(
    () => (incident ? getLinkedAlerts(incident, alerts) : []),
    [alerts, incident]
  );

  if (!incident) {
    return (
      <Card title="Incident Detail">
        <div className={styles.empty}>Select an incident to review timeline, notes, and assignment.</div>
      </Card>
    );
  }

  const resolutionHistory = getResolutionHistory(incident);
  const incidentNotes = notes.filter((note) => note.incidentId === incident.id);

  function submitNote() {
    if (!noteText.trim()) return;
    onAddNote(incident.id, noteText.trim());
    setNoteText("");
  }

  function submitAssignment() {
    onAssign(incident.id, owner.trim());
  }

  return (
    <div className={styles.panel}>
      <Card title="Incident Detail" subtitle={incident.id}>
        <div className={styles.summary}>
          <Badge variant={getSeverityVariant(incident.severity)}>{incident.severity}</Badge>
          <Badge variant={getStatusVariant(incident.status)}>{formatStatus(incident.status)}</Badge>
        </div>
        <h3>{incident.title}</h3>
        <p>{incident.description}</p>
      </Card>

      <Card title="Incident Timeline">
        <div className={styles.timeline}>
          {resolutionHistory.map((event) => (
            <div className={styles.timelineItem} key={event.id}>
              <span />
              <div>
                <strong>{event.label}</strong>
                <p>{event.detail}</p>
                <small>{formatTime(event.time)}</small>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="AI Root Cause">
        <p className={styles.text}>{getRootCause(incident)}</p>
      </Card>

      <Card title="Affected Devices">
        <div className={styles.chips}>
          {getAffectedDevices(incident).length ? (
            getAffectedDevices(incident).map((device) => <span key={device}>{device}</span>)
          ) : (
            <p className={styles.muted}>No device linked.</p>
          )}
        </div>
      </Card>

      <Card title="Linked Alerts">
        <div className={styles.list}>
          {linkedAlerts.length ? (
            linkedAlerts.map((alert) => (
              <div className={styles.row} key={`${alert.id}-${alert.time}`}>
                <span>{alert.message}</span>
                <strong>{formatTime(alert.time)}</strong>
              </div>
            ))
          ) : (
            <p className={styles.muted}>No linked alerts found.</p>
          )}
        </div>
      </Card>

      <Card title="Assignment">
        <div className={styles.form}>
          <input
            onChange={(event) => setOwner(event.target.value)}
            placeholder="Owner or team"
            value={owner}
          />
          <Button onClick={submitAssignment} type="button" variant="secondary">
            Assign
          </Button>
        </div>
        {assignment && <p className={styles.muted}>Assigned to {assignment}</p>}
      </Card>

      <Card title="Notes">
        <div className={styles.form}>
          <textarea
            onChange={(event) => setNoteText(event.target.value)}
            placeholder="Add investigation note..."
            value={noteText}
          />
          <Button onClick={submitNote} type="button">
            Add Note
          </Button>
        </div>
        <div className={styles.list}>
          {incidentNotes.length ? (
            incidentNotes.map((note) => (
              <div className={styles.note} key={note.id}>
                <strong>{note.author}</strong>
                <p>{note.text}</p>
                <small>{formatTime(note.createdAt)}</small>
              </div>
            ))
          ) : (
            <p className={styles.muted}>No notes yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
