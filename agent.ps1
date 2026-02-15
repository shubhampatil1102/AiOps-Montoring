$ErrorActionPreference = "Stop"
Write-Host "Agent starting..."

# ---------------- PROCESS COLLECTOR ----------------
function Get-TopProcesses {

    $cores = (Get-CimInstance Win32_ComputerSystem).NumberOfLogicalProcessors

    $samples = (Get-Counter '\Process(*)\% Processor Time').CounterSamples

    $grouped = $samples |
        Where-Object { $_.InstanceName -notmatch "_Total|Idle" } |
        Group-Object InstanceName |
        ForEach-Object {
            $cpuRaw = ($_.Group | Measure-Object CookedValue -Average).Average
            $cpu = $cpuRaw / $cores

            [PSCustomObject]@{
                name = $_.Name
                cpu  = [math]::Round($cpu, 2)
            }
        } |
        Sort-Object cpu -Descending |
        Select-Object -First 5

    $list = @()

    foreach ($p in $grouped) {
    
        $proc = Get-Process -Name $p.name -ErrorAction SilentlyContinue | Select-Object -First 1
        $ram = if ($proc) { [math]::Round($proc.WorkingSet / 1MB, 2) } else { 0 }

        $list += @{
            name = $p.name
            cpu  = $p.cpu
            ram  = $ram
        }
    }

    return $list
}
$boot = (Get-CimInstance Win32_OperatingSystem).LastBootUpTime
    $bootUnix = [int][double]::Parse((Get-Date $boot -UFormat %s))
    $bootMillis = $bootUnix * 1000
# ---------------- MAIN LOOP ----------------
while ($true) {

    try {

        # CPU %
        $cpu = (Get-Counter '\Processor(_Total)\% Processor Time').CounterSamples.CookedValue
        $cpu = [math]::Round($cpu,2)

        # RAM %
        $os = Get-CimInstance Win32_OperatingSystem
        $used = ($os.TotalVisibleMemorySize - $os.FreePhysicalMemory)
        $ram = [math]::Round(($used / $os.TotalVisibleMemorySize) * 100,2)

        # Top processes
        $top = Get-TopProcesses

        # Payload
        $body = @{
            id = $env:COMPUTERNAME
            cpu = $cpu
            ram = $ram
            boot_time = $bootMillis
            processes = $top
        } | ConvertTo-Json -Depth 4

        Invoke-RestMethod `
            -Uri "http://127.0.0.1:4000/metrics" `
            -Method Post `
            -Body $body `
            -ContentType "application/json"

        Write-Host "Sent CPU:$cpu RAM:$ram"

    }
    catch {
        Write-Host "ERROR:" $_
    }

    Start-Sleep 5
}
