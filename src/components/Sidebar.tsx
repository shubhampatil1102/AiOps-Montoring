import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <div style={{
      width: 230,
      background: "#ecf3fa",
      color: "black",
      padding: 20,
      display: "flex",
      flexDirection: "column",
      gap: 5
    }}>
      <h2 style={{ marginBottom: 10 }}>SysOps Tool</h2>

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
