import { Link } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import styles from "./ErrorPage.module.css";

export type ErrorCode = "401" | "403" | "404" | "500";

interface ErrorPageProps {
  code: ErrorCode;
  title: string;
  message: string;
  actionLabel?: string;
  actionTo?: string;
}

export default function ErrorPage({
  code,
  title,
  message,
  actionLabel = "Return to Dashboard",
  actionTo = "/",
}: ErrorPageProps) {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>
            <LayoutGrid size={20} />
          </div>
          <span>AiOps Console</span>
        </div>

        <div className={styles.code}>{code}</div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.message}>{message}</p>

        <Link to={actionTo} className={styles.action}>
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}
