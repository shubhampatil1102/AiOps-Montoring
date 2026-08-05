import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../layouts/PageHeader";
import DashboardWidget from "../components/dashboard/DashboardWidget";
import Badge from "../components/ui/Badge/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Loading from "../components/common/Loading";
import ErrorState from "../components/common/ErrorState";
import ApplicationTable from "../components/software/ApplicationTable";
import { APPLICATION_COLUMNS, type ApplicationColumnKey, type ApplicationSortKey } from "../components/software/applicationColumns";
import { useDevices } from "@/hooks/useDevices";
import {
  useApplicationCategories,
  useApplicationInsights,
  useApplications,
  useDeviceProcesses,
} from "@/hooks/useApplications";
import { useCloudIncidents, useCloudStatus } from "@/hooks/useCloudServices";
import { cloudStatusVariant } from "@/lib/deviceIntelligence/applicationIntelligence";
import { exportRowsAsCsv } from "@/lib/exportCsv";
import {
  deleteSavedFilter,
  loadSavedFilters,
  loadVisibleColumns,
  saveSavedFilter,
  saveVisibleColumns,
  type SoftwareSavedFilter,
} from "@/lib/softwareSavedFilters";
import type { Application } from "@/types/application";
import styles from "./Software.module.css";

type Tab = "installed" | "running" | "publishers" | "categories" | "cloud" | "insights";

const PAGE_SIZE = 15;
const DEFAULT_COLUMNS: ApplicationColumnKey[] = APPLICATION_COLUMNS.map((c) => c.key);

function compareValues(a: string | number | null | undefined, b: string | number | null | undefined): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

function sortApplications(apps: Application[], sortKey: ApplicationSortKey, direction: "asc" | "desc"): Application[] {
  const sorted = [...apps].sort((a, b) => {
    switch (sortKey) {
      case "canonical_name":
        return compareValues(a.canonical_name, b.canonical_name);
      case "publisher":
        return compareValues(a.publisher, b.publisher);
      case "category":
        return compareValues(a.category, b.category);
      case "device_count":
        return compareValues(a.device_count ?? 0, b.device_count ?? 0);
      case "running_count":
        return compareValues(a.running_count ?? 0, b.running_count ?? 0);
      case "avg_health_score":
        return compareValues(a.avg_health_score ?? null, b.avg_health_score ?? null);
      case "cloud_status":
        return compareValues(a.cloud_status ?? null, b.cloud_status ?? null);
      case "recognition":
        return compareValues(a.plugin_id ? 1 : 0, b.plugin_id ? 1 : 0);
      default:
        return 0;
    }
  });
  return direction === "asc" ? sorted : sorted.reverse();
}

