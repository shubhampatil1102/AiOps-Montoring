import { query } from "../repositories/db.repository";
import * as patchRepository from "../repositories/patch.repository";
import * as scriptRepository from "../repositories/script.repository";
import * as patchService from "./patch.service";
import * as scriptService from "./script.service";

interface PendingScriptRow {
  id: number;
  script: string;
  timeout: number;
  created_at: string | number;
}

// Claims whichever of script_jobs/patch_jobs has the oldest still-PENDING
// row for this device, so the agent's single long-poll endpoint can keep
// serving both "run this script" and "run this patch action" jobs without
// a second polling loop or a new transport.
export async function pullNextAgentJob(deviceId: string) {
  const [scriptResult, patchResult] = await Promise.all([
    query<PendingScriptRow>(
      `SELECT id, script, timeout, created_at
       FROM script_jobs
       WHERE device_id=$1 AND status='PENDING'
       ORDER BY id ASC
       LIMIT 1`,
      [deviceId]
    ),
    patchRepository.findNextPendingPatchJob(deviceId),
  ]);

  const scriptCandidate = scriptResult.rows[0];
  const patchCandidate = patchResult.rows[0];

  if (!scriptCandidate && !patchCandidate) {
    return {};
  }

  const useScript =
    Boolean(scriptCandidate) &&
    (!patchCandidate || Number(scriptCandidate.created_at) <= Number(patchCandidate.created_at));

  if (useScript) {
    await scriptRepository.markJobRunning(scriptCandidate.id);
    return {
      job_id: scriptCandidate.id,
      job_type: "SCRIPT" as const,
      script: scriptCandidate.script,
      timeout: scriptCandidate.timeout || 120,
    };
  }

  await patchRepository.markPatchJobRunning(patchCandidate.id);
  return {
    job_id: patchCandidate.id,
    job_type: "PATCH" as const,
    action: patchCandidate.action,
    related_job_id: patchCandidate.related_job_id ?? null,
    timeout: patchCandidate.timeout || 3600,
  };
}

interface AgentJobResultBody {
  job_id?: number;
  job_type?: "SCRIPT" | "PATCH";
  success?: boolean;
  output?: string;
  error?: string;
  status?: string;
  updates_total?: number;
  updates_processed?: number;
  updates_failed?: number;
  reboot_required?: boolean;
}

export async function saveAgentJobResult(body: AgentJobResultBody) {
  if (body?.job_type === "PATCH") {
    return patchService.completeJob(body);
  }

  return scriptService.saveAgentJobResult(body);
}
