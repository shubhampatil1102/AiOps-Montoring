import { useQuery } from "@tanstack/react-query";
import { API_URL } from "@/api/config";

export interface Device {
  id: string;
  cpu?: number;
  ram?: number;
  time?: number;
}

export interface Alert {
  id: string;
  message: string;
  time: number;
}

export interface DeviceHardware {
  cpu_temp?: number;
}

export type HardwareMap = Record<string, DeviceHardware>;

export default function useDashboardData() {
  // Devices
  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ["devices"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/devices`);
      return response.json();
    },
    refetchInterval: 5000,
  });

  // Alerts
  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ["alerts"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/alerts`);
      return response.json();
    },
    refetchInterval: 5000,
  });

  // Hardware
  const { data: hardware = {} } = useQuery<HardwareMap>({
    queryKey: ["hardware", devices.map((d) => d.id).join(",")],
    queryFn: async () => {
      const ids = devices.map((d) => d.id).join(",");

      if (!ids) return {};

      const response = await fetch(
        `${API_URL}/devices/hardware?ids=${encodeURIComponent(ids)}`
      );

      return response.json();
    },
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
  };
}