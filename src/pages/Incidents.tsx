import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchIssues } from "@/api/alerts";
import { API_URL } from "@/api/config";
import SeverityBadge from "@/components/SeverityBadge";
import Spinner from "@/components/Spinner";
import { timeAgo } from "@/utils/time";
import { title } from "process";

type Issue = {
  id: string;
  title: string;
  description: string;
  type: "security" | "update" | "service" | "driver" | "performance" | "other";
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "pending" | "in-progress" | "resolved";
  device_id?: string;
  created_at: number | string;
  updated_at?: number | string;
  action_required?: boolean;
  auto_remediation_available?: boolean;
};

type EscalationLevel = {
  level: string;
  trigger: string;
  owner: string;
  targetSla: string;
  channel: string;
};

const ESCALATION_MATRIX: EscalationLevel[] = [
  { level: "L1", trigger: "New incident detected", owner: "NOC On-Call", targetSla: "5 min", channel: "email + ops feed" },
  { level: "L2", trigger: "No ACK after 10 min", owner: "Platform Engineer", targetSla: "15 min", channel: "email + pager" },
  { level: "L3", trigger: "Service impact confirmed", owner: "SRE Lead", targetSla: "30 min", channel: "email + bridge" },
  { level: "L4", trigger: "Business critical outage", owner: "Incident Commander", targetSla: "Immediate", channel: "war room + exec email" },
];

export default function Incidents() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedKey, setSelectedKey] = useState<string>("");

  const { data: issues = [], isLoading, refetch } = useQuery<Issue[]>({
    queryKey: ["issues"],
    queryFn: fetchIssues,
    refetchInterval: 30000, // Refetch every 30 seconds instead of 5
  });

  const resolve = useMutation({
    mutationFn: (issueId: string) =>
      fetch(`${API_URL}/issues/${issueId}/resolve`, { method: "POST" }),
    onSuccess: () => refetch(),
  });

  const escalate = useMutation({
    mutationFn: (issueId: string) =>
      fetch(`${API_URL}/issues/${issueId}/escalate`, { method: "POST" }),
    onSuccess: () => refetch(),
  });

  const remediate = useMutation({
    mutationFn: (issueId: string) =>
      fetch(`${API_URL}/issues/${issueId}/remediate`, { method: "POST" }),
    onSuccess: () => refetch(),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return issues.filter((issue) => {
      const textMatch = !q || issue.id?.toLowerCase().includes(q) || issue.title?.toLowerCase().includes(q) || issue.description?.toLowerCase().includes(q);
      const statusMatch = statusFilter === "all" || issue.status === statusFilter;
      return textMatch && statusMatch;
    });
  }, [issues, search, statusFilter]);

  useEffect(() => {
    // Clear selection if no items available
    if (!filtered.length) {
      setSelectedKey("");
      return;
    }
    // Clear selection if selected item is no longer in filtered list (e.g., due to search)
    if (selectedKey && !filtered.some((i) => getKey(i) === selectedKey)) {
      setSelectedKey(getKey(filtered[0]));
    }
  }, [filtered, selectedKey]);

  const selected = useMemo(
    () => filtered.find((i) => getKey(i) === selectedKey) || null,
    [filtered, selectedKey]
  );

  const openCount = issues.filter((i) => i.status === "open").length;
  const pendingCount = issues.filter((i) => i.status === "pending").length;

//   const filtered = useMemo(() => {
//   const q = search.trim().toLowerCase();
//   return issues.filter((issue) => {
//     const textMatch =
//       !q ||
//       issue.id?.toLowerCase().includes(q) ||
//       issue.title?.toLowerCase().includes(q) ||
//       issue.description?.toLowerCase().includes(q);

//     const statusMatch =
//       statusFilter === "all" ||
//       issue.status?.toLowerCase().trim() === statusFilter.toLowerCase().trim(); // ← normalize both sides

