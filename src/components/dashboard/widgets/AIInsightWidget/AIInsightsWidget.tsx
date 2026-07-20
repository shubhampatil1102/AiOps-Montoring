import DashboardWidget from "../../DashboardWidget";
import Button from "../../../ui/Button";
import useSuggestions from "@/hooks/useSuggestions";
import Loading from "@/components/common/Loading";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import styles from "./AIInsightsWidget.module.css";

export default function AIInsightsWidget() {
  const { data: suggestions = [], isLoading, isError } = useSuggestions();

  return (
    <DashboardWidget
      title="AI Insights"
      subtitle="Live AI generated recommendations"
      footer={
        <Button>
          View All Insights ({suggestions.length})
        </Button>
      }
    >
      <div className={styles.list}>

        {isLoading && <Loading label="Loading insights..." />}

        {!isLoading && isError && (
          <ErrorState message="Unable to load AI insights." />
        )}

        {!isLoading && !isError && suggestions.length === 0 && (
          <EmptyState message="No AI insights right now." />
        )}

        {!isLoading &&
          !isError &&
          suggestions
            .slice(0, 3)
            .map((item) => (

              <div
                key={item.id}
                className={styles.item}
              >

                <div className={styles.top}>

                  <strong>
                    {item.device_id}
                  </strong>

                  <span className={styles.badge}>
                    {item.alert_type.replace("_", " ")}
                  </span>

                </div>

                <div className={styles.reason}>
                  {item.reason}
                </div>

                <div className={styles.action}>
                  💡 {item.suggested_action}
                </div>

              </div>

            ))}

      </div>
    </DashboardWidget>
  );
}