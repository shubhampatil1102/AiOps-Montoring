import Card from "../ui/Card";
import type { ScriptJob } from "@/types/autoHeal";
import styles from "./AutoHealStats.module.css";

interface AutoHealStatsProps {
  jobs: ScriptJob[];
  activeCount: number;
  ruleCount: number;
}

export default function AutoHealStats({
  jobs,
  activeCount,
  ruleCount,
}: AutoHealStatsProps) {
  const completed = jobs.filter((job) => isTerminal(job.status));
  const success = completed.filter((job) => normalizeStatus(job.status) === "SUCCESS").length;
  const failed = completed.filter((job) => normalizeStatus(job.status) === "FAILED").length;
  const successRate = completed.length ? Math.round((success / completed.length) * 100) : 0;
  const failureRate = completed.length ? Math.round((failed / completed.length) * 100) : 0;

  return (
    <div className={styles.grid}>
      <Stat title="Heal Rules" value={ruleCount} />
      <Stat title="Active Jobs" value={activeCount} />
      <Stat title="Success Rate" value={`${successRate}%`} />
      <Stat title="Failure Rate" value={`${failureRate}%`} tone={failureRate > 0 ? "danger" : "default"} />
    </div>
  );
}

function Stat({
  title,
  value,
  tone = "default",
}: {
  title: string;
  value: string | number;
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

function normalizeStatus(status: string) {
  return String(status || "").toUpperCase();
}

function isTerminal(status: string) {
  return ["SUCCESS", "FAILED", "DONE", "COMPLETED"].includes(normalizeStatus(status));
}
