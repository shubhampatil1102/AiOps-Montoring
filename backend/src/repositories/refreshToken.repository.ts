import { query } from "./db.repository";

export async function insert(userId: number, tokenHash: string, createdAt: number, expiresAt: number) {
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, created_at, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, tokenHash, createdAt, expiresAt]
  );
}

export async function findValidByHash(tokenHash: string, now: number) {
  return query(
    `SELECT * FROM refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > $2`,
    [tokenHash, now]
  );
}

export async function revokeByHash(tokenHash: string, revokedAt: number) {
  await query(
    "UPDATE refresh_tokens SET revoked_at = $1 WHERE token_hash = $2 AND revoked_at IS NULL",
    [revokedAt, tokenHash]
  );
}

export async function revokeAllForUser(userId: number, revokedAt: number) {
  await query(
    "UPDATE refresh_tokens SET revoked_at = $1 WHERE user_id = $2 AND revoked_at IS NULL",
    [revokedAt, userId]
  );
}
