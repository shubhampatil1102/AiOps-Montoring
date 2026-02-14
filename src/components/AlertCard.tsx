import { getSeverity, extractProcess } from "@/utils/severity";

export default function AlertCard({ alert }: any) {

  const sev = getSeverity(alert.message);
  const proc = extractProcess(alert.message);

  const state =
    alert.resolved ? "RESOLVED" :
    alert.acknowledged ? "ACK" :
    "ACTIVE";

  const stateColor =
    alert.resolved ? "#22c55e" :
    alert.acknowledged ? "#6b7280" :
    "#ef4444";

  return (
    <div style={{
      padding:16,
      borderBottom:"1px solid #1f2937",
      display:"flex",
      justifyContent:"space-between",
      alignItems:"center"
    }}>

      {/* left side */}
      <div style={{display:"flex", gap:12, alignItems:"center"}}>

        <div style={{
          width:4,
          height:40,
          background:sev.color,
          borderRadius:4
        }}/>

        <div>
          <div style={{fontWeight:600}}>
            {alert.id}
          </div>

          <div style={{color:"#9ca3af"}}>
            {alert.message}
          </div>

          {proc && (
            <div style={{color:"#fca5a5", fontSize:12}}>
              culprit: {proc}
            </div>
          )}
        </div>
      </div>

      {/* state badge */}
      <div style={{
        background:stateColor,
        padding:"4px 10px",
        borderRadius:20,
        fontSize:12,
        fontWeight:600
      }}>
        {state}
      </div>

    </div>
  );
}
