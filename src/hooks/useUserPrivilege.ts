import { useQuery } from "@tanstack/react-query";
import { fetchDeviceUserPrivilege, fetchDeviceUserPrivilegeEvents } from "@/api/userPrivilege";

export function useDeviceUserPrivilege(deviceId: string) {
  return useQuery({
    queryKey: ["device-user-privilege", deviceId],
    queryFn: () => fetchDeviceUserPrivilege(deviceId),
    enabled: Boolean(deviceId),
    refetchInterval: 30000,
  });
}

export function useDeviceUserPrivilegeEvents(deviceId: string) {
  return useQuery({
    queryKey: ["device-user-privilege-events", deviceId],
    queryFn: () => fetchDeviceUserPrivilegeEvents(deviceId),
    enabled: Boolean(deviceId),
    refetchInterval: 30000,
  });
}
