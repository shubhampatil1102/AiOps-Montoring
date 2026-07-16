import { useQuery } from "@tanstack/react-query";
import {
  fetchDevice,
  fetchDeviceAlerts,
  fetchDeviceCompliance,
  fetchDeviceEvents,
  fetchDeviceHardware,
  fetchDeviceInventory,
  fetchDevices,
  fetchDevicesHardware,
  fetchDeviceSuggestions,
  fetchDeviceTopProcesses,
  fetchDeviceUpdates,
} from "@/api/devices";

export function useDevices() {
  return useQuery({
    queryKey: ["devices"],
    queryFn: fetchDevices,
    refetchInterval: 5000,
  });
}

export function useDevicesHardware(deviceIds: string[]) {
  return useQuery({
    queryKey: ["devices-hardware", deviceIds.join(",")],
    queryFn: () => fetchDevicesHardware(deviceIds),
    enabled: deviceIds.length > 0,
    refetchInterval: 5000,
  });
}

export function useDeviceDetails(deviceId: string | null, enabled: boolean) {
  const isEnabled = enabled && Boolean(deviceId);
  const id = deviceId || "";

  const device = useQuery({
    queryKey: ["device", id],
    queryFn: () => fetchDevice(id),
    enabled: isEnabled,
    refetchInterval: 5000,
  });

  const hardware = useQuery({
    queryKey: ["device-hardware", id],
    queryFn: () => fetchDeviceHardware(id),
    enabled: isEnabled,
    refetchInterval: 5000,
  });

  const compliance = useQuery({
    queryKey: ["device-compliance", id],
    queryFn: () => fetchDeviceCompliance(id),
    enabled: isEnabled,
    refetchInterval: 5000,
  });

  const updates = useQuery({
    queryKey: ["device-updates", id],
    queryFn: () => fetchDeviceUpdates(id),
    enabled: isEnabled,
    refetchInterval: 5000,
  });

  const processes = useQuery({
    queryKey: ["device-processes", id],
    queryFn: () => fetchDeviceTopProcesses(id),
    enabled: isEnabled,
    refetchInterval: 5000,
  });

  const events = useQuery({
    queryKey: ["device-events", id],
    queryFn: () => fetchDeviceEvents(id),
    enabled: isEnabled,
    refetchInterval: 5000,
  });

  const inventory = useQuery({
    queryKey: ["device-inventory", id],
    queryFn: () => fetchDeviceInventory(id),
    enabled: isEnabled,
    refetchInterval: 5000,
  });

  const alerts = useQuery({
    queryKey: ["device-alerts", id],
    queryFn: () => fetchDeviceAlerts(id),
    enabled: isEnabled,
    refetchInterval: 5000,
  });

  const suggestions = useQuery({
    queryKey: ["device-suggestions", id],
    queryFn: () => fetchDeviceSuggestions(id),
    enabled: isEnabled,
    refetchInterval: 5000,
  });

  return {
    device,
    hardware,
    compliance,
    updates,
    processes,
    events,
    inventory,
    alerts,
    suggestions,
    isLoading:
      device.isLoading ||
      hardware.isLoading ||
      compliance.isLoading ||
      updates.isLoading,
    isError:
      device.isError ||
      hardware.isError ||
      compliance.isError ||
      updates.isError,
  };
}
