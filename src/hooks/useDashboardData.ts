import { useQuery } from "@tanstack/react-query";
import {
  fetchDashboardAlerts,
  fetchDashboardDevices,
  fetchDashboardHardware,
} from "@/api/dashboard";
import type { Alert, Device, HardwareMap } from "@/types/dashboard";

export default function useDashboardData() {

    
  // Devices
 const {
  data: devices = [],
  isLoading: devicesLoading,
} = useQuery<Device[]>({
    queryKey: ["devices"],
    queryFn: fetchDashboardDevices,
    refetchInterval: 5000,
  });

  // Alerts
 const {
  data: alerts = [],
  isLoading: alertsLoading,
} = useQuery<Alert[]>({
    queryKey: ["alerts"],
    queryFn: fetchDashboardAlerts,
    refetchInterval: 5000,
  });

  // Hardware
  const {
  data: hardware = {},
  isLoading: hardwareLoading,
} = useQuery<HardwareMap>({
    queryKey: ["hardware", devices.map((d) => d.id).join(",")],
    queryFn: () => fetchDashboardHardware(devices.map((d) => d.id)),
    enabled: devices.length > 0,
    refetchInterval: 5000,
  });

  const healthy = devices.filter(
    (d) =>
      Date.now() - Number(d.time || 0) < 20000 &&
      Number(d.cpu || 0) < 70 &&
      Number(d.ram || 0) < 80
  );

  const warning = devices.filter(
    (d) =>
      Date.now() - Number(d.time || 0) < 20000 &&
      ((Number(d.cpu || 0) >= 70 && Number(d.cpu || 0) < 90) ||
        (Number(d.ram || 0) >= 80 && Number(d.ram || 0) < 90))
  );

  const critical = devices.filter(
    (d) =>
      Date.now() - Number(d.time || 0) < 20000 &&
      (Number(d.cpu || 0) >= 90 || Number(d.ram || 0) >= 90)
  );

  const offline = devices.filter(
    (d) => Date.now() - Number(d.time || 0) >= 20000
  );

  return {
    devices,
    alerts,
    hardware,
    healthy,
    warning,
    critical,
    offline,
    isLoading:
  devicesLoading ||
  alertsLoading ||
  hardwareLoading,
  };
}
