import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdHocReboot,
  fetchDeviceRebootFacts,
  fetchDeviceRebootHistory,
  fetchRebootFleetSummary,
} from "@/api/reboot";

export function useDeviceRebootFacts(deviceId: string) {
  return useQuery({
    queryKey: ["device-reboot-facts", deviceId],
    queryFn: () => fetchDeviceRebootFacts(deviceId),
    enabled: Boolean(deviceId),
    refetchInterval: 5000,
  });
}

export function useDeviceRebootHistory(deviceId: string) {
  return useQuery({
    queryKey: ["device-reboot-history", deviceId],
    queryFn: () => fetchDeviceRebootHistory(deviceId),
    enabled: Boolean(deviceId),
    refetchInterval: 10000,
  });
}

export function useRebootFleetSummary() {
  return useQuery({
    queryKey: ["reboot-fleet-summary"],
    queryFn: fetchRebootFleetSummary,
    refetchInterval: 10000,
  });
}

export function useCreateAdHocReboot(deviceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => createAdHocReboot(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-patch-jobs", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["device-reboot-facts", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["reboot-fleet-summary"] });
    },
  });
}
