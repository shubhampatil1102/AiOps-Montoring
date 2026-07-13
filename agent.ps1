param(
    [string]$BackendUrl = "http://localhost:4000"
)

$ErrorActionPreference = "Stop"
Write-Host "===== AiOps Agent Starting ====="
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

    Start-Process powershell `
        -ArgumentList "-ExecutionPolicy Bypass -NoProfile -File `"$PSCommandPath`"" `
        -Verb RunAs

    exit
}

$device = $env:COMPUTERNAME.Trim().ToUpper()

# =====================================================
# COLLECTION SCHEDULER
# =====================================================
$COLLECT_USAGE_SECONDS = 5
$COLLECT_PROCESSES_SECONDS = 10
$COLLECT_HARDWARE_SECONDS = 60
$COLLECT_INVENTORY_SECONDS = 300
$COLLECT_COMPLIANCE_SECONDS = 900
$COLLECT_UPDATES_SECONDS = 1800

$lastUsageCollection = 0
$lastProcessCollection = 0
$lastHardwareCollection = 0
$lastInventoryCollection = 0
$lastComplianceCollection = 0
$lastUpdateCollection = 0

$usageCache = $null
$topCache = @()
$hardwareCache = $null
$inventoryCache = $null
$complianceCache = $null
$updateCache = $null

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
function Get-UpdateHealth {

    try {

        Import-Module PSWindowsUpdate -ErrorAction SilentlyContinue

        $updates = Get-WindowsUpdate -MicrosoftUpdate -IgnoreUserInput -ErrorAction SilentlyContinue

        $pending = ($updates | Where-Object {$_.IsDownloaded -eq $false}).Count

        $failed = (Get-WinEvent -LogName System -MaxEvents 50 |
            Where-Object {$_.Message -like "*failed*update*"}).Count

        if($pending -eq 0){
            $winStatus="UP_TO_DATE"
        }else{
            $winStatus="PENDING"
        }

    } catch {
        $winStatus="UNKNOWN"
        $pending=0
        $failed=0
    }

    # ================= DRIVER CHECK =================

    try {

        $drivers = Get-CimInstance Win32_PnPSignedDriver |
            Where-Object {$_.DriverDate -lt (Get-Date).AddYears(-2)}

        $outdated = $drivers.Count

        if($outdated -gt 0){
            $driverStatus="OUTDATED"
        } else {
            $driverStatus="HEALTHY"
        }

    } catch {
        $driverStatus="UNKNOWN"
        $outdated=0
    }

    return @{
        windows_update_status = $winStatus
        pending_updates = $pending
        failed_updates = $failed
        driver_status = $driverStatus
        outdated_drivers = $outdated
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
        return @{success=$false;output="";error=$_}
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

$result=Execute-Script $job

Invoke-RestMethod `
 -Uri "$BackendUrl/agent/job/result" `
 -Method Post `
 -Body (@{
    job_id=$job.job_id
    success=$result.success
    output=$result.output
    error=$result.error
 }|ConvertTo-Json -Depth 5) `
 -ContentType "application/json"

Write-Host "Job Finished"

}catch{
Write-Host "Job Error: $_"
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
function Get-TopProcesses {

Get-Process |
Sort CPU -Descending |
Select -First 5 |
ForEach-Object{
 @{
  name=$_.ProcessName
  cpu=[math]::Round($_.CPU,2)
  ram=[math]::Round($_.WorkingSet64/1MB,2)
 }
}
}

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
    $updateCache=Get-UpdateHealth
    $lastUpdateCollection=NowMillis
}

if($null -eq $inventoryCache -or (Should-Collect $lastInventoryCollection $COLLECT_INVENTORY_SECONDS)){
    $inventoryCache=Get-SystemInventory
    $lastInventoryCollection=NowMillis
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
Write-Host "Agent Error: $_"
}

Start-Sleep 1
}
