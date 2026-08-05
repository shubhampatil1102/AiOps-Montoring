import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../layouts/PageHeader";
import DashboardWidget from "../components/dashboard/DashboardWidget";
import Badge from "../components/ui/Badge/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Loading from "../components/common/Loading";
import ErrorState from "../components/common/ErrorState";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useApplicationDetail,
  useApplicationDevices,
  useApplicationHistoryFleetWide,
  useDeviceApplicationProcesses,
  useDeviceApplicationServices,
  useDeviceProcesses,
  useKillProcess,
  useRestartProcess,
  useServiceAction,
} from "@/hooks/useApplications";
import { useCloudIncidents, useCloudStatus } from "@/hooks/useCloudServices";
import {
  useApplicationDependencyGraph,
  useCollectDependencyLogs,
  useFlushDns,
  useScheduledTaskAction,
} from "@/hooks/useDependencies";
import {
  cloudStatusVariant,
  evaluateApplicationRecommendations,
  healthLevelVariant,
} from "@/lib/deviceIntelligence/applicationIntelligence";
import { evaluateDependencyRootCause } from "@/lib/intelligence/dependencyIntelligence";
import { exportRowsAsCsv } from "@/lib/exportCsv";
import type { ApplicationProcess } from "@/types/application";
import styles from "./SoftwareDetail.module.css";

type Tab =
  | "overview"
  | "performance"
  | "processes"
  | "services"
  | "dependencies"
  | "versions"
  | "events"
  | "registry"
  | "certificates"
  | "history"
  | "cloud"
  | "ai"
  | "devices"
  | "reports";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "performance", label: "Performance" },
  { key: "processes", label: "Processes" },
  { key: "services", label: "Services" },
  { key: "dependencies", label: "Dependencies" },
  { key: "versions", label: "Versions" },
  { key: "events", label: "Events" },
  { key: "registry", label: "Registry" },
  { key: "certificates", label: "Certificates" },
  { key: "history", label: "History" },
  { key: "cloud", label: "Cloud Status" },
  { key: "ai", label: "AI Analysis" },
  { key: "devices", label: "Devices" },
  { key: "reports", label: "Reports" },
];

const WARNING_EVENT_TYPES = new Set(["CRASH", "SERVICE_RESTART", "REMOVED", "STATUS_CHANGED", "HEALTH_SCORE_CHANGED"]);

interface VersionGroup {
  version: string;
  deviceCount: number;
  runningCount: number;
  adoptionPercent: number;
}

function buildVersionGroups(devices: Array<{ version?: string; is_running: boolean }>): VersionGroup[] {
  const totalDevices = devices.length;
  const byVersion = new Map<string, { deviceCount: number; runningCount: number }>();

  for (const d of devices) {
    const version = d.version || "Unknown";
    const entry = byVersion.get(version) ?? { deviceCount: 0, runningCount: 0 };
    entry.deviceCount += 1;
    if (d.is_running) entry.runningCount += 1;
    byVersion.set(version, entry);
  }

  return Array.from(byVersion.entries())
    .map(([version, entry]) => ({
      version,
      deviceCount: entry.deviceCount,
      runningCount: entry.runningCount,
      adoptionPercent: totalDevices > 0 ? Math.round((entry.deviceCount / totalDevices) * 100) : 0,
    }))
    .sort((a, b) => b.deviceCount - a.deviceCount);
}

interface ProcessTreeNode {
  process: ApplicationProcess;
  children: ProcessTreeNode[];
}

// Builds a real process tree from parent_pid links across ALL of the
// device's processes (not just this application's own) so that genuine
// child processes belonging to a different match (e.g. msedgewebview2.exe
// spawned by Teams) still show up under their real parent, exactly like
// Windows' own process tree.
function buildProcessTree(allProcesses: ApplicationProcess[], rootPids: Set<number>): ProcessTreeNode[] {
  const byParent = new Map<number, ApplicationProcess[]>();
  for (const p of allProcesses) {
    if (p.parent_pid === undefined || p.parent_pid === null) continue;
    const list = byParent.get(p.parent_pid) ?? [];
    list.push(p);
    byParent.set(p.parent_pid, list);
  }

  const visited = new Set<number>(rootPids);

  function build(pid: number): ProcessTreeNode[] {
    const children = (byParent.get(pid) ?? []).filter((c) => !visited.has(c.pid));
    return children.map((c) => {
      visited.add(c.pid);
      return { process: c, children: build(c.pid) };
    });
  }

  return allProcesses
    .filter((p) => rootPids.has(p.pid))
    .map((p) => ({ process: p, children: build(p.pid) }));
}

