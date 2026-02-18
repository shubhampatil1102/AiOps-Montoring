import { Link } from "react-router-dom";
import { useTheme } from "../../themeContext";

const { theme, toggle } = useTheme();
<button
  onClick={toggle}
  style={{
    marginTop: "auto",
    padding: 10,
    borderRadius: 12,
    background: theme.accentSoft,
    color: theme.text,
    border: "none",
    cursor: "pointer"
  }}
>
  Switch Theme
</button>

export default function Sidebar() {
    return (
        <div style={{
            width: 220,
            background: "#272b32",
            color: "white",
            padding: 10
        }}>
            <h2>AiOps</h2>

            <div><Link to="/">Dashboard</Link></div>
            <div><Link to="/devices">Devices</Link></div>
            <div><Link to="/incidents">Incidents</Link></div>
            <div><Link to="/policies">Policies</Link></div>
            <div><Link to="/scripts">Scripts</Link></div>
            <div><Link to="/remediations">Remediations</Link></div>
        </div>
    );
}
