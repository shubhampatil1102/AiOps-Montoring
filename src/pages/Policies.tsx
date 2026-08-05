import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import PageHeader from "../layouts/PageHeader";
import DashboardWidget from "../components/dashboard/DashboardWidget";
import Button from "../components/ui/Button";
import { fetchAlertPolicy, saveAlertPolicy, type AlertPolicy } from "@/api/policies";
import styles from "./Policies.module.css";

export default function Policies() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["policies"],
    queryFn: fetchAlertPolicy,
  });

  const [cpu, setCpu] = useState(80);
  const [ram, setRam] = useState(85);
  const [offline, setOffline] = useState(20);

  useEffect(() => {
    if (data) {
      setCpu(data.cpu_threshold);
      setRam(data.ram_threshold);
      setOffline(data.offline_seconds);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (policy: AlertPolicy) => saveAlertPolicy(policy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
    },
  });

  return (
    <div className={styles.page}>
      <PageHeader
        title="Alert Policies"
        description="Thresholds that trigger device health alerts and offline detection."
      />

      <DashboardWidget
        title="Thresholds"
        subtitle="Applied fleet-wide to every monitored device"
        isLoading={isLoading}
        isError={isError}
        errorMessage="Couldn't load alert policies. Please try again."
        footer={
          <div className={styles.actions}>
            <Button
              variant="primary"
              onClick={() => mutation.mutate({ cpu_threshold: cpu, ram_threshold: ram, offline_seconds: offline })}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Saving..." : "Save Policy"}
            </Button>

            {mutation.isSuccess && (
              <span className={`${styles.status} ${styles.statusSuccess}`} role="status">
                Policy updated successfully.
              </span>
            )}

            {mutation.isError && (
              <span className={`${styles.status} ${styles.statusError}`} role="alert">
                Couldn't save policy. Please try again.
              </span>
            )}
          </div>
        }
      >
        <div className={styles.fields}>
          <div className={styles.field}>
            <label htmlFor="cpu-threshold">CPU Threshold (%)</label>
            <span>Alert when a device's CPU usage stays above this for a sustained period.</span>
            <input
              id="cpu-threshold"
              type="number"
              min={0}
              max={100}
              value={cpu}
              onChange={(e) => setCpu(+e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="ram-threshold">RAM Threshold (%)</label>
            <span>Alert when a device's memory usage stays above this for a sustained period.</span>
            <input
              id="ram-threshold"
              type="number"
              min={0}
              max={100}
              value={ram}
              onChange={(e) => setRam(+e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="offline-timeout">Offline Timeout (seconds)</label>
            <span>Mark a device offline after this many seconds without a heartbeat.</span>
            <input
              id="offline-timeout"
              type="number"
              min={0}
              value={offline}
              onChange={(e) => setOffline(+e.target.value)}
            />
          </div>
        </div>
      </DashboardWidget>
    </div>
  );
}
