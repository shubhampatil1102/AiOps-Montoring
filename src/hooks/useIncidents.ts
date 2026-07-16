import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  escalateIncident,
  fetchIncidentAlerts,
  fetchIncidents,
  remediateIncident,
  resolveIncident,
} from "@/api/incidents";

export function useIncidents() {
  const incidents = useQuery({
    queryKey: ["incidents"],
    queryFn: fetchIncidents,
    refetchInterval: 30000,
  });

  const alerts = useQuery({
    queryKey: ["incident-alerts"],
    queryFn: fetchIncidentAlerts,
    refetchInterval: 30000,
  });

  return {
    incidents,
    alerts,
    isLoading: incidents.isLoading || alerts.isLoading,
    isError: incidents.isError || alerts.isError,
  };
}

export function useIncidentActions() {
  const queryClient = useQueryClient();

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["incidents"] });
    void queryClient.invalidateQueries({ queryKey: ["incident-alerts"] });
  }

  const resolve = useMutation({
    mutationFn: resolveIncident,
    onSuccess: invalidate,
  });

  const escalate = useMutation({
    mutationFn: escalateIncident,
    onSuccess: invalidate,
  });

  const remediate = useMutation({
    mutationFn: remediateIncident,
    onSuccess: invalidate,
  });

  return {
    resolve,
    escalate,
    remediate,
  };
}
