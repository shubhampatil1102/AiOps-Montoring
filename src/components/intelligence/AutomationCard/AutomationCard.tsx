import {
  Bell,
  CalendarClock,
  Download,
  RotateCcw,
  Terminal,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import Card from "../../ui/Card";
import Badge from "../../ui/Badge/Badge";
import ConfidenceBadge from "../ConfidenceBadge";
import type { AutomationSuggestion, RiskSeverity } from "@/lib/intelligence/types";
import styles from "./AutomationCard.module.css";

interface AutomationCardProps {
  automation: AutomationSuggestion;
}

const actionIcon: Record<AutomationSuggestion["actionType"], LucideIcon> = {
  "restart-service": RotateCcw,
  "clean-temp-files": Trash2,
  "install-updates": Download,
  "notify-admin": Bell,
  "run-script": Terminal,
  "schedule-maintenance": CalendarClock,
};

const riskVariant: Record<RiskSeverity, "success" | "warning" | "danger" | "info"> = {
  Low: "success",
  Medium: "warning",
  High: "danger",
  Critical: "danger",
};

export default function AutomationCard({ automation }: AutomationCardProps) {
  const Icon = actionIcon[automation.actionType];

  return (
    <Card fill>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <div className={styles.iconWrapper}>
              <Icon size={16} />
            </div>
            <div className={styles.title}>{automation.title}</div>
          </div>
          <Badge variant={riskVariant[automation.riskLevel]}>{automation.riskLevel} risk</Badge>
        </div>

        <p className={styles.description}>{automation.description}</p>

        <div className={styles.footer}>
          <ConfidenceBadge confidence={automation.confidence} />
          <span className={styles.suggestOnly}>Suggestion only — not executed</span>
        </div>
      </div>
    </Card>
  );
}
