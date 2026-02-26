$ErrorActionPreference = "Stop"
Write-Host "===== AiOps Agent Starting ====="

# =====================================================
# ADMIN AUTO ELEVATION
# =====================================================$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
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
# TIME HELPER
# =====================================================
function NowMillis {
    return [int64]((Get-Date).ToUniversalTime() -
        [datetime]'1970-01-01').TotalMilliseconds
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
 -Uri "http://localhost:4000/agent/job/approval" `
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
 -Uri "http://localhost:4000/agent/job/$device"

if(!$job.job_id){return}

Write-Host "Received Job $($job.job_id)"

$result=Execute-Script $job

Invoke-RestMethod `
 -Uri "http://localhost:4000/agent/job/result" `
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

$usage=Get-SystemUsage
$top=Get-TopProcesses
$compliance=Get-ComplianceStatus
$hardware = Get-HardwareHealth

$payload=@{
 id=$device
 cpu=$usage.cpu
 ram=$usage.ram
 boot_time=$usage.boot
 processes=$top
 compliance=$compliance
 hardware = $hardware
 }


$body=$payload|ConvertTo-Json -Depth 10

Invoke-RestMethod `
 -Uri "http://localhost:4000/metrics" `
 -Method Post `
 -Body $body `
 -ContentType "application/json"

Invoke-RemoteJob

Write-Host "CPU:$($usage.cpu)% RAM:$($usage.ram)%"

}catch{
Write-Host "Agent Error: $_"
}

Start-Sleep 5
}