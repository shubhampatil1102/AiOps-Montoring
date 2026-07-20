import { useMemo } from "react";
import { runIntelligencePipeline } from "@/lib/intelligence/pipeline";
import type { IntelligencePipelineConfig } from "@/lib/intelligence/pipeline";
import type { IntelligenceResult } from "@/lib/intelligence/types";

/**
 * Thin memoized wrapper around the Intelligence Framework's pipeline. No
 * network requests here — callers pass in data already fetched by their own
 * existing hooks (useDashboardData, useMetricsHistory, ...) via adapters.ts.
 *
 * Memoization contract: pass a `config` that's stable across renders (e.g.
 * built with your own `useMemo`) — this hook memoizes on the config
 * reference, not a deep field-by-field comparison.
 */
export default function useIntelligence<TContext = unknown>(
  config: IntelligencePipelineConfig<TContext>
): IntelligenceResult {
  return useMemo(() => runIntelligencePipeline(config), [config]);
}
