param(
    [string]$BackendUrl
)

$ErrorActionPreference = "Stop"
Write-Host "===== AiOps Agent Starting ====="

# =====================================================
# SERVER URL RESOLUTION
# =====================================================
# Precedence: explicit -BackendUrl param > agent.config.json next to this
# script > localhost fallback for same-machine dev. Never a hardcoded
# machine-specific LAN IP baked into the script itself — that only worked
# on whichever machine happened to have that address.
$ConfigPath = Join-Path $PSScriptRoot "agent.config.json"

function Resolve-BackendUrl {
    param(
        [string]$ParamValue,
        [string]$ConfigPath
    )

    if (-not [string]::IsNullOrWhiteSpace($ParamValue)) {
        return $ParamValue.TrimEnd("/")
    }

    if (Test-Path $ConfigPath) {
        try {
            $config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
            if (-not [string]::IsNullOrWhiteSpace($config.serverUrl)) {
                return $config.serverUrl.TrimEnd("/")
            }
            Write-Host "agent.config.json found but has no 'serverUrl' - falling back to default."
        } catch {
            Write-Host "Could not parse agent.config.json ($ConfigPath) - falling back to default. Error: $_"
        }
    }

    return "http://localhost:4000"
}

$BackendUrl = Resolve-BackendUrl -ParamValue $BackendUrl -ConfigPath $ConfigPath
Write-Host "Backend URL: $BackendUrl"

# =====================================================
# ADMIN AUTO ELEVATION
# =====================================================
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)

$adminCheck = $principal.IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $adminCheck) {

    Write-Host "Restarting Agent with Admin rights..."

    # The resolved BackendUrl is passed through explicitly — without this,
    # the elevated relaunch below used to silently drop it and the elevated
    # process would fall back to the default, which is exactly the kind of
    # bug that produces "works when already elevated, fails otherwise."
    Start-Process powershell `
        -ArgumentList "-ExecutionPolicy Bypass -NoProfile -File `"$PSCommandPath`" -BackendUrl `"$BackendUrl`"" `
        -Verb RunAs

    exit
}

$device = $env:COMPUTERNAME.Trim().ToUpper()

# =====================================================
# COLLECTION SCHEDULER
# =====================================================
$COLLECT_USAGE_SECONDS = 1
$COLLECT_PROCESSES_SECONDS = 10
# Everything below this line does real, slow I/O (WMI/CIM queries, event
# log scans, powercfg battery reports, PSWindowsUpdate, winget) — running
# these every 1s (instead of their intended cadence) makes each main-loop
# iteration take many seconds, which starves both the metrics POST and the
# job-polling call, making the device look offline and jobs look stuck.
$COLLECT_HARDWARE_SECONDS = 60
$COLLECT_INVENTORY_SECONDS = 300
$COLLECT_COMPLIANCE_SECONDS = 900
$COLLECT_UPDATES_SECONDS = 1800
# Windows Update fast signals (reboot-pending, service status, event-log
# poll) — cheap, no COM search session, so this can run far more often
# than the full WUA search+history scan below.
$COLLECT_UPDATE_FAST_SECONDS = 60
# Static software inventory (registry/AppX/winget) — slow, matches the
# Windows Update check's cadence, not rescanned every cycle.
$COLLECT_APPLICATIONS_SECONDS = 1800
# Live process snapshot (top-N by CPU/memory) — cheap, frequent.
$COLLECT_PROCESS_SNAPSHOT_SECONDS = 60
# Scheduled tasks / startup items / drivers / Entra join state — slow,
# structural "how is this wired up" facts, same cadence as static software
# inventory: rescanning every cycle would be wasted I/O for data that
# essentially never changes between scans.
$COLLECT_DEPENDENCY_TOPOLOGY_SECONDS = 1800
# TCP connections + DNS cache — churn faster than topology facts, but are
# still cheap system-table reads (not a packet capture), so a moderate cadence.
$COLLECT_NETWORK_SECONDS = 120
# User & Privilege Collector — query user + token inspection are the
# expensive part here; 5 minutes per the brief, same cache pattern as
# every other collector.
$COLLECT_USER_PRIVILEGE_SECONDS = 300

$lastUsageCollection = 0
$lastProcessCollection = 0
$lastHardwareCollection = 0
$lastInventoryCollection = 0
$lastComplianceCollection = 0
$lastUpdateCollection = 0
$lastUpdateFastCollection = 0
$lastApplicationsCollection = 0
$lastProcessSnapshotCollection = 0
$lastDependencyTopologyCollection = 0
$lastNetworkCollection = 0
$lastUpdateEventLogCheck = (Get-Date)
$lastUserPrivilegeCollection = 0

$usageCache = $null
$topCache = @()
$hardwareCache = $null
$inventoryCache = $null
$complianceCache = $null
$updateCache = $null
$updateCatalogCache = @()
$updateHistoryCache = @()
$updateEventsCache = @()
$installedApplicationsCache = @()
$runningProcessesCache = @()
$applicationServicesCache = @()
$crashEventsCache = @()
$scheduledTasksCache = @()
$startupItemsCache = @()
$systemDriversCache = @()
$authenticationStatusCache = $null
$networkConnectionsCache = @()
$dnsCacheEntriesCache = @()
$userSessionsCache = @()
$localAdministratorsCache = @()
$uacStatusCache = $null

# =====================================================
# TIME HELPER
# =====================================================
function NowMillis {
    return [int64]((Get-Date).ToUniversalTime() -
        [datetime]'1970-01-01').TotalMilliseconds
}

function Should-Collect($lastRun, $intervalSeconds) {
    return ((NowMillis) - [int64]$lastRun) -ge ([int64]$intervalSeconds * 1000)
}

# =====================================================
# NETWORK DIAGNOSTICS
# =====================================================
# Classifies a failed Invoke-RestMethod call into a specific, actionable
# reason instead of a generic "Unable to connect to remote server" message.
# Windows PowerShell 5.1's Invoke-RestMethod wraps network failures in a
# System.Net.WebException whose .Status is a reliable, documented signal —
# used here instead of guessing from the exception message text.
function Get-ConnectionErrorReason($errorRecord) {
    $ex = $errorRecord.Exception

    while ($ex -and -not ($ex -is [System.Net.WebException]) -and $ex.InnerException) {
        $ex = $ex.InnerException
    }

    if ($ex -is [System.Net.WebException]) {
        switch ($ex.Status) {
            "NameResolutionFailure" { return "DNS failure - cannot resolve the backend hostname" }
            "ConnectFailure"        { return "Connection refused - backend offline or port blocked by a firewall" }
            "Timeout"               { return "Connection timeout - server unreachable or network too slow" }
            "TrustFailure"          { return "TLS/certificate trust failure" }
            "SecureChannelFailure"  { return "TLS/certificate trust failure" }
            "ProtocolError" {
                try {
                    $statusCode = [int]$ex.Response.StatusCode
                } catch {
                    $statusCode = 0
                }

                # Read the response body when available — the backend's
                # error responses include a real message, and surfacing it
                # here beats a generic "HTTP 500" for actually diagnosing
                # what went wrong.
                $bodyDetail = ""
                try {
                    $stream = $ex.Response.GetResponseStream()
                    $reader = New-Object System.IO.StreamReader($stream)
                    $bodyText = $reader.ReadToEnd()
                    if ($bodyText) {
                        try {
                            $parsed = $bodyText | ConvertFrom-Json
                            if ($parsed.error) { $bodyDetail = " - $($parsed.error)" }
                            if ($parsed.debugMessage) { $bodyDetail += " ($($parsed.debugMessage))" }
                        } catch {
                            $bodyDetail = " - $bodyText"
                        }
                    }
                } catch {}

                if ($statusCode -eq 401 -or $statusCode -eq 403) { return "Authentication failed (HTTP $statusCode)$bodyDetail" }
                if ($statusCode -ge 500) { return "API unavailable (backend returned HTTP $statusCode)$bodyDetail" }
                if ($statusCode -gt 0) { return "API unavailable (HTTP $statusCode)$bodyDetail" }
                return "API unavailable (protocol error)$bodyDetail"
            }
            default { return "Server unreachable ($($ex.Status))" }
        }
    }

    $message = $errorRecord.Exception.Message
    if ($message -match "actively refused") { return "Connection refused - backend offline or port blocked by a firewall" }
    if ($message -match "No such host is known") { return "DNS failure - cannot resolve the backend hostname" }
    if ($message -match "timed out") { return "Connection timeout - server unreachable" }

    return "Backend offline or unreachable: $message"
}

# One-time startup check (not a retry loop) — tests DNS, TCP reachability,
# and the /health endpoint against $BackendUrl and prints a clear pass/fail
# summary so a misconfigured agent fails loudly at startup instead of
# silently retrying forever with only a generic error in the main loop.
# Does not stop the agent on failure — the main loop already retries every
# second, and a startup-time network blip shouldn't prevent that.
function Test-ServerConnectivity {
    param([string]$Url)

    Write-Host ""
    Write-Host "===== NexOps Connectivity Check ====="
    Write-Host "Target: $Url"

    try {
        $uri = [System.Uri]$Url
    } catch {
        Write-Host "[FAIL] Invalid server URL: $Url"
        Write-Host "===== End Connectivity Check ====="
        Write-Host ""
        return
    }

    $hostName = $uri.Host
    $port = $uri.Port

    try {
        $addresses = [System.Net.Dns]::GetHostAddresses($hostName)
        Write-Host "[OK]   DNS resolved '$hostName' -> $($addresses[0].IPAddressToString)"
    } catch {
        Write-Host "[FAIL] DNS failure - cannot resolve '$hostName'. Check the hostname in agent.config.json / -BackendUrl."
        Write-Host "===== End Connectivity Check ====="
        Write-Host ""
        return
    }

    $tcpOk = $false
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $asyncResult = $client.BeginConnect($hostName, $port, $null, $null)
        $tcpOk = $asyncResult.AsyncWaitHandle.WaitOne(3000) -and $client.Connected
        $client.Close()

        if ($tcpOk) {
            Write-Host "[OK]   TCP port $port is reachable on $hostName"
        } else {
            Write-Host "[FAIL] TCP port $port is not reachable on $hostName (timeout or refused)."
            Write-Host "       Check: is the backend running? Is Windows Firewall on the server blocking inbound $port`?"
        }
    } catch {
        Write-Host "[FAIL] TCP connection error: $_"
    }

    if (-not $tcpOk) {
        Write-Host "===== End Connectivity Check ====="
        Write-Host ""
        return
    }

    try {
        $health = Invoke-RestMethod -Uri "$Url/health" -Method Get -TimeoutSec 5
        Write-Host "[OK]   Backend health check passed: status=$($health.status) version=$($health.version) uptime=$($health.uptime)s"
    } catch {
        $reason = Get-ConnectionErrorReason $_
        Write-Host "[FAIL] Backend health check failed: $reason"
    }

    # The agent posts metrics unauthenticated today (no agent auth exists),
    # so there is nothing real to test here — not reported as a fabricated
    # pass/fail to avoid implying a check that doesn't exist.
    Write-Host "[SKIP] Authentication check - the agent does not use authenticated requests today."

    Write-Host "===== End Connectivity Check ====="
    Write-Host ""
}

