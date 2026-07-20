import { query } from "./db.repository";

export async function findGrantsForRole(role: string) {
  return query(
    "SELECT module, action FROM role_permissions WHERE role = $1",
    [role]
  );
}
