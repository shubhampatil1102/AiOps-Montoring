import { useQuery } from "@tanstack/react-query";
import { fetchAlerts } from "@/api/alerts";
import SeverityBadge from "@/components/SeverityBadge";
import { timeAgo } from "@/utils/time";


export default function Incidents() {
  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts"],
    queryFn: fetchAlerts,
    refetchInterval: 5000,
  });



  return (
    <div>
      <h1 style={{ fontSize: 26, marginBottom: 20 }}>Incidents</h1>

      <div style={{ border: "1px solid #b5c3d6", borderRadius: 12 }}>
        {alerts.map((a: any, i: number) => (
          <div
            key={i}
            style={{
              padding: 16,
              borderBottom: "1px solid #1f2937",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: a.acknowledged
                ? "#b7c3f5"
                : i % 2
                ? "#e1e5f7"
                : "transparent",
              opacity: a.acknowledged ? 0.5 : 1,
            }}
          >
            {/* left */}
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <SeverityBadge msg={a.message} />

              <div>
                <div style={{ fontWeight: 600 }}>{a.id}</div>
                <div style={{ color: "#676b72", fontSize: 13 }}>
                  {a.message}
                </div>
              </div>
            </div>

            {/* right */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ color: "#9ca3af", fontSize: 12 }}>
                {timeAgo(Number(a.time))}
              </div>

              {!a.acknowledged ? (
                <button
                  onClick={async () => {
                    await fetch(`http://localhost:4000/alerts/${a.time}/ack`, {
                      method: "POST",
                    });
                  }}
                  style={{
                    background: "#f59e0b",
                    border: "none",
                    padding: "4px 8px",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  ACK
                </button>
              ) : (
                <span style={{ color: "#9ca3af", fontSize: 12 }}>
                  ACKNOWLEDGED
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

