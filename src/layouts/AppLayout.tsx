import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

export default function AppLayout() {
  return (
    <div style={{ display: "flex", height: "100vh", background: "#f1f5f9" }}>
      
      <Sidebar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Topbar />

        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          <Outlet />
        </div>
      </div>

    </div>
  );
}
