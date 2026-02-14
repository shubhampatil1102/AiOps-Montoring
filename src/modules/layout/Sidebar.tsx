import { NavLink } from "react-router-dom";
import styles from "./sidebar.module.css";

export default function Sidebar() {
  return (
    <div className={styles.sidebar}>
      <div className={styles.logo}>AiOps</div>

      <NavLink to="/">Dashboard</NavLink>
      <NavLink to="/devices">Devices</NavLink>
      <NavLink to="/incidents">Incidents</NavLink>
      <NavLink to="/policies">Policies</NavLink>
    </div>
  );
}
