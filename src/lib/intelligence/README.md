# Intelligence Framework

Shared pipeline consumed by every Intelligence Service (Battery, Storage,
Performance, Security, Network, Asset, Update, and future modules). This
directory contains **no domain knowledge** — nothing here knows what
"battery" or "disk" means. A service module supplies data + config; the
framework returns a normalized `IntelligenceResult`.

This is infrastructure only. No Intelligence Service page is built here —
see `examples/batteryIntelligenceExample.ts` for how one would plug in.

## Pipeline

```
Raw Metrics (existing hooks: useDashboardData, useMetricsHistory, ...)
   -> adapters.ts        normalize into TimeSeriesPoint[] / WeightedComponent[]
   -> trendEngine         slope, moving average, anomalies, peak hours
   -> healthScoreEngine    weighted 0-100 score + level
   -> predictionEngine    threshold-crossing forecast (or honest "insufficient data")
   -> riskEngine          risk score, priority, severity, urgency
   -> recommendationEngine  rule-based recommendations, normalized shape
   -> insightGenerator     "X increased 18% this week" sentences
   -> automationOpportunityEngine  known-issue -> known-action lookup
   -> IntelligenceResult   one object, returned by pipeline.ts
```

`pipeline.ts`'s `runIntelligencePipeline(config)` is the only place these are
wired together in this order. `useIntelligence.ts` is a thin memoized React
wrapper around it — no network calls of its own.

## Modules and responsibilities

| File | Responsibility |
|---|---|
| `types.ts` | Every shared interface. The contract every engine and every service agrees to. |
| `trendEngine.ts` | Pure stats over a `TimeSeriesPoint[]`: slope, moving average, anomaly detection (stddev threshold), peak hours, period-over-period comparison. |
| `healthScoreEngine.ts` | Weighted-average scorer. Generalizes the score formula originally written inline in `OrgHealthCard` and Dashboard's Performance/Battery/Storage cards — both were "weighted average of {value, weight} pairs," now one function. |
| `predictionEngine.ts` | Linear regression → threshold-crossing date + confidence (from R² and sample size). Returns `insufficientData: true` below a minimum sample size/span rather than guessing. |
| `riskEngine.ts` | Combines health score + prediction into risk score / priority / severity / urgency. Does not assume trend direction is good or bad — that judgment already lives in the health score the caller computed. |
| `recommendationEngine.ts` | Normalizer (`buildRecommendation`) + generic rule evaluator (`evaluateRules`). Services supply their own `{ condition, build }` rules; this module guarantees the output shape. |
| `insightGenerator.ts` | Template sentences from numbers (`generateChangeInsight`, `generateCountInsight`). |
| `automationOpportunityEngine.ts` | Looks up an issue category against an extensible action catalog. Suggestion only — mirrors the existing heal/script pipeline's shape so a future Automation Hub can consume it without translation. Execution is out of scope here. |
| `confidenceCalculator.ts` | One shared 0-1 confidence formula (sample size + data recency + fit stability), used by both the prediction and recommendation engines. |
| `adapters.ts` | The only files that know this app's real data shapes (`MetricsHistoryPoint`, `HardwareMap`, `Device`). Converts existing hook output into the generic shapes above — no new API endpoints. |
| `pipeline.ts` | Orchestrator. `runIntelligencePipeline(config)`. |

## UI kit (`src/components/intelligence/`)

Each component renders one shape from `types.ts` and composes *existing*
primitives rather than reinventing chart rendering:

- `HealthScoreCard` — `Card` + the existing `RadialProgress` (`src/components/charts/RadialProgress`) + a level `Badge`.
- `TrendCard` — `DashboardWidget` + the existing `Sparkline` + a change-percent indicator.
- `ForecastWidget` — history (solid) + projected segment (dashed) to the predicted crossing point, or an honest "insufficient data" state.
- `InsightCard`, `RecommendationCard`, `RiskCard`, `PredictionCard` — small presentational cards.
- `ConfidenceBadge` — wraps the existing `Badge`, mapping a 0-1 score to Low/Medium/High.

**No "Mini Trend Chart" component exists here on purpose** — `src/components/charts/Sparkline` already is that component (built in the Epic 3 dashboard redesign). Reused directly; not duplicated.

## Extension points — adding a new Intelligence Service

A future service (Battery, Storage, Security, ... or something not yet
imagined — certificates, licenses, cloud resources, VMs, containers) needs
**zero changes to this directory**. It:

1. Fetches its own data via existing hooks/APIs.
2. Writes a small adapter call (or a new one-off function in `adapters.ts`
   if its data shape isn't covered yet) to get `TimeSeriesPoint[]` and/or
   `WeightedComponent[]`.
3. Calls `useIntelligence({ domain, series, healthComponents,
   predictionThreshold, recommendationRules, automationCategory, ... })`.
4. Renders the result with the existing UI kit.

That's the whole integration surface. See `examples/batteryIntelligenceExample.ts`.

## Honesty constraint

The Prediction Engine will happily return a confident forecast for a
service with rich historical data (Performance, today) and will just as
happily return `insufficientData: true` for a service with only a
snapshot (Battery, today). Both are correct behavior from the same
function — the framework's job is to be right about what it doesn't know,
not to produce a number on demand. See the worked example for both cases
side by side.

## Battery Intelligence, V2 (Historical Analytics Platform)

`examples/batteryIntelligenceExample.ts` originally fed the pipeline one
hardcoded snapshot point because no battery history existed anywhere in the
system — that was real and honest at the time. The Historical Analytics
Platform epic added a generic `metric_samples` store (see
`backend/init.sql`) that now records `battery_health_percent` (and
`disk`, `disk_free`, `cpu_temp`, `uptime_seconds`, `pending_updates`,
`failed_updates`) every ingest, plus hourly/daily aggregates and a rolling
baseline computed server-side.

A real Battery Intelligence page would now do:

```ts
const { data } = useMetricHistory(deviceId, "battery_health_percent", "1w");
const series = adaptAnalyticsHistoryToSeries(data ?? []);
const result = useIntelligence({ domain: "battery", series, ... });
```

Nothing else in this directory changes — `adaptAnalyticsHistoryToSeries`
(in `adapters.ts`) is the only new integration surface. The pipeline still
returns `insufficientData: true` honestly until enough real history has
accumulated (the minimum sample/span thresholds in `predictionEngine.ts`
are unchanged) — this doesn't fabricate a forecast, it just means the
forecast becomes real instead of permanently unavailable once the agent has
been reporting for long enough. Not wired into a page or executed against
live data in this epic — doing so would require a real running agent
reporting for days, which is out of scope to fake.

## Known future consumer, not migrated yet

`src/components/dashboard/widgets/AIInsightWidget/AIInsightsWidget.tsx`
renders ad hoc recommendation-shaped JSX today. It's a good candidate to
migrate onto `RecommendationCard` once a real service (not just the
framework) exists to drive it — not done in this epic, since it's a live
widget and touching it isn't necessary to prove the framework works.
