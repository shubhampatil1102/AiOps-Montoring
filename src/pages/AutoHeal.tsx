import { useQuery, useMutation } from "@tanstack/react-query";
import GlassCard from "../components/GlassCard";

export default function AutoHeal() {

  /* ---------------- SUGGESTIONS ---------------- */

  const { data: suggestions = [], refetch } = useQuery({
    queryKey: ["heal"],
    queryFn: async () => {
      const r = await fetch("http://localhost:4000/heal/suggestions");
      return r.json();
    },
    refetchInterval: 4000
  });

  const approve = useMutation({
    mutationFn: (id: number) =>
      fetch(`http://localhost:4000/heal/approve/${id}`, { method: "POST" }),
    onSuccess: () => refetch()
  });

  const reject = useMutation({
    mutationFn: (id: number) =>
      fetch(`http://localhost:4000/heal/reject/${id}`, { method: "POST" }),
    onSuccess: () => refetch()
  });

  /* ---------------- TIMELINE ---------------- */

  const { data: timeline = [] } = useQuery({
    queryKey: ["heal-timeline"],
    queryFn: async () => {
      const r = await fetch("http://localhost:4000/heal/timeline");
      return r.json();
    },
    refetchInterval: 3000
  });

  /* ---------- GROUP TIMELINE ---------- */

  const approved = timeline.filter((t: any) => t.approval_status === "APPROVED");
  const rejected = timeline.filter((t: any) => t.approval_status === "REJECTED");
  const running = timeline.filter((t: any) => t.status === "RUNNING");

  return (

    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 20,
      height: "calc(100vh - 80px)",
      padding: 20
    }}>

      {/* ================= LEFT : SUGGESTIONS ================= */}

      <GlassCard style={{
        padding: 20,
        overflowY: "auto"
      }}>
        <h2>AI Suggested Actions</h2>

        {suggestions.length === 0 &&
          <div style={{ opacity: .6 }}>No actions required</div>
        }

        {suggestions.map((s: any) => (
          <div key={s.id} style={{
            background: "white",
            padding: 16,
            marginTop: 15,
            borderRadius: 12,
            border: "1px solid #e5e7eb"
          }}>

            <b>{s.device_id}</b>

            <div style={{ fontSize: 12, opacity: .6 }}>
              {new Date(Number(s.created_at)).toLocaleString()}
            </div>

            <div style={{ color: "#0c0c0c", marginTop: 6 }}>
              Alert: <div style={{ color: "red", display: "inline" }}> {s.alert_type}
              </div>
            </div>

            <div style={{ fontSize: 14 }}><b>Reason:</b> {s.reason}</div>
            <div style={{ fontSize: 14 }}><b>Action:</b> {s.suggested_action}</div>

            <GlassCard style={{ marginTop: 10, background: "#d0f9d7", fontSize: 14 }}>
              <pre>{s.script}</pre>
            </GlassCard>

            <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
              <button
                onClick={() => approve.mutate(s.id)}
                disabled={approve.isPending}
                style={btn("#22c55e")}
              >
                Approve
              </button>

              <button
                onClick={() => reject.mutate(s.id)}
                disabled={reject.isPending}
                style={btn("#ef4444")}
              >
                Reject
              </button>
            </div>

          </div>
        ))}
      </GlassCard>


      {/* ================= RIGHT : TIMELINE ================= */}

      <GlassCard style={{
        padding: 20,
        overflowY: "auto"
      }}>
        <GlassCard>
          <h2>Auto-Heal Timeline</h2>
          <h6 style={{ opacity: .6, marginTop: 5 }}>
            Shows all actions including approved, rejected and running ones.
          </h6>
        </GlassCard>
        <GlassCard style={{ marginTop: 20, marginBottom: 20 }}>
          <TimelineGroup title="🟡 Running" data={running} />
        </GlassCard>
        <GlassCard style={{ marginTop: 20, marginBottom: 20 }}>
          <TimelineGroup title="🟢 Approved" data={approved} />
        </GlassCard>
        <GlassCard style={{ marginTop: 20, marginBottom: 20 }}>
          <TimelineGroup title="🔴 Rejected" data={rejected} />
        </GlassCard>




      </GlassCard>

    </div>
  );
}


/* ================= TIMELINE GROUP ================= */

function TimelineGroup({ title, data }: any) {

  return (
    <div style={{ marginTop: 20 }}>
      <h3>{title}</h3>

      {data.length === 0 &&
        <div style={{ opacity: .5, fontSize: 13, marginTop: 10 }}>No records</div>
      }
      {data.map((t: any) => (
        <div
          key={t.job_id}
          style={{
            borderBottom: "1px solid #e5e7eb",
            padding: 12,
            borderRadius: 10,
            marginBottom: 10,


            boxShadow:
              t.status === "RUNNING"
                ? "0 0 14px rgba(245,158,11,0.8)"
                : "none",

            animation:
              t.status === "RUNNING"
                ? "pulse 1.5s infinite"
                : "none",

            transition: "all 1.3s ease"
          }}
        >

          <b><h5 style={{ display: "inline", opacity: 0.7, color: "#0c0c0c" }}>Run on</h5> {t.device_id}</b>

          <div style={{ fontSize: 12, opacity: .6 }}>
            At {new Date(Number(t.created_at)).toLocaleString()}
          </div>

          {t.approval_user &&
            <div style={{ marginBottom: 6 }}>👤 {t.approval_user}</div>
          }
          <GlassCard>
            {t.agent_message &&
              <div style={{ color: "#ef4444" }}>
                {t.agent_message}
              </div>
            }
          </GlassCard>
          {t.output &&
            <pre style={{
              background: "#020617",
              color: "#22c55e",
              padding: 8,
              borderRadius: 6,
              marginTop: 6
            }}>
              {t.output}
            </pre>
          }

        </div>
      ))}
    </div>
  )
}


/* ================= BUTTON STYLE ================= */

function btn(color: string) {
  return {
    background: color,
    color: "white",
    border: "none",
    padding: "6px 14px",
    borderRadius: 8,
    cursor: "pointer"
  }
}