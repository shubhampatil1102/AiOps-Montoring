import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  collectDependencyLogs,
  fetchApplicationDependencyGraph,
  fetchDeviceAuthenticationStatus,
  flushDns,
  scheduledTaskAction,
} from "@/api/dependencies";

export function useApplicationDependencyGraph(deviceId: string, applicationId: number | null) {
  return useQuery({
    queryKey: ["application-dependency-graph", deviceId, applicationId],
    queryFn: () => fetchApplicationDependencyGraph(deviceId, applicationId as number),
    enabled: Boolean(deviceId) && applicationId !== null,
    refetchInterval: 20000,
  });
}

export function useDeviceAuthenticationStatus(deviceId: string) {
  return useQuery({
    queryKey: ["device-authentication-status", deviceId],
    queryFn: () => fetchDeviceAuthenticationStatus(deviceId),
    enabled: Boolean(deviceId),
    refetchInterval: 30000,
  });
}

function invalidateDependencyGraph(queryClient: ReturnType<typeof useQueryClient>, deviceId: string, applicationId: number | null) {
  queryClient.invalidateQueries({ queryKey: ["application-dependency-graph", deviceId, applicationId] });
}

export function useFlushDns(deviceId: string, applicationId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => flushDns(deviceId),
    onSuccess: () => invalidateDependencyGraph(queryClient, deviceId, applicationId),
  });
}

export function useScheduledTaskAction(deviceId: string, applicationId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskPath, taskName, action }: { taskPath: string; taskName: string; action: "enable" | "disable" | "run" }) =>
      scheduledTaskAction(deviceId, taskPath, taskName, action),
    onSuccess: () => invalidateDependencyGraph(queryClient, deviceId, applicationId),
  });
}

export function useCollectDependencyLogs(deviceId: string) {
  return useMutation({
    mutationFn: (processName: string) => collectDependencyLogs(deviceId, processName),
  });
}
