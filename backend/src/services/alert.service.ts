import * as alertRepository from "../repositories/alert.repository";

export async function getAlerts(sinceQuery: unknown) {
  const since = Number(sinceQuery);

  if (!since || isNaN(since)) {
    const result = await alertRepository.findRecentAlerts();
    return result.rows;
  }

  const result = await alertRepository.findAlertsSince(since);
  return result.rows;
}

export async function acknowledgeAlert(time: string) {
  await alertRepository.acknowledgeAlertByTime(time);
}
