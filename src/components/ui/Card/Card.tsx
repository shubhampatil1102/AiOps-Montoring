import styles from "./Card.module.css";
import { ReactNode } from "react";

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  fill?: boolean;
}

export default function Card({
  title,
  subtitle,
  actions,
  children,
  fill = false,
}: CardProps) {
  return (
    <div className={`${styles.card} ${fill ? styles.fill : ""}`}>
      {(title || actions) && (
        <div className={styles.header}>
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p>{subtitle}</p>}
          </div>

          {actions && (
            <div>{actions}</div>
          )}
        </div>
      )}

      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}
