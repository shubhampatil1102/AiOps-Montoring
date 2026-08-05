import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { runScript, fetchJobs, fetchLibrary, runLibrary, fetchApprovals, cancelJob, deleteJob } from "@/api/scripts";
import { fetchDevices } from "@/api/devices";
import GlassCard from "../components/GlassCard";
import { usePermissions } from "@/hooks/usePermissions";

type ScriptLibrary = {
    id: number;
    name: string;
    description: string;
};

type Job = {
    id: number;
    device_id: string;
    status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";
    output?: string;
    error?: string;
    created_at: number;
    started_at?: number;
    finished_at?: number;
};


export default function Scripts() {

    const [script, setScript] = useState("");
    const [device, setDevice] = useState("");
    const [activeJob, setActiveJob] = useState<number | null>(null);

    const queryClient = useQueryClient();
    const { can } = usePermissions();
    const canExecute = can("devices", "execute");

    /* ---------------- DATA ---------------- */

    const { data: devices = [] } = useQuery({
        queryKey: ["devices"],
        queryFn: fetchDevices
    });

    const { data: jobs = [] } = useQuery<Job[]>({
        queryKey: ["jobs"],
        queryFn: fetchJobs,
        refetchInterval: 2000
    });

    const { data: library = [] } = useQuery<ScriptLibrary[]>({
        queryKey: ["library"],
        queryFn: fetchLibrary
    });


    useEffect(() => {
        if (!activeJob) return;

        const job = jobs.find((j: any) => j.id === activeJob);

        if (job && job.status !== "PENDING" && job.status !== "RUNNING") {
            setActiveJob(null); // stop loader
        }
    }, [jobs]);



    /* ---------------- RUN SCRIPT ---------------- */

    // const run = useMutation({
    //     mutationFn: () => runScript(device, script),
    //     onSuccess: () => setScript("")
    // });

    const run = useMutation({
        mutationFn: () => runScript(device, script),
        onSuccess: (data: any) => {
            setActiveJob(data.job_id);   // 👈 job start loader
            setScript("");
        }
    });


    const runLib = useMutation({
        mutationFn: ({ device, script_id }: any) =>
            runLibrary(device, script_id)
    });

    const cancel = useMutation({
        mutationFn: (jobId: number) => cancelJob(jobId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] })
    });

    const remove = useMutation({
        mutationFn: (jobId: number) => deleteJob(jobId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] })
    });

    const { data: approvals = [] } = useQuery({
        queryKey: ["approvals"],
        queryFn: fetchApprovals,
        refetchInterval: 3000
    });

    /* ---------------- HELPERS ---------------- */

    function duration(start?: number, end?: number) {
        if (!start || !end) return "-";

        const sec = Math.floor((end - start) / 1000);

        if (sec < 60) return sec + "s";

        const m = Math.floor(sec / 60);
        const s = sec % 60;

        if (m < 60) return `${m}m ${s}s`;

        const h = Math.floor(m / 60);
        return `${h}h ${m % 60}m`;
    }


    function formatTime(t: number) {
        if (!t) return "-";
        return new Date(Number(t)).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
    }

    function statusBadge(status: string) {
        const map: any = {
            SUCCESS: "#22c55e",
            FAILED: "#ef4444",
            RUNNING: "#f59e0b",
            PENDING: "#64748b",
            CANCELLED: "#94a3b8"
        }

        return {
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            background: map[status] + "22",
            color: map[status],
            border: "1px solid " + map[status] + "55"
        }
    }

    /* ---------------- UI ---------------- */

    return (
        <div style={{ padding: 25, display: "grid", gap: 20 }}>

            <h1 style={{ fontSize: 28 }}>Remote Scripts </h1>

            {/* RUN CUSTOM SCRIPT */}
            <GlassCard>
                <div className="section-title">Run Custom Script</div>

                <select value={device} onChange={e => setDevice(e.target.value)} style={input}>
                    <option value="">Select device</option>
                    {devices.map((d: any) => (
                        <option key={d.id}>{d.id}</option>
                    ))}
                </select>

                <textarea
                    placeholder="Write PowerShell script..."
                    value={script}
                    onChange={e => setScript(e.target.value)}
                    style={{ ...input, height: 160, fontFamily: "monospace", marginTop: 12 }}
                />

                <button
                    onClick={() => run.mutate()}
                    style={btn}
                    disabled={!device || !script || activeJob !== null}
                >
                    {activeJob ? "Running..." : "Run Script"} 
                </button>
            </GlassCard>


            {/* QUICK ACTIONS */}
            <GlassCard>
                <h3 style={{ marginBottom: 12 }}>Quick Actions</h3>

                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
                    gap: 16,
                    alignItems: "start"

                }}>


                    {library.length === 0 && (
                        <div style={{ opacity: .6 }}>No quick actions available</div>
                    )}

                    {library.map((s: any) => (
                        <div
                            key={s.id}
                            className="panel"
                            style={{
                                padding: 16,
                                borderRadius: 14,
                                background: "linear-gradient(135deg,#f8fafc,#eef2ff)",
                                border: "1px solid #e5e7eb",
                                transition: "0.25s",
                                cursor: "pointer"
                            }}
                            onMouseEnter={(e: any) => e.currentTarget.style.transform = "translateY(-4px)"}
                            onMouseLeave={(e: any) => e.currentTarget.style.transform = "translateY(0px)"}
                        >
                            <div style={{ fontWeight: 600 }}>{s.name}</div>

                            <div style={{
                                fontSize: 12,
                                opacity: .7,
                                margin: "6px 0 12px"
                            }}>
                                {s.description}
                            </div>

                            <button
                                style={btn}
                                disabled={!device || runLib.isPending}
                                onClick={() => runLib.mutate({ device, script_id: s.id })}
                            >
                                Run
                            </button>
                        </div>
                    ))}
                </div>
            </GlassCard>




            {/* ACTIVE EXECUTIONS */}
            <div style={card}>
                <h3 style={{ marginBottom: 12 }}>🟡 Active Executions</h3>

                {jobs.filter((j: any) => j.status === "RUNNING" || j.status === "PENDING").length === 0 && (
                    <div style={{ opacity: .6 }}>No active scripts running</div>
                )}

                {jobs
                    .filter((j: any) => j.status === "RUNNING" || j.status === "PENDING")
                    .map((j: Job) => (
                        <div key={j.id} className="panel" style={{
                            padding: 14,
                            marginBottom: 12,
                            background: "linear-gradient(180deg,#ffffff,#f8fafc)"


                        }}>


                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <b>{j.device_id}</b>
                                <div style={{ fontSize: 12, opacity: .7 }}>
                                    Running for {duration(j.started_at || j.created_at, Date.now())}

                                </div>
                                <span style={statusBadge(j.status)}>
                                    {j.status}

                                </span>
                            </div>

                            <div style={{
                                height: 6,
                                background: "#fde68a",
                                borderRadius: 10,
                                overflow: "hidden",
                                marginTop: 8
                            }}>
                                <div style={{
                                    width: "100%",
                                    height: "100%",
                                    background: "#f59e0b",
                                    animation: "loading 1.2s linear infinite"
                                }} />
                            </div>

                            {canExecute && (
                                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                                    <button
                                        style={{ ...smallBtn, borderColor: "#f59e0b", color: "#b45309" }}
                                        disabled={cancel.isPending}
                                        onClick={() => {
                                            if (confirm(`Stop stuck job #${j.id} on ${j.device_id}?`)) {
                                                cancel.mutate(j.id);
                                            }
                                        }}
                                    >
                                        Stop
                                    </button>

                                    <button
                                        style={{ ...smallBtn, borderColor: "#ef4444", color: "#b91c1c" }}
                                        disabled={remove.isPending}
                                        onClick={() => {
                                            if (confirm(`Delete job #${j.id} from the database? This cannot be undone.`)) {
                                                remove.mutate(j.id);
                                            }
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            )}

                        </div>
                    ))}
            </div>

            {/* EXECUTION HISTORY */}
            <div style={card}>
                <h2 style={{ marginBottom: 12, fontFamily: "arial" }}>📜 Execution History</h2>

                <div style={{ maxHeight: 450, overflowY: "auto" }}>

                    {jobs
                        .filter((j: any) => j.status === "SUCCESS" || j.status === "FAILED" || j.status === "CANCELLED")
                        .sort((a: any, b: any) => b.id - a.id)
                        .map((j: Job) => (
                            <div key={j.id} className="panel" style={{
                                padding: 14,
                                marginBottom: 12,
                                background: "linear-gradient(190deg,#ffffff,#f8fafc)"
                            }}>


                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <b>{j.device_id}</b>

                                    <span style={statusBadge(j.status)}>
                                        {j.status}
                                    </span>
                                </div>

                                <div style={{ fontSize: 12, opacity: .6, marginTop: 2 }}>
                                    {formatTime(j.finished_at || j.created_at)}
                                    {" • "}
                                    Duration: {duration(j.started_at || j.created_at, j.finished_at)}
                                </div>

                                {j.output && (
                                    <pre style={{
                                        background: "#020617",
                                        color: "#e5e7eb",
                                        padding: 12,
                                        marginTop: 10,
                                        borderRadius: 10,
                                        fontSize: 13,
                                        lineHeight: 1.5,
                                        boxShadow: "inset 0 0 0 1px #1e293b"
                                    }}>
                                        {j.output}
                                    </pre>
                                )}

                                {j.error && (
                                    <pre style={{
                                        background: "#020617",
                                        color: "#e5e7eb",
                                        padding: 12,
                                        marginTop: 10,
                                        borderRadius: 10,
                                        fontSize: 13,
                                        lineHeight: 1.5,
                                        boxShadow: "inset 0 0 0 1px #1e293b"
                                    }}>
                                        {j.error}
                                    </pre>
                                )}

                                {canExecute && (
                                    <div style={{ display: "flex", marginTop: 10 }}>
                                        <button
                                            style={{ ...smallBtn, borderColor: "#ef4444", color: "#b91c1c" }}
                                            disabled={remove.isPending}
                                            onClick={() => {
                                                if (confirm(`Delete job #${j.id} from the database? This cannot be undone.`)) {
                                                    remove.mutate(j.id);
                                                }
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                )}

                            </div>
                        ))}

                </div>
            </div>

            {/* APPROVAL TIMELINE */}
            <div style={card}>
                <h3>Approval Timeline</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 15 }}>

                    <button style={btn}>ASC</button>
                    <button style={btn}>DESC</button>
                    <button style={btn}>Clear</button>
                </div>

                <div style={{ maxHeight: 420, overflowY: "auto" }}>

                    {approvals.length === 0 && (
                        <div style={{ opacity: .6 }}>No approval actions yet</div>
                    )}

                    {approvals.map((a: any) => (
                        <div key={a.time} style={{
                            borderBottom: "1px solid #eee",
                            padding: "12px 0"
                        }}>

                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <b>Job #{a.job_id}</b>



                                <span style={{
                                    color:
                                        a.status === "APPROVED" ? "#22c55e" :
                                            a.status === "REJECTED" ? "#ef4444" : "#64748b",
                                    fontWeight: 600
                                }}>
                                    {a.status}
                                </span>
                            </div>

                            <div style={{ fontSize: 13, marginTop: 3 }}>
                                User: <b>{a.approval_user}</b>
                                <div>
                                    Script : <b>{a.script}</b>
                                </div>
                                <div>
                                    Output : <b>{a.output || "No output"}</b>
                                </div>

                            </div>

                            {a.message && (
                                <div style={{ fontSize: 13, opacity: .8 }}>
                                    {a.message}
                                </div>
                            )}

                            <div style={{ fontSize: 11, opacity: .6 }}>
                                {new Date(Number(a.time)).toLocaleString()}
                            </div>

                        </div>
                    ))}
                </div>
            </div>


        </div >
    );
}

/* ---------- styles ---------- */

const card: React.CSSProperties = {
    padding: 22,
    borderRadius: 16,
    background: "rgba(255,255,255,0.6)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(255,255,255,0.4)",
    boxShadow: "0 12px 28px rgba(0,0,0,0.08)",
};


const input = {
    width: "100%",
    padding: 10,
    marginTop: 10,
    borderRadius: 8,
    border: "1px solid #e5e7eb"
};

const btn = {
    marginTop: 10,
    padding: "10px 16px",
    background: "#437df8",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer"
};

const smallBtn: React.CSSProperties = {
    padding: "6px 12px",
    background: "transparent",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer"
};