//     return textMatch && statusMatch;
//   });
// }, [issues, search, statusFilter]);

  if (isLoading) return <Spinner label="Loading incidents..." />;

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto auto 1fr", gap: 10, height: "calc(100vh - 80px)", padding: "0 12px 12px", overflow: "hidden", background: "#f5f7fa" }}>
      <div style={{ padding: "20px 12px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#0f172a" }}>Incidents</h1>
          <div style={{ color: "#64748b", fontSize: 14, marginTop: 6 }}>
            Monitor, acknowledge, and remediate detected incidents.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={pill("#ef4444")}>{issues.length} total</span>
          <span style={pill("#f59e0b")}>{openCount} open</span>
          <span style={pill("#3b82f6")}>{pendingCount} pending</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(240px,1fr) 220px", gap: 10 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search incident id or message..."
          style={controlInput}
        />
        
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={controlInput}>
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, overflow: "hidden" }}>
        <div style={{ ...tableOuter, display: "grid", gridTemplateRows: "auto 1fr auto", overflow: "hidden" }}>
          <div style={{ overflowY: "auto", overflowX: "hidden" }}>
            <table style={tableBase}>
              <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ ...th, width: "15%" }}>Incident</th>
                  <th style={{ ...th, width: "10%" }}>Severity</th>
                  <th style={{ ...th, width: "10%" }}>Detection Summary</th>
                  <th style={{ ...th, width: "8%" }}>Detected</th>
                  <th style={{ ...th, width: "10%" }}>Status</th>
                  <th style={{ ...th, borderRight: "none", width: "10%" }}>Action</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((issue, index) => {
                  const rowKey = getKey(issue);
                  const active = rowKey === selectedKey;
                  const typeColors: Record<string, string> = {
                    security: "#dc2626",
                    update: "#ea580c",
                    service: "#0284c7",
                    driver: "#6b7280",
                    performance: "#d97706",
                    other: "#64748b",
                  };
                  const typeColor = typeColors[issue.type] || "#64748b";
                  const statusColors: Record<string, string> = {
                    open: "#f59e0b",
                    pending: "#0284c7",
                    "in-progress": "#8b5cf6",
                    resolved: "#16a34a",
                  };
                  <div
                    title={issue.id}   // ← shows full ID on hover
                    style={{
                      fontWeight: 700, color: "#0f172a", fontSize: 12,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      maxWidth: 160
                    }}
                  >
                    {issue.id}
                  </div>
                  const statusColor = statusColors[issue.status] || "#64748b";
                  return (
                    <tr
                      key={rowKey}
                      onClick={() => setSelectedKey(rowKey)}
                      style={{
                        background: active ? "#dbeafe" : index % 2 === 0 ? "#ffffff" : "#f9fafb",
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <td style={{ ...td, width: "18%" }}>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{issue.id}</div>
                        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                          <span style={{ display: "inline-block", background: typeColor, color: "#fff", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                            {issue.type.charAt(0).toUpperCase() + issue.type.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td style={{ ...td, width: "12%" }}>
                        <SeverityBadge msg={issue.title} />
                      </td>
                      <td style={{ ...td, width: "auto", minWidth: 200 }}>
                        <div style={{ fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>{issue.title}</div>
                        <div style={{ fontSize: 12, color: "#9ca3af" }}>
                          {issue.auto_remediation_available ? "✓ Auto-remediation available" : "Manual action required"}
                        </div>
                      </td>
                      <td style={{ ...td, width: "14%" }}>{timeAgo(Number(issue.created_at))}</td>
                      <td style={{ ...td, width: "12%" }}>
                        <span style={pill(statusColor)}>{issue.status.charAt(0).toUpperCase() + issue.status.slice(1).replace("-", " ")}</span>
                      </td>
                      <td style={{ ...td, borderRight: "none", width: "10%" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "left", alignItems: "center" }}>
                          <div style={{ position: "relative", display: "inline-flex" }}>
                            <button
                              onClick={() => resolve.mutate(issue.id)}
                              disabled={resolve.isPending || issue.status === "resolved"}
                              title="Mark as resolved"
                              onMouseEnter={(e) => (e.currentTarget.nextElementSibling as HTMLDivElement).style.opacity = "1"}
                              onMouseLeave={(e) => (e.currentTarget.nextElementSibling as HTMLDivElement).style.opacity = "0"}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: issue.status === "resolved" ? "default" : "pointer",
                                fontSize: 14,
                                opacity: issue.status === "resolved" ? 0.4 : 1,
                              }}
                            >
                              👁️
                            </button>
                            <div
                              style={{
                                position: "absolute",
                                bottom: "-150%",
                                left: "50%",
                                transform: "translateX(-50%)",
                                background: "#0f172a",
                                color: "#e2e8f0",
                                padding: "4px 4px",
                                borderRadius: 4,
                                fontSize: 11,
                                whiteSpace: "nowrap",
                                opacity: 0,
                                transition: "opacity 0.2s",
                                pointerEvents: "none",
                                marginBottom: 4,
                                border: "1px solid #334155",
                              }}
                            >
                              {issue.status === "resolved" ? "Resolved" : "Resolve"}
                            </div>
                          </div>

                          <div style={{ position: "relative", display: "inline-flex" }}>
                            <button
                              onClick={() => escalate.mutate(issue.id)}
                              disabled={escalate.isPending}
                              title="Escalate to team"
                              onMouseEnter={(e) => (e.currentTarget.nextElementSibling as HTMLDivElement).style.opacity = "1"}
                              onMouseLeave={(e) => (e.currentTarget.nextElementSibling as HTMLDivElement).style.opacity = "0"}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontSize: 14,
                              }}
                            >
                              ⬆️
                            </button>
                            <div
                              style={{
                                position: "absolute",
                                bottom: "-150%",
                                left: "50%",
                                transform: "translateX(-50%)",
                                background: "#0f172a",
                                color: "#e2e8f0",
                                padding: "4px 8px",
                                borderRadius: 4,
                                fontSize: 11,
                                whiteSpace: "nowrap",
                                opacity: 0,
                                transition: "opacity 0.2s",
                                pointerEvents: "none",
                                marginBottom: 2,
                                border: "1px solid #334155",
                              }}
                            >
                              Escalate
                            </div>
                          </div>

                          {issue.auto_remediation_available && (
                            <div style={{ position: "relative", display: "inline-flex" }}>
                              <button
                                onClick={() => remediate.mutate(issue.id)}
                                disabled={remediate.isPending}
                                title="Execute auto-remediation"
                                onMouseEnter={(e) => (e.currentTarget.nextElementSibling as HTMLDivElement).style.opacity = "1"}
                                onMouseLeave={(e) => (e.currentTarget.nextElementSibling as HTMLDivElement).style.opacity = "0"}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  fontSize: 18,
                                }}
                              >
                                ⚙️
                              </button>
                              <div
                                style={{
                                  position: "absolute",
                                  bottom: "-150%",
                                  left: "50%",
                                  transform: "translateX(-50%)",
                                  background: "#0f172a",
                                  color: "#e2e8f0",
                                  padding: "4px 8px",
                                  borderRadius: 4,
                                  fontSize: 11,
                                  whiteSpace: "nowrap",
                                  opacity: 0,
                                  transition: "opacity 0.2s",
                                  pointerEvents: "none",
                                  marginBottom: 4,
                                  border: "1px solid #334155",
                                }}
                              >
                                Auto-Fix
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={tableFooter}>
            <span>Incident Queue</span>
            <span>{filtered.length} row(s)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getKey(issue: Issue) {
  return `${issue.id}-${issue.created_at}`;
}

function buildTimeline(issue: Issue | null) {
  if (!issue) {
    return [
      { title: "No incident selected", description: "Select an incident row to inspect details." },
    ];
  }
  const detected = new Date(Number(issue.created_at)).toLocaleString();
  const statusDisplay = issue.status.charAt(0).toUpperCase() + issue.status.slice(1).replace("-", " ");
  return [
    { title: "Detection", description: `${detected} | Issue detected on system.` },
    { title: "Classification", description: `Type: ${issue.type.charAt(0).toUpperCase() + issue.type.slice(1)} | Severity: ${issue.severity}` },
    { title: "Status", description: `Current: ${statusDisplay}` },
    { title: "Remediation", description: issue.auto_remediation_available ? "Auto-remediation available - click ⚙️ to execute." : "Manual action may be required." },
  ];
}

function buildSummary(issue: Issue | null) {
  if (!issue) return "Select an incident to view details.";
  const detected = new Date(Number(issue.created_at)).toLocaleString();
  const statusDisplay = issue.status.charAt(0).toUpperCase() + issue.status.slice(1).replace("-", " ");
  return [
    `Issue ID: ${issue.id}`,
    `Title: ${issue.title}`,
    `Type: ${issue.type.charAt(0).toUpperCase() + issue.type.slice(1)}`,
    `Severity: ${issue.severity.toUpperCase()}`,
    `Status: ${statusDisplay}`,
    `Detected At: ${detected}`,
    `Description: ${issue.description}`,
    `Remediation Available: ${issue.auto_remediation_available ? "Yes" : "No"}`,
    `Device: ${issue.device_id || "N/A"}`,
  ].join("\n");
}

const tableOuter = {
  border: "1px solid #d1d5db",
  borderRadius: 12,
  overflow: "hidden",
  background: "#ffffff",
  width: "100%",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
};

const panelOuter = {
  border: "1px solid #1f2937",
  borderRadius: 10,
  background: "#020617",
  padding: 12,
  display: "grid",
  gap: 10,
};

const panelSection = {
  border: "1px solid #1f2937",
  borderRadius: 10,
  padding: 12,
  background: "#111827",
};

const panelTitle = {
  margin: "0 0 12px",
  fontSize: 14,
  fontWeight: 600,
  color: "#e2e8f0",
};

const tableBase = {
  width: "100%",
  borderCollapse: "separate" as const,
  borderSpacing: 0,
  tableLayout: "fixed" as const,
};

const th = {
  textAlign: "left" as const,
  padding: "12px 14px",
  color: "#1f2937",
  fontSize: 13,
  letterSpacing: "0.03em",
  fontWeight: 700,
  borderBottom: "2px solid #e5e7eb",
  borderRight: "1px solid #f3f4f6",
  background: "#f9fafb",
};

const td = {
  padding: "12px 14px",
  borderBottom: "1px solid #f3f4f6",
  borderRight: "1px solid #f3f4f6",
  verticalAlign: "top" as const,
  color: "#374151",
  fontSize: 14,
};

const matrixTh = {
  textAlign: "left" as const,
  fontSize: 12,
  color: "#64748b",
  padding: "8px",
  borderBottom: "1px solid #e2e8f0",
  borderRight: "1px solid #e2e8f0",
  background: "#f1f5f9",
};

const matrixTd = {
  fontSize: 12,
  color: "#334155",
  padding: "8px",
  borderBottom: "1px solid #e2e8f0",
  borderRight: "1px solid #e2e8f0",
};

const timelineRow = {
  border: "1px solid #1f2937",
  borderRadius: 8,
  background: "#0f172a",
  padding: "10px 12px",
  color: "#e2e8f0",
};

const summaryBox = {
  width: "100%",
  minHeight: 130,
  border: "1px solid #1f2937",
  borderRadius: 8,
  padding: 10,
  fontSize: 12,
  color: "#e2e8f0",
  background: "#0f172a",
  resize: "vertical" as const,
};

const tableFooter = {
  borderTop: "2px solid #e5e7eb",
  background: "#f9fafb",
  color: "#6b7280",
  fontSize: 12,
  padding: "10px 14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const controlInput = {
  width: "100%",
  background: "#ffffff",
  border: "1px solid #d1d5db",
  color: "#1f2937",
  borderRadius: 8,
  height: 38,
  padding: "0 12px",
  fontSize: 13,
  outline: "none",
};

const lightControl = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  height: 36,
  padding: "0 10px",
  fontSize: 13,
  color: "#0f172a",
  background: "#fff",
  outline: "none",
};

function pill(color: string) {
  return {
    padding: "5px 12px",
    borderRadius: 999,
    background: `${color}20`,
    color,
    fontWeight: 700,
    fontSize: 12,
    display: "inline-flex",
    alignItems: "center",
  };
}

function btn(color: string) {
  return {
    background: color,
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: 8,
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 12,
  };
}
