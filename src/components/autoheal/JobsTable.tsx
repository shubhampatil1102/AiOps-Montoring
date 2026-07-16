import Badge from "../ui/Badge/Badge";
import Button from "../ui/Button";
import type { ScriptJob } from "@/types/autoHeal";
import styles from "./Tables.module.css";

interface JobsTableProps {
  jobs: ScriptJob[];
  mode: "active" | "history";
  onRetry?: (job: ScriptJob) => void;
}

export default function JobsTable({
  jobs,
  mode,
  onRetry,
}: JobsTableProps) {
  if (!jobs.length) {
    return (
      <div className={styles.empty}>
        {mode === "active" ? "No active jobs." : "No job history."}
      </div>
    );
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Job</th>
            <th>Device</th>
            <th>Status</th>
            <th>Created</th>
            <th>Duration</th>
            <th>Logs</th>
            {mode === "history" && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td>#{job.id}</td>
              <td>{job.device_id}</td>
              <td>
                <Badge variant={statusVariant(job.status)}>
                  {job.status}
                </Badge>
              </td>
              <td>{formatTime(job.created_at)}</td>
              <td>{duration(job.started_at || job.created_at, job.finished_at)}</td>
              <td>
                {job.output || job.error ? (
                  <pre className={styles.log}>{job.error || job.output}</pre>
                ) : (
                  "-"
                )}
              </td>
              {mode === "history" && (
                <td>
                  <div className={styles.actions}>
                    {normalizeStatus(job.status) === "FAILED" && (
                      <Button
                        onClick={() => onRetry?.(job)}
                        type="button"
                        variant="secondary"
                      >
                        Retry
                      </Button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function normalizeStatus(status: string) {
  return String(status || "").toUpperCase();
}

function statusVariant(status: string) {
  const normalized = normalizeStatus(status);
  if (normalized === "SUCCESS" || normalized === "DONE" || normalized === "COMPLETED") {
    return "success";
  }
  if (normalized === "FAILED" || normalized === "ERROR") {
    return "danger";
  }
  if (normalized === "RUNNING") {
    return "warning";
  }
  return "default";
}

function formatTime(value?: number) {
  return value ? new Date(Number(value)).toLocaleString() : "-";
}

function duration(start?: number, end?: number) {
  if (!start) return "-";
  const finish = end || Date.now();
  const seconds = Math.max(0, Math.floor((finish - start) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
