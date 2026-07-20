export type PermissionAction = "view" | "create" | "edit" | "delete" | "execute";
export type PermissionMap = Record<string, Record<PermissionAction, boolean>>;

/** Matches CLAUDE.md's "Permissions" section. */
export const RBAC_MODULES = [
  "dashboard",
  "devices",
  "inventory",
  "compliance",
  "incidents",
  "autoHeal",
  "policies",
  "reports",
  "settings",
  "users",
] as const;

export const RBAC_ACTIONS: PermissionAction[] = ["view", "create", "edit", "delete", "execute"];
