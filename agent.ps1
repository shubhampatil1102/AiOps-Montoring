$ErrorActionPreference = "Stop"
Write-Host "AiOps Agent starting..."

$device = $env:COMPUTERNAME.Trim().ToUpper()

# ================= SYSTEM USAGE =================
function Get-SystemUsage {

    $cpu = Get-CimInstance Win32_Processor |
           Measure-Object LoadPercentage -Average |
           Select -ExpandProperty Average

    $os = Get-CimInstance Win32_OperatingSystem
    $ram = (($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) /
           $os.TotalVisibleMemorySize) * 100

    $boot = $os.LastBootUpTime
    $bootUnix = [int][double]::Parse((Get-Date $boot -UFormat %s))
    $bootMillis = $bootUnix * 1000

    return @{
        cpu = [math]::Round($cpu,2)
        ram = [math]::Round($ram,2)
        boot = $bootMillis
    }
}

# ================= TOP PROCESSES =================
function Get-TopProcesses {

    Get-Process |
    Sort-Object CPU -Descending |
    Select-Object -First 5 |
    ForEach-Object {
        @{
            name = $_.ProcessName
            cpu  = [math]::Round($_.CPU,2)
            ram  = [math]::Round($_.WorkingSet64 / 1MB,2)
        }
    }
}

# ================= SCRIPT EXECUTOR =================
function Execute-Script($scriptText) {

    try {

        $tempScript = "C:\ProgramData\AiOps_job.ps1"
        Set-Content -Path $tempScript -Value $scriptText -Force

        Write-Host "Executing script..."

        $output = & powershell -ExecutionPolicy Bypass -File $tempScript 2>&1 | Out-String

        return @{
            success = $true
            output  = $output
            error   = ""
        }
    }
    catch {
        return @{
            success = $false
            output  = ""
            error   = ($_ | Out-String)
        }
    }
}

# ================= REMOTE JOB =================
function Invoke-RemoteJob {

    try {

        Write-Host "Checking job for $device"

        $job = Invoke-RestMethod -Uri "http://127.0.0.1:4000/agent/job/$device"

        if (!$job.job_id) { return }

        Write-Host "Received job $($job.job_id)"

        $result = Execute-Script $job.script

        Invoke-RestMethod `
          -Uri "http://127.0.0.1:4000/agent/job/result" `
          -Method Post `
          -Body (@{
              job_id = $job.job_id
              success = $result.success
              output = $result.output
              error = $result.error
          } | ConvertTo-Json -Depth 5) `
          -ContentType "application/json"

        Write-Host "Job finished"

    }
    catch {
        Write-Host "Job execution failed: $_"
    }
}

# ================= MAIN LOOP =================
while ($true) {

    try {

        $usage = Get-SystemUsage
        $top = Get-TopProcesses

        $body = @{
            id = $device
            cpu = $usage.cpu
            ram = $usage.ram
            boot_time = $usage.boot
            processes = $top
        } | ConvertTo-Json -Depth 4

        Invoke-RestMethod `
            -Uri "http://127.0.0.1:4000/metrics" `
            -Method Post `
            -Body $body `
            -ContentType "application/json"

        Invoke-RemoteJob

        Write-Host "Sent CPU:$($usage.cpu) RAM:$($usage.ram)"

    }
    catch {
        Write-Host "Agent error: $_"
    }

    Start-Sleep 5
}
