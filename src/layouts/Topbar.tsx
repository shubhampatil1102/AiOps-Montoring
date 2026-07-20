import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styles from "./topbar.module.css";
import {
  Search,
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  User,
  Settings as SettingsIcon,
} from "lucide-react";
import { sidebarNavigation } from "../constants/navigation";
import useDashboardData from "../hooks/useDashboardData";
import { useAuth } from "@/AuthContext";
import { useTheme } from "@/ThemeContext";
import { formatRole } from "@/constants/roles";

function useBreadcrumb(): string[] {
  const { pathname } = useLocation();

  const match = sidebarNavigation.find((item) => item.path === pathname);
  if (match) return [match.name];

  if (pathname.startsWith("/devices/")) return ["Devices", "Device Details"];

  const segment = pathname.replace(/^\//, "").split("/")[0];
  if (!segment) return ["AI Command Center"];

  return [segment.charAt(0).toUpperCase() + segment.slice(1)];
}

export default function Topbar() {
  const breadcrumb = useBreadcrumb();
  const { activeAlerts } = useDashboardData();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const isDark = theme?.name === "dark";

  const displayName = user?.displayName || user?.username || "User";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className={styles.topbar}>
      {/* Left Section */}
      <div className={styles.left}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          {breadcrumb.map((label, index) => (
            <span key={label} className={styles.breadcrumbItem}>
              {index > 0 && (
                <ChevronRight size={14} className={styles.breadcrumbSep} />
              )}
              {label}
            </span>
          ))}
        </nav>

        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Search anything..."
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Right Section */}
      <div className={styles.right}>
        {/* Organization (placeholder — single-tenant today) */}
        <div className={styles.orgBadge}>Default Organization</div>

        {/* Date Filter */}
        <button className={styles.dateButton}>
          <CalendarDays size={18} />
          <span>Last 7 Days</span>
          <ChevronDown size={16} />
        </button>

        {/* Notification (placeholder — no real notification delivery yet) */}
        <button className={styles.notification} aria-label="Notifications">
          <Bell size={20} />
          {activeAlerts.length > 0 && (
            <span className={styles.badge}>
              {activeAlerts.length > 99 ? "99+" : activeAlerts.length}
            </span>
          )}
        </button>

        {/* Theme switch */}
        <button
          type="button"
          className={styles.themeToggle}
          onClick={toggle}
          aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* User */}
        <div className={styles.userWrapper}>
          <button
            type="button"
            className={styles.user}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <div className={styles.avatar}>{initials || "?"}</div>

            <div className={styles.userInfo}>
              <span className={styles.name}>{displayName}</span>
              <span className={styles.role}>{formatRole(user?.role)}</span>
            </div>

            <ChevronDown size={16} />
          </button>

          {menuOpen && (
            <div className={styles.userMenu} role="menu">
              <Link to="/profile" className={styles.userMenuItem} onClick={() => setMenuOpen(false)} role="menuitem">
                <User size={15} />
                Profile
              </Link>
              <Link to="/settings" className={styles.userMenuItem} onClick={() => setMenuOpen(false)} role="menuitem">
                <SettingsIcon size={15} />
                Settings
              </Link>
              <button type="button" className={styles.userMenuItemDanger} onClick={handleLogout} role="menuitem">
                <LogOut size={15} />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
