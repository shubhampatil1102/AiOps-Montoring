import styles from "./DashboardWidget.module.css";
import { ReactNode } from "react";

import Card from "../../ui/Card";

interface DashboardWidgetProps {
  title: string;
  subtitle?: string;

  actions?: ReactNode;

  toolbar?: ReactNode;

  footer?: ReactNode;

  children: ReactNode;
}

export default function DashboardWidget({
  title,
  subtitle,
  actions,
  toolbar,
  footer,
  children,
}: DashboardWidgetProps) {
  return (
    <Card>
      {/* Header */}

      <div className={styles.header}>
        <div>
          <h3>{title}</h3>

          {subtitle && <p>{subtitle}</p>}
        </div>

        {actions}
      </div>

      {/* Toolbar */}

      {toolbar && (
        <div className={styles.toolbar}>
          {toolbar}
        </div>
      )}

      {/* Content */}

      <div className={styles.content}>
        {children}
      </div>

      {/* Footer */}

      {footer && (
        <div className={styles.footer}>
          {footer}
        </div>
      )}
    </Card>
  );
}