import { Link } from "react-router-dom";
import { ArrowRight, ListChecks, ShieldAlert, Wrench } from "lucide-react";
import Card from "../../../ui/Card";
import styles from "./QuickActionsBar.module.css";

const actions = [
  { label: "View All Devices", to: "/devices", icon: ListChecks },
  { label: "Review Automation Queue", to: "/remediations", icon: Wrench },
  { label: "View Alerts", to: "/incidents", icon: ShieldAlert },
];

export default function QuickActionsBar() {
  return (
    <Card fill>
      <div className={styles.bar}>
        <div className={styles.heading}>Quick Actions</div>

        <div className={styles.actions}>
          {actions.map((action) => (
            <Link key={action.to} to={action.to} className={styles.action}>
              <action.icon size={16} />
              {action.label}
              <ArrowRight size={14} className={styles.arrow} />
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
}
