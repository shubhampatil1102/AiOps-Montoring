import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import {
  cancelPatchJob,
  createPatchInstall,
  createPatchScan,
  createRebootJob,
  fetchDevicePatchHistory,
  fetchDevicePatchJobs,
  fetchPatchSummary,
  retryPatchJob,
} from "@/api/patch";

export function usePatchSummary() {
  return useQuery({
    queryKey: ["patch-summary"],
    queryFn: fetchPatchSummary,
    refetchInterval: 5000,
  });
}

export function useDevicePatchJobs(deviceId: string) {
  return useQuery({
    queryKey: ["device-patch-jobs", deviceId],
    queryFn: () => fetchDevicePatchJobs(deviceId),
    enabled: Boolean(deviceId),
    refetchInterval: 4000,
  });
}

export function useDevicePatchHistory(deviceId: string) {
  return useQuery({
    queryKey: ["device-patch-history", deviceId],
    queryFn: () => fetchDevicePatchHistory(deviceId),
    enabled: Boolean(deviceId),
    refetchInterval: 5000,
  });
}

function usePatchMutation(mutationFn: (jobId: number) => Promise<unknown>, deviceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-patch-jobs", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["device-patch-history", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["patch-summary"] });
    },
  });
}

export function useCreatePatchScan(deviceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => createPatchScan(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-patch-jobs", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["patch-summary"] });
    },
  });
}

export function useCreatePatchInstall(deviceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => createPatchInstall(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-patch-jobs", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["patch-summary"] });
    },
  });
}

export function useRetryPatchJob(deviceId: string) {
  return usePatchMutation(retryPatchJob, deviceId);
}

export function useCancelPatchJob(deviceId: string) {
  return usePatchMutation(cancelPatchJob, deviceId);
}

export function useCreateRebootJob(deviceId: string) {
  return usePatchMutation(createRebootJob, deviceId);
}