# =====================================================
# SYSTEM USAGE
# =====================================================
function Get-SystemUsage {

    $cpu = Get-CimInstance Win32_Processor |
        Measure-Object LoadPercentage -Average |
        Select -ExpandProperty Average

    $os = Get-CimInstance Win32_OperatingSystem

    $ram = (
        ($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) /
        $os.TotalVisibleMemorySize
    ) * 100

    $bootUnix =
        [int][double]::Parse(
            (Get-Date $os.LastBootUpTime -UFormat %s)
        )

    return @{
        cpu  = [math]::Round($cpu,2)
        ram  = [math]::Round($ram,2)
        boot = $bootUnix * 1000
    }
}



# =====================================================
# SECURITY COMPLIANCE
# =====================================================
function Get-ComplianceStatus {

    # Bitlocker
    try {
        $bl = Get-BitLockerVolume -MountPoint "C:"
        $bitlocker = if ($bl.ProtectionStatus -eq 1) {"ENABLED"} else {"DISABLED"}
    } catch { $bitlocker="UNKNOWN" }

    # TPM
    try {
        $tpmObj = Get-Tpm
        $tpm = if ($tpmObj.TpmPresent -and $tpmObj.TpmReady) {"READY"} else {"NOT_READY"}
    } catch { $tpm="UNKNOWN" }

    # SecureBoot
    try {
        if (Confirm-SecureBootUEFI) {
            $secureBoot="ON"
        }
    } catch { $secureBoot="OFF" }

    # Defender
    try {
        $def = Get-Service WinDefend
        $defender = if ($def.Status -eq "Running") {"Running"} else {"Stopped"}
    } catch { $defender="Unknown" }

    return @{
        bitlocker  = $bitlocker
        tpm        = $tpm
        secureBoot = $secureBoot
        defender   = $defender
    }
}

# =====================================================
# USER CONSENT POPUP
# =====================================================
function Ask-UserConsent($jobId,$process,$reason){

    Add-Type -AssemblyName PresentationFramework

    $result =
        [System.Windows.MessageBox]::Show(
            "IT wants to close $process`nReason: $reason`nSave work first.",
            "Company IT Maintenance",
            "YesNo",
            "Warning"
        )

    if($result -eq "Yes"){
        Send-Approval $jobId "APPROVED"
        return $true
    }

    Send-Approval $jobId "REJECTED" "User denied termination"
    return $false
}

# =====================================================
# SEND APPROVAL
# =====================================================
function Send-Approval($jobId,$status,$message=""){

Invoke-RestMethod `
 -Uri "$BackendUrl/agent/job/approval" `
 -Method Post `
 -Body (@{
        job_id=$jobId
        status=$status
        user=$env:USERNAME
        message=$message
        time=NowMillis
 } | ConvertTo-Json -Depth 5) `
 -ContentType "application/json"
}

# =====================================================
#   Update Checks
#======================================================
function Get-DriverHealth {
    try {
        $drivers = Get-CimInstance Win32_PnPSignedDriver |
            Where-Object {$_.DriverDate -lt (Get-Date).AddYears(-2)}

        $outdated = $drivers.Count
        $driverStatus = if ($outdated -gt 0) { "OUTDATED" } else { "HEALTHY" }
    } catch {
        $driverStatus = "UNKNOWN"
        $outdated = 0
    }

    return @{ driver_status = $driverStatus; outdated_drivers = $outdated }
}

# Best-effort from real WMI signals only. "shared"/"kiosk" have no
# reliable WMI signal and are intentionally never auto-assigned here.
function Get-DeviceClassification {
    try {
        $chassisTypes = (Get-CimInstance Win32_SystemEnclosure -ErrorAction Stop).ChassisTypes
        $productType = (Get-CimInstance Win32_OperatingSystem -ErrorAction Stop).ProductType
        $laptopChassis = @(8,9,10,11,12,14,18,21)
        $desktopChassis = @(3,4,5,6,7,15,16)

        if ($productType -eq 2 -or $productType -eq 3) {
            return "server"
        } elseif ($chassisTypes | Where-Object { $laptopChassis -contains $_ }) {
            return "laptop"
        } elseif ($chassisTypes | Where-Object { $desktopChassis -contains $_ }) {
            return "desktop"
        } else {
            return "unknown"
        }
    } catch {
        return "unknown"
    }
}

# =====================================================
# WINDOWS UPDATE COLLECTOR — pure/testable logic
# Kept side-effect-free on purpose so Pester can exercise them directly
# with plain values, no COM/registry mocking required.
# =====================================================

# Combines every reboot-pending signal into one answer, naming which one
# actually fired rather than just a bare boolean.
function Resolve-RebootReason {
    param(
        [bool]$CbsPending,
        [bool]$WuPending,
        [bool]$PendingRename,
        [bool]$WuaRebootRequired
    )
    if ($CbsPending) { return "CBS" }
    if ($WuPending) { return "WindowsUpdate" }
    if ($PendingRename) { return "PendingFileRename" }
    if ($WuaRebootRequired) { return "WUA" }
    return $null
}

# Derives a per-KB lifecycle state fresh from this scan's signals — not a
# value the agent has to remember between ticks. Never reports INSTALLED
# without a corresponding successful history entry.
function Get-UpdateStateFromSignals {
    param(
        [bool]$IsDownloaded,
        [bool]$HasSuccessHistory,
        [bool]$HasFailureHistory,
        [bool]$SystemRebootRequired
    )
    if ($HasFailureHistory -and -not $HasSuccessHistory) { return "FAILED" }
    if ($HasSuccessHistory) {
        if ($SystemRebootRequired) { return "INSTALLED_PENDING_REBOOT" }
        return "INSTALLED"
    }
    if ($IsDownloaded) { return "DOWNLOADED" }
    return "NOT_INSTALLED"
}

# Classifies a Microsoft-Windows-WindowsUpdateClient/Operational event by
# message text, not numeric Event ID — those IDs vary across Windows
# versions and asserting specific ones as fact would be fabrication.
function Get-UpdateEventTypeFromMessage {
    param([string]$Message)

    if ([string]::IsNullOrWhiteSpace($Message)) { return "OTHER" }
    # Reboot is checked before the bare "install" pattern below — a message
    # like "A reboot is required to complete installation of updates" still
    # mentions installation, but REBOOT_REQUIRED is the more specific and
    # more actionable classification.
    if ($Message -match "(?i)installation.*(succeed|success|successful)") { return "INSTALL_COMPLETED" }
    if ($Message -match "(?i)installation.*(fail|error)") { return "FAILURE" }
    if ($Message -match "(?i)reboot") { return "REBOOT_REQUIRED" }
    if ($Message -match "(?i)install") { return "INSTALL_STARTED" }
    if ($Message -match "(?i)download.*(succeed|success|complete)") { return "DOWNLOAD_FINISHED" }
    if ($Message -match "(?i)download") { return "DOWNLOAD_STARTED" }
    if ($Message -match "(?i)(scan|detection).*(succeed|success|complete)") { return "SCAN_FINISHED" }
    if ($Message -match "(?i)(scan|detection)") { return "SCAN_STARTED" }
    if ($Message -match "(?i)fail|error") { return "FAILURE" }
    return "OTHER"
}

function Get-UpdateSourceFromSignals {
    param(
        [string]$WsusServer,
        [bool]$IntuneEnrolled,
        [bool]$SccmServicePresent
    )
    if (-not [string]::IsNullOrWhiteSpace($WsusServer)) { return "WSUS" }
    if ($IntuneEnrolled) { return "Intune" }
    if ($SccmServicePresent) { return "SCCM" }
    return "Microsoft Update"
}

# =====================================================
# WINDOWS UPDATE COLLECTOR — live collectors
# =====================================================

