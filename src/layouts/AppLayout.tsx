import { Outlet } from "react-router-dom";
import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "./Topbar";

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
      style={{
        display: "flex",
        minHeight: "100dvh",
      }}
    >
      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          // marginLeft: sidebarWidth,
          transition: "margin-left .25s ease",
          background: "#f1f5f9",
          minHeight: "100dvh",
          overflow: "auto",
        }}
      >
        <Topbar />

        <div
          style={{
            padding: 24,
          }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}