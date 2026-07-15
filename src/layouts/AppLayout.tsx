import { Outlet } from "react-router-dom";
import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "./Topbar";
import styles from "./AppLayout.module.css";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  const SIDEBAR_WIDTH = 260;
  const SIDEBAR_COLLAPSED_WIDTH = 80;

  const sidebarWidth = collapsed
    ? SIDEBAR_COLLAPSED_WIDTH
    : SIDEBAR_WIDTH;

  // TODO (Sprint 2.4): Add Topbar component

  return (
    <div
      className={styles.layout}
    >
      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* Main Content */}
      <main
        className={styles.main}
      >
        <Topbar />

        <div
          className={styles.content}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}