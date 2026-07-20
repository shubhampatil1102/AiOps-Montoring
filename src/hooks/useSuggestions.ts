import { useQuery } from "@tanstack/react-query";
import { fetchSuggestions } from "@/api/suggestions";

export default function useSuggestions() {
  return useQuery({
    queryKey: ["suggestions"],
    queryFn: fetchSuggestions,
    refetchInterval: 10000,
  });
}