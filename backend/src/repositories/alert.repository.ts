import { query } from "./dbRepository";

export async function findRecentAlerts() {
  return query(
    "SELECT * FROM alerts ORDER BY time DESC LIMIT 100"
  );
}

export async function findAlertsSince(since: number) {
  return query(
    "SELECT * FROM alerts WHERE time > $1 ORDER BY time DESC",
    [since]
  );
}

export async function acknowledgeAlertByTime(time: string) {
  return query(
    "UPDATE alerts SET acknowledged=true WHERE time=$1",
    [time]
  );
}
