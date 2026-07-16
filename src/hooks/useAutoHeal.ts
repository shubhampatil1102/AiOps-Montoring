import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveHealSuggestion,
  fetchHealSuggestions,
  fetchHealTimeline,
  fetchScriptJobs,
  fetchScriptLibrary,
  rejectHealSuggestion,
  runAutoHealScript,
} from "@/api/autoHeal";
import type { RunScriptPayload } from "@/types/autoHeal";

export function useAutoHealData() {
  const suggestions = useQuery({
    queryKey: ["heal-suggestions"],
    queryFn: fetchHealSuggestions,
    refetchInterval: 4000,
  });

  const timeline = useQuery({
    queryKey: ["heal-timeline"],
    queryFn: fetchHealTimeline,
    refetchInterval: 3000,
  });

  const jobs = useQuery({
    queryKey: ["script-jobs"],
    queryFn: fetchScriptJobs,
    refetchInterval: 3000,
  });

  const library = useQuery({
    queryKey: ["script-library"],
    queryFn: fetchScriptLibrary,
  });

  return {
    suggestions,
    timeline,
    jobs,
    library,
    isLoading: suggestions.isLoading || timeline.isLoading || jobs.isLoading,
    isError: suggestions.isError || timeline.isError || jobs.isError,
  };
}

export function useAutoHealActions() {
  const queryClient = useQueryClient();

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["heal-suggestions"] });
    void queryClient.invalidateQueries({ queryKey: ["heal-timeline"] });
    void queryClient.invalidateQueries({ queryKey: ["script-jobs"] });
  }

  const approve = useMutation({
    mutationFn: approveHealSuggestion,
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: rejectHealSuggestion,
    onSuccess: invalidate,
  });

  const run = useMutation({
    mutationFn: (payload: RunScriptPayload) => runAutoHealScript(payload),
    onSuccess: invalidate,
  });

  return {
    approve,
    reject,
    run,
  };
}
