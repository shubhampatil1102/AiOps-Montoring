import Badge from "../ui/Badge/Badge";
import Button from "../ui/Button";
import { APPLICATION_COLUMNS, type ApplicationColumnKey, type ApplicationSortKey } from "./applicationColumns";
import { cloudStatusVariant, healthLevelVariant } from "@/lib/deviceIntelligence/applicationIntelligence";
import type { Application } from "@/types/application";
import styles from "./ApplicationTable.module.css";

interface ApplicationTableProps {
  applications: Application[];
  page: number;
  pageSize: number;
  total: number;
  sortKey: ApplicationSortKey;
  sortDirection: "asc" | "desc";
  visibleColumns: Set<ApplicationColumnKey>;
  onSort: (key: ApplicationSortKey) => void;
  onPageChange: (page: number) => void;
  onOpen: (app: Application) => void;
}

export default function ApplicationTable({
  applications,
  page,
  pageSize,
  total,
  sortKey,
  sortDirection,
  visibleColumns,
  onSort,
  onPageChange,
  onOpen,
}: ApplicationTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, total);

  if (total === 0) {
    return <div className={styles.empty}>No applications match the current filters.</div>;
  }

  const columns = APPLICATION_COLUMNS.filter((c) => visibleColumns.has(c.key));

  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>
                <button className={styles.sortButton} onClick={() => onSort("canonical_name")} type="button">
                  Name
                  <span>{sortKey === "canonical_name" ? (sortDirection === "asc" ? "↑" : "↓") : ""}</span>
                </button>
              </th>
              {columns.map((column) => (
                <th key={column.key}>
                  <button className={styles.sortButton} onClick={() => onSort(column.sortKey)} type="button">
                    {column.label}
                    <span>{sortKey === column.sortKey ? (sortDirection === "asc" ? "↑" : "↓") : ""}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {applications.map((app) => (
              <tr
                key={app.id}
                onClick={() => onOpen(app)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpen(app);
                  }
                }}
                tabIndex={0}
              >
                <td>
                  <div className={styles.nameCell}>
                    <span className={styles.appName}>{app.canonical_name}</span>
                  </div>
                </td>
                {visibleColumns.has("publisher") && <td>{app.publisher || "--"}</td>}
                {visibleColumns.has("category") && <td>{app.category}</td>}
                {visibleColumns.has("device_count") && <td>{app.device_count ?? 0}</td>}
                {visibleColumns.has("running_count") && <td>{app.running_count ?? 0}</td>}
                {visibleColumns.has("avg_health_score") && (
                  <td>
                    {app.avg_health_score !== null && app.avg_health_score !== undefined ? (
                      <Badge variant={healthLevelVariant(healthLevelFromScore(app.avg_health_score))}>
                        {app.avg_health_score}/100
                      </Badge>
                    ) : (
                      "--"
                    )}
                  </td>
                )}
                {visibleColumns.has("cloud_status") && (
                  <td>
                    {app.cloud_status ? (
                      <Badge variant={cloudStatusVariant(app.cloud_status)}>{app.cloud_status.replace(/_/g, " ")}</Badge>
                    ) : (
                      "--"
                    )}
                  </td>
                )}
                {visibleColumns.has("recognition") && (
                  <td>
                    <Badge variant={app.plugin_id ? "info" : "default"}>{app.plugin_id ? "Recognized" : "Generic"}</Badge>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <span>
          {firstItem}-{lastItem} of {total}
        </span>

        <div className={styles.pageActions}>
          <Button disabled={page <= 1} onClick={() => onPageChange(page - 1)} type="button" variant="secondary">
            Previous
          </Button>
          <span>
            Page {page} of {totalPages}
          </span>
          <Button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} type="button" variant="secondary">
            Next
          </Button>
        </div>
      </div>
    </>
  );
}

function healthLevelFromScore(score: number): string {
  if (score >= 85) return "Healthy";
  if (score >= 65) return "Good";
  if (score >= 40) return "Warning";
  return "Critical";
}
