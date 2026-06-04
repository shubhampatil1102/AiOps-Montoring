import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { API_URL } from "@/api/config";
import GlassCard from "@/components/GlassCard";
import { fetchAlerts } from "@/api/alerts";
import { fetchDevices } from "@/api/devices";
import "./remediation.css";

type AlertItem = {
  id: string;
  message: string;
  time: number;
  acknowledged?: boolean;
  resolved?: boolean;
  suggestion_id?: number | null;
};

type Suggestion = {
  id: number;
  device_id: string;
  alert_type: string;
  reason: string;
  suggested_action: string;
  script: string;
  created_at: number;
  status?: string;
};

type TimelineEntry = {
  job_id: number;
  device_id: string;
  script: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
  approval_status?: "APPROVED" | "REJECTED" | null;
  approval_user?: string | null;
  agent_message?: string | null;
  output?: string | null;
  created_at: number;
  started_at?: number | null;
  finished_at?: number | null;
  decision_time?: number | null;
};

type Device = {
  id: string;
  cpu?: number;
  ram?: number;
  time?: number;
  state?: string;
};

type RemediationRecord = {
  key: string;
  deviceId: string;
  title: string;
  message: string;
  alertTime: number;
  acknowledged: boolean;
  resolved: boolean;
  severity: "critical" | "warning" | "info";
  currentState: "pending" | "review" | "running" | "completed" | "failed";
  suggestion?: Suggestion;
  relatedJobs: TimelineEntry[];
  device?: Device;
};

const API = API_URL;

