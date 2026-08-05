import { APPLICATION_PLUGINS } from "../constants/applicationPlugins";
import * as applicationRepository from "../repositories/application.repository";
import * as dependencyRepository from "../repositories/dependency.repository";
import * as scriptService from "./script.service";

// Real remote actions reuse the existing script_jobs engine (POST
// /scripts/run) exactly like every other remote action in this app —
// no new job-execution mechanism. Kill-process scripts already trigger
// the agent's existing Stop-Process consent popup (agent.ps1 matches
// "Stop-Process" in any submitted script), so that protection applies
// here automatically.

const KNOWN_SERVICE_NAMES = new Set(
  APPLICATION_PLUGINS.flatMap((plugin) => plugin.relatedServiceNames)
);

// Rejects characters that could break out of a double-quoted PowerShell
// string or trigger expansion, rather than trying to escape them — safer
// to refuse an action than to guess a fix for untrusted-shaped input.
function isSafePowerShellLiteral(value: string): boolean {
  return !/["`$;|&]/.test(value);
}

export async function killProcess(deviceId: string, pid: number) {
  if (!Number.isInteger(pid) || pid <= 0) return { status: "INVALID" as const };

  const script = `Stop-Process -Id ${pid} -Force`;
  const result = await scriptService.runScript({ device_id: deviceId, script });
  if (result.status === "INVALID") return { status: "INVALID" as const };
  return { status: "OK" as const, job_id: result.job_id };
}

export async function restartProcess(deviceId: string, pid: number) {
  if (!Number.isInteger(pid) || pid <= 0) return { status: "INVALID" as const };

  const found = await applicationRepository.findProcessByPid(deviceId, pid);
  const row = found.rows[0] as { exe_path: string | null } | undefined;
  const exePath = row?.exe_path;

  if (exePath && !isSafePowerShellLiteral(exePath)) {
    return { status: "INVALID" as const };
  }

  const script = exePath
    ? `Stop-Process -Id ${pid} -Force; Start-Sleep -Seconds 2; Start-Process -FilePath "${exePath}"`
    : `Stop-Process -Id ${pid} -Force`;

  const result = await scriptService.runScript({ device_id: deviceId, script });
  if (result.status === "INVALID") return { status: "INVALID" as const };
  return { status: "OK" as const, job_id: result.job_id, relaunched: Boolean(exePath) };
}

export async function serviceAction(deviceId: string, serviceName: string, action: "restart" | "stop" | "start") {
  if (!KNOWN_SERVICE_NAMES.has(serviceName) || !isSafePowerShellLiteral(serviceName)) {
    return { status: "INVALID" as const };
  }

  const script =
    action === "restart"
      ? `Restart-Service -Name "${serviceName}" -Force`
      : action === "stop"
        ? `Stop-Service -Name "${serviceName}" -Force`
        : `Start-Service -Name "${serviceName}"`;

  const result = await scriptService.runScript({ device_id: deviceId, script });
  if (result.status === "INVALID") return { status: "INVALID" as const };
  return { status: "OK" as const, job_id: result.job_id };
}

// Dependency Intelligence remote actions — same script_jobs mechanism as
// above. "Restart Network Adapter" from the original brief is intentionally
// NOT implemented: this device is managed remotely over that same network
// adapter, so a blind adapter restart risks disconnecting the device from
// the very channel used to manage it. Flushing DNS carries no such risk.

export async function flushDns(deviceId: string) {
  const script = `Clear-DnsClientCache; ipconfig /flushdns`;
  const result = await scriptService.runScript({ device_id: deviceId, script });
  if (result.status === "INVALID") return { status: "INVALID" as const };
  return { status: "OK" as const, job_id: result.job_id };
}

// Task identity is validated against a previously-discovered dependency
// node for this exact device rather than trusting the caller's strings
// directly — same allowlist principle as KNOWN_SERVICE_NAMES above, just
// backed by observed data instead of a static list.
export async function scheduledTaskAction(
  deviceId: string,
  taskPath: string,
  taskName: string,
  action: "enable" | "disable" | "run"
) {
  if (!isSafePowerShellLiteral(taskPath) || !isSafePowerShellLiteral(taskName)) {
    return { status: "INVALID" as const };
  }

  const nodeKey = `${taskPath}${taskName}`;
  const existing = await dependencyRepository.findDependencyNodeByKey(deviceId, "SCHEDULED_TASK", nodeKey);
  if (!existing.rows[0]) return { status: "INVALID" as const };

  const script =
    action === "enable"
      ? `Enable-ScheduledTask -TaskName "${taskName}" -TaskPath "${taskPath}"`
      : action === "disable"
        ? `Disable-ScheduledTask -TaskName "${taskName}" -TaskPath "${taskPath}"`
        : `Start-ScheduledTask -TaskName "${taskName}" -TaskPath "${taskPath}"`;

  const result = await scriptService.runScript({ device_id: deviceId, script });
  if (result.status === "INVALID") return { status: "INVALID" as const };
  return { status: "OK" as const, job_id: result.job_id };
}

// Bundles recent Application/System event-log entries for a process name
// into the script's stdout (captured as script_jobs.output) — a real,
// on-demand log pull rather than a background log-shipping pipeline.
export async function collectDependencyLogs(deviceId: string, processName: string) {
  if (!isSafePowerShellLiteral(processName)) return { status: "INVALID" as const };

  const script = `
$since = (Get-Date).AddHours(-24)
Get-WinEvent -FilterHashtable @{LogName='Application','System'; StartTime=$since} -MaxEvents 200 -ErrorAction SilentlyContinue |
  Where-Object { $_.Message -match [regex]::Escape("${processName}") } |
  Select-Object TimeCreated, Id, LevelDisplayName, Message |
  Format-List | Out-String
`.trim();

  const result = await scriptService.runScript({ device_id: deviceId, script });
  if (result.status === "INVALID") return { status: "INVALID" as const };
  return { status: "OK" as const, job_id: result.job_id };
}
