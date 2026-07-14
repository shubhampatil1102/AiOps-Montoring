/**
 * Sidebar Component
 *
 * Responsibilities:
 * - Render application navigation
 * - Handle collapse/expand state
 * - Display branding
 *
 * Does NOT:
 * - Contain routing logic
 * - Define navigation items
 * - Perform API calls
 *
 * Navigation configuration:
 * src/constants/navigation.ts
 */
import { NavLink } from "react-router-dom";
import { Dispatch, SetStateAction } from "react";
import { sidebarNavigation } from "../constants/navigation";
import {
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { sidebarColors } from "../themes/colors";

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: Dispatch<SetStateAction<boolean>>;
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  /*
   * TODO (Sprint 3):
   * Move collapse button into the Sidebar footer.
   * Remove absolute positioning once the final AppLayout
   * and Topbar are implemented.
   */
  const SIDEBAR_WIDTH = 240;
  const SIDEBAR_COLLAPSED_WIDTH = 70;
  return (

    <div
      style={{
        width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
        transition: "all 0.35s ease",
        height: "100dvh",
        background: sidebarColors.background,
        color: sidebarColors.text,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        boxShadow: "4px 0 20px rgba(0,0,0,.3)"
      }}
    >

      {/* ===== Logo ===== */}
      <div style={{
        padding: 20,
        fontWeight: 700,
        fontSize: 18,
        whiteSpace: "nowrap"
      }}>
        {collapsed ? "AI" : "AiOps Console"}
      </div>

      {/* ===== Navigation ===== */}
      <div style={{ flex: 1 }}>

        {sidebarNavigation.map((m, i) => {

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
                color: sidebarColors.text,
                margin: "6px 10px",
                borderRadius: 10,
                transition: "all .25s",
                background: isActive
                  ? `linear-gradient(90deg, ${sidebarColors.activeStart}, ${sidebarColors.activeEnd})`
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

      {/* ===== Footer ===== */}

      {/* Collapse Toggle */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          position: "absolute",
          right: -12,
          top: 30,
          background: sidebarColors.background,
          borderRadius: "50%",
          padding: 6,
          cursor: "pointer",
          boxShadow: "0 0 10px rgba(0,0,0,.5)"
        }}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </div>

    </div>
  );
}
