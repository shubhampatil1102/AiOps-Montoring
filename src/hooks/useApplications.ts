import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchApplicationCategories,
  fetchApplicationDetail,
  fetchApplicationDevices,
  fetchApplicationHealthHistory,
  fetchApplicationHistoryFleetWide,
  fetchApplicationInsights,
  fetchApplications,
  fetchApplicationSummary,
  fetchDeviceApplicationHealth,
  fetchDeviceApplicationHistory,
  fetchDeviceApplicationProcesses,
  fetchDeviceApplicationServices,
  fetchDeviceApplications,
  fetchDeviceProcesses,
  killProcess,
  restartProcess,
  serviceAction,
} from "@/api/applications";

export function useApplications() {
  return useQuery({
    queryKey: ["applications"],
    queryFn: fetchApplications,
    refetchInterval: 15000,
  });
}

export function useApplicationCategories() {
  return useQuery({
    queryKey: ["application-categories"],
    queryFn: fetchApplicationCategories,
    refetchInterval: 30000,
  });
}

export function useApplicationSummary() {
  return useQuery({
    queryKey: ["application-summary"],
    queryFn: fetchApplicationSummary,
    refetchInterval: 15000,
  });
}

export function useDeviceApplications(deviceId: string) {
  return useQuery({
    queryKey: ["device-applications", deviceId],
    queryFn: () => fetchDeviceApplications(deviceId),
    enabled: Boolean(deviceId),
    refetchInterval: 15000,
  });
}

export function useDeviceProcesses(deviceId: string) {
  return useQuery({
    queryKey: ["device-processes", deviceId],
    queryFn: () => fetchDeviceProcesses(deviceId),
    enabled: Boolean(deviceId),
    refetchInterval: 15000,
  });
}

export function useDeviceApplicationProcesses(deviceId: string, applicationId: number | null) {
  return useQuery({
    queryKey: ["device-application-processes", deviceId, applicationId],
    queryFn: () => fetchDeviceApplicationProcesses(deviceId, applicationId as number),
    enabled: Boolean(deviceId) && applicationId !== null,
    refetchInterval: 15000,
  });
}

export function useDeviceApplicationServices(deviceId: string, applicationId: number | null) {
  return useQuery({
    queryKey: ["device-application-services", deviceId, applicationId],
    queryFn: () => fetchDeviceApplicationServices(deviceId, applicationId as number),
    enabled: Boolean(deviceId) && applicationId !== null,
    refetchInterval: 15000,
  });
}

export function useDeviceApplicationHealth(deviceId: string, applicationId: number | null) {
  return useQuery({
    queryKey: ["device-application-health", deviceId, applicationId],
    queryFn: () => fetchDeviceApplicationHealth(deviceId, applicationId as number),
    enabled: Boolean(deviceId) && applicationId !== null,
    refetchInterval: 15000,
  });
}

export function useDeviceApplicationHistory(deviceId: string, applicationId: number | null) {
  return useQuery({
    queryKey: ["device-application-history", deviceId, applicationId],
    queryFn: () => fetchDeviceApplicationHistory(deviceId, applicationId as number),
    enabled: Boolean(deviceId) && applicationId !== null,
    refetchInterval: 20000,
  });
}

export function useApplicationDetail(applicationId: number | null) {
  return useQuery({
    queryKey: ["application-detail", applicationId],
    queryFn: () => fetchApplicationDetail(applicationId as number),
    enabled: applicationId !== null,
    refetchInterval: 15000,
  });
}

export function useApplicationDevices(applicationId: number | null) {
  return useQuery({
    queryKey: ["application-devices", applicationId],
    queryFn: () => fetchApplicationDevices(applicationId as number),
    enabled: applicationId !== null,
    refetchInterval: 15000,
  });
}

export function useApplicationHistoryFleetWide(applicationId: number | null) {
  return useQuery({
    queryKey: ["application-history", applicationId],
    queryFn: () => fetchApplicationHistoryFleetWide(applicationId as number),
    enabled: applicationId !== null,
    refetchInterval: 20000,
  });
}

export function useApplicationHealthHistory(applicationId: number | null, days: number) {
  return useQuery({
    queryKey: ["application-health-history", applicationId, days],
    queryFn: () => fetchApplicationHealthHistory(applicationId as number, days),
    enabled: applicationId !== null,
    refetchInterval: 30000,
  });
}

export function useApplicationInsights() {
  return useQuery({
    queryKey: ["application-insights"],
    queryFn: fetchApplicationInsights,
    refetchInterval: 30000,
  });
}

function invalidateAfterRemoteAction(queryClient: ReturnType<typeof useQueryClient>, deviceId: string, applicationId: number | null) {
  queryClient.invalidateQueries({ queryKey: ["device-processes", deviceId] });
  queryClient.invalidateQueries({ queryKey: ["device-application-processes", deviceId, applicationId] });
  queryClient.invalidateQueries({ queryKey: ["device-application-services", deviceId, applicationId] });
  queryClient.invalidateQueries({ queryKey: ["device-application-health", deviceId, applicationId] });
  queryClient.invalidateQueries({ queryKey: ["application-devices", applicationId] });
}

export function useKillProcess(deviceId: string, applicationId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pid: number) => killProcess(deviceId, pid),
    onSuccess: () => invalidateAfterRemoteAction(queryClient, deviceId, applicationId),
  });
}

export function useRestartProcess(deviceId: string, applicationId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pid: number) => restartProcess(deviceId, pid),
    onSuccess: () => invalidateAfterRemoteAction(queryClient, deviceId, applicationId),
  });
}

export function useServiceAction(deviceId: string, applicationId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ serviceName, action }: { serviceName: string; action: "restart" | "stop" | "start" }) =>
      serviceAction(deviceId, serviceName, action),
    onSuccess: () => invalidateAfterRemoteAction(queryClient, deviceId, applicationId),
  });
}
