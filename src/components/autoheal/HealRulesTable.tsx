import { useState } from "react";
import Badge from "../ui/Badge/Badge";
import Button from "../ui/Button";
import type { HealRule } from "@/types/autoHeal";
import styles from "./Tables.module.css";

interface HealRulesTableProps {
  rules: HealRule[];
  onManualRun: (rule: HealRule) => void;
}

export default function HealRulesTable({
  rules,
  onManualRun,
}: HealRulesTableProps) {
  const [localRules, setLocalRules] = useState(rules);

  function updateRule(id: string, patch: Partial<HealRule>) {
    setLocalRules((current) =>
      current.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule))
    );
  }

  const rows = localRules.length ? localRules : rules;

  if (!rows.length) {
    return <div className={styles.empty}>No heal rules available.</div>;
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Priority</th>
            <th>Alert Type</th>
            <th>Script</th>
            <th>Source</th>
            <th>Auto Run</th>
            <th>Manual Run</th>
          </tr>
        </thead>
        <tbody>
          {rows
            .slice()
            .sort((a, b) => a.priority - b.priority)
            .map((rule) => (
              <tr key={rule.id}>
                <td>
                  <input
                    className={styles.priority}
                    min={1}
                    onChange={(event) =>
                      updateRule(rule.id, { priority: Number(event.target.value || 1) })
                    }
                    type="number"
                    value={rule.priority}
                  />
                </td>
                <td>{rule.alertType}</td>
                <td>{rule.scriptName}</td>
                <td>
                  <Badge variant={rule.source === "suggestion" ? "info" : "default"}>
                    {rule.source}
                  </Badge>
                </td>
                <td>
                  <label className={styles.toggle}>
                    <input
                      checked={rule.autoEnabled}
                      onChange={(event) =>
                        updateRule(rule.id, { autoEnabled: event.target.checked })
                      }
                      type="checkbox"
                    />
                    <span>{rule.autoEnabled ? "Enabled" : "Disabled"}</span>
                  </label>
                </td>
                <td>
                  <Button onClick={() => onManualRun(rule)} type="button" variant="secondary">
                    Run
                  </Button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
