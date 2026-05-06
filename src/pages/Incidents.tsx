import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchAlerts } from "@/api/alerts";
import SeverityBadge from "@/components/SeverityBadge";
import Spinner from "@/components/Spinner";
import { timeAgo } from "@/utils/time";

type AlertItem = {
  id: string;
  message: string;
  time: number | string;
  acknowledged?: boolean;
  resolved?: boolean;
  suggestion_id?: number | null;
  auto_healed?: boolean;
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
  const [recipientInput, setRecipientInput] = useState("noc@company.com,sre@company.com");
  const [escalationLevel, setEscalationLevel] = useState("L1");

  const { data: alerts = [], isLoading, refetch } = useQuery<AlertItem[]>({
    queryKey: ["alerts"],
    queryFn: fetchAlerts,
    refetchInterval: 5000,
  });

  const ack = useMutation({
    mutationFn: (time: string | number) =>
      fetch(`http://localhost:4000/alerts/${time}/ack`, { method: "POST" }),
    onSuccess: () => refetch(),
  });

  const escalate = useMutation({
    mutationFn: async (payload: { recipients: string; summary: string; incidentKey: string; level: string }) => {
      await new Promise((r) => setTimeout(r, 700));
      return payload;
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return alerts.filter((a) => {
      const textMatch = !q || a.id?.toLowerCase().includes(q) || a.message?.toLowerCase().includes(q);
      const status = a.acknowledged ? "acknowledged" : "open";
      const statusMatch = statusFilter === "all" || status === statusFilter;
      return textMatch && statusMatch;
    });
  }, [alerts, search, statusFilter]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedKey("");
      return;
    }
    if (!selectedKey || !filtered.some((a) => getKey(a) === selectedKey)) {
      setSelectedKey(getKey(filtered[0]));
    }
  }, [filtered, selectedKey]);

  const selected = useMemo(
    () => filtered.find((a) => getKey(a) === selectedKey) || null,
    [filtered, selectedKey]
  );

  const summaryText = useMemo(() => buildSummary(selected), [selected]);
  const timelineItems = useMemo(() => buildTimeline(selected), [selected]);
  const activeLevel = ESCALATION_MATRIX.find((m) => m.level === escalationLevel) || ESCALATION_MATRIX[0];

  const openCount = alerts.filter((a) => !a.acknowledged).length;
  const ackCount = alerts.filter((a) => !!a.acknowledged).length;

  if (isLoading) return <Spinner label="Loading incidents..." />;

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto auto minmax(0,1fr)", gap: 10, minHeight: "calc(100vh - 80px)", padding: "0 12px 12px" }}>
      <div style={{ padding: "20px 0 12px", borderBottom: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, color: "#0f172a" }}>Incidents</h1>
          <div style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
            Escalation-ready incident desk with matrix, timeline, and issue summary reporting.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={pill("#2563eb")}>{alerts.length} total</span>
          <span style={pill("#f59e0b")}>{openCount} open</span>
          <span style={pill("#16a34a")}>{ackCount} acknowledged</span>
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
          <option value="acknowledged">Acknowledged</option>
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.45fr) minmax(340px,1fr)", gap: 10, minHeight: 0 }}>
        <div style={{ ...tableOuter, display: "grid", gridTemplateRows: "auto minmax(0,1fr) auto", minHeight: 0 }}>
          <table style={tableBase}>
            <thead>
              <tr>
                <th style={{ ...th, width: 180 }}>Incident</th>
                <th style={{ ...th, width: 140 }}>Severity</th>
                <th style={th}>Detection Summary</th>
                <th style={{ ...th, width: 160 }}>Detected</th>
                <th style={{ ...th, width: 140 }}>Status</th>
                <th style={{ ...th, borderRight: "none", width: 110 }}>Action</th>
              </tr>
            </thead>
          </table>

          <div style={{ overflowY: "auto", minHeight: 0 }}>
            <table style={tableBase}>
              <tbody>
                {filtered.map((a, index) => {
                  const rowKey = getKey(a);
                  const active = rowKey === selectedKey;
                  return (
                    <tr
                      key={rowKey}
                      onClick={() => setSelectedKey(rowKey)}
                      style={{
                        background: active ? "#e0ecff" : index % 2 === 0 ? "#ffffff" : "#f8fafc",
                        cursor: "pointer",
                      }}
                    >
                      <td style={{ ...td, width: 180 }}>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{a.id}</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Signal #{String(a.time).slice(-6)}</div>
                      </td>
                      <td style={{ ...td, width: 140 }}>
                        <SeverityBadge msg={a.message} />
                      </td>
                      <td style={td}>
                        <div style={{ fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>{a.message}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          {a.auto_healed ? "Auto-heal attached" : "Awaiting escalation / remediation"}
                        </div>
                      </td>
                      <td style={{ ...td, width: 160 }}>{timeAgo(Number(a.time))}</td>
                      <td style={{ ...td, width: 140 }}>
                        <span style={pill(a.acknowledged ? "#16a34a" : "#f59e0b")}>{a.acknowledged ? "Acknowledged" : "Open"}</span>
                      </td>
                      <td style={{ ...td, borderRight: "none", width: 110 }}>
                        {!a.acknowledged ? (
                          <button onClick={() => ack.mutate(a.time)} disabled={ack.isPending} style={btn("#f59e0b")}>
                            ACK
                          </button>
                        ) : (
                          <span style={{ color: "#64748b", fontSize: 12 }}>Done</span>
                        )}
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

        <div style={{ ...panelOuter, minHeight: 0, overflowY: "auto" }}>
          <section style={panelSection}>
            <h3 style={panelTitle}>Escalation Matrix</h3>
            <table style={{ ...tableBase, tableLayout: "auto" as const }}>
              <thead>
                <tr>
                  <th style={matrixTh}>Level</th>
                  <th style={matrixTh}>Trigger</th>
                  <th style={matrixTh}>Owner</th>
                  <th style={{ ...matrixTh, borderRight: "none" }}>SLA</th>
                </tr>
              </thead>
              <tbody>
                {ESCALATION_MATRIX.map((m) => (
                  <tr key={m.level} style={{ background: m.level === escalationLevel ? "#ecfeff" : "#fff" }}>
                    <td style={matrixTd}>{m.level}</td>
                    <td style={matrixTd}>{m.trigger}</td>
                    <td style={matrixTd}>{m.owner}</td>
                    <td style={{ ...matrixTd, borderRight: "none" }}>{m.targetSla}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section style={panelSection}>
            <h3 style={panelTitle}>What Happened</h3>
            <div style={{ display: "grid", gap: 8 }}>
              {timelineItems.map((t) => (
                <div key={t.title} style={timelineRow}>
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{t.description}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={panelSection}>
            <h3 style={panelTitle}>Issue Summary Report</h3>
            <textarea value={summaryText} readOnly style={summaryBox} />
          </section>

          <section style={panelSection}>
            <h3 style={panelTitle}>Escalate to Agents by Email</h3>
            <div style={{ display: "grid", gap: 8 }}>
              <select value={escalationLevel} onChange={(e) => setEscalationLevel(e.target.value)} style={lightControl}>
                {ESCALATION_MATRIX.map((m) => (
                  <option key={m.level} value={m.level}>
                    {m.level} - {m.owner}
                  </option>
                ))}
              </select>
              <input
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                placeholder="ops@company.com,sre@company.com"
                style={lightControl}
              />
              <button
                style={btn("#2563eb")}
                disabled={!selected || escalate.isPending}
                onClick={() =>
                  selected &&
                  escalate.mutate({
                    recipients: recipientInput,
                    summary: summaryText,
                    incidentKey: getKey(selected),
                    level: escalationLevel,
                  })
                }
              >
                {escalate.isPending ? "Escalating..." : "Escalate Incident"}
              </button>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Route: {activeLevel.channel} | Target SLA: {activeLevel.targetSla}
              </div>
              {escalate.isSuccess && (
                <div style={{ fontSize: 12, color: "#166534", background: "#dcfce7", borderRadius: 8, padding: "8px 10px" }}>
                  Escalation payload prepared and dispatched for {escalate.data.incidentKey}.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function getKey(a: AlertItem) {
  return `${a.id}-${a.time}`;
}

function buildTimeline(alert: AlertItem | null) {
  if (!alert) {
    return [
      { title: "No incident selected", description: "Select an incident row to inspect process history." },
    ];
  }
  const detected = new Date(Number(alert.time)).toLocaleString();
  return [
    { title: "Detection", description: `${detected} | Alert signal captured from endpoint monitor.` },
    { title: "Triage", description: alert.acknowledged ? "Operator acknowledged incident and began triage." : "Awaiting operator acknowledgement and triage start." },
    { title: "Remediation", description: alert.auto_healed ? "Auto-heal recommendation linked and available for execution." : "No automated remediation linked yet." },
    { title: "Escalation", description: "Use escalation matrix to dispatch the summary to on-call agents by email." },
  ];
}

function buildSummary(alert: AlertItem | null) {
  if (!alert) return "Select an incident to generate summary report.";
  const detected = new Date(Number(alert.time)).toLocaleString();
  const state = alert.acknowledged ? "ACKNOWLEDGED" : "OPEN";
  const remediation = alert.auto_healed ? "Auto-heal suggestion is linked." : "No auto-heal suggestion linked.";
  return [
    `Incident ID: ${alert.id}`,
    `Detected At: ${detected}`,
    `Current Status: ${state}`,
    `Detection Summary: ${alert.message}`,
    `Remediation Context: ${remediation}`,
    "Impact Assessment: Potential degradation on monitored service and/or endpoint health.",
    "Recommended Next Step: Escalate to assigned on-call owner per matrix and confirm recovery validation window.",
  ].join("\n");
}

const tableOuter = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  overflow: "hidden",
  background: "#ffffff",
  width: "100%",
};

const panelOuter = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  background: "#ffffff",
  padding: 12,
  display: "grid",
  gap: 10,
};

const panelSection = {
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: 10,
  background: "#f8fafc",
};

const panelTitle = {
  margin: "0 0 10px",
  fontSize: 14,
  color: "#0f172a",
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
  color: "#475569",
  fontSize: 13,
  letterSpacing: "0.03em",
  fontWeight: 700,
  borderBottom: "1px solid #e2e8f0",
  borderRight: "1px solid #e2e8f0",
  background: "#f8fafc",
};

const td = {
  padding: "12px 14px",
  borderBottom: "1px solid #e2e8f0",
  borderRight: "1px solid #e2e8f0",
  verticalAlign: "top" as const,
  color: "#334155",
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
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  background: "#fff",
  padding: "8px 10px",
};

const summaryBox = {
  width: "100%",
  minHeight: 130,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: 10,
  fontSize: 12,
  color: "#334155",
  background: "#fff",
  resize: "vertical" as const,
};

const tableFooter = {
  borderTop: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#64748b",
  fontSize: 12,
  padding: "10px 14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const controlInput = {
  width: "100%",
  background: "#0f172a",
  border: "1px solid #334155",
  color: "#e2e8f0",
  borderRadius: 8,
  height: 38,
  padding: "0 12px",
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

