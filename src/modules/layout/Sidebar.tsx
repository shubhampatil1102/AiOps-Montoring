import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <div style={{
      width: 220,
      background: "#272b32",
      color: "white",
      padding: 20
    }}>
      <h2>AiOps</h2>

      <div><Link to="/">Dashboard</Link></div>
      <div><Link to="/devices">Devices</Link></div>
      <div><Link to="/incidents">Incidents</Link></div>
      <div><Link to="/policies">Policies</Link></div>
    </div>
  );
}
