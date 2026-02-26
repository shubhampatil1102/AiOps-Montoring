export default function Topbar() {
  return (
    <div style={{
      height: 60,
      background: "#f6f9f97f",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      padding: "0 20px",
      justifyContent: "space-between",
    boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
     backdropFilter: "blur(8px)",
     WebkitBackdropFilter: "blur(8px)"
    }}>
      <b style={{fontFamily:"arial", fontSize:12, opacity:.7}}>Real-Time Monitoring Portal</b>

      <div style={{ color: "#b8cdf8" }}>
    <button style={{background:"#bacfff", borderRadius: 50}}>##</button>
      </div>
    </div>
  );
}
