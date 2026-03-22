import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";
import { useState } from "react";


export default function DashboardLayout() {

  const [collapsed, setCollapsed] = useState(false);

  const sidebarWidth = collapsed ? 80 : 260;

  return (
    <div style={{ height: "100vh" }}>

      {/* ================= SIDEBAR ================= */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: sidebarWidth,
          background: "#0f172a",
          transition: "width .25s ease",
          zIndex: 1000
        }}
      >
        <Sidebar
          collapsed ={collapsed}
          setCollapsed={setCollapsed}
        />
      </div>

      {/* ================= CONTENT ================= */}
      <div
        style={{
          marginLeft: sidebarWidth,
          height: "100vh",
          overflowY: "auto",
          transition: "margin-left .25s ease",
          padding: 20,
          background: "#f1f5f9"
        }}
      >
        <Outlet />
      </div>

    </div>
  );
}
