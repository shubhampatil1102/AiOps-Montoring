/**
 * Insight Generator — turns numbers into short, human sentences
 * ("CPU usage increased 18% this week."). Pure string templating, no
 * domain knowledge of what the metric is.
 */
import type { Insight, RiskSeverity, TrendDirection } from "./types";

function severityFromMagnitude(absPercent: number): RiskSeverity {
  if (absPercent >= 25) return "High";
  if (absPercent >= 10) return "Medium";
  return "Low";
}

/** e.g. "CPU usage increased 18% this week." Returns null for negligible (<1%) change. */
export function generateChangeInsight(
  metricName: string,
  current: number,
  previous: number,
  period = "this period"
): Insight | null {
  if (previous === 0) return null;

  const changePercent = ((current - previous) / previous) * 100;
  if (Math.abs(changePercent) < 1) return null;

  const direction: TrendDirection = changePercent > 0 ? "up" : "down";
  const verb = direction === "up" ? "increased" : "decreased";

  return {
    id: `${metricName}-${direction}-${Date.now()}`,
    message: `${metricName} ${verb} ${Math.abs(changePercent).toFixed(0)}% ${period}.`,
    severity: severityFromMagnitude(Math.abs(changePercent)),
    metric: metricName,
    changeValue: changePercent,
    changeDirection: direction,
  };
}

/** e.g. "Windows Updates failed twice this week." */
export function generateCountInsight(
  label: string,
  count: number,
  period = "this week",
  severity: RiskSeverity = "Medium"
): Insight | null {
  if (count <= 0) return null;

  const times = count === 1 ? "once" : count === 2 ? "twice" : `${count} times`;

  return {
    id: `${label}-count-${Date.now()}`,
    message: `${label} occurred ${times} ${period}.`,
    severity,
    metric: label,
  };
}
