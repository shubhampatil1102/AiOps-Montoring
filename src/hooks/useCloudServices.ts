import { useQuery } from "@tanstack/react-query";
import { fetchCloudIncidents, fetchCloudStatus } from "@/api/cloud";

export function useCloudStatus() {
  return useQuery({
    queryKey: ["cloud-status"],
    queryFn: fetchCloudStatus,
    refetchInterval: 30000,
  });
}

export function useCloudIncidents() {
  return useQuery({
    queryKey: ["cloud-incidents"],
    queryFn: fetchCloudIncidents,
    refetchInterval: 30000,
  });
}