export default function Software() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("installed");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [publisher, setPublisher] = useState("All");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [sortKey, setSortKey] = useState<ApplicationSortKey>("canonical_name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState<Set<ApplicationColumnKey>>(
    () => loadVisibleColumns(DEFAULT_COLUMNS) as Set<ApplicationColumnKey>
  );
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showSavedFilters, setShowSavedFilters] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SoftwareSavedFilter[]>(() => loadSavedFilters());

  const devicesQuery = useDevices();
  const devices = devicesQuery.data ?? [];

  const applicationsQuery = useApplications();
  const categoriesQuery = useApplicationCategories();

  const processesQuery = useDeviceProcesses(selectedDeviceId);
  const cloudStatusQuery = useCloudStatus();
  const cloudIncidentsQuery = useCloudIncidents();
  const insightsQuery = useApplicationInsights();

  const publisherOptions = useMemo(() => {
    const set = new Set<string>();
    for (const app of applicationsQuery.data ?? []) {
      if (app.publisher) set.add(app.publisher);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [applicationsQuery.data]);

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matches = (applicationsQuery.data ?? [])
      .filter(
        (app) =>
          !query ||
          app.canonical_name.toLowerCase().includes(query) ||
          (app.publisher ?? "").toLowerCase().includes(query) ||
          app.category.toLowerCase().includes(query)
      )
      .filter((app) => category === "All" || app.category === category)
      .filter((app) => publisher === "All" || app.publisher === publisher);
    return sortApplications(matches, sortKey, sortDirection);
  }, [applicationsQuery.data, search, category, publisher, sortKey, sortDirection]);

  const totalApplications = filteredApplications.length;
  const totalPages = Math.max(1, Math.ceil(totalApplications / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedApplications = filteredApplications.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleSort(key: ApplicationSortKey) {
    if (key === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  }

  function toggleColumn(key: ApplicationColumnKey) {
    setVisibleColumns((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveVisibleColumns(next);
      return next;
    });
  }

  function exportApplicationsCsv() {
    exportRowsAsCsv(
      `software-inventory-${new Date().toISOString().slice(0, 10)}.csv`,
      filteredApplications,
      [
        { header: "Name", value: (a) => a.canonical_name },
        { header: "Publisher", value: (a) => a.publisher ?? "" },
        { header: "Category", value: (a) => a.category },
        { header: "Devices", value: (a) => a.device_count ?? 0 },
        { header: "Running", value: (a) => a.running_count ?? 0 },
        { header: "Avg Health", value: (a) => a.avg_health_score ?? "" },
        { header: "Cloud Status", value: (a) => a.cloud_status ?? "" },
        { header: "Recognition", value: (a) => (a.plugin_id ? "Recognized" : "Generic") },
      ]
    );
  }

  function applySavedFilter(filter: SoftwareSavedFilter) {
    setSearch(filter.search);
    setCategory(filter.category);
    setPublisher(filter.publisher);
    const columns = new Set(filter.visibleColumns) as Set<ApplicationColumnKey>;
    setVisibleColumns(columns);
    saveVisibleColumns(columns);
    setPage(1);
    setShowSavedFilters(false);
  }

  function handleSaveCurrentFilter() {
    const name = window.prompt("Name this saved view:");
    if (!name) return;
    const filter: SoftwareSavedFilter = {
      name,
      search,
      category,
      publisher,
      visibleColumns: Array.from(visibleColumns),
    };
    saveSavedFilter(filter);
    setSavedFilters(loadSavedFilters());
  }

  function handleDeleteSavedFilter(name: string) {
    deleteSavedFilter(name);
    setSavedFilters(loadSavedFilters());
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Software"
        description="Automatically discovered applications, running processes, and cloud service health across the fleet."
      />

      <div className={styles.controlsRow}>
        <div className={styles.tabs}>
          <button className={tab === "installed" ? styles.tabActive : styles.tab} onClick={() => setTab("installed")}>
            Installed
          </button>
          <button className={tab === "running" ? styles.tabActive : styles.tab} onClick={() => setTab("running")}>
            Running
          </button>
          <button className={tab === "publishers" ? styles.tabActive : styles.tab} onClick={() => setTab("publishers")}>
            Publishers
          </button>
          <button className={tab === "categories" ? styles.tabActive : styles.tab} onClick={() => setTab("categories")}>
            Categories
          </button>
          <button className={tab === "cloud" ? styles.tabActive : styles.tab} onClick={() => setTab("cloud")}>
            Cloud Services
          </button>
          <button className={tab === "insights" ? styles.tabActive : styles.tab} onClick={() => setTab("insights")}>
            Insights &amp; Compliance
          </button>
        </div>

        <select className={styles.select} value={selectedDeviceId} onChange={(e) => setSelectedDeviceId(e.target.value)}>
          <option value="">All Devices</option>
          {devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.id}
            </option>
          ))}
        </select>
      </div>

      {tab === "installed" && (
        <DashboardWidget
          title="All Applications"
          subtitle="Distinct applications discovered across the fleet (registry, AppX, winget) — click a row for details"
          isEmpty={!applicationsQuery.isLoading && totalApplications === 0}
          emptyMessage="No applications discovered yet."
        >
          <div className={styles.filterRow}>
            <input
              className={styles.search}
              type="search"
              placeholder="Search name, publisher, or category..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <select
              className={styles.select}
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="All">All Categories</option>
              {(categoriesQuery.data ?? []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className={styles.select}
              value={publisher}
              onChange={(e) => {
                setPublisher(e.target.value);
                setPage(1);
              }}
            >
              <option value="All">All Publishers</option>
              {publisherOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.gridToolbar}>
            <div className={styles.gridToolbarGroup}>
              <Button type="button" variant="secondary" onClick={() => setShowColumnMenu((v) => !v)}>
                Columns
              </Button>
              {showColumnMenu && (
                <div className={styles.columnMenu}>
                  {APPLICATION_COLUMNS.map((c) => (
                    <label key={c.key} className={styles.columnMenuItem}>
                      <input
                        type="checkbox"
                        checked={visibleColumns.has(c.key)}
                        onChange={() => toggleColumn(c.key)}
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              )}
              <Button type="button" variant="secondary" onClick={() => setShowSavedFilters((v) => !v)}>
                Saved Filters
              </Button>
              {showSavedFilters && (
                <div className={styles.columnMenu}>
                  <button type="button" className={styles.savedFilterAction} onClick={handleSaveCurrentFilter}>
                    + Save current view
                  </button>
                  {savedFilters.length === 0 && <div className={styles.hint}>No saved views yet.</div>}
                  {savedFilters.map((f) => (
                    <div key={f.name} className={styles.savedFilterRow}>
                      <button type="button" className={styles.savedFilterAction} onClick={() => applySavedFilter(f)}>
                        {f.name}
                      </button>
                      <button type="button" className={styles.savedFilterDelete} onClick={() => handleDeleteSavedFilter(f.name)}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button type="button" variant="secondary" onClick={exportApplicationsCsv}>
              Export CSV
            </Button>
          </div>

          {applicationsQuery.isLoading && <Loading label="Loading applications..." />}
          {applicationsQuery.isError && <ErrorState message="Unable to load applications." />}

          {!applicationsQuery.isLoading && totalApplications > 0 && (
            <ApplicationTable
              applications={pagedApplications}
              page={currentPage}
              pageSize={PAGE_SIZE}
              total={totalApplications}
              sortKey={sortKey}
              sortDirection={sortDirection}
              visibleColumns={visibleColumns}
              onSort={handleSort}
              onPageChange={setPage}
              onOpen={(app) => navigate(`/software/${app.id}`)}
            />
          )}
        </DashboardWidget>
      )}

      {tab === "publishers" && (
        <DashboardWidget title="Publishers" subtitle="Distinct application publishers across the fleet, ranked by device reach">
          <div className={styles.appList}>
            {(insightsQuery.data?.publisherBreakdown ?? []).length === 0 && (
              <div className={styles.hint}>No publisher data yet.</div>
            )}
            {(insightsQuery.data?.publisherBreakdown ?? []).map((p) => (
              <div
                key={p.publisher}
                className={styles.rankedRow}
                onClick={() => {
                  setPublisher(p.publisher === "Unknown" ? "All" : p.publisher);
                  setTab("installed");
                  setPage(1);
                }}
              >
                <span>{p.publisher}</span>
                <span className={styles.hint}>
                  {p.application_count} app(s) · {p.device_count} device(s)
                </span>
              </div>
            ))}
          </div>
        </DashboardWidget>
      )}

      {tab === "categories" && (
        <DashboardWidget title="Categories" subtitle="Application categories across the fleet, ranked by device reach">
          <div className={styles.appList}>
            {(insightsQuery.data?.categoryBreakdown ?? []).length === 0 && (
              <div className={styles.hint}>No category data yet.</div>
            )}
            {(insightsQuery.data?.categoryBreakdown ?? []).map((c) => (
              <div
                key={c.category}
                className={styles.rankedRow}
                onClick={() => {
                  setCategory(c.category);
                  setTab("installed");
                  setPage(1);
                }}
              >
                <span>{c.category}</span>
                <span className={styles.hint}>
                  {c.application_count} app(s) · {c.device_count} device(s)
                </span>
              </div>
            ))}
          </div>
        </DashboardWidget>
      )}

      {tab === "running" && (
        <DashboardWidget
          title="Running Processes"
          subtitle={selectedDeviceId ? `Top processes by CPU/memory on ${selectedDeviceId}` : "Select a device above to see live process data"}
          isEmpty={Boolean(selectedDeviceId) && !processesQuery.isLoading && (processesQuery.data ?? []).length === 0}
          emptyMessage="No process data reported for this device yet."
        >
          {!selectedDeviceId && <div className={styles.hint}>Select a device from the dropdown above.</div>}
          {selectedDeviceId && processesQuery.isLoading && <Loading label="Loading processes..." />}
          {selectedDeviceId && (processesQuery.data ?? []).length > 0 && (
            <div className={styles.processTableWrap}>
              <table className={styles.processTable}>
                <thead>
                  <tr>
                    <th>Process</th>
                    <th>PID</th>
                    <th>CPU%</th>
                    <th>Memory (MB)</th>
                    <th>Owner</th>
                    <th>Signed</th>
                  </tr>
                </thead>
                <tbody>
                  {(processesQuery.data ?? []).map((p) => (
                    <tr key={p.pid}>
                      <td>{p.process_name}</td>
                      <td>{p.pid}</td>
                      <td>{p.cpu_percent ?? "--"}</td>
                      <td>{p.memory_mb ?? "--"}</td>
                      <td>{p.owner ?? "--"}</td>
                      <td>{p.signed === true ? "Yes" : p.signed === false ? "No" : "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardWidget>
      )}

      {tab === "cloud" && (
        <DashboardWidget
          title="Cloud Service Health"
          subtitle="Live status for providers with public APIs; others show Not Configured until credentials are supplied"
        >
          {cloudStatusQuery.isLoading && <Loading label="Loading cloud status..." />}
          <div className={styles.cloudGrid}>
            {(cloudStatusQuery.data ?? []).map((provider) => {
              const incidents = (cloudIncidentsQuery.data ?? []).filter((i) => i.provider === provider.provider);
              return (
                <Card key={provider.provider} fill>
                  <div className={styles.cloudCard}>
                    <div className={styles.cloudCardHeader}>
                      <span className={styles.cloudCardName}>{provider.display_name}</span>
                      <Badge variant={cloudStatusVariant(provider.status)}>{provider.status.replace(/_/g, " ")}</Badge>
                    </div>
                    {incidents.length > 0 && (
                      <ul className={styles.incidentList}>
                        {incidents.map((incident) => (
                          <li key={incident.id}>{incident.title}</li>
                        ))}
                      </ul>
                    )}
                    {provider.status_url && (
                      <a href={provider.status_url} target="_blank" rel="noreferrer" className={styles.statusLink}>
                        View status page
                      </a>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </DashboardWidget>
      )}

      {tab === "insights" && (
        <div className={styles.insightsGrid}>
          <DashboardWidget title="Most Installed" subtitle="Distinct devices reporting each application">
            <RankedList
              items={(insightsQuery.data?.mostInstalled ?? []).map((a) => ({
                id: a.id,
                label: a.canonical_name,
                value: `${a.device_count} device(s)`,
              }))}
              onOpen={(id) => navigate(`/software/${id}`)}
              emptyText="No data yet."
            />
          </DashboardWidget>

          <DashboardWidget title="Most Version Changes" subtitle="Applications updated most often">
            <RankedList
              items={(insightsQuery.data?.mostVersionChanged ?? []).map((a) => ({
                id: a.id,
                label: a.canonical_name,
                value: `${a.change_count} change(s)`,
              }))}
              onOpen={(id) => navigate(`/software/${id}`)}
              emptyText="No version changes recorded yet."
            />
          </DashboardWidget>

          <DashboardWidget title="Most Service Restarts" subtitle="Related Windows services restarting most">
            <RankedList
              items={(insightsQuery.data?.mostServiceRestarts ?? []).map((a) => ({
                id: a.id,
                label: a.canonical_name,
                value: `${a.total_restarts} restart(s)`,
              }))}
              onOpen={(id) => navigate(`/software/${id}`)}
              emptyText="No service restarts recorded yet."
            />
          </DashboardWidget>

          <DashboardWidget title="Recently Installed" subtitle="Newest INSTALLED events across the fleet">
            <div className={styles.appList}>
              {(insightsQuery.data?.recentlyInstalled ?? []).length === 0 && <div className={styles.hint}>No installs recorded yet.</div>}
              {(insightsQuery.data?.recentlyInstalled ?? []).map((entry) => (
                <div
                  key={entry.id}
                  className={styles.rankedRow}
                  onClick={() => navigate(`/software/${entry.application_id}`)}
                >
                  <span>{entry.canonical_name}</span>
                  <span className={styles.hint}>{new Date(entry.occurred_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </DashboardWidget>

          <DashboardWidget title="Top CPU Consumers" subtitle="Highest single-process CPU% reported fleet-wide">
            <div className={styles.appList}>
              {(insightsQuery.data?.topCpu ?? []).length === 0 && <div className={styles.hint}>No process data yet.</div>}
              {(insightsQuery.data?.topCpu ?? []).map((p, index) => (
                <div key={`${p.device_id}-${p.process_name}-${index}`} className={styles.rankedRow}>
                  <span>{p.process_name}</span>
                  <span className={styles.hint}>{p.device_id} · {p.cpu_percent}%</span>
                </div>
              ))}
            </div>
          </DashboardWidget>

          <DashboardWidget title="Top Memory Consumers" subtitle="Highest single-process memory usage reported fleet-wide">
            <div className={styles.appList}>
              {(insightsQuery.data?.topMemory ?? []).length === 0 && <div className={styles.hint}>No process data yet.</div>}
              {(insightsQuery.data?.topMemory ?? []).map((p, index) => (
                <div key={`${p.device_id}-${p.process_name}-${index}`} className={styles.rankedRow}>
                  <span>{p.process_name}</span>
                  <span className={styles.hint}>{p.device_id} · {p.memory_mb} MB</span>
                </div>
              ))}
            </div>
          </DashboardWidget>

          <DashboardWidget
            title="Unsigned Software"
            subtitle="Real signal only — Get-AuthenticodeSignature reports these processes as unsigned or invalid. Version end-of-life and blocked-app policies aren't tracked yet (no EOL database or admin-defined policy exists in this system)."
          >
            <div className={styles.appList}>
              {(insightsQuery.data?.unsignedSoftware ?? []).length === 0 && (
                <div className={styles.hint}>No unsigned processes detected.</div>
              )}
              {(insightsQuery.data?.unsignedSoftware ?? []).map((row, index) => (
                <div
                  key={`${row.device_id}-${row.process_name}-${index}`}
                  className={row.application_id ? styles.rankedRow : styles.rankedRowStatic}
                  onClick={row.application_id ? () => navigate(`/software/${row.application_id}`) : undefined}
                >
                  <span>{row.canonical_name ?? row.process_name}</span>
                  <span className={styles.hint}>{row.device_id}</span>
                </div>
              ))}
            </div>
          </DashboardWidget>
        </div>
      )}
    </div>
  );
}

function RankedList({
  items,
  onOpen,
  emptyText,
}: {
  items: Array<{ id: number; label: string; value: string }>;
  onOpen: (id: number) => void;
  emptyText: string;
}) {
  return (
    <div className={styles.appList}>
      {items.length === 0 && <div className={styles.hint}>{emptyText}</div>}
      {items.map((item) => (
        <div key={item.id} className={styles.rankedRow} onClick={() => onOpen(item.id)}>
          <span>{item.label}</span>
          <span className={styles.hint}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}
