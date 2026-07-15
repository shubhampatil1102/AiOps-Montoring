import styles from "./Card.module.css";
import { ReactNode } from "react";

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export default function Card({
  title,
  subtitle,
  actions,
  children,
}: CardProps) {
  return (
    <div className={styles.card}>
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