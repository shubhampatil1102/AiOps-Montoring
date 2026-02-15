import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <div style={{
      width: 230,
      background: "#0f172a",
      color: "white",
      padding: 20,
      display: "flex",
      flexDirection: "column",
      gap: 5
    }}>
      <h2 style={{ marginBottom: 10 }}>AiOps</h2>

      <Nav to="/">Dashboard</Nav>
      <Nav to="/devices">Devices</Nav>
      <Nav to="/incidents">Incidents</Nav>
      <Nav to="/policies">Policies</Nav>
    </div>
  );
}

function Nav({ to, children }: any) {
  return (
    <Link
      to={to}
      style={{
        color: "#cbd5f5",
        textDecoration: "none",
        padding: "8px 10px",
        borderRadius: 8
      }}
    >
      {children}
    </Link>
  );
}
