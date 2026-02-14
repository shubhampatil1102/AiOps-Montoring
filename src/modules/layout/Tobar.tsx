import styles from "./topbar.module.css";

export default function Topbar() {
  return (
    <div className={styles.topbar}>
      <div>Monitoring Dashboard</div>
      <div>{new Date().toLocaleTimeString()}</div>
    </div>
  );
}
