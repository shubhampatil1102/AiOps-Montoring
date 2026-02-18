import { Link } from "react-router-dom";
import GlassCard from "./GlassCard";

export default function Sidebar() {
  return (
    <div className="glass" style={{
    width: 200,
    margin: 16,
    borderRadius: 18,
    padding: 12,
    display: "flex",
    flexDirection: "column",
    height: "calc(100vh - 32px)"
}}>
<>
      <h2 style={{ marginBottom: 10 }}>SysOps Tool</h2>
</>
      <Nav to="/">Dashboard</Nav>
      <Nav to="/devices">Devices</Nav>
      <Nav to="/incidents">Incidents</Nav>
      <Nav to="/policies">Policies</Nav>
      <Nav to="/scripts">Scripts</Nav>
      <Nav to="/remediations">Remediations</Nav>
    </div>
  );
}

function Nav({ to, children }: any) {
  return (
    <Link
      to={to}
      style={{
        color: "#000207",
        textDecoration: "none",
        padding: "8px 10px",
        borderRadius: 8
      }}onMouseEnter={(e) => {
        (e.target as HTMLElement).style.background = "#b9dafd";
      }}
      onMouseLeave={(e) => {
        (e.target as HTMLElement).style.background = "transparent";
      }}
    >
      {children}
    </Link>
  );
}
