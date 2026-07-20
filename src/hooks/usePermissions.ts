import { useAuth } from "@/AuthContext";
import type { PermissionAction } from "@/api/auth";

export function usePermissions() {
  const { user, permissions } = useAuth();

  function can(module: string, action: PermissionAction = "view"): boolean {
    return Boolean(permissions?.[module]?.[action]);
  }

  return { can, role: user?.role, permissions };
}
