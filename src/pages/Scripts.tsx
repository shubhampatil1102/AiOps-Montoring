import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { runScript, fetchJobs } from "@/api/scripts";
import { fetchDevices } from "@/api/devices";
import { fetchLibrary, runLibrary } from "@/api/scripts";
import { colors } from "../theme";


export default function Scripts() {

    const [script, setScript] = useState("");
    const [device, setDevice] = useState("");

    const { data: devices = [] } = useQuery({
        queryKey: ["devices"],
        queryFn: fetchDevices
    });

    const { data: jobs = [] } = useQuery({
        queryKey: ["jobs"],
        queryFn: fetchJobs,
        refetchInterval: 3000
    });
    const log: React.CSSProperties = {
        background: "#020617",
        padding: 12,
        borderRadius: 8,
        fontSize: 13,
        overflowX: "auto",
        whiteSpace: "pre-wrap"
    };
    const { data: history = [] } = useQuery({
        queryKey: ["script-history"],
        queryFn: async () => {
            const r = await fetch("http://localhost:4000/scripts/history");
            return r.json();
        },
        refetchInterval: 3000
    });


    const run = useMutation({
        mutationFn: () => runScript(device, script),
        onSuccess: () => {
            alert("Script sent to machine");
            setScript("");
        }
    });

    const { data: library = [] } = useQuery({
        queryKey: ["library"],
        queryFn: fetchLibrary
    });

    const runLib = useMutation({
        mutationFn: ({ device, script_id }: { device: string, script_id: number }) =>
            runLibrary(device, script_id)
    });

    <div >

        <h3>Quick Actions Here</h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>

            {library.map((s: any) => (
                <div key={s.id} style={{
                    border: "1px solid #e5e7eb",
                    padding: 12,
                    borderRadius: 10
                }}>

                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    <div style={{ fontSize: 12, opacity: .7, marginBottom: 8 }}>
                        {s.description}
                    </div>

                    <button
                        style={btn}
                        onClick={() => runLib.mutate({ device, script_id: s.id })}
                        disabled={!device}
                    >
                        Run
                    </button>

                </div>
            ))}

        </div>
    </div>


    return (
        <div style={{ padding: 25, display: "grid", gap: 20 }}>

            <h1 style={{ fontSize: 28 }}>Remote Scripts</h1>

            {/* EXECUTE PANEL */}
            <div style={card}>
                <h3>Run Script</h3>

                <select
                    value={device}
                    onChange={e => setDevice(e.target.value)}
                    style={input}
                >
                    <option value="">Select device</option>
                    {devices.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.id}</option>
                    ))}
                </select>

                <textarea
                    placeholder="Write PowerShell script here..."
                    value={script}
                    onChange={e => setScript(e.target.value)}
                    style={{ ...input, height: 180, fontFamily: "monospace" }}
                />

                <button
                    onClick={() => run.mutate()}
                    style={btn}
                    disabled={!device || !script}
                >
                    Run Script
                </button>
            </div>
            {/* QUICK SCRIPT LIBRARY */}
            <div style={card}>
                <h3 style={{ marginBottom: 10 }}>Quick Actions</h3>

                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
                    gap: 12
                }}>
                    {library.length === 0 && (
                        <div style={{ opacity: .6 }}>No predefined scripts</div>
                    )}

                    {library.map((s: any) => (
                        <div key={s.id} style={{
                            border: "1px solid #e5e7eb",
                            padding: 12,
                            borderRadius: 10,
                            background: "#f8fafc"
                        }}>
                            <div style={{ fontWeight: 600 }}>{s.name}</div>

                            <div style={{
                                fontSize: 12,
                                opacity: .7,
                                margin: "6px 0 10px"
                            }}>
                                {s.description}
                            </div>

                            <button
                                style={btn}
                                onClick={() => runLib.mutate({ device, script_id: s.id })}
                                disabled={!device}
                            >
                                Run on {device || "Select Device"}
                            </button>
                        </div>
                    ))}
                </div>
            </div>


            {/* JOB STATUS */}
            <div style={card}>
                <div className="glass" style={{ padding: 10 }}>
                    <h2 style={{ marginBottom: 10 }}>Execution History</h2>

                    {/* {history.length === 0 && (
                        <div style={{ opacity: .6 }}>No scripts executed yet</div>
                    )} */}

                    {history.map((j: any) => (
                        <div key={j.id} style={{
                            borderBottom: "1px solid #b5c3d8",
                            padding: "12px 0"
                        }}>

                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <b>{j.device_id}</b>

                                <span style={{
                                    color:
                                        j.status === "SUCCESS" ? "#22c55e" :
                                            j.status === "FAILED" ? "#ef4444" :
                                                "#f59e0b"
                                }}>
                                    {j.status}
                                </span>
                            </div>

                            <div style={{ fontSize: 12, opacity: .7, color:"grey"}}>
                                {new Date(Number(j.finished_at || j.created_at)).toLocaleString()}
                            </div>

                            {j.output && (
                                <pre style={{
                                    background: "#3c5187",
                                    padding: 10,
                                    marginTop: 10,
                                    borderRadius: 8,
                                    maxHeight: 200,
                                    overflow: "auto",
                                    fontSize: 12
                                }}>
                                    {j.output}
                                </pre>
                            )}

                            {j.error && (
                                <pre style={{
                                    background: "#050000",
                                    color: "#fe0303",
                                    padding: 10,
                                    marginTop: 10,
                                    borderRadius: 8,
                                    maxHeight: 200,
                                    overflow: "auto",
                                    fontSize: 12
                                }}>
                                    {j.error}
                                </pre>
                            )}

                        </div>
                    ))}
                </div>


                <div style={{ maxHeight: 400, overflowY: "auto" }}>
                    {jobs.map((j: any) => (
                        <div key={j.job_id} style={jobCard(j.success)}>
                            <div style={{ fontWeight: 600 }}>
                                {j.device_id}
                            </div>

                            <div style={{ fontSize: 11, opacity: .7, marginBottom: 4 }}>
                                {j.created_at
                                    ? new Date(Number(j.created_at)).toLocaleString("en-IN", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit"
                                    })
                                    : "-"}
                            </div>


                            <div style={{ marginTop: 1, marginBottom: 3, fontSize: 14, fontFamily: "Inter, system-ui, Arial" }}>
                                Status:
                                <span style={{
                                    color:
                                        j.status === "SUCCESS" ? "#22c55e" :
                                            j.status === "FAILED" ? "#ef4444" :
                                                j.status === "RUNNING" ? "#f59e0b" :
                                                    "#94a3b8",
                                    fontWeight: 500,
                                    marginLeft: 5,
                                }}>
                                    {j.status}
                                </span>

                            </div>

                            {j.status === "SUCCESS" && j.output && (
                                <div style={{ fontFamily: "Inter, system-ui, Arial", fontSize: 14 }}>Output:<pre style={{ ...log, backgroundColor: colors.text }}>
                                    {j.output}
                                </pre></div>
                            )}

                            {j.status === "FAILED" && j.error && (
                                <pre style={{ ...log, color: "#ef4444" }}>
                                    {j.error}
                                </pre>
                            )}

                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}

/* ---------- styles ---------- */

const card = {
    background: "white",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 5px 18px rgba(242, 236, 236, 0.08)"
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
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer"
};

const jobCard = (ok: any) => ({
    borderBottom: "1px solid #eee",
    padding: 12
});

const log = {
    background: "#d5dae3",
    color: "#e5e7eb",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    fontSize: 12,
    overflowX: "auto"
};
