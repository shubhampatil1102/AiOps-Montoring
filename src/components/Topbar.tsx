export default function Topbar() {
  return (
    <div style={{
      height: 60,
      background: "#e9f2fe",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      padding: "0 20px",
      justifyContent: "space-between"
    }}>
      <b style={{fontFamily:"arial", fontSize:12, opacity:.7}}>Real-Time Monitoring Portal</b>

      <div style={{ color: "#b8cdf8" }}>
    <button style={{background:"#bacfff", borderRadius: 50}}>##</button>
      </div>
    </div>
  );
}
