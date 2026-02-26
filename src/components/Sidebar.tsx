import { NavLink } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard,
  Monitor,
  ShieldCheck,
  Wrench,
  ChevronLeft,
  ChevronRight,
  LaptopIcon,
  CpuIcon,
  LockIcon,
  SuperscriptIcon,
  BotIcon
} from "lucide-react";

export default function Sidebar() {

  const [collapsed, setCollapsed] = useState(false);

  const menu = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/" },
    { name: "Devices", icon: LaptopIcon, path: "/devices" },
    { name: "Auto Heal", icon: Wrench, path: "/auto-heal" },
    { name: "Incidents", icon: CpuIcon, path: "/incidents" },
    { name: "Policies", icon: LockIcon, path: "/policies" },
    {name: "Scripts", icon: SuperscriptIcon, path: "/scripts" },
    { name: "Remediations", icon: BotIcon, path: "/remediations" },
    { name: "Security", icon: ShieldCheck, path: "/security" },
  ];

  return (

    <div
      style={{
        width: collapsed ? 70 : 240,
        transition: "all 0.35s ease",
        height: "140vh",
        background: "#0f172a",
        color: "white",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        boxShadow: "4px 0 20px rgba(0,0,0,.3)"
      }}
    >

      {/* ===== HEADER ===== */}
      <div style={{
        padding: 20,
        fontWeight: 700,
        fontSize: 18,
        whiteSpace: "nowrap"
      }}>
        {collapsed ? "AI" : "AiOps Console"}
      </div>

      {/* ===== MENU ===== */}
      <div style={{ flex: 1 }}>

        {menu.map((m, i) => {

          const Icon = m.icon;

          return (
            <NavLink
              key={i}
              to={m.path}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 18px",
                textDecoration: "none",
                color: "white",
                margin: "6px 10px",
                borderRadius: 10,
                transition: "all .25s",
                background: isActive
                  ? "linear-gradient(90deg,#2563eb,#1d4ed8)"
                  : "transparent",
                boxShadow: isActive
                  ? "0 0 15px rgba(37,99,235,.6)"
                  : "none"
              })}
            >

              <Icon size={20} />

              {!collapsed && (
                <span style={{
                  transition: "opacity .2s"
                }}>
                  {m.name}
                </span>
              )}

            </NavLink>
          );
        })}
      </div>

      {/* ===== COLLAPSE BUTTON ===== */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          position: "absolute",
          right: -12,
          top: 30,
          background: "#1e293b",
          borderRadius: "50%",
          padding: 6,
          cursor: "pointer",
          boxShadow: "0 0 10px rgba(0,0,0,.5)"
        }}
      >
        {collapsed ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>}
      </div>

    </div>
  );
}