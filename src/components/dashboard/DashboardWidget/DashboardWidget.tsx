import styles from "./DashboardWidget.module.css";
import { ReactNode } from "react";
import { Download, RefreshCcw } from "lucide-react";

import Card from "../../ui/Card";
import Loading from "@/components/common/Loading";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import { timeAgo } from "@/utils/time";

interface DashboardWidgetProps {
  title: string;
  subtitle?: string;

  actions?: ReactNode;

  toolbar?: ReactNode;

  footer?: ReactNode;

  children: ReactNode;

  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  isEmpty?: boolean;
  emptyMessage?: string;

  lastUpdated?: number;
  onRefresh?: () => void;
  onExport?: () => void;
}

export default function DashboardWidget({
  title,
  subtitle,
  actions,
  toolbar,
  footer,
  children,
  isLoading = false,
  isError = false,
  errorMessage,
  isEmpty = false,
  emptyMessage,
  lastUpdated,
  onRefresh,
  onExport,
}: DashboardWidgetProps) {
  const showMeta = lastUpdated !== undefined || onRefresh || onExport;

  return (
    <Card fill>
      <div className={styles.widget}>
      {/* Header */}

      <div className={styles.header}>
        <div>
          <h3>{title}</h3>

          {subtitle && <p>{subtitle}</p>}
        </div>

        <div className={styles.headerRight}>
          {showMeta && (
            <div className={styles.meta}>
              {lastUpdated !== undefined && (
                <span className={styles.lastUpdated}>
                  Updated {timeAgo(lastUpdated)}
                </span>
              )}

              {onRefresh && (
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={onRefresh}
                  aria-label="Refresh"
                >
                  <RefreshCcw size={14} />
                </button>
              )}

              {onExport && (
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={onExport}
                  aria-label="Export"
                >
                  <Download size={14} />
                </button>
              )}
            </div>
          )}

          {actions}
        </div>
      </div>

      {/* Toolbar */}

      {toolbar && (
        <div className={styles.toolbar}>
          {toolbar}
        </div>
      )}

      {/* Content */}

        <div className={styles.content}>
          {isLoading ? (
            <Loading />
          ) : isError ? (
            <ErrorState message={errorMessage} />
          ) : isEmpty ? (
            <EmptyState message={emptyMessage} />
          ) : (
            children
          )}
        </div>

      {/* Footer */}

        {footer && (
          <div className={styles.footer}>
            {footer}
          </div>
        )}
      </div>
    </Card>
  );
}
