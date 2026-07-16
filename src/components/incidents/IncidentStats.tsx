import Card from "../ui/Card";
import type { Incident } from "@/types/incident";
import styles from "./IncidentStats.module.css";

interface IncidentStatsProps {
  incidents: Incident[];
}

export default function IncidentStats({ incidents }: IncidentStatsProps) {
  const open = incidents.filter((incident) => incident.status === "open").length;
  const inProgress = incidents.filter((incident) => incident.status === "in-progress").length;
  const critical = incidents.filter((incident) => incident.severity === "critical").length;
  const resolved = incidents.filter((incident) => incident.status === "resolved").length;

  return (
    <div className={styles.grid}>
      <Stat title="Total Incidents" value={incidents.length} />
      <Stat title="Open" value={open} tone={open > 0 ? "danger" : "default"} />
      <Stat title="In Progress" value={inProgress} />
      <Stat title="Critical" value={critical} tone={critical > 0 ? "danger" : "default"} />
      <Stat title="Resolved" value={resolved} />
    </div>
  );
}

function Stat({
  title,
  value,
  tone = "default",
}: {
  title: string;
  value: number;
  tone?: "default" | "danger";
}) {
  return (
    <Card>
      <div className={styles.stat}>
        <span>{title}</span>
        <strong className={tone === "danger" ? styles.danger : undefined}>
          {value}
        </strong>
      </div>
    </Card>
  );
}