function Get-WindowsUpdateSourceInfo {
    $wsusServer = $null
    try {
        $wsusServer = (Get-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" -Name "WUServer" -ErrorAction SilentlyContinue).WUServer
    } catch {}

    $intuneEnrolled = $false
    try {
        $enrollments = Get-ChildItem -Path "HKLM:\SOFTWARE\Microsoft\Enrollments" -ErrorAction SilentlyContinue
        foreach ($enrollment in $enrollments) {
            $providerId = (Get-ItemProperty -Path $enrollment.PSPath -Name "ProviderID" -ErrorAction SilentlyContinue).ProviderID
            if ($providerId -eq "MS DM Server") { $intuneEnrolled = $true; break }
        }
    } catch {}

    $sccmPresent = $false
    try {
        $sccmPresent = [bool](Get-Service -Name "ccmexec" -ErrorAction SilentlyContinue)
    } catch {}

    return Get-UpdateSourceFromSignals -WsusServer $wsusServer -IntuneEnrolled $intuneEnrolled -SccmServicePresent $sccmPresent
}

function Get-WindowsUpdateServiceStatus {
    $result = @{ wu = "Unknown"; bits = "Unknown"; updateMedic = "Unknown" }

    try {
        $svc = Get-Service -Name "wuauserv" -ErrorAction SilentlyContinue
        $result.wu = if ($svc) { "$($svc.Status)" } else { "NotFound" }
    } catch {}
    try {
        $svc = Get-Service -Name "BITS" -ErrorAction SilentlyContinue
        $result.bits = if ($svc) { "$($svc.Status)" } else { "NotFound" }
    } catch {}
    try {
        $svc = Get-Service -Name "WaaSMedicSvc" -ErrorAction SilentlyContinue
        $result.updateMedic = if ($svc) { "$($svc.Status)" } else { "NotFound" }
    } catch {}

    return $result
}

# Fast tier (60s) — cheap registry/service/event-log signals only, no COM
# search session. Combines registry reboot-pending checks with the WUA
# SystemInfo.RebootRequired property (a distinct, real WUA-level signal;
# System.SystemInfo is a lightweight COM class, not a full search session).
function Get-WindowsUpdateFastSignals {
    param([datetime]$EventsSince)

    try {
        $cbsPending = Test-Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending"
        $wuPending = Test-Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired"
        $pendingRename = $null -ne (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager" -Name "PendingFileRenameOperations" -ErrorAction SilentlyContinue)
    } catch {
        $cbsPending = $false; $wuPending = $false; $pendingRename = $false
    }

    $wuaRebootRequired = $false
    try {
        $sysInfo = New-Object -ComObject Microsoft.Update.SystemInfo
        $wuaRebootRequired = [bool]$sysInfo.RebootRequired
    } catch {}

    $rebootReason = Resolve-RebootReason -CbsPending $cbsPending -WuPending $wuPending -PendingRename $pendingRename -WuaRebootRequired $wuaRebootRequired

    $serviceStatus = Get-WindowsUpdateServiceStatus

    $events = @()
    try {
        $winEvents = Get-WinEvent -FilterHashtable @{
            LogName = "Microsoft-Windows-WindowsUpdateClient/Operational"
            StartTime = $EventsSince
        } -MaxEvents 100 -ErrorAction SilentlyContinue

        foreach ($winEvent in $winEvents) {
            $occurredMs = $null
            try { $occurredMs = [int64](($winEvent.TimeCreated.ToUniversalTime()) - [datetime]'1970-01-01').TotalMilliseconds } catch {}
            if (-not $occurredMs) { continue }

            $events += @{
                event_type = Get-UpdateEventTypeFromMessage -Message $winEvent.Message
                message = $winEvent.Message
                raw_event_id = $winEvent.Id
                occurred_at = $occurredMs
            }
        }
    } catch {
        # Log may not exist on some builds, or there may simply be no
        # matching events in the window — either way, empty is correct.
    }

    return @{
        reboot_required = [bool]$rebootReason
        reboot_reason = $rebootReason
        wu_service_status = $serviceStatus.wu
        bits_service_status = $serviceStatus.bits
        update_medic_status = $serviceStatus.updateMedic
        events = $events
    }
}

# Full tier (1800s) — the real WUA search + install-history query. COM
# session/searcher/history are reused within a single scan (one search,
# one history query), never re-created per update, per the "reuse COM
# objects, avoid duplicate scans" performance requirement. Falls back to
# PSWindowsUpdate only if the COM session itself can't be created — same
# pattern already proven in Invoke-PatchInstall.
function Get-WindowsUpdateFullScan {
    $scanStart = Get-Date
    $catalog = @()
    $history = @()
    $pending = 0
    $failed = 0
    $winStatus = "UNKNOWN"
    $lastInstallAt = $null
    $scanSucceeded = $false

    $useComApi = $true
    try {
        $session = New-Object -ComObject Microsoft.Update.Session
    } catch {
        $useComApi = $false
    }

    if ($useComApi) {
        try {
            $searcher = $session.CreateUpdateSearcher()
            $searchResult = $searcher.Search("IsInstalled=0 and IsHidden=0")

            try {
                $historyCount = $searcher.GetTotalHistoryCount()
                $rawHistory = $searcher.QueryHistory(0, [Math]::Min($historyCount, 200))

                foreach ($record in $rawHistory) {
                    $success = ($record.ResultCode -eq 2 -or $record.ResultCode -eq 3)
                    $occurredMs = $null
                    try { $occurredMs = [int64](($record.Date.ToUniversalTime()) - [datetime]'1970-01-01').TotalMilliseconds } catch {}
                    if (-not $occurredMs) { continue }

                    $updateId = $null
                    try { $updateId = $record.UpdateIdentity.UpdateID } catch {}
                    $kbMatch = [regex]::Match($record.Title, "KB(\d+)")

                    $history += @{
                        update_id = $updateId
                        kb = if ($kbMatch.Success) { "KB$($kbMatch.Groups[1].Value)" } else { $null }
                        title = $record.Title
                        success = $success
                        hresult = "$($record.HResult)"
                        source = "WUA"
                        occurred_at = $occurredMs
                    }

                    if ($success -and (-not $lastInstallAt -or $occurredMs -gt $lastInstallAt)) {
                        $lastInstallAt = $occurredMs
                    }
                }
            } catch {
                Write-Host "QueryHistory failed: $_"
            }

            $successfulUpdateIds = @{}
            $failedUpdateIds = @{}
            foreach ($h in $history) {
                if (-not $h.update_id) { continue }
                if ($h.success) { $successfulUpdateIds[$h.update_id] = $true } else { $failedUpdateIds[$h.update_id] = $true }
            }

            $wuaRebootRequired = $false
            try {
                $sysInfo = New-Object -ComObject Microsoft.Update.SystemInfo
                $wuaRebootRequired = [bool]$sysInfo.RebootRequired
            } catch {}

            foreach ($update in $searchResult.Updates) {
                $updateId = $null
                try { $updateId = $update.Identity.UpdateID } catch {}
                $kb = $null
                try { if ($update.KBArticleIDs.Count -gt 0) { $kb = "KB$($update.KBArticleIDs[0])" } } catch {}
                $category = $null
                try { if ($update.Categories.Count -gt 0) { $category = $update.Categories.Item(0).Name } } catch {}

                $hasSuccess = [bool]($updateId -and $successfulUpdateIds.ContainsKey($updateId))
                $hasFailure = [bool]($updateId -and $failedUpdateIds.ContainsKey($updateId))

                $state = Get-UpdateStateFromSignals `
                    -IsDownloaded ([bool]$update.IsDownloaded) `
                    -HasSuccessHistory $hasSuccess `
                    -HasFailureHistory $hasFailure `
                    -SystemRebootRequired $wuaRebootRequired

                if ($state -eq "FAILED") { $failed++ }
                if ($state -ne "INSTALLED") { $pending++ }

                $catalog += @{
                    update_id = $updateId
                    revision_number = $update.Identity.RevisionNumber
                    kb = $kb
                    title = $update.Title
                    description = $update.Description
                    category = $category
                    severity = "$($update.MsrcSeverity)"
                    size_bytes = [int64]$update.MaxDownloadSize
                    is_downloaded = [bool]$update.IsDownloaded
                    is_hidden = [bool]$update.IsHidden
                    is_mandatory = [bool]$update.IsMandatory
                    reboot_behavior = "$($update.InstallationBehavior.RebootBehavior)"
                    state = $state
                    failure_hresult = $null
                }
            }

            $winStatus = if ($pending -eq 0) { "UP_TO_DATE" } else { "PENDING" }
            $scanSucceeded = $true
        } catch {
            Write-Host "WUA inventory scan failed, falling back to PSWindowsUpdate: $_"
            $useComApi = $false
        }
    }

    if (-not $useComApi) {
        try {
            Import-Module PSWindowsUpdate -ErrorAction Stop
            $fallbackUpdates = Get-WindowsUpdate -MicrosoftUpdate -IgnoreUserInput -ErrorAction Stop
            $pending = ($fallbackUpdates | Where-Object { -not $_.IsDownloaded }).Count
            $winStatus = if ($pending -eq 0) { "UP_TO_DATE" } else { "PENDING" }
            $scanSucceeded = $true
        } catch {
            $winStatus = "UNKNOWN"
            $scanSucceeded = $false
        }
    }

    $now = NowMillis
    $updateSource = Get-WindowsUpdateSourceInfo

    return @{
        windows_update_status = $winStatus
        pending_updates = $pending
        failed_updates = $failed
        update_source = $updateSource
        last_scan_at = $now
        last_successful_scan_at = if ($scanSucceeded) { $now } else { $null }
        last_failed_scan_at = if (-not $scanSucceeded) { $now } else { $null }
        last_install_at = $lastInstallAt
        scan_duration_ms = [int]((Get-Date) - $scanStart).TotalMilliseconds
        catalog = $catalog
        history = $history
    }
}

# Shared merge helper — used by the main loop's full-tier branch, the
# on-demand "SCAN" patch-job action, and post-reboot verification, so a
# fresh scan always updates the same $script:updateCache/$script:updateCatalogCache/
# $script:updateHistoryCache the metrics payload reads, without duplicating
# the merge logic three times.
function Update-WindowsUpdateFullScanCache {
    $fullScan = Get-WindowsUpdateFullScan
    $driverInfo = Get-DriverHealth
    $deviceClass = Get-DeviceClassification

    if ($null -eq $script:updateCache) { $script:updateCache = @{} }
    $script:updateCache.windows_update_status = $fullScan.windows_update_status
    $script:updateCache.pending_updates = $fullScan.pending_updates
    $script:updateCache.failed_updates = $fullScan.failed_updates
    $script:updateCache.update_source = $fullScan.update_source
    $script:updateCache.last_scan_at = $fullScan.last_scan_at
    $script:updateCache.last_successful_scan_at = $fullScan.last_successful_scan_at
    $script:updateCache.last_failed_scan_at = $fullScan.last_failed_scan_at
    $script:updateCache.last_install_at = $fullScan.last_install_at
    $script:updateCache.scan_duration_ms = $fullScan.scan_duration_ms
    $script:updateCache.driver_status = $driverInfo.driver_status
    $script:updateCache.outdated_drivers = $driverInfo.outdated_drivers
    $script:updateCache.device_class = $deviceClass

    $script:updateCatalogCache = $fullScan.catalog
    $script:updateHistoryCache = $fullScan.history

    return $fullScan
}

# =====================================================
# PATCH JOB ENGINE
# =====================================================
function Post-PatchProgress($jobId, $status, $detail, $percent) {
    try {
        Invoke-RestMethod `
            -Uri "$BackendUrl/agent/patch-job/progress" `
            -Method Post `
            -Body (@{
                job_id  = $jobId
                status  = $status
                detail  = $detail
                percent = $percent
            } | ConvertTo-Json -Depth 5) `
            -ContentType "application/json"
    } catch {
        Write-Host "Patch progress post failed: $_"
    }
}

function Post-PatchResult($jobId, $status, $updatesTotal, $updatesProcessed, $updatesFailed, $rebootRequired, $errorMessage) {
    try {
        Invoke-RestMethod `
            -Uri "$BackendUrl/agent/job/result" `
            -Method Post `
            -Body (@{
                job_id             = $jobId
                job_type           = "PATCH"
                status             = $status
                updates_total      = $updatesTotal
                updates_processed  = $updatesProcessed
                updates_failed     = $updatesFailed
                reboot_required    = $rebootRequired
                error              = $errorMessage
            } | ConvertTo-Json -Depth 5) `
            -ContentType "application/json"
    } catch {
        Write-Host "Patch result post failed: $_"
    }
}

function Test-PatchJobCancelled($jobId) {
    try {
        $current = Invoke-RestMethod -Uri "$BackendUrl/patch/jobs/$jobId" -Method Get
        return $current.status -eq "CANCELLED"
    } catch {
        return $false
    }
}

function Invoke-PatchInstall($job) {

    Post-PatchProgress $job.job_id "PREPARING" "Searching for applicable updates" 10

    $useComApi = $true
    try {
        $session = New-Object -ComObject Microsoft.Update.Session
    } catch {
        $useComApi = $false
    }

    if ($useComApi) {
        try {
            $searcher = $session.CreateUpdateSearcher()
            $searchResult = $searcher.Search("IsInstalled=0 and IsHidden=0")
            $updatesToInstall = New-Object -ComObject Microsoft.Update.UpdateColl
            $updateIdsInThisJob = @()

            foreach ($update in $searchResult.Updates) {
                if (-not $update.EulaAccepted) {
                    try { $update.AcceptEula() } catch {}
                }
                $updatesToInstall.Add($update) | Out-Null
                try { $updateIdsInThisJob += $update.Identity.UpdateID } catch {}
            }

            $totalCount = $updatesToInstall.Count

            if ($totalCount -eq 0) {
                Post-PatchResult $job.job_id "COMPLETED" 0 0 0 $false ""
                return
            }

            if (Test-PatchJobCancelled $job.job_id) {
                Write-Host "Patch job $($job.job_id) cancelled before download"
                return
            }

            Post-PatchProgress $job.job_id "DOWNLOADING" "Downloading $totalCount update(s)" 40
            $downloader = $session.CreateUpdateDownloader()
            $downloader.Updates = $updatesToInstall
            $downloader.Download() | Out-Null

            if (Test-PatchJobCancelled $job.job_id) {
                Write-Host "Patch job $($job.job_id) cancelled before install"
                return
            }

            Post-PatchProgress $job.job_id "INSTALLING" "Installing $totalCount update(s)" 90
            $installer = $session.CreateUpdateInstaller()
            $installer.Updates = $updatesToInstall
            $installResult = $installer.Install()

            $processed = 0
            $failedCount = 0
            for ($i = 0; $i -lt $updatesToInstall.Count; $i++) {
                # WU ResultCode: 2 = Succeeded, 3 = SucceededWithErrors
                $resultCode = $installResult.GetUpdateResult($i).ResultCode
                if ($resultCode -eq 2 -or $resultCode -eq 3) {
                    $processed++
                } else {
                    $failedCount++
                }
            }

            $rebootRequired = [bool]$installResult.RebootRequired

            if ($rebootRequired) {
                # Persists which specific KBs were part of THIS install job,
                # surviving the reboot, so Test-PendingRebootVerification can
                # check exactly those updates instead of a broad pending-count.
                try {
                    $markerDir = "$env:ProgramData\AiOpsAgent"
                    if (-not (Test-Path $markerDir)) { New-Item -ItemType Directory -Path $markerDir -Force | Out-Null }
                    @{
                        install_job_id = $job.job_id
                        update_ids     = $updateIdsInThisJob
                    } | ConvertTo-Json | Set-Content -Path "$markerDir\pending_install_updates.json" -Force
                } catch {}

                Post-PatchResult $job.job_id "WAITING_FOR_REBOOT" $totalCount $processed $failedCount $true ""
            } elseif ($failedCount -gt 0 -and $processed -eq 0) {
                Post-PatchResult $job.job_id "FAILED" $totalCount $processed $failedCount $false "All updates failed to install"
            } else {
                Post-PatchResult $job.job_id "COMPLETED" $totalCount $processed $failedCount $false ""
            }

            return
        } catch {
            Write-Host "COM API install failed, falling back to PSWindowsUpdate: $_"
        }
    }

    # ---- PSWindowsUpdate fallback (COM API unavailable) ----
    try {
        Import-Module PSWindowsUpdate -ErrorAction Stop
        Post-PatchProgress $job.job_id "DOWNLOADING" "Downloading and installing via PSWindowsUpdate" 40
        $result = Get-WindowsUpdate -MicrosoftUpdate -AcceptAll -IgnoreReboot -Install -ErrorAction Stop

        $installed = ($result | Where-Object { $_.Result -eq "Installed" }).Count
        $failedCount = ($result | Where-Object { $_.Result -ne "Installed" }).Count
        $rebootRequired = [bool](Get-WURebootStatus -Silent)

        if ($rebootRequired) {
            Post-PatchResult $job.job_id "WAITING_FOR_REBOOT" $result.Count $installed $failedCount $true ""
        } else {
            Post-PatchResult $job.job_id "COMPLETED" $result.Count $installed $failedCount $false ""
        }
    } catch {
        Post-PatchResult $job.job_id "FAILED" 0 0 0 $false "$_"
    }
}

function Invoke-PatchReboot($job) {
    Post-PatchProgress $job.job_id "REBOOTING" "Restarting device" 50

    $markerDir = "$env:ProgramData\AiOpsAgent"
    if (-not (Test-Path $markerDir)) {
        New-Item -ItemType Directory -Path $markerDir -Force | Out-Null
    }
    $markerFile = "$markerDir\pending_reboot.json"

    @{
        reboot_job_id  = $job.job_id
        install_job_id = $job.related_job_id
        device         = $device
    } | ConvertTo-Json | Set-Content -Path $markerFile -Force

    try {
        Post-PatchResult $job.job_id "COMPLETED" $null $null $null $false ""
        Restart-Computer -Force
    } catch {
        Post-PatchResult $job.job_id "FAILED" $null $null $null $false "$_"
    }
}

function Invoke-PatchJob($job) {
    switch ($job.action) {
        "SCAN" {
            Post-PatchProgress $job.job_id "PREPARING" "Scanning for updates" 20
            Update-WindowsUpdateFullScanCache | Out-Null
            $script:lastUpdateCollection = NowMillis
            Post-PatchResult $job.job_id "COMPLETED" $null $null $null $false ""
        }
        "INSTALL" {
            Invoke-PatchInstall $job
        }
        "REBOOT" {
            Invoke-PatchReboot $job
        }
        default {
            Post-PatchResult $job.job_id "FAILED" $null $null $null $false "Unknown patch action: $($job.action)"
        }
    }
}

function Test-PendingRebootVerification {
    $markerFile = "$env:ProgramData\AiOpsAgent\pending_reboot.json"
    if (-not (Test-Path $markerFile)) { return }

    $installUpdatesFile = "$env:ProgramData\AiOpsAgent\pending_install_updates.json"

    try {
        $marker = Get-Content $markerFile -Raw | ConvertFrom-Json
        $installJobId = $marker.install_job_id

        if (-not $installJobId) { return }

        Post-PatchProgress $installJobId "VERIFYING" "Verifying updates after reboot" 95

        $freshScan = Update-WindowsUpdateFullScanCache
        $script:lastUpdateCollection = NowMillis

        $targetUpdateIds = $null
        if (Test-Path $installUpdatesFile) {
            try {
                $installMarker = Get-Content $installUpdatesFile -Raw | ConvertFrom-Json
                if ("$($installMarker.install_job_id)" -eq "$installJobId") {
                    $targetUpdateIds = @($installMarker.update_ids)
                }
            } catch {}
        }

        if ($targetUpdateIds -and $targetUpdateIds.Count -gt 0) {
            # Real per-KB verification: each targeted update must have a
            # successful history entry AND no longer sit in a pending state
            # in the catalog (KB no longer appears in available updates).
            $catalogByUpdateId = @{}
            foreach ($entry in $freshScan.catalog) { $catalogByUpdateId[$entry.update_id] = $entry }
            $successfulUpdateIds = @{}
            foreach ($entry in $freshScan.history) {
                if ($entry.success -and $entry.update_id) { $successfulUpdateIds[$entry.update_id] = $true }
            }

            $unverified = @()
            foreach ($updateId in $targetUpdateIds) {
                $stillPending = $catalogByUpdateId.ContainsKey($updateId) -and
                    $catalogByUpdateId[$updateId].state -ne "INSTALLED" -and
                    $catalogByUpdateId[$updateId].state -ne "INSTALLED_PENDING_REBOOT"
                $hasSuccess = $successfulUpdateIds.ContainsKey($updateId)

                if ($stillPending -or -not $hasSuccess) {
                    $unverified += $updateId
                }
            }

            if ($unverified.Count -eq 0) {
                Post-PatchResult $installJobId "COMPLETED" $null $null $null $false ""
            } else {
                Post-PatchResult $installJobId "FAILED" $null $null $null $false "Verification failed for $($unverified.Count) of $($targetUpdateIds.Count) update(s) after reboot"
            }
        } elseif ($freshScan.pending_updates -eq 0) {
            # Fallback (e.g. PSWindowsUpdate path, which doesn't track
            # individual update IDs the same way) — broad check only,
            # honestly degraded rather than fabricating per-KB confidence.
            Post-PatchResult $installJobId "COMPLETED" $null $null $null $false ""
        } else {
            Post-PatchResult $installJobId "FAILED" $null $null $null $false "Verification inconclusive - $($freshScan.pending_updates) update(s) still pending after reboot"
        }
    } catch {
        Write-Host "Reboot verification failed: $_"
    } finally {
        Remove-Item $markerFile -Force -ErrorAction SilentlyContinue
        Remove-Item $installUpdatesFile -Force -ErrorAction SilentlyContinue
    }
}

function Get-SystemInventory {

    # Services that should be running because they are Automatic but are stopped.
    try {
        $autoStoppedServices = Get-CimInstance Win32_Service |
            Where-Object {
                $_.StartMode -eq "Auto" -and
                $_.State -ne "Running"
            } |
            Select-Object -First 25 |
            ForEach-Object {
                @{
                    name = $_.Name
                    display_name = $_.DisplayName
                    start_mode = $_.StartMode
                    state = $_.State
                }
            }
    } catch {
        $autoStoppedServices = @()
    }

    try {
        $recentServiceFailures = Get-WinEvent -LogName System -MaxEvents 120 -ErrorAction SilentlyContinue |
            Where-Object {
                $_.ProviderName -eq "Service Control Manager" -and
                ($_.LevelDisplayName -eq "Error" -or $_.LevelDisplayName -eq "Warning")
            } |
            Select-Object -First 15 |
            ForEach-Object {
                @{
                    time = [int64]((Get-Date $_.TimeCreated).ToUniversalTime() - [datetime]'1970-01-01').TotalMilliseconds
                    id = $_.Id
                    message = $_.Message
                }
            }
    } catch {
        $recentServiceFailures = @()
    }

    try {
        $problemDrivers = Get-CimInstance Win32_PnPEntity |
            Where-Object { $_.ConfigManagerErrorCode -ne 0 } |
            Select-Object -First 25 |
            ForEach-Object {
                @{
                    name = $_.Name
                    status = $_.Status
                    error_code = $_.ConfigManagerErrorCode
                    device_id = $_.DeviceID
                }
            }
    } catch {
        $problemDrivers = @()
    }

    try {
        $outdatedDrivers = Get-CimInstance Win32_PnPSignedDriver |
            Where-Object { $_.DriverDate -lt (Get-Date).AddYears(-2) } |
            Sort-Object DriverDate |
            Select-Object -First 25 |
            ForEach-Object {
                @{
                    device_name = $_.DeviceName
                    manufacturer = $_.Manufacturer
                    version = $_.DriverVersion
                    driver_date = if ($_.DriverDate) { (Get-Date $_.DriverDate).ToString("s") } else { "" }
                }
            }
    } catch {
        $outdatedDrivers = @()
    }

    return @{
        services = @{
            auto_running_issue_count = $autoStoppedServices.Count
            recent_failure_count = $recentServiceFailures.Count
            auto_stopped = $autoStoppedServices
            recent_failures = $recentServiceFailures
        }
        drivers = @{
            problem_count = $problemDrivers.Count
            outdated_count = $outdatedDrivers.Count
            problems = $problemDrivers
            outdated = $outdatedDrivers
        }
    }
}
# =====================================================
# DIGITAL WORKPLACE INTELLIGENCE — DISCOVERY
# =====================================================

# Static software inventory: registry (3 uninstall key locations) + AppX +
# winget, best-effort. Runs on a slow interval (COLLECT_APPLICATIONS_SECONDS)
# — this is exactly the "cache static inventory, don't rescan constantly"
# data the brief itself asks for.
function Get-InstalledApplications {
    $apps = @{}

    $uninstallPaths = @(
        "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*"
    )

    foreach ($path in $uninstallPaths) {
        try {
            Get-ItemProperty -Path $path -ErrorAction SilentlyContinue | ForEach-Object {
                if ([string]::IsNullOrWhiteSpace($_.DisplayName)) { return }

                $installDateMs = $null
                if ($_.InstallDate -match '^\d{8}$') {
                    try {
                        $installDateMs = [int64](
                            (Get-Date -Year $_.InstallDate.Substring(0,4) -Month $_.InstallDate.Substring(4,2) -Day $_.InstallDate.Substring(6,2)).ToUniversalTime() -
                            [datetime]'1970-01-01'
                        ).TotalMilliseconds
                    } catch {}
                }

                $productCode = if ($_.PSChildName) { $_.PSChildName } else { $_.DisplayName }

                $apps[$productCode] = @{
                    display_name = $_.DisplayName
                    version = $_.DisplayVersion
                    publisher = $_.Publisher
                    install_date = $installDateMs
                    install_location = $_.InstallLocation
                    architecture = if ($path -match "WOW6432Node") { "x86" } else { "x64" }
                    estimated_size_kb = $_.EstimatedSize
                    install_source = "registry"
                    product_code = $productCode
                    uninstall_command = $_.UninstallString
                }
            }
        } catch {
            Write-Host "Registry uninstall scan failed for $path`: $_"
        }
    }

    try {
        Get-AppxPackage -ErrorAction SilentlyContinue | ForEach-Object {
            $key = "appx:$($_.PackageFullName)"
            $apps[$key] = @{
                display_name = $_.Name
                version = "$($_.Version)"
                publisher = $_.Publisher
                install_date = $null
                install_location = $_.InstallLocation
                architecture = "$($_.Architecture)"
                estimated_size_kb = $null
                install_source = "appx"
                product_code = $_.PackageFullName
                uninstall_command = $null
            }
        }
    } catch {
        Write-Host "AppX enumeration unavailable: $_"
    }

    try {
        $wingetOutput = winget list --accept-source-agreements 2>$null
        if ($LASTEXITCODE -eq 0 -and $wingetOutput) {
            # winget's console table has no stable delimiter — best-effort
            # parse: skip header/separator rows, split on runs of 2+ spaces.
            $dataLines = $wingetOutput | Select-Object -Skip 2 | Where-Object { $_ -notmatch '^-+$' -and $_.Trim() -ne "" }
            foreach ($line in $dataLines) {
                $columns = $line -split '\s{2,}'
                if ($columns.Count -ge 2) {
                    $name = $columns[0].Trim()
                    $wingetId = $columns[1].Trim()
                    if ([string]::IsNullOrWhiteSpace($name)) { continue }

                    $key = "winget:$wingetId"
                    if (-not $apps.ContainsKey($key)) {
                        $apps[$key] = @{
                            display_name = $name
                            version = if ($columns.Count -ge 3) { $columns[2].Trim() } else { $null }
                            publisher = $null
                            install_date = $null
                            install_location = $null
                            architecture = $null
                            estimated_size_kb = $null
                            install_source = "winget"
                            product_code = $wingetId
                            uninstall_command = $null
                        }
                    }
                }
            }
        }
    } catch {
        Write-Host "winget enumeration unavailable (may not be installed): $_"
    }

    return @($apps.Values)
}

# Top 20 processes by CPU + top 20 by memory (deduped) — bounded so the
# expensive per-process calls (owner lookup, Authenticode signature check)
# only run on a small set, not all ~150-250 running processes, per the
# brief's own "agent must remain lightweight" guidance.
function Get-RunningApplicationProcesses {
    try {
        $allProcesses = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne 0 }

        $topByCpu = $allProcesses | Sort-Object CPU -Descending | Select-Object -First 20
        $topByMemory = $allProcesses | Sort-Object WorkingSet64 -Descending | Select-Object -First 20

        $selected = @{}
        foreach ($p in (@($topByCpu) + @($topByMemory))) {
            $selected[$p.Id] = $p
        }

        if (-not $script:previousProcessCpuSamples) {
            $script:previousProcessCpuSamples = @{}
        }
        $nowMs = NowMillis
        $currentSamples = @{}
        $results = @()

        foreach ($p in $selected.Values) {
            $owner = $null
            $parentPid = $null
            try {
                $cim = Get-CimInstance Win32_Process -Filter "ProcessId=$($p.Id)" -ErrorAction SilentlyContinue
                if ($cim) {
                    $parentPid = $cim.ParentProcessId
                    $ownerInfo = Invoke-CimMethod -InputObject $cim -MethodName GetOwner -ErrorAction SilentlyContinue
                    if ($ownerInfo -and $ownerInfo.User) {
                        $owner = "$($ownerInfo.Domain)\$($ownerInfo.User)"
                    }
                }
            } catch {}

            $signed = $null
            $publisher = $null
            $certIssuer = $null
            $certExpiresAt = $null
            $certThumbprint = $null
            try {
                if ($p.Path) {
                    $sig = Get-AuthenticodeSignature -FilePath $p.Path -ErrorAction SilentlyContinue
                    if ($sig) {
                        $signed = ($sig.Status -eq "Valid")
                        if ($sig.SignerCertificate) {
                            $publisher = ($sig.SignerCertificate.Subject -replace '^CN=([^,]+).*', '$1')
                            $certIssuer = ($sig.SignerCertificate.Issuer -replace '^CN=([^,]+).*', '$1')
                            $certThumbprint = $sig.SignerCertificate.Thumbprint
                            try {
                                $certExpiresAt = [int64](($sig.SignerCertificate.NotAfter.ToUniversalTime()) - [datetime]'1970-01-01').TotalMilliseconds
                            } catch {}
                        }
                    }
                }
            } catch {}

            $startTimeMs = $null
            try {
                $startTimeMs = [int64](($p.StartTime.ToUniversalTime()) - [datetime]'1970-01-01').TotalMilliseconds
            } catch {}

            # CPU% via delta sampling across cycles (Get-Process's .CPU is
            # cumulative seconds, not instantaneous — same limitation already
            # documented on Get-TopProcesses). Only reported once a real prior
            # sample for this exact PID exists; null otherwise — never
            # fabricated, matching this codebase's existing convention.
            $cpuPercent = $null
            if ($null -ne $p.CPU) {
                $currentSamples[$p.Id] = @{ cpu = $p.CPU; time = $nowMs }
                $previous = $script:previousProcessCpuSamples[$p.Id]
                if ($previous) {
                    $elapsedSeconds = ($nowMs - $previous.time) / 1000
                    $deltaCpu = $p.CPU - $previous.cpu
                    if ($elapsedSeconds -gt 0 -and $deltaCpu -ge 0) {
                        $cpuPercent = [math]::Round((($deltaCpu / $elapsedSeconds) / [Environment]::ProcessorCount) * 100, 1)
                    }
                }
            }

            $results += @{
                pid = $p.Id
                parent_pid = $parentPid
                process_name = "$($p.ProcessName).exe"
                exe_path = $p.Path
                cpu_percent = $cpuPercent
                memory_mb = [math]::Round($p.WorkingSet64 / 1MB, 1)
                threads = $p.Threads.Count
                handles = $p.HandleCount
                start_time = $startTimeMs
                owner = $owner
                responding = $p.Responding
                window_title = $p.MainWindowTitle
                signed = $signed
                publisher = $publisher
                cert_issuer = $certIssuer
                cert_expires_at = $certExpiresAt
                cert_thumbprint = $certThumbprint
            }
        }

        $script:previousProcessCpuSamples = $currentSamples
        return $results
    } catch {
        Write-Host "Process snapshot failed: $_"
        return @()
    }
}

# Mirrors the relatedServiceNames declared across
# backend/src/constants/applicationPlugins.ts's plugin entries. Can't be
# imported directly (different language/runtime) — kept in sync manually;
# intentionally short since only ~5 plugins declare real services today.
# Most machines won't have most of these — that's expected, not an error.
$script:KNOWN_APPLICATION_SERVICES = @(
    "WinDefend",
    "edgeupdate",
    "edgeupdatem",
    "MicrosoftEdgeElevationService",
    "gupdate",
    "gupdatem"
)

function Get-ApplicationRelatedServices {
    $results = @()

    foreach ($serviceName in $script:KNOWN_APPLICATION_SERVICES) {
        try {
            $svc = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
            if (-not $svc) { continue }

            $startupType = "Unknown"
            $logonAccount = $null
            try {
                $wmiSvc = Get-CimInstance Win32_Service -Filter "Name='$serviceName'" -ErrorAction SilentlyContinue
                if ($wmiSvc) {
                    $startupType = $wmiSvc.StartMode
                    $logonAccount = $wmiSvc.StartName
                }
            } catch {}

            $results += @{
                service_name = $svc.Name
                display_name = $svc.DisplayName
                status = "$($svc.Status)"
                startup_type = $startupType
                logon_account = $logonAccount
            }
        } catch {}
    }

    return $results
}

# Application crash detection — same Get-WinEvent pattern already used by
# Get-WindowsUpdateFastSignals, applied to Application-log Event ID 1000
# ("Application Error" / faulting-application crashes). Sends the last 24h window every
# cycle rather than tracking its own "already reported" state; the backend
# deduplicates against application_history before inserting.
function Get-ApplicationCrashEvents {
    $results = @()

    try {
        $since = (Get-Date).AddHours(-24)
        $crashEvents = Get-WinEvent -FilterHashtable @{LogName='Application'; Id=1000; StartTime=$since} -MaxEvents 200 -ErrorAction SilentlyContinue

        foreach ($crashEvent in $crashEvents) {
            $match = [regex]::Match($crashEvent.Message, "Faulting application name:\s*([^\s,]+)")
            if (-not $match.Success) { continue }

            $processName = $match.Groups[1].Value
            $occurredMs = [int64](($crashEvent.TimeCreated.ToUniversalTime()) - [datetime]'1970-01-01').TotalMilliseconds

            $results += @{
                process_name = $processName
                occurred_at = $occurredMs
            }
        }
    } catch {
        # Get-WinEvent throws if there are simply no matching events in the
        # window (not a real error) as well as on genuine access issues —
        # either way, reporting zero crash events is the correct fallback.
    }

    return $results
}

# =====================================================
# APPLICATION DEPENDENCY INTELLIGENCE — TOPOLOGY DISCOVERY
# Real Windows APIs only (scheduled tasks, startup registry/folder entries,
# system drivers, Entra/AD join state). No packet capture, no TLS handshakes,
# no credential/token inspection — the agent posts to the backend
# unauthenticated (see "[SKIP] Authentication check" below) so per-app OAuth
# token state genuinely isn't available; dsregcmd's own join/SSO state is the
# honest ceiling here.
# =====================================================

function Get-ScheduledTasksSnapshot {
    $results = @()

    try {
        $tasks = Get-ScheduledTask -ErrorAction SilentlyContinue |
            Where-Object { $_.TaskPath -notlike "\Microsoft\*" } |
            Select-Object -First 50

        foreach ($task in $tasks) {
            $exePath = $null
            try {
                $action = $task.Actions | Where-Object { $_.Execute } | Select-Object -First 1
                if ($action) { $exePath = $action.Execute }
            } catch {}

            $lastRun = $null
            try {
                $info = Get-ScheduledTaskInfo -TaskName $task.TaskName -TaskPath $task.TaskPath -ErrorAction SilentlyContinue
                if ($info -and $info.LastRunTime) {
                    $lastRun = [int64](($info.LastRunTime.ToUniversalTime()) - [datetime]'1970-01-01').TotalMilliseconds
                }
            } catch {}

            $results += @{
                task_name = $task.TaskName
                task_path = $task.TaskPath
                state = "$($task.State)"
                exe_path = $exePath
                last_run_time = $lastRun
            }
        }
    } catch {}

    return $results
}

# Registry Run/RunOnce keys (HKLM + HKCU) and the Startup folder shortcuts —
# the two mechanisms that actually launch something at logon.
function Get-StartupItems {
    $results = @()

    $registryPaths = @(
        @{ path = "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run"; source = "HKLM Run" },
        @{ path = "HKLM:\Software\Microsoft\Windows\CurrentVersion\RunOnce"; source = "HKLM RunOnce" },
        @{ path = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"; source = "HKCU Run" },
        @{ path = "HKCU:\Software\Microsoft\Windows\CurrentVersion\RunOnce"; source = "HKCU RunOnce" }
    )

    foreach ($entry in $registryPaths) {
        try {
            $props = Get-ItemProperty -Path $entry.path -ErrorAction SilentlyContinue
            if (-not $props) { continue }

            foreach ($name in $props.PSObject.Properties.Name) {
                if ($name -like "PS*") { continue }

                $results += @{
                    name = $name
                    command = "$($props.$name)"
                    source = $entry.source
                }
            }
        } catch {}
    }

    $startupFolders = @(
        "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\StartUp",
        "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
    )

    foreach ($folder in $startupFolders) {
        try {
            $shortcuts = Get-ChildItem -Path $folder -Filter "*.lnk" -ErrorAction SilentlyContinue
            foreach ($shortcut in $shortcuts) {
                $target = $null
                try {
                    $shell = New-Object -ComObject WScript.Shell
                    $target = $shell.CreateShortcut($shortcut.FullName).TargetPath
                } catch {}

                $results += @{
                    name = $shortcut.BaseName
                    command = $target
                    source = "Startup Folder"
                }
            }
        } catch {}
    }

    return $results
}

function Get-SystemDriversSnapshot {
    $results = @()

    try {
        $drivers = Get-CimInstance Win32_SystemDriver -ErrorAction SilentlyContinue |
            Where-Object { $_.State -eq "Running" } |
            Select-Object -First 50

        foreach ($driver in $drivers) {
            $results += @{
                name = $driver.Name
                display_name = $driver.DisplayName
                state = $driver.State
                start_mode = $driver.StartMode
                path_name = $driver.PathName
            }
        }
    } catch {}

    return $results
}

# Established TCP connections + listeners — bounded, no packet capture.
# Owning-process lookup lets the backend link a network endpoint back to the
# application that opened it (via application_processes.pid).
function Get-NetworkConnectionsSnapshot {
    $results = @()

    try {
        $connections = Get-NetTCPConnection -State Established, Listen -ErrorAction SilentlyContinue |
            Select-Object -First 60

        foreach ($conn in $connections) {
            $processName = $null
            try {
                $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
                if ($proc) { $processName = "$($proc.ProcessName).exe" }
            } catch {}

            $results += @{
                local_port = $conn.LocalPort
                remote_address = $conn.RemoteAddress
                remote_port = $conn.RemotePort
                state = "$($conn.State)"
                pid = $conn.OwningProcess
                process_name = $processName
            }
        }
    } catch {}

    return $results
}

function Get-DnsCacheSnapshot {
    $results = @()

    try {
        $entries = Get-DnsClientCache -ErrorAction SilentlyContinue | Select-Object -First 60

        foreach ($entry in $entries) {
            $results += @{
                record_name = $entry.Entry
                record_type = "$($entry.Type)"
                data = "$($entry.Data)"
                status = "$($entry.Status)"
            }
        }
    } catch {}

    return $results
}

# dsregcmd is the real, built-in Windows tool for Entra/Azure AD join + SSO
# token-cache state. Every machine has it (even fully unjoined ones just
# report NO/NO/NO) — parsing its "Key : Value" text output is the honest
# ceiling for authentication-dependency signals from an unauthenticated
# agent; there is no access to per-application OAuth token state.
function Get-AuthenticationStatus {
    try {
        $raw = & dsregcmd /status 2>&1 | Out-String
        if ([string]::IsNullOrWhiteSpace($raw)) { return $null }

        $fields = @{}
        foreach ($line in ($raw -split "`r?`n")) {
            $match = [regex]::Match($line, "^\s*([A-Za-z ]+?)\s*:\s*(.+?)\s*$")
            if ($match.Success) {
                $fields[$match.Groups[1].Value.Trim()] = $match.Groups[2].Value.Trim()
            }
        }

        return @{
            azure_ad_joined = $fields["AzureAdJoined"]
            domain_joined = $fields["DomainJoined"]
            workplace_joined = $fields["WorkplaceJoined"]
            azure_ad_prt = $fields["AzureAdPrt"]
            tenant_name = $fields["TenantName"]
        }
    } catch {
        return $null
    }
}

# =====================================================
# USER & PRIVILEGE COLLECTOR — pure/testable logic
# =====================================================

# Real, documented SID prefix Windows assigns to Azure AD accounts on an
# AAD-joined device — used directly, not guessed.
function Test-AzureAdSid {
    param([string]$Sid)
    if ([string]::IsNullOrWhiteSpace($Sid)) { return $false }
    return $Sid -like "S-1-12-1-*"
}

# The real, visible signal Windows itself uses (an email-shaped identity
# on a local account). Cannot be distinguished from a literal local
# account that happens to be named like an email address — the agent
# can't read another user's un-loaded HKCU hive to confirm cloud-identity
# linkage more precisely than this.
function Test-MicrosoftAccountUsername {
    param([string]$Username)
    if ([string]::IsNullOrWhiteSpace($Username)) { return $false }
    return $Username -match "^[^@\s]+@[^@\s]+\.[^@\s]+$"
}

function Resolve-AccountType {
    param(
        [bool]$IsLocalAccount,
        [string]$Sid,
        [string]$Username
    )
    if (Test-AzureAdSid -Sid $Sid) { return "Azure AD" }
    if ($IsLocalAccount -and (Test-MicrosoftAccountUsername -Username $Username)) { return "Microsoft Account" }
    if ($IsLocalAccount) { return "Local" }
    return "Domain"
}

# Built-in Administrator/Guest accounts are identified by SID suffix, not
# by name — both are commonly renamed for security.
function Resolve-BuiltInAccountKind {
    param([string]$Sid)
    if ([string]::IsNullOrWhiteSpace($Sid)) { return $null }
    if ($Sid -match "-500$") { return "BuiltInAdministrator" }
    if ($Sid -match "-501$") { return "BuiltInGuest" }
    return $null
}

# Combines token-level elevation info with local-group membership —
# "never by group name alone" means combining signals, not relying on
# either one in isolation. TokenElevationType: 2=Full (split-token admin,
# currently elevated), 3=Limited (split-token admin, NOT currently
# elevated — the brief's own "isAdministrator: true, isElevated: false"
# example), 1=Default (UAC off, or a plain standard user — both look
# identical at the token level, disambiguated against group membership).
function Resolve-EffectivePrivilege {
    param(
        $TokenElevationType,
        $TokenElevated,
        [bool]$IsInLocalAdminsGroup
    )

    if ($null -eq $TokenElevationType) {
        return @{ isAdministrator = $IsInLocalAdminsGroup; isElevated = $null; source = "group-membership-fallback" }
    }
    if ($TokenElevationType -eq 2) {
        return @{ isAdministrator = $true; isElevated = $true; source = "access-token" }
    }
    if ($TokenElevationType -eq 3) {
        return @{ isAdministrator = $true; isElevated = $false; source = "access-token" }
    }
    return @{
        isAdministrator = $IsInLocalAdminsGroup
        isElevated = [bool]$TokenElevated
        source = "access-token"
    }
}

# Parses `query user`'s fixed-width table using the header row's own
# column offsets (more robust than splitting on whitespace runs, since
# usernames/session names can themselves contain spaces).
function Parse-QuserOutput {
    param([string[]]$Lines)

    $results = @()
    if (-not $Lines -or $Lines.Count -lt 2) { return $results }

    $header = $Lines[0]
    $columnNames = @("USERNAME", "SESSIONNAME", "ID", "STATE", "IDLE TIME", "LOGON TIME")
    $starts = [ordered]@{}
    foreach ($col in $columnNames) {
        $idx = $header.IndexOf($col)
        if ($idx -ge 0) { $starts[$col] = $idx }
    }
    if (-not $starts.Contains("USERNAME")) { return $results }

    $orderedNames = @($starts.Keys)

    for ($i = 1; $i -lt $Lines.Count; $i++) {
        $line = $Lines[$i]
        if ([string]::IsNullOrWhiteSpace($line)) { continue }

        $row = @{}
        for ($c = 0; $c -lt $orderedNames.Count; $c++) {
            $name = $orderedNames[$c]
            $start = $starts[$name]
            $end = if ($c + 1 -lt $orderedNames.Count) { $starts[$orderedNames[$c + 1]] } else { $line.Length }
            if ($start -ge $line.Length) { $row[$name] = ""; continue }
            $len = [Math]::Min($end, $line.Length) - $start
            if ($len -lt 0) { $len = 0 }
            $row[$name] = $line.Substring($start, $len).Trim()
        }
        $row["USERNAME"] = ("$($row['USERNAME'])").TrimStart('>').Trim()
        $results += $row
    }
    # Unary comma forces this to stay an array even with exactly one row —
    # without it, `return $results` unrolls a single-element array into a
    # bare Hashtable, which silently breaks a caller's `foreach` (iterates
    # dictionary entries instead of rows) and makes the backend's
    # `Array.isArray()` ingest guard skip real data.
    return ,$results
}

# =====================================================
# USER & PRIVILEGE COLLECTOR — live collectors
# =====================================================

# Small, focused P/Invoke surface for real token-elevation inspection.
# The agent runs as SYSTEM, which already holds the privilege to open a
# process in another user's session. Compiled once (guarded so a re-run
# in the same process doesn't error on redefinition).
if (-not ([System.Management.Automation.PSTypeName]"AiOpsAgent.TokenInspector").Type) {
    Add-Type -Language CSharp -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

namespace AiOpsAgent {
    public static class TokenInspector {
        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern IntPtr OpenProcess(uint processAccess, bool bInheritHandle, int processId);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool CloseHandle(IntPtr hObject);

        [DllImport("advapi32.dll", SetLastError = true)]
        private static extern bool OpenProcessToken(IntPtr processHandle, uint desiredAccess, out IntPtr tokenHandle);

        [DllImport("advapi32.dll", SetLastError = true)]
        private static extern bool GetTokenInformation(IntPtr tokenHandle, int tokenInformationClass, IntPtr tokenInformation, uint tokenInformationLength, out uint returnLength);

        private const uint PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
        private const uint TOKEN_QUERY = 0x0008;
        private const int TokenElevationType = 18;
        private const int TokenElevation = 20;

        // Returns [elevationType, isElevated] or null if inspection failed
        // (access denied, process gone, etc.) — callers must treat null as
        // "unknown," never assume a default.
        public static int[] GetElevationInfo(int processId) {
            IntPtr processHandle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, processId);
            if (processHandle == IntPtr.Zero) return null;

            try {
                IntPtr tokenHandle;
                if (!OpenProcessToken(processHandle, TOKEN_QUERY, out tokenHandle)) return null;

                try {
                    IntPtr elevationTypePtr = Marshal.AllocHGlobal(4);
                    IntPtr elevationPtr = Marshal.AllocHGlobal(4);
                    try {
                        uint returnLength;
                        bool okType = GetTokenInformation(tokenHandle, TokenElevationType, elevationTypePtr, 4, out returnLength);
                        bool okElevation = GetTokenInformation(tokenHandle, TokenElevation, elevationPtr, 4, out returnLength);
                        if (!okType || !okElevation) return null;

                        int elevationType = Marshal.ReadInt32(elevationTypePtr);
                        int isElevated = Marshal.ReadInt32(elevationPtr);
                        return new int[] { elevationType, isElevated };
                    } finally {
                        Marshal.FreeHGlobal(elevationTypePtr);
                        Marshal.FreeHGlobal(elevationPtr);
                    }
                } finally {
                    CloseHandle(tokenHandle);
                }
            } finally {
                CloseHandle(processHandle);
            }
        }
    }
}
"@
}

function Get-TokenElevationInfo {
    param([int]$ProcessId)
    try {
        $result = [AiOpsAgent.TokenInspector]::GetElevationInfo($ProcessId)
        if ($null -eq $result) { return $null }
        return @{ elevationType = $result[0]; isElevated = ($result[1] -ne 0) }
    } catch {
        return $null
    }
}

function Get-UacStatus {
    try {
        $enableLua = (Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "EnableLUA" -ErrorAction SilentlyContinue).EnableLUA
        return @{ uac_enabled = ($enableLua -eq 1) }
    } catch {
        return @{ uac_enabled = $null }
    }
}

# Enumerates every local Administrators group member via the real
# Get-LocalGroupMember cmdlet (built-in, Windows 10/Server 2016+, covers
# the full Win10/11/Server 2019/2022/2025 matrix). Domain/AzureAD/MSA
# members get Enabled/LastLogon/PasswordLastSet left $null — honestly
# unknown from this device, not fabricated.
function Get-LocalAdministrators {
    $results = @()
    try {
        $members = Get-LocalGroupMember -Group "Administrators" -ErrorAction Stop
        foreach ($member in $members) {
            $sidValue = "$($member.SID)"
            $source = "$($member.PrincipalSource)"
            $enabled = $null
            $lastLogon = $null
            $passwordLastSet = $null

            $domainAndUser = $member.Name -split '\\', 2
            $domain = if ($domainAndUser.Count -eq 2) { $domainAndUser[0] } else { $null }
            $username = if ($domainAndUser.Count -eq 2) { $domainAndUser[1] } else { $member.Name }

            if ($source -eq "Local") {
                try {
                    $localUser = Get-LocalUser -Name $username -ErrorAction SilentlyContinue
                    if ($localUser) {
                        $enabled = [bool]$localUser.Enabled
                        if ($localUser.PasswordLastSet) {
                            $passwordLastSet = [int64](($localUser.PasswordLastSet.ToUniversalTime()) - [datetime]'1970-01-01').TotalMilliseconds
                        }
                        if ($localUser.LastLogon) {
                            $lastLogon = [int64](($localUser.LastLogon.ToUniversalTime()) - [datetime]'1970-01-01').TotalMilliseconds
                        }
                    }
                } catch {}
            }

            $results += @{
                sid = $sidValue
                username = $username
                domain = $domain
                source = $source
                enabled = $enabled
                last_logon = $lastLogon
                password_last_set = $passwordLastSet
            }
        }
    } catch {
        Write-Host "Get-LocalAdministrators failed: $_"
    }
    # Unary comma — see Parse-QuserOutput's comment; without it a device
    # with exactly one local administrator would collapse this to a bare
    # Hashtable instead of a one-element array.
    return ,$results
}

# `query user` (real Windows command, works across the full Win10/11/
# Server 2019/2022/2025 matrix) for session enumeration, cross-referenced
# with Win32_LogonSession for LogonType, and per-active-session token
# inspection for real elevation state.
function Get-LoggedOnSessions {
    param($LocalAdminSids)

    $adminSidSet = @{}
    foreach ($sid in $LocalAdminSids) { if ($sid) { $adminSidSet[$sid] = $true } }

    $logonTypeByUser = @{}
    try {
        $logonSessions = Get-CimInstance Win32_LogonSession -ErrorAction SilentlyContinue
        foreach ($ls in $logonSessions) {
            try {
                $assoc = Get-CimAssociatedInstance -InputObject $ls -ResultClassName Win32_Account -ErrorAction SilentlyContinue
                foreach ($account in $assoc) {
                    $key = "$($account.Name)"
                    if (-not $logonTypeByUser.ContainsKey($key)) {
                        $logonTypeByUser[$key] = $ls.LogonType
                    }
                }
            } catch {}
        }
    } catch {}

    $sessions = @()
    try {
        $quserOutput = & query user 2>$null
        $rows = Parse-QuserOutput -Lines $quserOutput

        foreach ($row in $rows) {
            $username = $row["USERNAME"]
            if ([string]::IsNullOrWhiteSpace($username)) { continue }

            $sessionName = $row["SESSIONNAME"]
            $sessionId = $null
            [int]::TryParse($row["ID"], [ref]$sessionId) | Out-Null
            $state = $row["STATE"]
            $isActive = $state -match "(?i)^active"

            $sid = $null
            try {
                $ntAccount = New-Object System.Security.Principal.NTAccount($username)
                $sid = ($ntAccount.Translate([System.Security.Principal.SecurityIdentifier])).Value
            } catch {}

            $isLocalAccount = $true
            try {
                $localUser = Get-LocalUser -Name $username -ErrorAction SilentlyContinue
                $isLocalAccount = [bool]$localUser
            } catch {}

            $isAzureAdAccount = Test-AzureAdSid -Sid $sid
            $isMicrosoftAccount = $isLocalAccount -and (Test-MicrosoftAccountUsername -Username $username)
            $builtInKind = Resolve-BuiltInAccountKind -Sid $sid
            $accountType = if ($builtInKind) { $builtInKind } else { Resolve-AccountType -IsLocalAccount $isLocalAccount -Sid $sid -Username $username }

            $isInAdminsGroup = [bool]($sid -and $adminSidSet.ContainsKey($sid))
            $logonType = if ($logonTypeByUser.ContainsKey($username)) { $logonTypeByUser[$username] } else { $null }

            $tokenElevationType = $null
            $tokenIsElevated = $null
            if ($isActive -and $sessionId -ne $null) {
                try {
                    $representativeProcess = Get-CimInstance Win32_Process -Filter "SessionId=$sessionId AND Name='explorer.exe'" -ErrorAction SilentlyContinue | Select-Object -First 1
                    if (-not $representativeProcess) {
                        $representativeProcess = Get-CimInstance Win32_Process -Filter "SessionId=$sessionId" -ErrorAction SilentlyContinue | Select-Object -First 1
                    }
                    if ($representativeProcess) {
                        $tokenInfo = Get-TokenElevationInfo -ProcessId $representativeProcess.ProcessId
                        if ($tokenInfo) {
                            $tokenElevationType = $tokenInfo.elevationType
                            $tokenIsElevated = $tokenInfo.isElevated
                        }
                    }
                } catch {}
            }

            $privilege = Resolve-EffectivePrivilege -TokenElevationType $tokenElevationType -TokenElevated $tokenIsElevated -IsInLocalAdminsGroup $isInAdminsGroup

            $sessions += @{
                session_id = $sessionId
                username = $username
                domain = $env:COMPUTERNAME
                sid = $sid
                session_name = $sessionName
                state = $state
                logon_type = $logonType
                logon_time = $null
                idle_time_ms = $null
                is_active = $isActive
                is_local_account = $isLocalAccount
                is_azure_ad_account = $isAzureAdAccount
                is_microsoft_account = $isMicrosoftAccount
                account_type = $accountType
                is_administrator = $privilege.isAdministrator
                is_elevated = $privilege.isElevated
                elevation_source = $privilege.source
            }
        }
    } catch {
        Write-Host "Get-LoggedOnSessions failed: $_"
    }

    # Unary comma — see Parse-QuserOutput's comment; the common
    # single-session workstation case would otherwise collapse this to a
    # bare Hashtable and the backend would silently drop it.
    return ,$sessions
}

function Get-UserPrivilegeSnapshot {
    $localAdmins = Get-LocalAdministrators
    $adminSids = @($localAdmins | ForEach-Object { $_.sid } | Where-Object { $_ })
    $sessions = Get-LoggedOnSessions -LocalAdminSids $adminSids
    $uacStatus = Get-UacStatus

    return @{
        sessions = $sessions
        local_administrators = $localAdmins
        uac_status = $uacStatus
    }
}

# =====================================================
# EXECUTE SCRIPT
# =====================================================
function Execute-Script($job){

    if([string]::IsNullOrWhiteSpace($job.script)){
        return @{success=$false;output="";error="Empty Script"}
    }

    $scriptFile="$env:TEMP\aiops_job.ps1"
    Set-Content $scriptFile $job.script -Force

    # Consent if kill process
    if($job.script -match "Stop-Process"){
        try{
            $proc=($job.script -split "-Name")[1].Trim().Replace('"',"")
        }catch{$proc="Unknown"}

        if(!(Ask-UserConsent $job.job_id $proc "High Resource Usage")){
            return @{success=$false;output="Denied";error="User rejected"}
        }
    }

    try{
        Write-Host "Executing Script..."
        $output=& "$scriptFile" 2>&1 | Out-String
        return @{success=$true;output=$output;error=""}
    }
    catch{
        # $_ is the full ErrorRecord object, not a string — putting it
        # directly into a hashtable that later gets ConvertTo-Json'd fails,
        # because ErrorRecord.Exception.Data is a ListDictionaryInternal
        # (non-string-keyed dictionary), which ConvertTo-Json can't
        # serialize. "$_" stringifies to just the error message instead.
        return @{success=$false;output="";error="$_"}
    }
}

# =====================================================
# REMOTE JOB
# =====================================================
function Invoke-RemoteJob {

try{

$job=Invoke-RestMethod `
 -Uri "$BackendUrl/agent/job/$device"

if(!$job.job_id){return}

Write-Host "Received Job $($job.job_id)"

if($job.job_type -eq "PATCH"){
    Invoke-PatchJob $job
    Write-Host "Job Finished"
    return
}

$result=Execute-Script $job

Invoke-RestMethod `
 -Uri "$BackendUrl/agent/job/result" `
 -Method Post `
 -Body (@{
    job_id=$job.job_id
    job_type="SCRIPT"
    success=$result.success
    output=$result.output
    error=$result.error
 }|ConvertTo-Json -Depth 5) `
 -ContentType "application/json"

Write-Host "Job Finished"

}catch{
Write-Host "Job Error: $(Get-ConnectionErrorReason $_)"
}
}

function Get-HardwareHealth {

    # -------- Disk ----------
    $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"

    $diskUsed =
        (($disk.Size - $disk.FreeSpace) / $disk.Size) * 100

    $diskFree =
        ($disk.FreeSpace / $disk.Size) * 100


    # -------- CPU TEMP ----------
    try {
        $temp = Get-WmiObject `
            MSAcpi_ThermalZoneTemperature `
            -Namespace "root/wmi"

        $cpuTemp =
            (($temp.CurrentTemperature - 2732)/10)
    }
    catch {
        $cpuTemp = 45
    }


    # -------- Battery Health ----------
    try {

        $report="$env:TEMP\battery-report.html"

        powercfg /batteryreport /output $report | Out-Null
        Start-Sleep 1

        $html=Get-Content $report -Raw

        $design =
        ([regex]::Match($html,
        "DESIGN CAPACITY.*?(\d+,?\d*) mWh")).Groups[1].Value

        $full =
        ([regex]::Match($html,
        "FULL CHARGE CAPACITY.*?(\d+,?\d*) mWh")).Groups[1].Value

        $design=[double]($design -replace ",","")
        $full=[double]($full -replace ",","")

        $healthPercent=($full/$design)*100

        if($healthPercent -ge 80){$status="EXCELLENT"}
        elseif($healthPercent -ge 60){$status="GOOD"}
        elseif($healthPercent -ge 40){$status="WEAK"}
        else{$status="REPLACE"}

    }
    catch{
        $status="UNKNOWN"
        $healthPercent=0
    }


    # -------- FINAL RETURN ----------
    return @{
        disk = [math]::Round($diskUsed,2)
        disk_free = [math]::Round($diskFree,2)
        cpu_temp = [math]::Round($cpuTemp,2)
        battery_health = $status
        battery_health_percent =
            [math]::Round($healthPercent,1)
        fan_status = "OK"
    }
}

# =====================================================
# TOP PROCESSES
# =====================================================
# =====================================================
# TOP PROCESSES
# =====================================================
function Get-TopProcesses {

    Get-Process |
        Where-Object {
            $_.ProcessName -ne "Idle" -and
            $_.WorkingSet64 -gt 0
        } |
        Sort-Object WorkingSet64 -Descending |
        Select-Object -First 5 |
        ForEach-Object {

            @{
                name = $_.ProcessName

                # Total CPU time in seconds (NOT CPU %)
                cpu_time = [math]::Round($_.CPU,2)

                # RAM in MB
                ram = [math]::Round($_.WorkingSet64 / 1MB,2)

                pid = $_.Id
            }

        }

}

# One-time checks, before the main loop starts.
Test-ServerConnectivity -Url $BackendUrl

# If this run of the agent is the first one after a patch-triggered reboot,
# finish verifying and closing out that install job before doing anything else.
Test-PendingRebootVerification

# =====================================================
# MAIN LOOP
# =====================================================
while($true){

try{

$metricsDue = $false

if($null -eq $usageCache -or (Should-Collect $lastUsageCollection $COLLECT_USAGE_SECONDS)){
    $usageCache=Get-SystemUsage
    $lastUsageCollection=NowMillis
    $metricsDue = $true
}

if($null -eq $topCache -or (Should-Collect $lastProcessCollection $COLLECT_PROCESSES_SECONDS)){
    $topCache=Get-TopProcesses
    $lastProcessCollection=NowMillis
}

if($null -eq $complianceCache -or (Should-Collect $lastComplianceCollection $COLLECT_COMPLIANCE_SECONDS)){
    $complianceCache=Get-ComplianceStatus
    $lastComplianceCollection=NowMillis
}

if($null -eq $hardwareCache -or (Should-Collect $lastHardwareCollection $COLLECT_HARDWARE_SECONDS)){
    $hardwareCache=Get-HardwareHealth
    $lastHardwareCollection=NowMillis
}

if($null -eq $updateCache -or (Should-Collect $lastUpdateCollection $COLLECT_UPDATES_SECONDS)){
    Update-WindowsUpdateFullScanCache | Out-Null
    $lastUpdateCollection=NowMillis
}

if($lastUpdateFastCollection -eq 0 -or (Should-Collect $lastUpdateFastCollection $COLLECT_UPDATE_FAST_SECONDS)){
    $fastSignals = Get-WindowsUpdateFastSignals -EventsSince $lastUpdateEventLogCheck
    if ($null -eq $updateCache) { $updateCache = @{} }
    $updateCache.registry_reboot_pending = $fastSignals.reboot_required
    $updateCache.reboot_reason = $fastSignals.reboot_reason
    $updateCache.wu_service_status = $fastSignals.wu_service_status
    $updateCache.bits_service_status = $fastSignals.bits_service_status
    $updateCache.update_medic_status = $fastSignals.update_medic_status
    $updateEventsCache = $fastSignals.events
    $lastUpdateEventLogCheck = Get-Date
    $lastUpdateFastCollection = NowMillis
}

if($null -eq $inventoryCache -or (Should-Collect $lastInventoryCollection $COLLECT_INVENTORY_SECONDS)){
    $inventoryCache=Get-SystemInventory
    $lastInventoryCollection=NowMillis
}

if($lastApplicationsCollection -eq 0 -or (Should-Collect $lastApplicationsCollection $COLLECT_APPLICATIONS_SECONDS)){
    $installedApplicationsCache=Get-InstalledApplications
    $lastApplicationsCollection=NowMillis
}

if($lastProcessSnapshotCollection -eq 0 -or (Should-Collect $lastProcessSnapshotCollection $COLLECT_PROCESS_SNAPSHOT_SECONDS)){
    $runningProcessesCache=Get-RunningApplicationProcesses
    $applicationServicesCache=Get-ApplicationRelatedServices
    $crashEventsCache=Get-ApplicationCrashEvents
    $lastProcessSnapshotCollection=NowMillis
}

if($lastDependencyTopologyCollection -eq 0 -or (Should-Collect $lastDependencyTopologyCollection $COLLECT_DEPENDENCY_TOPOLOGY_SECONDS)){
    $scheduledTasksCache=Get-ScheduledTasksSnapshot
    $startupItemsCache=Get-StartupItems
    $systemDriversCache=Get-SystemDriversSnapshot
    $authenticationStatusCache=Get-AuthenticationStatus
    $lastDependencyTopologyCollection=NowMillis
}

if($lastNetworkCollection -eq 0 -or (Should-Collect $lastNetworkCollection $COLLECT_NETWORK_SECONDS)){
    $networkConnectionsCache=Get-NetworkConnectionsSnapshot
    $dnsCacheEntriesCache=Get-DnsCacheSnapshot
    $lastNetworkCollection=NowMillis
}

if($lastUserPrivilegeCollection -eq 0 -or (Should-Collect $lastUserPrivilegeCollection $COLLECT_USER_PRIVILEGE_SECONDS)){
    $privilegeSnapshot = Get-UserPrivilegeSnapshot
    $userSessionsCache = $privilegeSnapshot.sessions
    $localAdministratorsCache = $privilegeSnapshot.local_administrators
    $uacStatusCache = $privilegeSnapshot.uac_status
    $lastUserPrivilegeCollection = NowMillis
}

if($metricsDue){

$payload=@{
 id=$device
 cpu=$usageCache.cpu
 ram=$usageCache.ram
 boot_time=$usageCache.boot
 processes=$topCache
 compliance=$complianceCache
 hardware = $hardwareCache
 updates = $updateCache
 inventory = $inventoryCache
 installed_applications = $installedApplicationsCache
 running_processes = $runningProcessesCache
 application_services = $applicationServicesCache
 crash_events = $crashEventsCache
 scheduled_tasks = $scheduledTasksCache
 startup_items = $startupItemsCache
 system_drivers = $systemDriversCache
 authentication_status = $authenticationStatusCache
 network_connections = $networkConnectionsCache
 dns_cache = $dnsCacheEntriesCache
 update_catalog = $updateCatalogCache
 update_history_entries = $updateHistoryCache
 update_events = $updateEventsCache
 user_sessions = $userSessionsCache
 local_administrators = $localAdministratorsCache
 uac_status = $uacStatusCache
 }

 

$body=$payload|ConvertTo-Json -Depth 10

Invoke-RestMethod `
 -Uri "$BackendUrl/metrics" `
 -Method Post `
 -Body $body `
 -ContentType "application/json"
}

Invoke-RemoteJob

if($metricsDue){
Write-Host "CPU:$($usageCache.cpu)% RAM:$($usageCache.ram)%"
Write-Host (
    "Update: status={0} pending={1} failed={2} drivers={3} outdated={4}" -f
    $updateCache.windows_update_status,
    $updateCache.pending_updates,
    $updateCache.failed_updates,
    $updateCache.driver_status,
    $updateCache.outdated_drivers
)
Write-Host (
    "Inventory: services_issues={0} service_failures={1} driver_problems={2} outdated_drivers={3}" -f
    $inventoryCache.services.auto_running_issue_count,
    $inventoryCache.services.recent_failure_count,
    $inventoryCache.drivers.problem_count,
    $inventoryCache.drivers.outdated_count
)
}

}catch{
Write-Host "Agent Error: $(Get-ConnectionErrorReason $_)"
}

Start-Sleep 1
}
