/** Matches CLAUDE.md's "Roles" section and the backend's role_permissions seed. */
export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  it_admin: "IT Admin",
  helpdesk: "Helpdesk",
  security_analyst: "Security Analyst",
  read_only: "Read Only",
  auditor: "Auditor",
};

export function formatRole(role: string | undefined): string {
  if (!role) return "—";
  return ROLE_LABELS[role] || role;
}
