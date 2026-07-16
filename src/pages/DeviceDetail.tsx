import { useParams } from "react-router-dom";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { API_URL } from "@/api/config";
import {
  fetchDevice,
  fetchDeviceCompliance,
  fetchDeviceEvents,
  fetchDeviceHardware,
  fetchDeviceHistory,
  fetchDeviceInventory,
  fetchDeviceTopProcesses,
  fetchDeviceUpdates,
} from "@/api/devices";
import "./remediation.css";
import Spinner from "../components/Spinner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import GlassCard from "../components/GlassCard";
import { PuzzleIcon } from "lucide-react";

const API = API_URL;

type Device = {
  id: string;
  cpu?: number | string;
  ram?: number | string;
  time?: number;
};

type MetricPoint = {
  cpu: number;
  ram: number;
  time: number;
};

type ProcessItem = {
  name: string;
  cpu?: number | string;
  ram?: number | string;
};

type DeviceEvent = {
  type: string;
  message: string;
  time: number;
};

type Compliance = {
  bitlocker?: string | boolean;
  tpm?: string | boolean;
  secureboot?: string | boolean;
  secureBoot?: string | boolean;
  defender?: string | boolean;
  updated_at?: number;
};

type Hardware = {
  cpu_temp?: number;
  disk?: number;
  battery_health?: string;
  battery_health_percent?: number;
  fan_status?: string;
  disk_free?: number;
  risk?: "LOW" | "MEDIUM" | "HIGH" | string;
  health_score?: number;
};

type DeviceUpdate = {
  windows_update_status?: string;
  pending_updates?: number | string;
  failed_updates?: number | string;
  driver_status?: string;
  outdated_drivers?: number | string;
  last_checked?: number;
};

type InventoryRecord = {
  updated_at?: number;
  services_summary?: {
    auto_running_issue_count?: number;
    recent_failure_count?: number;
    auto_stopped?: Array<{
      name: string;
      display_name: string;
      start_mode: string;
      state: string;
    }>;
    recent_failures?: Array<{
      time: number;
      id: number;
      message: string;
    }>;
  };
  drivers_summary?: {
    problem_count?: number;
    outdated_count?: number;
    problems?: Array<{
      name: string;
      status?: string;
      error_code?: number;
      device_id?: string;
    }>;
    outdated?: Array<{
      device_name?: string;
      manufacturer?: string;
      version?: string;
      driver_date?: string;
    }>;
  };
};

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

