export default function Topbar() {
  return (
    <div style={{
      height: 60,
      background: "white",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      padding: "0 20px",
      justifyContent: "space-between"
    }}>
      <b>Monitoring Portal</b>

      <div style={{ color: "#6b7280" }}>
    <button style={{background:"#b6caf8", borderRadius: 50}}>##</button>
      </div>
    </div>
  );
}
