import { query } from "./db.repository";

export async function findByEmailOrUsername(identifier: string) {
  return query(
    "SELECT * FROM users WHERE email = $1 OR username = $1",
    [identifier]
  );
}

export async function findById(id: number) {
  return query("SELECT * FROM users WHERE id = $1", [id]);
}

export async function touchLastLogin(id: number, timestamp: number) {
  await query("UPDATE users SET last_login_at = $1 WHERE id = $2", [timestamp, id]);
}
