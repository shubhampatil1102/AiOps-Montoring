export const sidebarColors = {
  background: "#F5F7FA",
  text: "#000000",
  activeStart: "#6B63B5",
  activeEnd: "#4B5AF9",
  Card1:"lightgreen",
  Card2:"orange",
  Card3:"red",
  Card4:"gray",

};
export const statusColors = {
  healthy: "#22c55e",
  warning: "#f59e0b",
  critical: "#ef4444",
  offline: "#64748b",
  info: "#2563eb",
};

/** Maps a 0-100 health/composite score to a status color — the single
 * source of truth every health ring/badge should use instead of a fixed
 * or default color, so a critical score never renders as "healthy" blue. */
export function scoreToColor(score: number): string {
  if (score >= 80) return statusColors.healthy;
  if (score >= 50) return statusColors.warning;
  return statusColors.critical;
}