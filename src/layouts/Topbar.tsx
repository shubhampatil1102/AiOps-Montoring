import styles from "./topbar.module.css";
import {
  Search,
  Bell,
  CalendarDays,
  ChevronDown,
} from "lucide-react";

export default function Topbar() {
  return (
    <header className={styles.topbar}>
      {/* Left Section */}
      <div className={styles.left}>
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
        {/* Date Filter */}
        <button className={styles.dateButton}>
          <CalendarDays size={18} />
          <span>Last 7 Days</span>
          <ChevronDown size={16} />
        </button>

        {/* Notification */}
        <button className={styles.notification}>
          <Bell size={20} />
          <span className={styles.badge}>3</span>
        </button>

        {/* User */}
        <div className={styles.user}>
          <div className={styles.avatar}>JD</div>

          <div className={styles.userInfo}>
            <span className={styles.name}>John Doe</span>
            <span className={styles.role}>Administrator</span>
          </div>

          <ChevronDown size={16} />
        </div>
      </div>
    </header>
  );
}