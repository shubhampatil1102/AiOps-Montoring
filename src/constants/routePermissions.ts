/**
 * The single pathname → module map driving both the sidebar filter
 * (`Sidebar.tsx`) and the route guard (`PermissionGuard.tsx`) — one source
 * of truth so "menus hide" and "pages reject" can't drift out of sync.
 * Modules match CLAUDE.md's "Permissions" section.
 */
export const routeModuleMap: { path: string; module: string }[] = [
  { path: "/", module: "dashboard" },
  { path: "/live-monitoring", module: "dashboard" },
  { path: "/devices", module: "devices" },
  { path: "/incidents", module: "incidents" },
  { path: "/policies", module: "policies" },
  { path: "/scripts", module: "autoHeal" },
  { path: "/auto-heal", module: "autoHeal" },
  { path: "/remediations", module: "autoHeal" },
  { path: "/settings", module: "settings" },
  // Reuses "inventory" — installed-software discovery is squarely what
  // that module already means, and CLAUDE.md's Permissions list doesn't
  // ask for a dedicated one.
  { path: "/software", module: "inventory" },
];

/** Exact match first, then longest-prefix match (for dynamic routes like
 * /devices/:id). Returns null for unmapped routes — those are not gated. */
export function resolveModuleForPath(pathname: string): string | null {
  const exact = routeModuleMap.find((r) => r.path === pathname);
  if (exact) return exact.module;

  const prefixMatches = routeModuleMap
    .filter((r) => r.path !== "/" && pathname.startsWith(`${r.path}/`))
    .sort((a, b) => b.path.length - a.path.length);

  return prefixMatches[0]?.module ?? null;
}