export default function DeviceDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const [range, setRange] = useState("1h");
  const [updateActionMessage, setUpdateActionMessage] = useState("");

  const {
    data: device,
    isLoading: isDeviceLoading,
    isError: isDeviceError,
  } = useQuery<Device>({
    queryKey: ["device", id],
    queryFn: () => fetchDevice(id),
    refetchInterval: 5000,
    enabled: !!id,
  });

  const { data: history = [] } = useQuery<MetricPoint[]>({
    queryKey: ["history", id, range],
    queryFn: () => fetchDeviceHistory(id, range),
    refetchInterval: 5000,
    enabled: !!id,
  });

  const { data: processes = [] } = useQuery<ProcessItem[]>({
    queryKey: ["top-processes", id],
    queryFn: () => fetchDeviceTopProcesses(id),
    refetchInterval: 5000,
    enabled: !!id,
  });

  const { data: events = [], refetch: refetchEvents } = useQuery<DeviceEvent[]>({
    queryKey: ["events", id],
    queryFn: () => fetchDeviceEvents(id),
    refetchInterval: 5000,
    enabled: !!id,
  });

  const { data: compliance = {} } = useQuery<Compliance>({
    queryKey: ["compliance", id],
    queryFn: () => fetchDeviceCompliance(id),
    refetchInterval: 4000,
    enabled: !!id
  });

  const { data: hardware = {} } = useQuery<Hardware>({
    queryKey: ["hardware", id],
    queryFn: () => fetchDeviceHardware(id),
    refetchInterval: 4000,
    enabled: !!id
  });

  const { data: update = {}, refetch: refetchUpdate } = useQuery<DeviceUpdate>({
    queryKey: ["update", id],
    queryFn: () => fetchDeviceUpdates(id),
    refetchInterval: 4000,
    enabled: !!id
  });

  const { data: inventory = {} } = useQuery<InventoryRecord>({
    queryKey: ["inventory", id],
    queryFn: () => fetchDeviceInventory(id),
    refetchInterval: 5000,
    enabled: !!id
  });

  const runDeviceScript = useMutation({
    mutationFn: async ({ script, successMessage }: { script: string; successMessage: string }) => {
      const res = await fetch(`${API}/scripts/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: id,
          script
        })
      });

      if (!res.ok) {
        throw new Error("Failed to queue device action");
      }

      return { ...(await res.json()), successMessage };
    },
    onSuccess: async (data) => {
      setUpdateActionMessage(data.successMessage);
      await Promise.all([refetchUpdate(), refetchEvents()]);
    },
    onError: (error) => {
      setUpdateActionMessage(
        error instanceof Error ? error.message : "Unable to start the device action"
      );
    }
  });

  if (!id) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Device ID not provided</h2>
        <p>Please select a device from the Devices list.</p>
      </div>
    );
  }

  if (isDeviceLoading) {
    return <Spinner label="Loading device details..." />;
  }

  if (isDeviceError) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Unable to load device details</h2>
        <p>There was a problem fetching the device information. Please try again.</p>
      </div>
    );
  }

  if (!device || !device.id) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Device not found</h2>
        <p>Check that the selected device exists and try again.</p>
      </div>
    );
  }

  function queueWindowsUpdateScan() {
    runDeviceScript.mutate({
      successMessage: "Update scan queued on the client machine.",
      script: `
$ErrorActionPreference = "Stop"
if (Get-Module -ListAvailable -Name PSWindowsUpdate) {
  Import-Module PSWindowsUpdate
  Get-WindowsUpdate -MicrosoftUpdate -IgnoreUserInput -AcceptAll | Out-String
} else {
  UsoClient StartScan
  "Triggered Windows Update scan using UsoClient."
}
      `.trim()
    });
  }

  function queueWindowsUpdateInstall() {
    runDeviceScript.mutate({
      successMessage: "Update install action queued on the client machine.",
      script: `
$ErrorActionPreference = "Stop"
if (Get-Module -ListAvailable -Name PSWindowsUpdate) {
  Import-Module PSWindowsUpdate
  Install-WindowsUpdate -MicrosoftUpdate -AcceptAll -IgnoreReboot -Confirm:$false | Out-String
} else {
  UsoClient StartDownload
  Start-Sleep -Seconds 5
  UsoClient StartInstall
  "Triggered Windows Update download and install using UsoClient."
}
      `.trim()
    });
  }




  return (
    <div
      className="remediation-scroll"
      style={{
        display: "grid",
        gap: 16,
        minHeight: "calc(100vh - 40px)",
        overflowX: "hidden",
        overflowY: "auto",
        paddingRight: 6,
      }}
    >
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Device: {id}</h1>
        <div style={{ color: "#64748b", fontSize: 14 }}>
          Full device health, compliance, and remediation tooling in the same page theme.
        </div>
      </div>

      {/* Info */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          gap: 16,
        }}
      >

        {/* <Info title="CPU" value={`${device?.cpu?.toFixed(1) ?? 0}%`} />
        <Info title="RAM" value={`${device?.ram?.toFixed(1) ?? 0}%`} /> */}

        <Info
          title="CPU"
          value={`${Number(device?.cpu ?? 0).toFixed(1)}%`}
        />

        <Info
          title="RAM"
          value={`${Number(device?.ram ?? 0).toFixed(1)}%`}
        />
        <Info
          title="Status"
          value={Date.now() - (device?.time ?? 0) < 20000 ? "ONLINE" : "OFFLINE"}
          color={Date.now() - (device?.time ?? 0) < 20000 ? "#22c55e" : "#ef4444"}
        />
      </div>
      <GlassCard>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <PuzzleIcon />
          <h4 style={{ fontWeight: 600, fontSize: 19 }}>Activity monitor </h4>
        </div>


        {/* Range */}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          {["1h", "1d", "1w"].map((value) => (
            <button
              key={value}
              onClick={() => setRange(value)}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                background: range === value ? "#38fc80" : "#d1fae5",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {value.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Charts */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
            gap: 12,
            fontSize: 12,
          }}
        >
          <Chart title="CPU Usage %" data={history} dataKey="cpu" color="#22c55e" />
          <Chart title="RAM Usage %" data={history} dataKey="ram" color="#3b82f6" />
        </div>
      </GlassCard>
      <GlassCard style={{ marginTop: 5 }}>
        <div>
          <h3>Security Compliance</h3>

          {!compliance && <div>Loading...</div>}

          {compliance && (
            <>
              <StatusRow label="Bitlocker" value={compliance.bitlocker} />
              <StatusRow label="TPM" value={compliance.tpm} />
              <StatusRow
                label="Secure Boot"
                value={compliance.secureboot ?? compliance.secureBoot}
              />
              <StatusRow label="Windows Defender" value={compliance.defender} />

              <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
                Last checked: {
                  compliance.updated_at
                    ? new Date(Number(compliance.updated_at)).toLocaleString()
                    : "-"
                }
              </div>
            </>
          )}
        </div>
      </GlassCard>

      <GlassCard>
        <h3>Hardware Health AI</h3>

        <StatusRow label="CPU Temp"
          value={hardware?.cpu_temp}
          displayValue={hardware?.cpu_temp !== undefined ? `${hardware.cpu_temp} "°C"` : "--"} />

        <StatusRow label="Disk Usage"
          value={hardware?.disk}
          displayValue={hardware?.disk !== undefined ? `${hardware.disk} %` : "--"} />

        <StatusRow label="Battery Health"
          value={hardware?.battery_health}
          displayValue={`${hardware?.battery_health ?? "--"} ${hardware?.battery_health_percent ? `(${hardware.battery_health_percent}%)` : ""}`} />
        <StatusRow label="Fan Speed"
          value={hardware?.fan_status}
          displayValue={hardware?.fan_status ?? "--"} />
        <StatusRow label="Free Disk Space"
          value={hardware?.disk_free}
          displayValue={`C Drive : ${hardware?.disk_free ?? "--"} GB`} />

        <div style={{
          marginTop: 15,
          fontSize: 18,
          fontWeight: 600,
          color:
            hardware?.risk === "LOW" ? "#22c55e" :
              hardware?.risk === "MEDIUM" ? "#f59e0b" :
                "#ef4444"
        }}>
          AI Health Score : {hardware?.health_score ?? "--"}/100
        </div>

      </GlassCard>
      <GlassCard>
        <h3 style={{ marginBottom: 5 }}>System Updates & Drivers</h3>

        <StatusRow
          label="Windows Update"
          value={update?.windows_update_status}
          onFix={queueWindowsUpdateScan}
        />

        <StatusRow
          label="Pending Updates"
          value={update?.pending_updates}
          displayValue={String(update?.pending_updates ?? "--")}
          onFix={queueWindowsUpdateInstall}
        />

        <StatusRow
          label="Failed Updates"
          value={update?.failed_updates}
          displayValue={String(update?.failed_updates ?? "--")}
          onFix={queueWindowsUpdateInstall}
        />

        <StatusRow
          label="Driver Health"
          value={update?.driver_status}
        />

        <StatusRow
          label="Outdated Drivers"
          value={update?.outdated_drivers}
          displayValue={String(update?.outdated_drivers ?? "--")}
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <button
            onClick={queueWindowsUpdateScan}
            disabled={runDeviceScript.isPending}
            style={updateButton("#0f766e")}
          >
            {runDeviceScript.isPending ? "Queueing..." : "Check for Updates"}
          </button>

          <button
            onClick={queueWindowsUpdateInstall}
            disabled={runDeviceScript.isPending}
            style={updateButton("#2563eb")}
          >
            {runDeviceScript.isPending ? "Queueing..." : "Install Pending Updates"}
          </button>
        </div>

        {updateActionMessage && (
          <div style={{ marginTop: 10, fontSize: 13, color: "#475569" }}>
            {updateActionMessage}
          </div>
        )}

        <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
          Last checked: {update?.last_checked ? new Date(Number(update.last_checked)).toLocaleString() : "-"}
        </div>

      </GlassCard>

      <GlassCard>
        <h3 style={{ marginBottom: 8 }}>Windows Services & Drivers</h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
            gap: 12,
            marginBottom: 16
          }}
        >
          <MiniStat
            title="Auto Services Stopped"
            value={inventory?.services_summary?.auto_running_issue_count ?? 0}
            color={(inventory?.services_summary?.auto_running_issue_count ?? 0) > 0 ? "#f59e0b" : "#22c55e"}
          />
          <MiniStat
            title="Recent Service Failures"
            value={inventory?.services_summary?.recent_failure_count ?? 0}
            color={(inventory?.services_summary?.recent_failure_count ?? 0) > 0 ? "#ef4444" : "#22c55e"}
          />
          <MiniStat
            title="Driver Problems"
            value={inventory?.drivers_summary?.problem_count ?? 0}
            color={(inventory?.drivers_summary?.problem_count ?? 0) > 0 ? "#ef4444" : "#22c55e"}
          />
          <MiniStat
            title="Outdated Drivers"
            value={inventory?.drivers_summary?.outdated_count ?? 0}
            color={(inventory?.drivers_summary?.outdated_count ?? 0) > 0 ? "#f59e0b" : "#22c55e"}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
            gap: 1,
            fontSize: 12,


          }}
        >
          <IssueList
            title="Automatic Services Not Running"
            items={ensureArray<{ name: string; display_name?: string; start_mode: string; state: string }>(inventory?.services_summary?.auto_stopped).map((service) => ({
              primary: service.display_name || service.name,
              secondary: `${service.name} • ${service.start_mode} • ${service.state}`
            }))}
            emptyText="No automatic services are currently stopped."
          />

          <IssueList
            title="Recent Service Failures"
            items={ensureArray<{ time: number; id: number; message: string }>(inventory?.services_summary?.recent_failures).map((failure) => ({
              primary: `Event ${failure.id}`,
              secondary: `${failure.message} • ${new Date(Number(failure.time)).toLocaleString()}`
            }))}
            emptyText="No recent service failures found."
          />

          <IssueList
            title="Driver Problems"
            items={ensureArray<{ name: string; status?: string; error_code?: number }>(inventory?.drivers_summary?.problems).map((driver) => ({
              primary: driver.name || "Unknown driver",
              secondary: `Status: ${driver.status ?? "Unknown"} • Error code: ${driver.error_code ?? "-"}`
            }))}
            emptyText="No driver problems detected."
          />

          <IssueList
            title="Outdated Drivers"
            items={ensureArray<{ device_name?: string; manufacturer?: string; version?: string; driver_date?: string }>(inventory?.drivers_summary?.outdated).map((driver) => ({
              primary: driver.device_name || "Unknown device",
              secondary: `${driver.manufacturer ?? "Unknown vendor"} • ${driver.version ?? "-"} • ${driver.driver_date ?? "-"}`
            }))}
            emptyText="No outdated drivers found."
          />
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>
          Last inventory refresh: {inventory?.updated_at ? new Date(Number(inventory.updated_at)).toLocaleString() : "-"}
        </div>
      </GlassCard>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >

        <GlassCard>
          {/* Processes */}

          <div style={{ background: "#fbfcfd", padding: 16, borderRadius: 12 }}>
            <h3 style={{ marginBottom: 10 }}>Top Processes</h3>
            {processes.map((p: any) => (
              <div key={p.name} style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{p.name}</span>
                {/* <span>{p.cpu}%</span> */}
                <span>{Number(p.cpu ?? 0).toFixed(1)}%</span>
              </div>

            ))}
          </div>

        </GlassCard>
        <GlassCard>
          {/* EVENTS TIMELINE */}
          <div style={{ background: "white", padding: 15, borderRadius: 12 }}>
            <h3>Incident Timeline</h3>

            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {events.map((e: any) => (
                <div key={e.time} style={{ borderBottom: "1px solid #e5e7eb", padding: "8px 0", display: "flex", gap: 10 }}>
                  <span>
                    {e.type === "OFFLINE"
                      ? "🔴"
                      : e.type === "ONLINE"
                        ? "🟢"
                        : e.type.includes("CPU")
                          ? "🟠"
                          : "🟡"}
                  </span>

                  <div>
                    <div style={{ fontWeight: 350 }}>{e.message}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      {new Date(Number(e.time)).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>

    </div>

  );
}

function StatusRow({
  label,
  value,
  displayValue,
  onFix
}: {
  label: string;
  value: unknown;
  displayValue?: string;
  onFix?: () => void;
}) {
  const { ok, toneColor } = evaluateStatus(label, value);
  const text = displayValue ?? formatStatusValue(value);

  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      padding: "12px 0",
      borderBottom: "1px solid #eee",
      gap: 16
    }}>
      <div style={{ color: "#334155" }}>{label}</div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", textAlign: "right", flexWrap: "wrap", justifyContent: "flex-end" }}>
        <span style={{
          color: toneColor,
          fontWeight: 600
        }}>
          {ok ? "OK" : "Check"} • {text}
        </span>

        {!ok && (
          <button
            onClick={onFix}
            style={{
              background: "#25eb3f",
              color: "black",
              border: "none",
              padding: "4px 10px",
              borderRadius: 6,
              cursor: "pointer"
            }}
          >
            Repair
          </button>
        )}
      </div>
    </div>
  );
}

/* small components */

function Info({ title, value, color = "black" }: any) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 16,
        background: "linear-gradient(135deg,#f8fafc,#eef2ff)",
        border: "1px solid #e5e7eb",
        boxShadow: "0 12px 28px rgba(15,23,42,0.06)",
        minWidth: 0,
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
      className="panel"
      onMouseEnter={(e: any) => (e.currentTarget.style.transform = "translateY(-3px)")}
      onMouseLeave={(e: any) => (e.currentTarget.style.transform = "translateY(0)")}
    >
      <div style={{ color: "#111827", marginBottom: 8, fontWeight: 600 }}>{title}</div>
      <div style={{ fontFamily: "monospace", fontSize: 26, color, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function evaluateStatus(label: string, value: unknown) {
  const text = String(value ?? "").trim().toUpperCase();
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  if (label === "CPU Temp") {
    const ok = Number.isFinite(numberValue) && numberValue < 70;
    return { ok, toneColor: ok ? "#16a34a" : "#dc2626" };
  }

  if (label === "Disk Usage") {
    const ok = Number.isFinite(numberValue) && numberValue < 80;
    return { ok, toneColor: ok ? "#16a34a" : "#dc2626" };
  }

  if (label === "Battery Health") {
    const ok = ["EXCELLENT", "GOOD", "HEALTHY", "NORMAL"].some((token) => text.includes(token));
    return { ok, toneColor: ok ? "#16a34a" : "#d97706" };
  }

  if (label === "Free Disk Space") {
    const ok = Number.isFinite(numberValue) && numberValue > 10;
    return { ok, toneColor: ok ? "#16a34a" : "#d97706" };
  }

  if (label === "Pending Updates" || label === "Outdated Drivers" || label === "Failed Updates") {
    const ok = Number.isFinite(numberValue) ? numberValue === 0 : text === "0" || text === "NONE";
    return { ok, toneColor: ok ? "#16a34a" : "#d97706" };
  }

  if (label === "Windows Update" || label === "Driver Health") {
    const ok = ["UP TO DATE", "UPDATED", "HEALTHY", "OK", "GOOD", "ENABLED"].some((token) =>
      text.includes(token)
    );
    return { ok, toneColor: ok ? "#16a34a" : "#d97706" };
  }

  const ok = normalizeBooleanLike(value);
  return { ok, toneColor: ok ? "#16a34a" : "#dc2626" };
}

function normalizeBooleanLike(value: unknown) {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "").trim().toUpperCase();
  return ["TRUE", "YES", "ON", "ENABLED", "READY", "ACTIVE", "OK", "GOOD", "PRESENT"].includes(text);
}

function formatStatusValue(value: unknown) {
  if (value === undefined || value === null || value === "") return "--";
  if (typeof value === "boolean") return value ? "Enabled" : "Disabled";
  return String(value);
}

function Chart({
  title,
  data,
  dataKey,
  color
}: {
  title: string;
  data: MetricPoint[];
  dataKey: "cpu" | "ram";
  color: string;
}) {
  const formatted = data.map((d: any) => ({
    ...d,
    time: new Date(Number(d.time)).toLocaleTimeString(),
  }));

  const latestValue =
    formatted.length > 0
      ? Number(formatted[formatted.length - 1][dataKey] ?? 0).toFixed(1)
      : "--";

  return (
    <div
      style={{
        background: "linear-gradient(180deg,#f8fbff,#eef4ff)",
        padding: 20,
        borderRadius: 18,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        border: "1px solid #dbe7ff",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Live trend for {title.toLowerCase()}</div>
        </div>
        <div style={{ color, fontWeight: 800, fontSize: 24 }}>{latestValue}{latestValue !== "--" ? "%" : ""}</div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={formatted} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id={`chart-fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.24} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#dbeafe" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={34} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #dbeafe",
              boxShadow: "0 12px 30px rgba(15,23,42,0.12)",
            }}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
            fill={`url(#chart-fill-${dataKey})`}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function updateButton(background: string): React.CSSProperties {
  return {
    background,
    color: "white",
    border: "none",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700
  };
}

function MiniStat({
  title,
  value,
  color
}: {
  title: string;
  value: number | string;
  color: string;
}) {
  return (
    <div
      style={{
        background: "linear-gradient(180deg,#ffffff,#f8fafc)",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 14
      }}
    >
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function IssueList({
  title,
  items,
  emptyText
}: {
  title: string;
  items: Array<{ primary: string; secondary: string }>;
  emptyText: string;
}) {
  return (
    <div
      style={{
        background: "#f7f9fa",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 11,
        minWidth: 0
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>{title}</div>

      <div style={{ maxHeight: 230, overflowY: "auto", display: "grid", gap: 10 }}>
        {items.length === 0 && (
          <div style={{ color: "#64748b", fontSize: 13 }}>{emptyText}</div>
        )}

        {items.map((item, index) => (
          <div
            key={`${item.primary}-${index}`}
            style={{
              borderBottom: "1px solid #fcfdff",
              boxShadow: "0 4px 12px rgba(105, 100, 100, 0.08)",
              paddingBottom: 10
            }}
          >
            <div style={{ fontWeight: 600, color: "#0f172a" }}>{item.primary}</div>
            <div style={{ fontSize: 12, color: "#f90303", marginTop: 4, lineHeight: 1.4, opacity: 0.7 }}>
              {item.secondary}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
