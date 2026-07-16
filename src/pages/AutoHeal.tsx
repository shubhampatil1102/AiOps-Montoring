import { Fragment, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Activity, Sparkles } from "lucide-react";
import { API_URL } from "@/api/config";
import AutoHealPage from "./AutoHealPage";

type Suggestion = {
  id: number;
  device_id: string;
  alert_type: string;
  reason: string;
  suggested_action: string;
  created_at: string | number;
  script: string;
};

type TimelineEntry = {
  job_id: string;
  device_id: string;
  status: string;
  approval_status?: string;
  approval_user?: string;
  started_at?: string | number;
  created_at?: string | number;
  output?: string;
  agent_message?: string;
};

export default AutoHealPage;

function AutoHealLegacy() {
  const { data: suggestions = [], refetch } = useQuery({
    queryKey: ["heal"],
    queryFn: async () => {
      const r = await fetch(`${API_URL}/heal/suggestions`);
      return r.json();
    },
    refetchInterval: 4000
  });

  const approve = useMutation({
    mutationFn: (id: number) =>
      fetch(`${API_URL}/heal/approve/${id}`, { method: "POST" }),
    onSuccess: () => refetch()
  });

  const reject = useMutation({
    mutationFn: (id: number) =>
      fetch(`${API_URL}/heal/reject/${id}`, { method: "POST" }),
    onSuccess: () => refetch()
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ["heal-timeline"],
    queryFn: async () => {
      const r = await fetch(`${API_URL}/heal/timeline`);
      return r.json();
    },
    refetchInterval: 3000
  });

  const [activeView, setActiveView] = useState<"actions" | "running" | "completed" | "failed">("actions");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOne, setFilterOne] = useState("all");
  const [filterTwo, setFilterTwo] = useState("all");

  const processRows = (timeline as TimelineEntry[]).filter((t) => String(t.approval_status || "").toUpperCase() === "APPROVED");
  const running = processRows.filter((t) => isRunningProcess(t));
  const completed = processRows.filter((t) => isCompletedProcess(t));
  const failed = processRows.filter((t) => isFailedProcess(t));

  const tabButton = (active: boolean) => ({
    height: 52,
    padding: "0 22px",
    borderRadius: 28,
    border: active ? "1px solid #3b82f6" : "1px solid #334155",
    background: active ? "#1e293b" : "#111827",
    color: active ? "#dbeafe" : "#94a3b8",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    whiteSpace: "nowrap" as const,
    flex: "0 0 auto",
    transition: "all .2s ease"
  });

  const tableOuter = {
    border: "1px solid #334155",
    borderRadius: 10,
    overflow: "hidden",
    background: "#1f2937",
    width: "100%"
  };

  const tableBase = {
    width: "100%",
    borderCollapse: "separate" as const,
    borderSpacing: 0,
    tableLayout: "fixed" as const
  };

  const bodyScroll = {
    overflowY: "auto" as const,
    height: "100%"
  };

  const tableFooter = {
    borderTop: "1px solid #334155",
    background: "#111827",
    color: "#94a3b8",
    fontSize: 12,
    padding: "10px 14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  };

  const th = {
    textAlign: "left" as const,
    padding: "12px 14px",
    color: "#94a3b8",
    fontSize: 13,
    letterSpacing: "0.04em",
    fontWeight: 700,
    borderBottom: "1px solid #334155",
    borderRight: "1px solid #334155",
    background: "#111827"
  };

  const td = {
    padding: "12px 14px",
    borderBottom: "1px solid #334155",
    borderRight: "1px solid #334155",
    verticalAlign: "top" as const,
    color: "#cbd5e1",
    fontSize: 14,
    overflow: "hidden",
    textOverflow: "ellipsis"
  };

  const pill = (color: string) => ({
    padding: "5px 12px",
    borderRadius: 999,
    background: `${color}20`,
    color,
    fontWeight: 700,
    fontSize: 12,
    display: "inline-flex",
    alignItems: "center",
  });

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto auto 1fr", gap: 10, height: "calc(100vh - 80px)", padding: "0 12px 12px" }}>
      <div style={{ padding: "20px 0 12px", borderBottom: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, color: "#444545" }}>
              {activeView === "actions"
                ? "AI Suggested Actions"
                : activeView === "completed"
                  ? "Completed Processes"
                  : activeView === "failed"
                    ? "Failed Processes"
                    : "Running Processes"}
            </h2>
            <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
              {activeView === "actions"
                ? "Approve or reject auto-heal recommendations from the agent."
                : activeView === "completed"
                  ? "Review completed auto-heal jobs and their outputs."
                  : activeView === "failed"
                    ? "Inspect failed jobs and review failure output."
                    : "Track jobs that are currently in progress."
              }
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={pill("#2563eb")}>{suggestions.length} suggestions</span>
            <span style={pill("#efc53c")}>{running.length} running</span>
            <span style={pill("#22c55e")}>{completed.length} completed</span>
            <span style={pill("#ef4444")}>{failed.length} failed</span>
          </div>
      </div>

      <div style={{ padding: "0 0 4px", display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => setActiveView("actions")} style={tabButton(activeView === "actions")}>
            <Sparkles size={14} />
            AI Suggested Actions
          </button>
          <button onClick={() => setActiveView("running")} style={tabButton(activeView === "running")}>
            <Activity size={14} />
            Running Processes
          </button>
          <button onClick={() => setActiveView("completed")} style={tabButton(activeView === "completed")}>
            <Activity size={14} />
            Completed Processes
          </button>
          <button onClick={() => setActiveView("failed")} style={tabButton(activeView === "failed")}>
            <Activity size={14} />
            Failed Processes
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(220px,1fr) repeat(2,minmax(150px,220px))", gap: 10 }}>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={activeView === "actions" ? "Search device, alert, action..." : "Search device, job id, output..."}
            style={controlInput}
          />
          <select
            value={filterOne}
            onChange={(e) => setFilterOne(e.target.value)}
            style={activeView === "actions" ? controlInput : disabledControlInput}
            disabled={activeView !== "actions"}
          >
            {activeView !== "actions" && <option value="all">Filter disabled for process tabs</option>}
            {activeView === "actions" ? (
              <>
                <option value="all">All Alerts</option>
                <option value="cpu">CPU</option>
                <option value="memory">Memory</option>
                <option value="disk">Disk</option>
                <option value="network">Network</option>
              </>
            ) : (
              <>
                <option value="all">All Status</option>
                <option value="RUNNING">Running</option>
                <option value="DONE">Done</option>
                <option value="COMPLETED">Completed</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILED">Failed</option>
              </>
            )}
          </select>
          <select
            value={filterTwo}
            onChange={(e) => setFilterTwo(e.target.value)}
            style={activeView === "actions" ? controlInput : disabledControlInput}
            disabled={activeView !== "actions"}
          >
            {activeView !== "actions" && <option value="all">Filter disabled for process tabs</option>}
            {activeView === "actions" ? (
              <>
                <option value="all">All Actions</option>
                <option value="restart">Restart</option>
                <option value="kill">Kill</option>
                <option value="cleanup">Cleanup</option>
              </>
            ) : (
              <>
                <option value="all">Approved only</option>
              </>
            )}
          </select>
        </div>
      </div>

      <div style={{ width: "100%", minHeight: 0, overflow: "hidden", borderRadius: 12, display: "grid" }}>
        {activeView === "actions" ? renderSuggestionTable() : renderProcessTable(activeView)}
      </div>
    </div>
  );

  function renderSuggestionTable() {
    const q = searchTerm.trim().toLowerCase();
    const filtered = (suggestions as Suggestion[]).filter((s) => {
      const textMatch =
        !q ||
        s.device_id?.toLowerCase().includes(q) ||
        s.alert_type?.toLowerCase().includes(q) ||
        s.reason?.toLowerCase().includes(q) ||
        s.suggested_action?.toLowerCase().includes(q);
      const alertMatch = filterOne === "all" || s.alert_type?.toLowerCase().includes(filterOne.toLowerCase());
      const actionMatch = filterTwo === "all" || s.suggested_action?.toLowerCase().includes(filterTwo.toLowerCase());
      return textMatch && alertMatch && actionMatch;
    });

    if (filtered.length === 0) {
      return <div style={{ opacity: .7, color: "#94a3b8" }}>No AI suggested actions available right now.</div>;
    }

    return (
      <div style={{ ...tableOuter, height: "100%", display: "grid", gridTemplateRows: "auto 1fr", minHeight: 0 }}>
        <table style={tableBase}>
          <thead>
            <tr>
              <th style={{ ...th, width: 48 }}>#</th>
              <th style={{ ...th, width: "22%" }}>Device</th>
              <th style={{ ...th, width: "24%" }}>Alert</th>
              <th style={{ ...th, width: "22%" }}>Action</th>
              <th style={{ ...th, width: "14%" }}>Created</th>
              <th style={{ ...th, borderRight: "none", width: 180 }}>Controls</th>
            </tr>
          </thead>
        </table>
        <div style={bodyScroll}>
          <table style={tableBase}>
            <tbody>
              {filtered.map((s: Suggestion, index: number) => (
                <Fragment key={s.id}>
                  <tr style={{ background: index % 2 === 0 ? "#1f2937" : "#263244" }}>
                    <td style={{ ...td, width: 48, fontWeight: 700, color: "#f8fafc" }}>{index + 1}</td>
                    <td style={{ ...td, width: "22%" }}>
                      <div style={{ fontWeight: 700, color: "#e2e8f0" }}>{s.device_id}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                        {new Date(Number(s.created_at)).toLocaleString()}
                      </div>
                    </td>
                    <td style={{ ...td, width: "24%" }}>
                      <div style={{ color: "#f87171", fontWeight: 700 }}>{s.alert_type}</div>
                      <div style={{ marginTop: 6, fontSize: 13, color: "#a5b4fc" }}>{s.reason}</div>
                    </td>
                    <td style={{ ...td, width: "22%" }}>
                      <div style={{ fontWeight: 600, color: "#dbeafe" }}>{s.suggested_action}</div>
                    </td>
                    <td style={{ ...td, width: "14%" }}>{new Date(Number(s.created_at)).toLocaleTimeString()}</td>
                    <td style={{ ...td, borderRight: "none", width: 180 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button onClick={() => approve.mutate(s.id)} disabled={approve.isPending} style={btn("#22c55e")}>Approve</button>
                        <button onClick={() => reject.mutate(s.id)} disabled={reject.isPending} style={btn("#ef4444")}>Reject</button>
                      </div>
                    </td>
                  </tr>
                  <tr style={{ background: index % 2 === 0 ? "#1b2535" : "#202d3f" }}>
                    <td style={{ ...td, borderRight: "none" }} colSpan={6}>
                      <div style={{ marginBottom: 8, fontSize: 12, letterSpacing: "0.03em", color: "#93c5fd", textTransform: "uppercase" }}>
                        Script Preview
                      </div>
                      <pre style={{ margin: 0, background: "#0f172a", border: "1px solid #334155", color: "#d1e7ff", padding: 12, borderRadius: 8, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12 }}>
                        {s.script}
                      </pre>
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div style={tableFooter}>
          <span>AI Suggested Actions</span>
          <span>{filtered.length} row(s)</span>
        </div>
      </div>
    );
  }

  function renderProcessTable(view: "running" | "completed" | "failed") {
    const rows = processRows.filter((t) => {
      if (view === "running") return isRunningProcess(t);
      if (view === "completed") return isCompletedProcess(t);
      return isFailedProcess(t);
    });
    const q = searchTerm.trim().toLowerCase();
    const filtered = rows.filter((t) => {
      const textMatch =
        !q ||
        t.device_id?.toLowerCase().includes(q) ||
        t.job_id?.toLowerCase().includes(q) ||
        String(t.output || "").toLowerCase().includes(q);
      return textMatch;
    });

    if (filtered.length === 0) {
      return <div style={{ opacity: .7, color: "#94a3b8" }}>No process activity found.</div>;
    }

    return (
      <div style={{ ...tableOuter, height: "100%", display: "grid", gridTemplateRows: "auto 1fr", minHeight: 0 }}>
        <table style={tableBase}>
          <thead>
            <tr>
              <th style={{ ...th, width: "24%" }}>Device</th>
              <th style={{ ...th, width: "14%" }}>Status</th>
              <th style={{ ...th, width: "20%" }}>Started</th>
              <th style={{ ...th, width: "22%" }}>Approval</th>
              <th style={{ ...th, borderRight: "none" }}>Output</th>
            </tr>
          </thead>
        </table>
        <div style={bodyScroll}>
          <table style={tableBase}>
            <tbody>
              {filtered.map((t: TimelineEntry, index: number) => (
                <Fragment key={t.job_id}>
                  <tr style={{ background: index % 2 === 0 ? "#1f2937" : "#263244" }}>
                    <td style={{ ...td, width: "24%" }}>
                      <div style={{ fontWeight: 700, color: "#e2e8f0" }}>{t.device_id}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{t.job_id}</div>
                    </td>
                    <td style={{ ...td, width: "14%" }}>
                      <span style={pill(t.status === "RUNNING" ? "#f59e0b" : t.approval_status === "APPROVED" ? "#16a34a" : "#ef4444")}>{t.status}</span>
                    </td>
                    <td style={{ ...td, width: "20%" }}>{new Date(Number(t.started_at || t.created_at)).toLocaleString()}</td>
                    <td style={{ ...td, width: "22%" }}>{t.approval_user ? `${t.approval_user} (${t.approval_status})` : "Pending"}</td>
                    <td style={{ ...td, borderRight: "none" }}>
                      {t.output ? (
                        <span style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "#e2e8f0" }}>{String(t.output).slice(0, 120)}</span>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>No output</span>
                      )}
                    </td>
                  </tr>
                  <tr style={{ background: index % 2 === 0 ? "#1b2535" : "#202d3f" }}>
                    <td colSpan={5} style={{ ...td, borderRight: "none" }}>
                      {t.agent_message && (
                        <div style={{ marginBottom: 8, color: "#fca5a5", fontSize: 13 }}>{t.agent_message}</div>
                      )}
                      {t.output && (
                        <pre style={{ margin: 0, background: "#0f172a", border: "1px solid #334155", color: "#d1fae5", padding: 12, borderRadius: 8, overflowX: "auto", fontSize: 12 }}>
                          {t.output}
                        </pre>
                      )}
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div style={tableFooter}>
          <span>{view === "running" ? "Running Processes" : view === "completed" ? "Completed Processes" : "Failed Processes"}</span>
          <span>{filtered.length} row(s)</span>
        </div>
      </div>
    );
  }
}

function isCompletedProcess(t: TimelineEntry) {
  const status = String(t.status || "").toUpperCase();
  return status === "DONE" || status === "COMPLETED" || status === "SUCCESS";
}

function isFailedProcess(t: TimelineEntry) {
  const status = String(t.status || "").toUpperCase();
  return status === "FAILED" || status === "ERROR";
}

function isRunningProcess(t: TimelineEntry) {
  if (isCompletedProcess(t) || isFailedProcess(t)) return false;
  const status = String(t.status || "").toUpperCase();
  return status === "RUNNING" || status === "PENDING" || status === "IN_PROGRESS";
}

const controlInput = {
  width: "100%",
  background: "#0f172a",
  border: "1px solid #334155",
  color: "#e2e8f0",
  borderRadius: 8,
  height: 38,
  padding: "0 12px",
  outline: "none"
};

const disabledControlInput = {
  ...controlInput,
  background: "#0b1220",
  color: "#64748b",
  border: "1px solid #263244",
  cursor: "not-allowed",
  opacity: 0.7
};

function btn(color: string) {
  return {
    background: color,
    color: "white",
    border: "none",
    padding: "6px 14px",
    borderRadius: 8,
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 12
  };
}
