import Badge from "../ui/Badge/Badge";
import Button from "../ui/Button";
import type { HealSuggestion } from "@/types/autoHeal";
import styles from "./Tables.module.css";

interface SuggestionsTableProps {
  suggestions: HealSuggestion[];
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}

export default function SuggestionsTable({
  suggestions,
  onApprove,
  onReject,
}: SuggestionsTableProps) {
  if (!suggestions.length) {
    return <div className={styles.empty}>No pending AI suggestions.</div>;
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Device</th>
            <th>Alert</th>
            <th>Action</th>
            <th>Script</th>
            <th>Created</th>
            <th>Controls</th>
          </tr>
        </thead>
        <tbody>
          {suggestions.map((suggestion) => (
            <tr key={suggestion.id}>
              <td>{suggestion.device_id}</td>
              <td>
                <Badge variant="warning">{suggestion.alert_type}</Badge>
                <div>{suggestion.reason}</div>
              </td>
              <td>{suggestion.suggested_action}</td>
              <td>
                <pre className={styles.log}>{suggestion.script}</pre>
              </td>
              <td>{new Date(Number(suggestion.created_at)).toLocaleString()}</td>
              <td>
                <div className={styles.actions}>
                  <Button onClick={() => onApprove(suggestion.id)} type="button">
                    Approve
                  </Button>
                  <Button onClick={() => onReject(suggestion.id)} type="button" variant="danger">
                    Reject
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
