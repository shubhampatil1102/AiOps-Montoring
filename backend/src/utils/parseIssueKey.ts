export function parseIssueKey(issueKey: string) {
  const prefix = "ALERT-";
  if (!issueKey.startsWith(prefix)) {
    return null;
  }

  const lastDash = issueKey.lastIndexOf("-");
  if (lastDash <= prefix.length) {
    return null;
  }

  const alertId = issueKey.slice(prefix.length, lastDash);
  const alertTime = issueKey.slice(lastDash + 1);

  if (!alertId || !alertTime) {
    return null;
  }

  return { alertId, alertTime };
}