export default function Remediation() {
  const navigate = useNavigate();
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: alerts = [], refetch: refetchAlerts } = useQuery<AlertItem[]>({
    queryKey: ["alerts"],
    queryFn: fetchAlerts,
    refetchInterval: 5000,
  });

  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ["devices"],
    queryFn: fetchDevices,
    refetchInterval: 5000,
  });

  const { data: suggestions = [], refetch: refetchSuggestions } = useQuery<Suggestion[]>({
    queryKey: ["heal"],
    queryFn: async () => {
      const r = await fetch(`${API}/heal/suggestions`);
      return r.json();
    },
    refetchInterval: 4000,
  });

  const { data: timeline = [], refetch: refetchTimeline } = useQuery<TimelineEntry[]>({
    queryKey: ["heal-timeline"],
    queryFn: async () => {
      const r = await fetch(`${API}/heal/timeline`);
      return r.json();
    },
    refetchInterval: 3000,
  });

  const acknowledge = useMutation({
    mutationFn: (time: number) =>
      fetch(`${API}/alerts/${time}/ack`, { method: "POST" }),
    onSuccess: () => {
      refetchAlerts();
    },
  });

  const approve = useMutation({
    mutationFn: (id: number) =>
      fetch(`${API}/heal/approve/${id}`, { method: "POST" }),
    onSuccess: () => {
      refetchSuggestions();
      refetchTimeline();
      refetchAlerts();
    },
  });

  const reject = useMutation({
    mutationFn: (id: number) =>
      fetch(`${API}/heal/reject/${id}`, { method: "POST" }),
    onSuccess: () => {
      refetchSuggestions();
      refetchTimeline();
    },
  });

  const records: RemediationRecord[] = alerts.map((alert) => {
    const relatedSuggestion = findRelatedSuggestion(alert, suggestions);

    const relatedJobs = timeline.filter(
      (job) => isJobRelatedToAlert(job, alert, relatedSuggestion)
    );

    return {
      key: `${alert.id}-${alert.time}`,
      deviceId: alert.id,
      title: summarizeAlert(alert.message),
      message: alert.message,
      alertTime: Number(alert.time),
      acknowledged: !!alert.acknowledged,
      resolved: !!alert.resolved,
      severity: getSeverity(alert.message),
      currentState: deriveCurrentState(alert, relatedSuggestion, relatedJobs),
      suggestion: relatedSuggestion,
      relatedJobs,
      device: devices.find((d) => d.id === alert.id),
    };
  });

  const filteredRecords = records
    .filter((record) => {
      if (statusFilter !== "all" && record.currentState !== statusFilter) return false;
      if (deviceFilter !== "all" && record.deviceId !== deviceFilter) return false;

      const query = search.trim().toLowerCase();
      if (!query) return true;

      return (
        record.deviceId.toLowerCase().includes(query) ||
        record.message.toLowerCase().includes(query) ||
        record.title.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => b.alertTime - a.alertTime);

  useEffect(() => {
    if (!filteredRecords.length) {
      setSelectedKey("");
      return;
    }

    const exists = filteredRecords.some((record) => record.key === selectedKey);
    if (!selectedKey || !exists) {
      setSelectedKey(filteredRecords[0].key);
    }
  }, [filteredRecords, selectedKey]);

  const selectedRecord =
    filteredRecords.find((record) => record.key === selectedKey) ?? null;

  const summary = {
    pending: records.filter((record) => record.currentState === "pending").length,
    review: records.filter((record) => record.currentState === "review").length,
    running: records.filter((record) => record.currentState === "running").length,
    completed: records.filter((record) => record.currentState === "completed").length,
    failed: records.filter((record) => record.currentState === "failed").length,
  };

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        minHeight: "calc(100vh - 40px)",
        overflowX: "hidden",
        overflowY: "auto",
        paddingRight: 6,
      }}
      className="remediation-scroll"
    >
      <div>
        <h1 style={{ fontSize: 28, marginBottom: 6 }}>Remediation Center</h1>
        <div style={{ color: "#64748b", fontSize: 14 }}>
          One place to review incidents, approve AI fixes, and track execution history.
        </div>
      </div>

      <div
        className="remediation-summary-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          gap: 14,
        }}
      >
        <SummaryCard title="Pending" value={summary.pending} color="#f59e0b" />
        <SummaryCard title="Needs Review" value={summary.review} color="#6366f1" />
        <SummaryCard title="Running" value={summary.running} color="#0ea5e9" />
        <SummaryCard title="Completed" value={summary.completed} color="#22c55e" />
        <SummaryCard title="Failed" value={summary.failed} color="#ef4444" />
      </div>

      <GlassCard style={{ padding: 16 }}>
        <div
          className="remediation-filter-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr",
            gap: 12,
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by device or issue"
            style={input}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={input}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="review">Needs review</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
            style={input}
          >
            <option value="all">All devices</option>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.id}
              </option>
            ))}
          </select>
        </div>
      </GlassCard>

      <div
        className="remediation-main-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,minmax(0,1fr))",
          gap: 20,
          alignItems: "stretch",
          width: "100%",
        }}
      >
        <GlassCard
          className="remediation-panel"
          style={{
            padding: 16,
            height: "72vh",
            minHeight: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={sectionTitle}>Queue</div>
          <div
            style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 4 }}
            className="remediation-scroll remediation-queue-scroll"
          >
            {filteredRecords.length === 0 && (
              <div style={{ opacity: 0.65, paddingTop: 10 }}>No remediation items found.</div>
            )}

            {filteredRecords.map((record) => (
              <button
                key={record.key}
                onClick={() => setSelectedKey(record.key)}
                style={{
                  ...queueItem,
                  background:
                    selectedKey === record.key
                      ? "linear-gradient(180deg,#eff6ff,#dbeafe)"
                      : isNewRecord(record)
                        ? "linear-gradient(180deg,#fff7ed,#ffedd5)"
                        : "white",
                  border:
                    selectedKey === record.key
                      ? "1px solid #2563eb"
                      : isNewRecord(record)
                        ? "1px solid rgba(249,115,22,0.35)"
                      : "1px solid rgba(148,163,184,0.25)",
                  boxShadow:
                    selectedKey === record.key
                      ? "0 0 0 3px rgba(37,99,235,0.14), 0 10px 25px rgba(37,99,235,0.12)"
                      : isNewRecord(record)
                        ? "0 0 0 2px rgba(249,115,22,0.10), 0 8px 20px rgba(249,115,22,0.10)"
                      : "0 1px 2px rgba(15,23,42,0.04)",
                  transform: selectedKey === record.key ? "translateY(-1px)" : "translateY(0)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#64748b",
                        marginBottom: 4,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span>{record.deviceId}</span>
                      {isNewRecord(record) && <NewPill />}
                    </div>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{record.title}</div>
                  </div>
                  <SeverityPill severity={record.severity} />
                </div>

                <div style={{ color: "#475569", fontSize: 13, marginTop: 8 }}>
                  {record.message}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 12,
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <StatePill state={record.currentState} />
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    {formatDateTime(record.alertTime)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard
          className="remediation-panel"
          style={{
            padding: 18,
            height: "72vh",
            minHeight: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                Selected incident
              </div>
              <h2 style={{ margin: 0 }}>{selectedRecord?.title || "No incident selected"}</h2>
            </div>
            {selectedRecord && <StatePill state={selectedRecord.currentState} />}
          </div>

          {!selectedRecord && (
            <div style={{ color: "#64748b" }}>Select an item from the queue to inspect it.</div>
          )}

          {selectedRecord && (
            <div
              style={{ display: "grid", gap: 16, flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 4 }}
              className="remediation-scroll remediation-panel-body"
            >
              <div className="remediation-detail-grid" style={detailGrid}>
                <DetailCard
                  label="Device"
                  value={selectedRecord.deviceId}
                  helper={selectedRecord.device?.state || "Unknown state"}
                />
                <DetailCard
                  label="Signal"
                  value={selectedRecord.message}
                  helper={`Raised ${timeAgo(selectedRecord.alertTime)}`}
                />
                <DetailCard
                  label="Live Health"
                  value={`${formatPercent(selectedRecord.device?.cpu)} CPU / ${formatPercent(
                    selectedRecord.device?.ram
                  )} RAM`}
                  helper={`Last seen ${selectedRecord.device?.time ? timeAgo(selectedRecord.device.time) : "-"}`}
                />
              </div>

              <div style={panel}>
                <div style={subTitle}>Recommended action</div>
                {selectedRecord.suggestion ? (
                  <>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>
                      {selectedRecord.suggestion.suggested_action}
                    </div>
                    <div style={{ marginTop: 8, color: "#475569", fontSize: 14 }}>
                      {selectedRecord.suggestion.reason}
                    </div>
                    <pre style={scriptBox}>{selectedRecord.suggestion.script}</pre>
                  </>
                ) : (
                  <div style={{ color: "#64748b" }}>
                    No AI suggestion is currently linked to this incident. You can still
                    acknowledge it, inspect the device, or run a manual script from the
                    scripts page.
                  </div>
                )}
              </div>

              <div style={panel}>
                <div style={subTitle}>Remediation timeline</div>
                <div style={{ display: "grid", gap: 10 }}>
                  <TimelineRow
                    label="Alert created"
                    value={formatDateTime(selectedRecord.alertTime)}
                    tone="neutral"
                  />
                  <TimelineRow
                    label="Acknowledgement"
                    value={selectedRecord.acknowledged ? "Acknowledged" : "Waiting for ACK"}
                    tone={selectedRecord.acknowledged ? "good" : "warn"}
                  />
                  {selectedRecord.suggestion && (
                    <TimelineRow
                      label="AI suggestion"
                      value={`Suggestion #${selectedRecord.suggestion.id} ready for review`}
                      tone="info"
                    />
                  )}
                  {selectedRecord.relatedJobs.map((job) => (
                    <TimelineRow
                      key={job.job_id}
                      label={`Job #${job.job_id}`}
                      value={buildJobSummary(job)}
                      tone={job.status === "SUCCESS" ? "good" : job.status === "FAILED" ? "bad" : "info"}
                    />
                  ))}
                  {!selectedRecord.relatedJobs.length && (
                    <div style={{ color: "#64748b", fontSize: 14 }}>
                      No execution has started for this incident yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </GlassCard>

        <GlassCard
          className="remediation-panel"
          style={{
            padding: 18,
            height: "72vh",
            minHeight: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={sectionTitle}>Actions</div>

          {!selectedRecord && (
            <div style={{ color: "#64748b" }}>Choose an incident to see the available actions.</div>
          )}

          {selectedRecord && (
            <div
              style={{ display: "grid", gap: 16, flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 4 }}
              className="remediation-scroll remediation-panel-body"
            >
              <div style={panel}>
                <div style={subTitle}>Incident controls</div>
                <div style={actionGrid}>
                  <button
                    onClick={() => acknowledge.mutate(selectedRecord.alertTime)}
                    disabled={selectedRecord.acknowledged || acknowledge.isPending}
                    style={primaryButton("#f59e0b")}
                  >
                    {selectedRecord.acknowledged ? "Acknowledged" : "Acknowledge"}
                  </button>

                  <button
                    onClick={() => navigate(`/devices/${selectedRecord.deviceId}`)}
                    style={secondaryButton}
                  >
                    Open Device
                  </button>

                  <button onClick={() => navigate("/incidents")} style={secondaryButton}>
                    Open Incidents
                  </button>

                  <button onClick={() => navigate("/scripts")} style={secondaryButton}>
                    Manual Script
                  </button>
                </div>
              </div>

              <div style={panel}>
                <div style={subTitle}>AI remediation</div>
                {selectedRecord.suggestion ? (
                  <div style={actionGrid}>
                    <button
                      onClick={() => approve.mutate(selectedRecord.suggestion!.id)}
                      disabled={approve.isPending}
                      style={primaryButton("#22c55e")}
                    >
                      Approve Fix
                    </button>
                    <button
                      onClick={() => reject.mutate(selectedRecord.suggestion!.id)}
                      disabled={reject.isPending}
                      style={primaryButton("#ef4444")}
                    >
                      Reject Fix
                    </button>
                    <div style={{ color: "#64748b", fontSize: 13 }}>
                      Suggestion #{selectedRecord.suggestion.id} will create a script job when
                      approved.
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "#64748b", fontSize: 14 }}>
                    No pending AI suggestion is available for this incident right now.
                  </div>
                )}
              </div>

              <div style={panel}>
                <div style={subTitle}>Latest execution output</div>
                {selectedRecord.relatedJobs[0]?.output ? (
                  <pre style={outputBox}>{selectedRecord.relatedJobs[0].output}</pre>
                ) : selectedRecord.relatedJobs[0]?.agent_message ? (
                  <div style={{ color: "#ef4444", fontSize: 14 }}>
                    {selectedRecord.relatedJobs[0].agent_message}
                  </div>
                ) : (
                  <div style={{ color: "#64748b", fontSize: 14 }}>
                    Execution logs will appear here once a remediation job starts streaming
                    output.
                  </div>
                )}
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

function deriveCurrentState(
  alert: AlertItem,
  suggestion: Suggestion | undefined,
  jobs: TimelineEntry[]
): RemediationRecord["currentState"] {
  if (alert.resolved) return "completed";

  if (jobs.some((job) => job.status === "RUNNING" || job.status === "PENDING")) {
    return "running";
  }

  if (jobs.some((job) => job.status === "FAILED" || job.approval_status === "REJECTED")) {
    return "failed";
  }

  if (jobs.some((job) => job.status === "SUCCESS")) {
    return "completed";
  }

  if (suggestion) return "review";
  if (alert.acknowledged) return "review";
  return "pending";
}

function isNewRecord(record: RemediationRecord) {
  return Date.now() - Number(record.alertTime) < 2 * 60 * 1000;
}

function findRelatedSuggestion(alert: AlertItem, suggestions: Suggestion[]) {
  if (alert.suggestion_id) {
    return suggestions.find((suggestion) => suggestion.id === alert.suggestion_id);
  }

  const alertTime = Number(alert.time);

  return suggestions
    .filter((suggestion) => {
      const createdAt = Number(suggestion.created_at);
      return (
        suggestion.device_id === alert.id &&
        createdAt >= alertTime &&
        createdAt - alertTime < 2 * 60 * 1000
      );
    })
    .sort((a, b) => Number(a.created_at) - Number(b.created_at))[0];
}

function isJobRelatedToAlert(
  job: TimelineEntry,
  alert: AlertItem,
  suggestion?: Suggestion
) {
  if (job.device_id !== alert.id) return false;

  const alertTime = Number(alert.time);
  const jobTime = Number(job.created_at);

  if (suggestion) {
    const suggestionTime = Number(suggestion.created_at);
    return jobTime >= suggestionTime && jobTime - suggestionTime < 2 * 60 * 1000;
  }

  return jobTime >= alertTime && jobTime - alertTime < 2 * 60 * 1000;
}

function getSeverity(message: string): RemediationRecord["severity"] {
  const text = message.toLowerCase();

  if (
    text.includes("critical") ||
    text.includes("offline") ||
    text.includes("not reporting") ||
    text.includes("anomaly")
  ) {
    return "critical";
  }

  if (text.includes("high") || text.includes("elevated") || text.includes("warning")) {
    return "warning";
  }

  return "info";
}

function summarizeAlert(message: string) {
  const text = message.toLowerCase();

  if (text.includes("cpu")) return "CPU remediation";
  if (text.includes("ram") || text.includes("memory")) return "Memory remediation";
  if (text.includes("not reporting") || text.includes("offline")) return "Connectivity remediation";
  if (text.includes("update")) return "Update remediation";
  return "General remediation";
}

function buildJobSummary(job: TimelineEntry) {
  const parts = [`${job.status} on ${formatDateTime(job.created_at)}`];

  if (job.approval_status) parts.push(job.approval_status);
  if (job.approval_user) parts.push(`by ${job.approval_user}`);
  if (job.finished_at && job.started_at) {
    parts.push(`duration ${formatDuration(job.started_at, job.finished_at)}`);
  }

  return parts.join(" • ");
}

function formatDateTime(time: number) {
  return new Date(Number(time)).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(time: number) {
  const diff = Date.now() - Number(time);
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDuration(start: number, end: number) {
  const seconds = Math.max(0, Math.floor((end - start) / 1000));
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${minutes}m ${rem}s`;
}

function formatPercent(value?: number) {
  if (value === undefined || value === null) return "--";
  return `${Number(value).toFixed(1)}%`;
}

function SummaryCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
  return (
    <GlassCard style={{ padding: 18, position: "relative", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at top left, ${color}22, transparent 65%)`,
        }}
      />
      <div style={{ position: "relative" }}>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 34, fontWeight: 800, color }}>{value}</div>
      </div>
    </GlassCard>
  );
}

function NewPill() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 999,
        background: "#f9731618",
        color: "#ea580c",
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 0.4,
      }}
    >
      NEW
    </span>
  );
}

function SeverityPill({ severity }: { severity: RemediationRecord["severity"] }) {
  const color =
    severity === "critical" ? "#ef4444" : severity === "warning" ? "#f59e0b" : "#0ea5e9";

  return (
    <span
      style={{
        background: `${color}18`,
        color,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        height: "fit-content",
      }}
    >
      {severity.toUpperCase()}
    </span>
  );
}

function StatePill({ state }: { state: RemediationRecord["currentState"] }) {
  const map = {
    pending: "#f59e0b",
    review: "#6366f1",
    running: "#0ea5e9",
    completed: "#22c55e",
    failed: "#ef4444",
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignSelf: "flex-start",
        alignItems: "center",
        background: `${map[state]}18`,
        color: map[state],
        padding: "4px 10px",
        borderRadius: 800,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {state.toUpperCase()}
    </span>
  );
}

function DetailCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div style={detailCard}>
      <div style={{ color: "#64748b", fontSize: 12, marginBottom: 6 }}>{label}</div>
      <div style={{ color: "#0f172a", fontWeight: 700, lineHeight: 1.35 }}>{value}</div>
      <div style={{ color: "#64748b", fontSize: 12, marginTop: 8 }}>{helper}</div>
    </div>
  );
}

function TimelineRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "good" | "warn" | "bad" | "info";
}) {
  const colorMap = {
    neutral: "#64748b",
    good: "#16a34a",
    warn: "#d97706",
    bad: "#dc2626",
    info: "#2563eb",
  };

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 12,
        background: "#fff",
      }}
    >
      <div style={{ color: "#64748b", fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ color: colorMap[tone], fontWeight: 700, lineHeight: 1.4 }}>{value}</div>
    </div>
  );
}

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#0f172a",
};