function ProcessTreeRow({ node, depth }: { node: ProcessTreeNode; depth: number }) {
  return (
    <>
      <div className={styles.historyRow} style={{ paddingLeft: depth * 20 }}>
        <span className={styles.appName}>{node.process.process_name}</span>
        <span className={styles.hint}>PID {node.process.pid}</span>
        <span className={styles.hint}>{node.process.cpu_percent ?? "--"}% CPU</span>
        <span className={styles.hint}>{node.process.memory_mb ?? "--"} MB</span>
      </div>
      {node.children.map((child) => (
        <ProcessTreeRow key={child.process.pid} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

interface PendingAction {
  label: string;
  detail: string;
  run: () => void;
}

export default function SoftwareDetail() {
  const { applicationId: idParam } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const applicationId = idParam ? Number(idParam) : null;

  const [tab, setTab] = useState<Tab>("overview");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const { can } = usePermissions();
  const canExecute = can("devices", "execute");

  const detailQuery = useApplicationDetail(applicationId);
  const devicesQuery = useApplicationDevices(applicationId);
  const historyQuery = useApplicationHistoryFleetWide(applicationId);
  const cloudStatusQuery = useCloudStatus();
  const cloudIncidentsQuery = useCloudIncidents();

  useEffect(() => {
    if (!selectedDeviceId && devicesQuery.data && devicesQuery.data.length > 0) {
      setSelectedDeviceId(devicesQuery.data[0].device_id);
    }
  }, [devicesQuery.data, selectedDeviceId]);

  const processesQuery = useDeviceApplicationProcesses(selectedDeviceId, applicationId);
  const servicesQuery = useDeviceApplicationServices(selectedDeviceId, applicationId);
  const deviceProcessesQuery = useDeviceProcesses(selectedDeviceId);
  const dependencyGraphQuery = useApplicationDependencyGraph(selectedDeviceId, applicationId);

  const killMutation = useKillProcess(selectedDeviceId, applicationId);
  const restartProcessMutation = useRestartProcess(selectedDeviceId, applicationId);
  const serviceActionMutation = useServiceAction(selectedDeviceId, applicationId);
  const flushDnsMutation = useFlushDns(selectedDeviceId, applicationId);
  const scheduledTaskMutation = useScheduledTaskAction(selectedDeviceId, applicationId);
  const collectLogsMutation = useCollectDependencyLogs(selectedDeviceId);

  const app = detailQuery.data;

  const cloudStatus = app?.cloud_provider
    ? (cloudStatusQuery.data ?? []).find((p) => p.provider === app.cloud_provider)
    : undefined;
  const cloudIncident = cloudStatus
    ? (cloudIncidentsQuery.data ?? []).find((i) => i.provider === cloudStatus.provider)
    : undefined;

  const isRunningOnSelectedDevice = (processesQuery.data ?? []).length > 0;
  const requiredServiceDown = (servicesQuery.data ?? []).some((s) => s.status && s.status !== "Running");

  const recommendations = app
    ? evaluateApplicationRecommendations({
        appName: app.canonical_name,
        isRunning: isRunningOnSelectedDevice,
        requiredServiceDown,
        cloudProviderStatus: cloudStatus?.status,
        cloudIncidentTitle: cloudIncident?.title,
      })
    : [];

  const dependencyGraph = dependencyGraphQuery.data;
  const authStatus = dependencyGraph?.authentication?.status ?? null;
  const hasEstablishedConnections = (dependencyGraph?.network ?? []).some((n) => n.status === "Established");
  const dnsFailureCount = (dependencyGraph?.dns ?? []).filter((d) => d.status && d.status !== "Success").length;
  const scheduledTaskDisabled = (dependencyGraph?.scheduledTasks ?? []).some((t) => t.status === "Disabled");

  const dependencyRecommendations = app
    ? evaluateDependencyRootCause({
        appName: app.canonical_name,
        isRunning: isRunningOnSelectedDevice,
        requiredServiceDown,
        scheduledTaskDisabled,
        cloudProviderStatus: cloudStatus?.status,
        cloudIncidentTitle: cloudIncident?.title,
        authStatus,
        hasEstablishedConnections,
        dnsFailureCount,
      })
    : [];

  const allRecommendations = [...recommendations, ...dependencyRecommendations];

  const processTree = buildProcessTree(
    deviceProcessesQuery.data ?? [],
    new Set((processesQuery.data ?? []).map((p) => p.pid))
  );

  const selectedDeviceRow = (devicesQuery.data ?? []).find((d) => d.device_id === selectedDeviceId);

  const versionGroups = buildVersionGroups(devicesQuery.data ?? []);

  const warningEvents = [
    ...(historyQuery.data ?? []).filter((h) => WARNING_EVENT_TYPES.has(h.event_type)).map((h) => ({
      id: `history-${h.id}`,
      eventType: h.event_type,
      detail: h.detail,
      occurredAt: h.occurred_at,
    })),
    ...(dependencyGraph?.events ?? []).map((e) => ({
      id: `dependency-${e.id}`,
      eventType: e.event_type,
      detail: e.detail,
      occurredAt: e.occurred_at,
    })),
  ].sort((a, b) => b.occurredAt - a.occurredAt);

  const registryStartupItems = (dependencyGraph?.startupItems ?? []).filter(
    (s) => String(s.metadata?.source ?? "") !== "Startup Folder"
  );

  if (detailQuery.isLoading) {
    return (
      <div className={styles.page}>
        <Loading label="Loading application..." />
      </div>
    );
  }

  if (detailQuery.isError || !app) {
    return (
      <div className={styles.page}>
        <ErrorState message="Unable to load this application. It may have been removed." />
      </div>
    );
  }

  function confirmAndRun(label: string, detail: string, run: () => void) {
    setPendingAction({ label, detail, run });
  }

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link to="/software">Software</Link>
        <span>/</span>
        <span>{app.canonical_name}</span>
      </div>

      <PageHeader
        title={app.canonical_name}
        description={app.publisher || "Unknown publisher"}
        actions={
          <Button type="button" variant="secondary" onClick={() => navigate("/software")}>
            Back to Software
          </Button>
        }
      />

      <div className={styles.statsRow}>
        <StatChip label="Category" value={app.category} />
        <StatChip label="Recognition" value={app.plugin_id ? "Recognized plugin" : "Generic"} />
        <StatChip label="Devices" value={String(app.deviceCount)} />
        <StatChip label="Running on" value={`${app.runningCount} device(s)`} />
        <StatChip
          label="Avg Health"
          value={app.avgHealthScore !== null ? `${app.avgHealthScore}/100` : "--"}
        />
        {app.unsignedProcessCount > 0 && (
          <StatChip label="Unsigned processes" value={String(app.unsignedProcessCount)} warn />
        )}
      </div>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? styles.tabActive : styles.tab}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {["processes", "services", "dependencies", "events", "registry", "certificates"].includes(tab) && (
        <div className={styles.deviceSelectRow}>
          <span className={styles.hint}>Device:</span>
          <select
            className={styles.select}
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
          >
            {(devicesQuery.data ?? []).map((d) => (
              <option key={d.device_id} value={d.device_id}>
                {d.device_id}
              </option>
            ))}
          </select>
        </div>
      )}

      {tab === "overview" && (
        <DashboardWidget title="Overview">
          <div className={styles.detailGrid}>
            <Field label="Application Name" value={app.canonical_name} />
            <Field label="Publisher" value={app.publisher || "Unknown"} />
            <Field label="Category" value={app.category} />
            <Field label="Cloud Provider" value={app.cloud_provider || "Not mapped"} />
            {selectedDeviceRow && (
              <>
                <Field label="Version (selected device)" value={selectedDeviceRow.version || "--"} />
                <Field label="Architecture" value={selectedDeviceRow.architecture || "--"} />
                <Field label="Install Folder" value={selectedDeviceRow.install_location || "--"} />
                <Field
                  label="Install Date"
                  value={selectedDeviceRow.install_date ? new Date(Number(selectedDeviceRow.install_date)).toLocaleDateString() : "--"}
                />
                <Field label="Product Code" value={selectedDeviceRow.product_code || "--"} muted={!selectedDeviceRow.product_code} />
              </>
            )}
            <Field label="Digital Signature" value="See Processes tab (per-process, real data only)" muted />
          </div>
        </DashboardWidget>
      )}

      {tab === "performance" && (
        <DashboardWidget
          title="Performance"
          subtitle="CPU and memory from the latest reported process snapshot per device — no historical per-application time series exists yet (would need a new metrics table)"
        >
          <div className={styles.processTableWrap}>
            <table className={styles.processTable}>
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Running</th>
                  <th>CPU%</th>
                  <th>Memory (MB)</th>
                  <th>Health</th>
                </tr>
              </thead>
              <tbody>
                {(devicesQuery.data ?? []).map((d) => (
                  <tr key={d.device_id}>
                    <td>{d.device_id}</td>
                    <td>{d.is_running ? "Yes" : "No"}</td>
                    <td>{d.cpu_percent ?? "--"}</td>
                    <td>{d.memory_mb ?? "--"}</td>
                    <td>
                      {d.level ? <Badge variant={healthLevelVariant(d.level)}>{d.level}</Badge> : "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardWidget>
      )}

      {tab === "processes" && (
        <DashboardWidget
          title="Running Processes"
          isEmpty={!selectedDeviceId || (processesQuery.data ?? []).length === 0}
          emptyMessage="No process data for this device."
        >
          <div className={styles.processTableWrap}>
            <table className={styles.processTable}>
              <thead>
                <tr>
                  <th>PID</th>
                  <th>CPU%</th>
                  <th>Memory (MB)</th>
                  <th>Threads</th>
                  <th>Handles</th>
                  <th>Owner</th>
                  <th>Signed</th>
                  <th>Window Title</th>
                  {canExecute && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {(processesQuery.data ?? []).map((p) => (
                  <tr key={p.pid}>
                    <td>{p.pid}</td>
                    <td>{p.cpu_percent ?? "--"}</td>
                    <td>{p.memory_mb ?? "--"}</td>
                    <td>{p.threads ?? "--"}</td>
                    <td>{p.handles ?? "--"}</td>
                    <td>{p.owner ?? "--"}</td>
                    <td>{p.signed === true ? "Yes" : p.signed === false ? "No" : "--"}</td>
                    <td>{p.window_title || "--"}</td>
                    {canExecute && (
                      <td>
                        <div className={styles.actionButtons}>
                          <button
                            className={styles.smallButton}
                            onClick={() =>
                              confirmAndRun(`Kill ${p.process_name} (PID ${p.pid})`, `on ${selectedDeviceId}`, () =>
                                killMutation.mutate(p.pid)
                              )
                            }
                          >
                            Kill
                          </button>
                          <button
                            className={styles.smallButton}
                            onClick={() =>
                              confirmAndRun(`Restart ${p.process_name} (PID ${p.pid})`, `on ${selectedDeviceId}`, () =>
                                restartProcessMutation.mutate(p.pid)
                              )
                            }
                          >
                            Restart
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardWidget>
      )}

      {tab === "services" && (
        <DashboardWidget
          title="Windows Services"
          isEmpty={!selectedDeviceId || (servicesQuery.data ?? []).length === 0}
          emptyMessage="No related services detected on this device."
        >
          <div className={styles.appList}>
            {(servicesQuery.data ?? []).map((s) => (
              <div key={s.service_name} className={styles.serviceCard}>
                <div className={styles.serviceCardHeader}>
                  <span className={styles.appName}>{s.display_name || s.service_name}</span>
                  <Badge variant={s.status === "Running" ? "success" : "warning"}>{s.status ?? "Unknown"}</Badge>
                </div>
                <div className={styles.hint}>
                  Startup: {s.startup_type ?? "Unknown"} · Restarts: {s.restart_count} · Account: {s.logon_account ?? "--"}
                </div>
                {canExecute && (
                  <div className={styles.actionButtons}>
                    <button
                      className={styles.smallButton}
                      onClick={() =>
                        confirmAndRun(`Restart ${s.service_name}`, `on ${selectedDeviceId}`, () =>
                          serviceActionMutation.mutate({ serviceName: s.service_name, action: "restart" })
                        )
                      }
                    >
                      Restart
                    </button>
                    <button
                      className={styles.smallButton}
                      onClick={() =>
                        confirmAndRun(`Stop ${s.service_name}`, `on ${selectedDeviceId}`, () =>
                          serviceActionMutation.mutate({ serviceName: s.service_name, action: "stop" })
                        )
                      }
                    >
                      Stop
                    </button>
                    <button
                      className={styles.smallButton}
                      onClick={() =>
                        confirmAndRun(`Start ${s.service_name}`, `on ${selectedDeviceId}`, () =>
                          serviceActionMutation.mutate({ serviceName: s.service_name, action: "start" })
                        )
                      }
                    >
                      Start
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </DashboardWidget>
      )}

      {tab === "dependencies" && (
        <div className={styles.detailSection}>
          <DashboardWidget
            title="Process Tree"
            subtitle="This application's processes and their real child processes (via parent PID) on the selected device"
            isEmpty={!selectedDeviceId || processTree.length === 0}
            emptyMessage="No process tree data for this device."
          >
            <div className={styles.appList}>
              {processTree.map((node) => (
                <ProcessTreeRow key={node.process.pid} node={node} depth={0} />
              ))}
            </div>
          </DashboardWidget>

          <DashboardWidget
            title="Scheduled Tasks & Startup Items"
            subtitle="Discovered via registry Run/RunOnce keys, the Startup folder, and Get-ScheduledTask — attributed to this application when its exe path matches a known plugin"
            isEmpty={
              !selectedDeviceId ||
              ((dependencyGraph?.scheduledTasks.length ?? 0) === 0 && (dependencyGraph?.startupItems.length ?? 0) === 0)
            }
            emptyMessage="No scheduled tasks or startup items linked to this application were discovered on this device."
          >
            <div className={styles.appList}>
              {(dependencyGraph?.scheduledTasks ?? []).map((t) => (
                <div key={t.id} className={styles.serviceCard}>
                  <div className={styles.serviceCardHeader}>
                    <span className={styles.appName}>{t.display_name}</span>
                    <Badge variant={t.status === "Disabled" ? "warning" : "success"}>{t.status ?? "Unknown"}</Badge>
                  </div>
                  <div className={styles.hint}>Task path: {String(t.metadata?.taskPath ?? "--")}</div>
                  {canExecute && (
                    <div className={styles.actionButtons}>
                      <button
                        className={styles.smallButton}
                        onClick={() =>
                          confirmAndRun(`Run scheduled task ${t.display_name}`, `on ${selectedDeviceId}`, () =>
                            scheduledTaskMutation.mutate({
                              taskPath: String(t.metadata?.taskPath ?? ""),
                              taskName: t.display_name,
                              action: "run",
                            })
                          )
                        }
                      >
                        Run
                      </button>
                      <button
                        className={styles.smallButton}
                        onClick={() =>
                          confirmAndRun(
                            `${t.status === "Disabled" ? "Enable" : "Disable"} scheduled task ${t.display_name}`,
                            `on ${selectedDeviceId}`,
                            () =>
                              scheduledTaskMutation.mutate({
                                taskPath: String(t.metadata?.taskPath ?? ""),
                                taskName: t.display_name,
                                action: t.status === "Disabled" ? "enable" : "disable",
                              })
                          )
                        }
                      >
                        {t.status === "Disabled" ? "Enable" : "Disable"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {(dependencyGraph?.startupItems ?? []).map((s) => (
                <div key={s.id} className={styles.serviceCard}>
                  <div className={styles.serviceCardHeader}>
                    <span className={styles.appName}>{s.display_name}</span>
                    <Badge variant="info">{String(s.metadata?.source ?? "Startup")}</Badge>
                  </div>
                  <div className={styles.hint}>{String(s.metadata?.command ?? "")}</div>
                </div>
              ))}
            </div>
          </DashboardWidget>

          <DashboardWidget
            title="Network & DNS"
            subtitle="Live TCP connections owned by this application's processes, plus the device's DNS client cache (device-wide, not app-attributed)"
          >
            <div className={styles.appList}>
              {(dependencyGraph?.network ?? []).length === 0 && (
                <div className={styles.hint}>No active connections attributed to this application right now.</div>
              )}
              {(dependencyGraph?.network ?? []).map((n) => (
                <div key={n.id} className={styles.historyRow}>
                  <Badge variant={n.status === "Established" ? "success" : "info"}>{n.status ?? "--"}</Badge>
                  <span>{n.display_name}</span>
                </div>
              ))}
            </div>

            <div className={styles.hint} style={{ marginTop: 12 }}>DNS cache:</div>
            <div className={styles.appList}>
              {(dependencyGraph?.dns ?? []).slice(0, 15).map((d) => (
                <div key={d.id} className={styles.historyRow}>
                  <Badge variant={d.status === "Success" ? "success" : "danger"}>{d.status ?? "--"}</Badge>
                  <span>{d.display_name}</span>
                </div>
              ))}
            </div>

            {canExecute && (
              <div className={styles.actionButtons} style={{ marginTop: 12 }}>
                <button
                  className={styles.smallButton}
                  onClick={() => confirmAndRun("Flush DNS cache", `on ${selectedDeviceId}`, () => flushDnsMutation.mutate())}
                >
                  Flush DNS
                </button>
                <button
                  className={styles.smallButton}
                  onClick={() =>
                    confirmAndRun(`Collect logs for ${app.canonical_name}`, `on ${selectedDeviceId}`, () =>
                      collectLogsMutation.mutate(processesQuery.data?.[0]?.process_name ?? app.canonical_name)
                    )
                  }
                >
                  Collect Logs
                </button>
              </div>
            )}
          </DashboardWidget>

          <DashboardWidget title="Authentication" subtitle="Real dsregcmd /status output — Windows/Entra join and SSO token state">
            {dependencyGraph?.authentication ? (
              <div className={styles.detailGrid}>
                <Field label="Status" value={dependencyGraph.authentication.status ?? "Unknown"} />
                <Field label="Azure AD Joined" value={String(dependencyGraph.authentication.metadata?.azureAdJoined ?? "--")} />
                <Field label="SSO Token (PRT)" value={String(dependencyGraph.authentication.metadata?.azureAdPrt ?? "--")} />
                <Field label="Tenant" value={String(dependencyGraph.authentication.metadata?.tenantName ?? "--")} />
              </div>
            ) : (
              <div className={styles.hint}>No authentication status reported by this device yet.</div>
            )}
          </DashboardWidget>

          <DashboardWidget
            title="Dependency Timeline"
            isEmpty={(dependencyGraph?.events.length ?? 0) === 0}
            emptyMessage="No dependency changes recorded yet."
          >
            <div className={styles.appList}>
              {(dependencyGraph?.events ?? []).map((e) => (
                <div key={e.id} className={styles.historyRow}>
                  <Badge variant={e.event_type === "REMOVED" ? "danger" : "warning"}>{e.event_type.replace(/_/g, " ")}</Badge>
                  <span className={styles.hint}>{e.detail}</span>
                  <span className={styles.hint}>{new Date(e.occurred_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </DashboardWidget>
        </div>
      )}

      {tab === "versions" && (
        <DashboardWidget
          title="Versions"
          subtitle="Fleet version distribution for this application — no end-of-life/support-status data exists in this system yet, so that column is intentionally omitted rather than guessed"
          isEmpty={versionGroups.length === 0}
          emptyMessage="No version data reported yet."
        >
          <div className={styles.processTableWrap}>
            <table className={styles.processTable}>
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Installed Devices</th>
                  <th>Running Devices</th>
                  <th>Adoption %</th>
                </tr>
              </thead>
              <tbody>
                {versionGroups.map((v) => (
                  <tr key={v.version}>
                    <td>{v.version}</td>
                    <td>{v.deviceCount}</td>
                    <td>{v.runningCount}</td>
                    <td>{v.adoptionPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardWidget>
      )}

      {tab === "events" && (
        <DashboardWidget
          title="Events"
          subtitle="Warning-shaped events only — crashes, service restarts, removals, status/health changes. See History for the full timeline."
          isEmpty={warningEvents.length === 0}
          emptyMessage="No warning-level events recorded yet."
        >
          <div className={styles.appList}>
            {warningEvents.map((e) => (
              <div key={e.id} className={styles.historyRow}>
                <Badge variant={historyEventVariant(e.eventType)}>{e.eventType.replace(/_/g, " ")}</Badge>
                <span className={styles.hint}>{e.detail}</span>
                <span className={styles.hint}>{new Date(e.occurredAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </DashboardWidget>
      )}

      {tab === "registry" && (
        <DashboardWidget
          title="Registry"
          subtitle="Real registry-sourced facts already collected — install/uninstall entry and Run/RunOnce startup keys. Not a live registry browser."
        >
          <div className={styles.detailSection}>
            <div className={styles.appName}>Install Registry</div>
            {selectedDeviceRow ? (
              <div className={styles.detailGrid}>
                <Field label="Product Code" value={selectedDeviceRow.product_code || "--"} />
                <Field label="Install Location" value={selectedDeviceRow.install_location || "--"} />
                <Field label="Uninstall Command" value={selectedDeviceRow.uninstall_command || "--"} />
              </div>
            ) : (
              <div className={styles.hint}>Select a device to view its install registry entry.</div>
            )}
          </div>

          <div className={styles.detailSection} style={{ marginTop: 16 }}>
            <div className={styles.appName}>Startup Registry (Run / RunOnce)</div>
            {registryStartupItems.length === 0 && (
              <div className={styles.hint}>No Run/RunOnce registry entries linked to this application on this device.</div>
            )}
            <div className={styles.appList}>
              {registryStartupItems.map((s) => (
                <div key={s.id} className={styles.historyRow}>
                  <Badge variant="info">{String(s.metadata?.source ?? "Registry")}</Badge>
                  <span>{s.display_name}</span>
                  <span className={styles.hint}>{String(s.metadata?.command ?? "")}</span>
                </div>
              ))}
            </div>
          </div>
        </DashboardWidget>
      )}

      {tab === "certificates" && (
        <DashboardWidget
          title="Certificates"
          subtitle="Digital signature details from Get-AuthenticodeSignature on this application's running processes for the selected device"
          isEmpty={!selectedDeviceId || (processesQuery.data ?? []).length === 0}
          emptyMessage="No process data for this device."
        >
          <div className={styles.appList}>
            {(processesQuery.data ?? []).map((p) => (
              <div key={p.pid} className={styles.serviceCard}>
                <div className={styles.serviceCardHeader}>
                  <span className={styles.appName}>{p.process_name}</span>
                  <Badge variant={p.signed === true ? "success" : p.signed === false ? "danger" : "default"}>
                    {p.signed === true ? "Signed" : p.signed === false ? "Unsigned" : "Unknown"}
                  </Badge>
                </div>
                <div className={styles.hint}>Publisher: {p.publisher || "--"}</div>
                <div className={styles.hint}>Issuer: {p.cert_issuer || "--"}</div>
                <div className={styles.hint}>
                  Expires: {p.cert_expires_at ? new Date(Number(p.cert_expires_at)).toLocaleDateString() : "--"}
                </div>
                <div className={styles.hint}>Thumbprint: {p.cert_thumbprint || "--"}</div>
              </div>
            ))}
          </div>
        </DashboardWidget>
      )}

      {tab === "history" && (
        <DashboardWidget
          title="History"
          subtitle="Installed, removed, version changes, crashes, service restarts, and health changes — across all devices"
          isEmpty={(historyQuery.data ?? []).length === 0}
          emptyMessage="No history recorded yet."
        >
          <div className={styles.appList}>
            {(historyQuery.data ?? []).map((h) => (
              <div key={h.id} className={styles.historyRow}>
                <Badge variant={historyEventVariant(h.event_type)}>{h.event_type.replace(/_/g, " ")}</Badge>
                <span className={styles.hint}>{h.detail}</span>
                <span className={styles.hint}>{new Date(h.occurred_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </DashboardWidget>
      )}

      {tab === "cloud" && (
        <DashboardWidget title="Cloud Status">
          {!app.cloud_provider && <div className={styles.hint}>This application has no mapped cloud provider.</div>}
          {cloudStatus && (
            <div className={styles.detailSection}>
              <Badge variant={cloudStatusVariant(cloudStatus.status)}>{cloudStatus.status.replace(/_/g, " ")}</Badge>
              {cloudStatus.status_url && (
                <a href={cloudStatus.status_url} target="_blank" rel="noreferrer" className={styles.statusLink}>
                  View official status page
                </a>
              )}
              <div className={styles.appList} style={{ marginTop: 12 }}>
                {(cloudIncidentsQuery.data ?? [])
                  .filter((i) => i.provider === cloudStatus.provider)
                  .map((incident) => (
                    <div key={incident.id} className={styles.historyRow}>
                      <span>{incident.title}</span>
                      <span className={styles.hint}>
                        {incident.started_at ? new Date(incident.started_at).toLocaleString() : ""}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </DashboardWidget>
      )}

      {tab === "ai" && (
        <DashboardWidget
          title="AI Analysis"
          subtitle="Rule-based correlation of local signals, dependencies, and cloud status — honest rounded confidence, not fabricated precision"
          isEmpty={allRecommendations.length === 0}
          emptyMessage={selectedDeviceId ? "No correlated issues detected for the selected device." : "Select a device on the Processes/Services tab to evaluate."}
        >
          <div className={styles.appList}>
            {allRecommendations.map((r) => (
              <div key={r.title} className={styles.recommendation}>
                <div className={styles.recommendationTitle}>{r.title}</div>
                <div className={styles.hint}>{r.description}</div>
                <div className={styles.hint}>{r.reason}</div>
                <div className={styles.hint}>Suggested action: {r.suggestedAction}</div>
                <div className={styles.hint}>Confidence: {Math.round(r.confidence * 100)}%</div>
              </div>
            ))}
          </div>
        </DashboardWidget>
      )}

      {tab === "devices" && (
        <DashboardWidget
          title="Devices"
          subtitle="Every device where this application is installed"
          isEmpty={(devicesQuery.data ?? []).length === 0}
          emptyMessage="No devices report this application installed."
        >
          <div className={styles.processTableWrap}>
            <table className={styles.processTable}>
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Version</th>
                  <th>Running</th>
                  <th>Health</th>
                  <th>CPU%</th>
                  <th>Memory (MB)</th>
                  <th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {(devicesQuery.data ?? []).map((d) => (
                  <tr key={d.device_id} className={styles.clickableRow} onClick={() => navigate(`/devices/${d.device_id}`)}>
                    <td>{d.device_id}</td>
                    <td>{d.version ?? "--"}</td>
                    <td>{d.is_running ? "Yes" : "No"}</td>
                    <td>{d.level ? <Badge variant={healthLevelVariant(d.level)}>{d.level}</Badge> : "--"}</td>
                    <td>{d.cpu_percent ?? "--"}</td>
                    <td>{d.memory_mb ?? "--"}</td>
                    <td>{d.last_seen ? new Date(Number(d.last_seen)).toLocaleString() : "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardWidget>
      )}

      {tab === "reports" && (
        <DashboardWidget
          title="Reports"
          subtitle="On-demand CSV exports for this application — no scheduled/emailed reports or PDF generation exist in this system yet"
        >
          <div className={styles.actionButtons}>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                exportRowsAsCsv(`${app.canonical_name}-devices.csv`, devicesQuery.data ?? [], [
                  { header: "Device", value: (d) => d.device_id },
                  { header: "Version", value: (d) => d.version ?? "" },
                  { header: "Running", value: (d) => (d.is_running ? "Yes" : "No") },
                  { header: "Health", value: (d) => d.level ?? "" },
                  { header: "Last Seen", value: (d) => (d.last_seen ? new Date(Number(d.last_seen)).toLocaleString() : "") },
                ])
              }
            >
              Export Device List (CSV)
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                exportRowsAsCsv(`${app.canonical_name}-history.csv`, historyQuery.data ?? [], [
                  { header: "Event", value: (h) => h.event_type },
                  { header: "Detail", value: (h) => h.detail ?? "" },
                  { header: "Occurred At", value: (h) => new Date(h.occurred_at).toLocaleString() },
                ])
              }
            >
              Export History (CSV)
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                exportRowsAsCsv(`${app.canonical_name}-versions.csv`, versionGroups, [
                  { header: "Version", value: (v) => v.version },
                  { header: "Installed Devices", value: (v) => v.deviceCount },
                  { header: "Running Devices", value: (v) => v.runningCount },
                  { header: "Adoption %", value: (v) => v.adoptionPercent },
                ])
              }
            >
              Export Version Breakdown (CSV)
            </Button>
          </div>
        </DashboardWidget>
      )}

      <Modal
        isOpen={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        titleId="confirm-action-title"
        title={pendingAction?.label ?? "Confirm action"}
      >
        <p className={styles.hint}>
          This runs immediately {pendingAction?.detail}. Kill actions trigger the agent's existing user-consent
          prompt on the device before anything happens.
        </p>
        <div className={styles.actionButtons}>
          <Button type="button" variant="secondary" onClick={() => setPendingAction(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              pendingAction?.run();
              setPendingAction(null);
            }}
          >
            Confirm
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function StatChip({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={warn ? styles.statChipWarn : styles.statChip}>
      <span className={styles.statChipLabel}>{label}</span>
      <span className={styles.statChipValue}>{value}</span>
    </div>
  );
}

function Field({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={muted ? styles.fieldValueMuted : styles.fieldValue}>{value}</span>
    </div>
  );
}

function historyEventVariant(eventType: string): "success" | "warning" | "danger" | "info" | "default" {
  if (eventType === "INSTALLED") return "success";
  if (eventType === "REMOVED" || eventType === "CRASH") return "danger";
  if (eventType === "VERSION_CHANGED" || eventType === "SERVICE_RESTART" || eventType === "HEALTH_SCORE_CHANGED") return "warning";
  return "info";
}
