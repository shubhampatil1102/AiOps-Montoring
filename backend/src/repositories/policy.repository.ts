import { query } from "./dbRepository";

export async function findFirstPolicy() {
  return query("SELECT * FROM policies LIMIT 1");
}

export async function findFirstPolicySettings() {
  return query(
    `SELECT cpu_threshold, ram_threshold, offline_seconds
     FROM policies
     ORDER BY id ASC
     LIMIT 1`
  );
}

export async function findFirstPolicyId() {
  return query("SELECT id FROM policies ORDER BY id ASC LIMIT 1");
}

export async function updatePolicy(
  id: number,
  cpuThreshold: number,
  ramThreshold: number,
  offlineSeconds: number
) {
  return query(
    `UPDATE policies
       SET cpu_threshold=$1,
           ram_threshold=$2,
           offline_seconds=$3
       WHERE id=$4`,
    [cpuThreshold, ramThreshold, offlineSeconds, id]
  );
}

export async function insertPolicy(
  cpuThreshold: number,
  ramThreshold: number,
  offlineSeconds: number,
  createdAt: number
) {
  return query(
    `INSERT INTO policies(cpu_threshold, ram_threshold, offline_seconds, created_at)
       VALUES($1,$2,$3,$4)`,
    [cpuThreshold, ramThreshold, offlineSeconds, createdAt]
  );
}
