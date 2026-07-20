import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { resolveModuleForPath } from "@/constants/routePermissions";
import type { PermissionAction } from "@/api/auth";
import Forbidden from "@/pages/errors/Forbidden";

interface PermissionGuardProps {
  children: ReactNode;
  /** Explicit override for non-route use (e.g. hiding a single action).
   * When omitted, the required module is resolved from the current route
   * via the shared routeModuleMap — the same map the sidebar filters with. */
  module?: string;
  action?: PermissionAction;
}

export default function PermissionGuard({ children, module, action = "view" }: PermissionGuardProps) {
  const { can } = usePermissions();
  const location = useLocation();

  const resolvedModule = module ?? resolveModuleForPath(location.pathname);

  // Routes with no module mapping aren't gated — there's nothing to check.
  if (!resolvedModule) {
    return <>{children}</>;
  }

  if (!can(resolvedModule, action)) {
    return <Forbidden />;
  }

  return <>{children}</>;
}