const queueItem: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  textAlign: "left",
  background: "white",
  padding: 14,
  borderRadius: 14,
  cursor: "pointer",
  marginTop: 12,
};

const panel: React.CSSProperties = {
  padding: 16,
  borderRadius: 14,
  background: "rgba(255,255,255,0.72)",
  border: "1px solid rgba(148,163,184,0.22)",
};

const detailGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 12,
  minWidth: 0,
  alignItems: "stretch",
};

const detailCard: React.CSSProperties = {
  minWidth: 0,
  display: "grid",
  gap: 8,
  alignContent: "start",
  background: "white",
  borderRadius: 14,
  padding: 14,
  border: "1px solid #e2e8f0",
};

const actionGrid: React.CSSProperties = {
  display: "grid",
  gap: 10,
};

const scriptBox: React.CSSProperties = {
  marginTop: 12,
  background: "#020617",
  color: "#e2e8f0",
  padding: 12,
  borderRadius: 12,
  fontSize: 13,
  whiteSpace: "pre-wrap",
};

const outputBox: React.CSSProperties = {
  background: "#020617",
  color: "#22c55e",
  padding: 12,
  borderRadius: 12,
  fontSize: 13,
  maxHeight: 280,
  overflowY: "auto",
  whiteSpace: "pre-wrap",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: "#0f172a",
};

const subTitle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: "#0f172a",
  marginBottom: 12,
};

function primaryButton(color: string): React.CSSProperties {
  return {
    border: "none",
    background: color,
    color: "white",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
  };
}

const secondaryButton: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#0f172a",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 600,
};
