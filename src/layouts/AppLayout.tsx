import { Outlet } from "react-router-dom";
import Sidebar from "../modules/layout/Sidebar";
import Topbar from "../modules/layout/Topbar";
import styles from "./layout.module.css";

export default function AppLayout() {
  return (
    <div className={styles.wrapper}>
      <Sidebar />

      <div className={styles.page}>
        <Topbar />

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
