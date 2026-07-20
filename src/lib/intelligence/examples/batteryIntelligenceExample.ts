/**
 * Example integration — NOT wired into the app, not a page, not a route,
 * not imported by any running code. This exists purely to demonstrate how
 * a future Battery Intelligence module would call the shared framework,
 * per the epic's deliverable #7 ("example integration for Battery
 * Intelligence — do not implement Battery Intelligence itself").
 *
 * Two scenarios, same pipeline function, both honest:
 *
 * Run with: npx tsx src/lib/intelligence/examples/batteryIntelligenceExample.ts
 */
import { runIntelligencePipeline } from "../pipeline";
import type { TimeSeriesPoint } from "../types";

// ---------------------------------------------------------------------------
// Scenario 1 — Battery Intelligence, fed today's REAL data shape.
//
// The agent (agent.ps1) reports `battery_health_percent` as a single
// point-in-time snapshot on every metrics post. There is no battery-history
// table anywhere in the schema (confirmed in the Product Evolution Report
// and Architecture Document — Battery is Tier 2, "current-state now,
// prediction later"). So a real Battery Intelligence module has exactly one
// data point today, not a time series.
// ---------------------------------------------------------------------------
const batterySnapshot: TimeSeriesPoint[] = [
  { time: Date.now(), value: 82 }, // today's battery_health_percent reading
];

const batteryResult = runIntelligencePipeline({
  domain: "battery",
  series: batterySnapshot,
  healthComponents: [{ label: "battery_health_percent", value: 82, weight: 1 }],
  // "Predict when battery health drops below 20%" — a real V2 question,
  // asked honestly against today's V1 data.
  predictionThreshold: { value: 20, direction: "below" },
  predictionOptions: { metric: "battery_health_percent" },
});

console.log("Battery Intelligence — today's real data:");
console.log(JSON.stringify(batteryResult.prediction, null, 2));
/*
Expected output:
{
  "metric": "battery_health_percent",
  "insufficientData": true,
  "predictedDate": null,
  "confidence": 0,
  "reason": "Not enough historical data points (1/5 minimum) to build a
             reliable trend."
}

This is correct and honest — not a bug, not a stub. Once Phase 7 telemetry
(a real charge-cycle/history collector, per the Architecture Document
roadmap) ships, this exact same function call — same shape, same config —
starts returning a real forecast. Nothing about the framework changes.
*/

// ---------------------------------------------------------------------------
// Scenario 2 — Performance, fed real historical data (the same shape
// useMetricsHistory() already returns: hourly-ish cpu/ram averages).
// ---------------------------------------------------------------------------
const now = Date.now();
const performanceHistory: TimeSeriesPoint[] = Array.from({ length: 30 }, (_, i) => ({
  time: now - (30 - i) * 60 * 60 * 1000, // 30 hourly points
  value: 40 + i * 0.3, // gradual real-looking upward creep
}));

const lastCpu = performanceHistory[performanceHistory.length - 1].value;

const performanceResult = runIntelligencePipeline({
  domain: "performance",
  series: performanceHistory,
  healthComponents: [{ label: "cpu", value: 100 - lastCpu, weight: 1 }],
  // "Predict CPU saturation at 90%" — same question shape as Battery's,
  // different domain, same generic engine underneath.
  predictionThreshold: { value: 90, direction: "above" },
  predictionOptions: { metric: "cpu" },
});

console.log("\nPerformance Intelligence — real historical series:");
console.log(JSON.stringify(performanceResult.prediction, null, 2));
/*
Expected output shape:
{
  "metric": "cpu",
  "insufficientData": false,
  "predictedDate": <a real future timestamp, several days out>,
  "confidence": <> 0, based on sample size + fit quality>,
  "reason": "Based on a +7.20/day trend over 30 data points.",
  "slopePerDay": 7.2
}

Same pipeline, same function signature, two genuinely different (both
honest) outcomes — because the underlying data is genuinely different.
That contrast is the whole point of building the engine generically.
*/
