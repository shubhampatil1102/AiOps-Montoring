export function getSeverity(msg: string) {
  if (msg.includes("OFFLINE")) return { color:"#ef4444", label:"CRITICAL" };
  if (msg.includes("CPU")) return { color:"#f59e0b", label:"WARNING" };
  if (msg.includes("RAM")) return { color:"#f59e0b", label:"WARNING" };
  return { color:"#22c55e", label:"INFO" };
}

export function extractProcess(msg: string) {
  const match = msg.match(/caused by ([^ ]+)/);
  return match ? match[1] : null;
}
