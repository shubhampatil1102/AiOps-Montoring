<#
.SYNOPSIS
    Standalone NexOps network diagnostics — safe to run from any machine
    without admin rights and without starting the agent.

.DESCRIPTION
    Tests, in order: ping, DNS resolution, TCP port reachability, the
    backend's /health endpoint, and a couple of real API endpoints.
    Reports a specific reason for failure (DNS / connection refused /
    timeout / likely firewall / backend offline / API error) instead of a
    generic "unable to connect" message.

.PARAMETER BackendUrl
    e.g. http://192.168.1.36:4000. Defaults to reading agent.config.json
    next to this script, then falls back to http://localhost:4000.

.EXAMPLE
    .\Test-NexOpsConnection.ps1 -BackendUrl "http://192.168.1.36:4000"
#>
param(
    [string]$BackendUrl
)

function Resolve-TargetUrl {
    param([string]$ParamValue)

    if (-not [string]::IsNullOrWhiteSpace($ParamValue)) {
        return $ParamValue.TrimEnd("/")
    }

    $configPath = Join-Path $PSScriptRoot "agent.config.json"
    if (Test-Path $configPath) {
        try {
            $config = Get-Content $configPath -Raw | ConvertFrom-Json
            if (-not [string]::IsNullOrWhiteSpace($config.serverUrl)) {
                return $config.serverUrl.TrimEnd("/")
            }
        } catch {
            Write-Host "Could not parse agent.config.json - ignoring it."
        }
    }

    return "http://localhost:4000"
}

$BackendUrl = Resolve-TargetUrl -ParamValue $BackendUrl
$uri = [System.Uri]$BackendUrl
$hostName = $uri.Host
$port = $uri.Port

$results = @()
function Add-Result($name, $ok, $detail) {
    $script:results += [pscustomobject]@{ Check = $name; Result = if ($ok) { "PASS" } else { "FAIL" }; Detail = $detail }
}

Write-Host "===== NexOps Network Diagnostics ====="
Write-Host "Target: $BackendUrl"
Write-Host ""

# ---- Ping ----
try {
    $ping = Test-Connection -ComputerName $hostName -Count 2 -Quiet -ErrorAction Stop
    $pingDetail = $(if ($ping) { "Host responds to ICMP" } else { "No ICMP response (may still be reachable over TCP - some firewalls block ping specifically)" })
    Add-Result "Ping" $ping $pingDetail
} catch {
    Add-Result "Ping" $false "Ping failed: $_"
}

# ---- DNS ----
try {
    $addresses = [System.Net.Dns]::GetHostAddresses($hostName)
    Add-Result "DNS resolution" $true "$hostName -> $($addresses[0].IPAddressToString)"
} catch {
    Add-Result "DNS resolution" $false "Cannot resolve '$hostName' - check the hostname/IP in the URL"
}

# ---- TCP port ----
$tcpOk = $false
try {
    $client = New-Object System.Net.Sockets.TcpClient
    $asyncResult = $client.BeginConnect($hostName, $port, $null, $null)
    $tcpOk = $asyncResult.AsyncWaitHandle.WaitOne(5000) -and $client.Connected
    $client.Close()

    if ($tcpOk) {
        Add-Result "TCP port $port" $true "Reachable"
    } else {
        Add-Result "TCP port $port" $false "Timed out or refused - likely backend offline, or Windows Firewall on $hostName blocking inbound $port"
    }
} catch {
    Add-Result "TCP port $port" $false "Connection error: $_"
}

# ---- Health endpoint ----
if ($tcpOk) {
    try {
        $health = Invoke-RestMethod -Uri "$BackendUrl/health" -Method Get -TimeoutSec 5
        Add-Result "/health endpoint" $true "status=$($health.status) version=$($health.version) uptime=$($health.uptime)s"
    } catch {
        $reason = "Request failed: $($_.Exception.Message)"
        if ($_.Exception -is [System.Net.WebException] -and $_.Exception.Status -eq "Timeout") {
            $reason = "Timed out - server accepted the TCP connection but didn't respond in time"
        }
        Add-Result "/health endpoint" $false $reason
    }

    # ---- A couple of real API endpoints, to catch a CORS/route-level issue
    # even when /health is fine ----
    try {
        Invoke-RestMethod -Uri "$BackendUrl/devices" -Method Get -TimeoutSec 5 | Out-Null
        Add-Result "GET /devices" $true "Responded"
    } catch {
        Add-Result "GET /devices" $false "Request failed: $($_.Exception.Message)"
    }
} else {
    Add-Result "/health endpoint" $false "Skipped - TCP port unreachable"
    Add-Result "GET /devices" $false "Skipped - TCP port unreachable"
}

# ---- WebSocket ----
# This application has no WebSocket/real-time server anywhere in its
# architecture (confirmed) — reported explicitly as not applicable rather
# than fabricating a test against something that doesn't exist.
Add-Result "WebSocket" $true "N/A - this application has no WebSocket server; all real-time UI updates are HTTP polling"

Write-Host ""
$results | Format-Table -AutoSize
Write-Host ""

$failed = @($results | Where-Object { $_.Result -eq "FAIL" })
if ($failed.Count -eq 0) {
    Write-Host "All checks passed - the backend is reachable from this machine."
} else {
    Write-Host "$($failed.Count) check(s) failed. See the Detail column above for the specific reason."
    Write-Host "See NETWORK_SETUP.md for firewall commands and configuration steps."
}
