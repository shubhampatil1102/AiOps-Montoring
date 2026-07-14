import { Policy } from "../types/policy.types";
import * as policyRepository from "../repositories/policy.repository";

let POLICY: Policy = {
  cpu_threshold: 80,
  ram_threshold: 85,
  offline_seconds: 20,
};

export async function loadPolicy() {
  const result = await policyRepository.findFirstPolicy();
  if (result.rows[0]) POLICY = result.rows[0];
}

export function getPolicy() {
  return POLICY;
}

export function setPolicy(policy: Policy) {
  POLICY = policy;
}

export async function getPolicies() {
  const result = await policyRepository.findFirstPolicySettings();
  return result.rows[0] || getPolicy();
}

export async function savePolicies(body: any) {
  const cpuThreshold = Number(body?.cpu_threshold);
  const ramThreshold = Number(body?.ram_threshold);
  const offlineSeconds = Number(body?.offline_seconds);

  if (
    !Number.isFinite(cpuThreshold) ||
    !Number.isFinite(ramThreshold) ||
    !Number.isFinite(offlineSeconds)
  ) {
    return { ok: false as const };
  }

  const existing = await policyRepository.findFirstPolicyId();

  if (existing.rows[0]) {
    await policyRepository.updatePolicy(
      existing.rows[0].id,
      cpuThreshold,
      ramThreshold,
      offlineSeconds
    );
  } else {
    await policyRepository.insertPolicy(
      cpuThreshold,
      ramThreshold,
      offlineSeconds,
      Date.now()
    );
  }

  const policy = {
    cpu_threshold: cpuThreshold,
    ram_threshold: ramThreshold,
    offline_seconds: offlineSeconds,
  };
  setPolicy(policy);

  return { ok: true as const, policy };
}
