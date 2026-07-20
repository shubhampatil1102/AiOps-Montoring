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
import { resolveModuleForPath } from "../constants/routePermissions";
import { usePermissions } from "@/hooks/usePermissions";
import {
  ChevronLeft,
  ChevronRight,
  CopyMinus,
  ListCollapse,
  MoveRight
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
  const SIDEBAR_WIDTH = 260;
  const SIDEBAR_COLLAPSED_WIDTH = 80;

  const { can } = usePermissions();

  const visibleNavigation = sidebarNavigation.filter((item) => {
    const module = resolveModuleForPath(item.path);
    // Unmapped items aren't gated — same "no config, no restriction" rule
    // the route guard uses.
    return !module || can(module, "view");
  });

  const groupedNavigation = visibleNavigation.reduce<
    Array<[string, typeof sidebarNavigation]>
  >((groups, item) => {
    const existing = groups.find(([group]) => group === item.group);

    if (existing) {
      existing[1].push(item);
    } else {
      groups.push([item.group, [item]]);
    }

    return groups;
  }, []);

  return (

    <div
      style={{
        width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
        transition: "all 0.35s ease",
        background: sidebarColors.background,
        color: sidebarColors.text,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        boxShadow: "4px 0 30px rgba(54, 52, 52, 0.3)"
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

        {groupedNavigation.map(([group, items]) => (
          <div key={group}>

            {!collapsed && (
              <div style={{
                padding: "16px 22px 6px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#98adcb"
              }}>
                {group}
              </div>
            )}

            {items.map((m) => {

              const Icon = m.icon;

              return (
                <NavLink
                  key={m.path}
                  to={m.path}
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 18px",
                    textDecoration: "none",
                    color: isActive ? "#ffffff" : sidebarColors.text,
                    margin: "3px 10px",
                    borderRadius: 10,
                    transition: "all .25s",
                    background: isActive
                      ? `linear-gradient(90deg, ${sidebarColors.activeStart}, ${sidebarColors.activeEnd})`
                      : "transparent",
                    boxShadow: isActive
                      ? "0 6px 16px rgba(75,90,249,.35)"
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
        ))}
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
          borderRadius: "60%",
          padding: 6,
          cursor: "pointer",
          boxShadow: "0 0 0px rgba(0,0,0,.5)"
        }}
      >
        {collapsed ? <ListCollapse size={18} /> : <CopyMinus size={18} />}
      </div>

    </div>
  );
}
