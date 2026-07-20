import * as analyticsRepository from "../repositories/metricsAnalytics.repository";
import { Logger } from "./logger.service";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function runRetentionCleanup() {
  try {
    const result = await analyticsRepository.findRetentionPolicies();
    const policies = new Map<string, number>(
      result.rows.map((r: { target: string; retain_days: number }) => [r.target, Number(r.retain_days)])
    );

    const now = Date.now();
    const cutoffFor = (target: string) => {
      const days = policies.get(target);
      return days ? now - days * DAY_MS : null;
    };

    const rawCutoff = cutoffFor("raw");
    if (rawCutoff) await analyticsRepository.deleteOldMetricSamples(rawCutoff);

    const hourCutoff = cutoffFor("hour");
    if (hourCutoff) await analyticsRepository.deleteOldAggregates("hour", hourCutoff);

    const dayCutoff = cutoffFor("day");
    if (dayCutoff) await analyticsRepository.deleteOldAggregates("day", dayCutoff);

    const legacyCutoff = cutoffFor("metrics_history");
    if (legacyCutoff) await analyticsRepository.deleteOldLegacyHistory(legacyCutoff);

    const processesCutoff = cutoffFor("processes");
    if (processesCutoff) await analyticsRepository.deleteOldProcesses(processesCutoff);
  } catch (err) {
    Logger.info("RETENTION CLEANUP ERROR:", err);
  }
}

export function startRetentionJob() {
  setInterval(runRetentionCleanup, 24 * 60 * 60 * 1000);
}
