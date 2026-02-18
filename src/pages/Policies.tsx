import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import GlassCard from "../components/GlassCard";

export default function Policies() {
  const queryClient = useQueryClient();

  // fetch policy
  const { data, isLoading } = useQuery({
    queryKey: ["policies"],
    queryFn: async () => {
      const r = await fetch("http://localhost:4000/policies");
      return r.json();
    },
  });

  // local state
  const [cpu, setCpu] = useState(80);
  const [ram, setRam] = useState(85);
  const [offline, setOffline] = useState(20);

  // load values from backend
  useEffect(() => {
    if (data) {
      setCpu(data.cpu_threshold);
      setRam(data.ram_threshold);
      setOffline(data.offline_seconds);
    }
  }, [data]);

  // save mutation
  const mutation = useMutation({
    mutationFn: async () => {
      await fetch("http://localhost:4000/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpu_threshold: cpu,
          ram_threshold: ram,
          offline_seconds: offline,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      alert("Policy updated successfully");
    },
  });

  if (isLoading) return <div>Loading policy...</div>;

  return (
    <div style={{ maxWidth: 500 }}>
      <h1 style={{ fontSize: 30, marginBottom: 20 }}>Alert Policies</h1>

      <Card label="CPU Threshold (%)" >
        <input style={{border:"none", backgroundColor:"#8efeb7", padding: 8, borderRadius: 10, marginTop: 10}}
          type="number"
          value={cpu}
          onChange={(e) => setCpu(+e.target.value)}
        />
      </Card>

      <Card label="RAM Threshold (%)">
        <input style={{border:"none", backgroundColor:"#8efeb7", padding: 8, borderRadius: 10, marginTop: 10}}
          type="number"
          value={ram}
          onChange={(e) => setRam(+e.target.value)}
        />
      </Card>

      <Card label="Offline Timeout (seconds)">
        <input style={{border:"none", backgroundColor:"#8efeb7", padding: 8, borderRadius: 10, marginTop: 10}}
          type="number"
          value={offline}
          onChange={(e) => setOffline(+e.target.value)}
        />
      </Card>

      <button
        onClick={() => mutation.mutate()}
        style={{
          marginTop: 10,
          marginLeft: 10,
          padding: "10px 16px",
          borderRadius: 8,
          background: "#22c55e",
          border: "none",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Save Policy
      </button>
    </div>
  );
}


// small reusable card
function Card({ label, children }: any) {
  return (
    <GlassCard style={{ marginBottom: 16 }}>
      <div style={{ height: 20, fontFamily: "monospace", marginTop: 12 }}>{label}</div>
      {children}
    </GlassCard>
  );
}
