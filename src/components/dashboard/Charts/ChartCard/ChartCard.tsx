import { ReactNode } from "react";
import DashboardWidget from "../../DashboardWidget";
import styles from "./ChartCard.module.css";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function ChartCard({
  title,
  subtitle,
  children,
}: ChartCardProps) {
  return (
    <DashboardWidget
      title={title}
      subtitle={subtitle}
    >
      <div className={styles.chart}>
        {children}
      </div>
    </DashboardWidget>
  );
}
