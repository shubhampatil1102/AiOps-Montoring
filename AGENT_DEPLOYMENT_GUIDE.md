# PowerShell Agent Deployment Guide

## Overview
The AiOps Agent is a PowerShell script that runs on Windows machines to collect system metrics and execute remediation scripts. It sends data to your backend API running on port 4000.

## Key Changes Made
✅ Agent now accepts a **BackendUrl** parameter
✅ Automatically elevates to Admin privileges
✅ Collects metrics every 3 seconds
✅ Sends data to your backend server

## Running the Agent Locally

### Option 1: Default (localhost)
```powershell
powershell -ExecutionPolicy Bypass -File C:\path\to\agent.ps1
```

### Option 2: Custom Backend URL
```powershell
powershell -ExecutionPolicy Bypass -File C:\path\to\agent.ps1 -BackendUrl "http://your-backend-server:4000"
```

## Running the Agent on Remote Machines

### Prerequisites
- PowerShell 5.0 or higher
- Administrator privileges
- Network access to your backend server

### Step 1: Copy Agent to Remote Machine

**Option A: Using PowerShell Remoting**
```powershell
$remoteServer = "remote-machine-name"
$localAgent = "C:\path\to\agent.ps1"
$remotePath = "C:\AiOps\agent.ps1"

# Copy file to remote machine
Copy-Item -Path $localAgent -Destination $remotePath -ToSession (New-PSSession -ComputerName $remoteServer)
```

**Option B: Using SMB/Network Share**
```powershell
# Copy to network share accessible from remote machine
Copy-Item -Path C:\path\to\agent.ps1 -Destination \\remote-machine\c$\AiOps\agent.ps1
```

**Option C: Using SCP (if OpenSSH installed)**
```bash
scp C:\path\to\agent.ps1 admin@remote-machine:C:\AiOps\agent.ps1
```

### Step 2: Run Agent on Remote Machine

**Option A: Via PowerShell Remoting (Interactive)**
```powershell
$session = New-PSSession -ComputerName remote-machine-name

Invoke-Command -Session $session -ScriptBlock {
    powershell -ExecutionPolicy Bypass -File C:\AiOps\agent.ps1 `
        -BackendUrl "http://YOUR_BACKEND_IP:4000"
}
```

**Option B: Via PowerShell Remoting (Background Job)**
```powershell
$session = New-PSSession -ComputerName remote-machine-name

Invoke-Command -Session $session -AsJob -ScriptBlock {
    powershell -ExecutionPolicy Bypass -NoProfile `
        -File C:\AiOps\agent.ps1 `
        -BackendUrl "http://YOUR_BACKEND_IP:4000"
}
```

**Option C: Via Scheduled Task (Persistent)**
```powershell
$taskName = "AiOps Agent"
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -NoProfile -File C:\AiOps\agent.ps1 -BackendUrl 'http://YOUR_BACKEND_IP:4000'"

$trigger = New-ScheduledTaskTrigger -AtStartup

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -RunLevel Highest `
    -Force
```

## Configuration for Different Environments

### For Local Testing (Same Machine)
```powershell
.\agent.ps1 -BackendUrl "http://localhost:4000"
```

### For Docker Network (From Container Host)
```powershell
.\agent.ps1 -BackendUrl "http://host.docker.internal:4000"
```

### For Remote Server (External)
```powershell
.\agent.ps1 -BackendUrl "http://192.168.1.36:4000"
# or
.\agent.ps1 -BackendUrl "http://backend.yourdomain.com:4000"
```

## Firewall Rules

Make sure port 4000 is open on your backend server:

**Windows Firewall (Backend Server)**
```powershell
New-NetFirewallRule `
    -DisplayName "AiOps Backend API" `
    -Direction Inbound `
    -LocalPort 4000 `
    -Protocol TCP `
    -Action Allow
```

**Linux/Docker (if backend is in Docker)**
```bash
# The port 4000 is already exposed in docker-compose.yml
# Make sure the host firewall allows traffic on port 4000
sudo ufw allow 4000/tcp  # Ubuntu/Debian
sudo firewall-cmd --add-port=4000/tcp --permanent  # CentOS/RHEL
```

## Deploy Agent to Multiple Machines

### PowerShell Script for Bulk Deployment
```powershell
$machines = @(
    "machine1",
    "machine2", 
    "machine3"
)

$backendUrl = "http://your-backend-ip:4000"
$agentScript = "C:\path\to\agent.ps1"

foreach ($machine in $machines) {
    Write-Host "Deploying to $machine..."
    
    # Copy agent
    Copy-Item -Path $agentScript -Destination \\$machine\c$\AiOps\agent.ps1 -Force
    
    # Create scheduled task remotely
    Invoke-Command -ComputerName $machine -ScriptBlock {
        param($backendUrl)
        
        $taskName = "AiOps Agent"
        $action = New-ScheduledTaskAction `
            -Execute "powershell.exe" `
            -Argument "-ExecutionPolicy Bypass -NoProfile -File C:\AiOps\agent.ps1 -BackendUrl '$backendUrl'"
        
        $trigger = New-ScheduledTaskTrigger -AtStartup
        
        Register-ScheduledTask `
            -TaskName $taskName `
            -Action $action `
            -Trigger $trigger `
            -RunLevel Highest `
            -Force
        
        Write-Host "Scheduled task created on $env:COMPUTERNAME"
        
    } -ArgumentList $backendUrl
}
```

## Monitoring Agent Status

### Check if Agent is Running
```powershell
# Check processes
Get-Process | Where-Object {$_.ProcessName -like "*powershell*"}

# Check scheduled task
Get-ScheduledTask -TaskName "AiOps Agent" | Get-ScheduledTaskInfo
```

### View Agent Logs
The agent outputs to console. To capture logs:

```powershell
# Create log file
$logPath = "C:\AiOps\agent.log"

# Run with logging
powershell -ExecutionPolicy Bypass -File C:\AiOps\agent.ps1 `
    -BackendUrl "http://YOUR_BACKEND_IP:4000" `
    -OutFile $logPath -Append

# View logs
Get-Content $logPath -Tail 50
```

## Troubleshooting

### Issue: Connection Refused
**Solution**: Verify backend server IP and port, ensure firewall allows traffic
```powershell
Test-NetConnection -ComputerName your-backend-ip -Port 4000
```

### Issue: Agent Exits Immediately
**Solution**: Check for errors, make sure Admin privileges are granted
```powershell
powershell -ExecutionPolicy Bypass -File C:\AiOps\agent.ps1 -BackendUrl "http://your-backend:4000" -Verbose
```

### Issue: Metrics Not Appearing in Dashboard
**Solution**: Check if data is reaching backend
```bash
# On backend server, check if POST requests are received
docker logs aiops-backend | grep "metrics"
```

### Issue: Agent Running but No Data
**Solution**: Verify NetworkActivity and WMI access
```powershell
# Test WMI access
Get-CimInstance Win32_Processor
Get-CimInstance Win32_OperatingSystem

# Test HTTP connectivity
Invoke-RestMethod -Uri "http://your-backend-ip:4000/metrics" -Method Post -Body '{"test":"data"}' -ContentType "application/json"
```

## Security Considerations

⚠️ **Important**: The agent runs with Administrator privileges to access system information.

1. **Authentication**: Currently no auth token (add if needed)
2. **HTTPS**: Consider using HTTPS in production
3. **Firewall**: Restrict backend access to trusted networks
4. **Execution Policy**: Use signed scripts in production environments

## Example Deployments

### Deployment 1: Single Remote Machine
```powershell
# From your local machine
.\agent.ps1 -BackendUrl "http://192.168.1.50:4000"
```

### Deployment 2: Remote Machine via Scheduled Task
```powershell
$remoteServer = "prod-server-01"
$backendUrl = "http://backend.company.com:4000"

# First, copy the agent
Copy-Item -Path .\agent.ps1 -Destination \\$remoteServer\c$\AiOps\ -Force

# Then create scheduled task
Invoke-Command -ComputerName $remoteServer -ScriptBlock {
    param($url)
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -NoProfile -File C:\AiOps\agent.ps1 -BackendUrl '$url'"
    $trigger = New-ScheduledTaskTrigger -AtStartup
    Register-ScheduledTask -TaskName "AiOps Agent" -Action $action -Trigger $trigger -RunLevel Highest -Force
} -ArgumentList $backendUrl
```

### Deployment 3: Multiple Machines with Error Handling
```powershell
$machines = "machine1", "machine2", "machine3"
$backendUrl = "http://10.0.0.100:4000"

foreach ($m in $machines) {
    try {
        Write-Host "Deploying to $m..."
        Copy-Item -Path .\agent.ps1 -Destination \\$m\c$\AiOps\ -Force -ErrorAction Stop
        
        Invoke-Command -ComputerName $m -ScriptBlock {
            param($url)
            $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File C:\AiOps\agent.ps1 -BackendUrl '$url'"
            Register-ScheduledTask -TaskName "AiOps Agent" -Action $action -Trigger (New-ScheduledTaskTrigger -AtStartup) -RunLevel Highest -Force
        } -ArgumentList $backendUrl -ErrorAction Stop
        
        Write-Host "✓ Successfully deployed to $m"
    }
    catch {
        Write-Host "✗ Failed to deploy to $m : $_"
    }
}
```

## Data Collection

The agent collects and sends every 3 seconds:

- **System Metrics**: CPU %, RAM %, Boot time
- **Top Processes**: Top 5 by CPU usage
- **Security**: BitLocker, TPM, SecureBoot, Windows Defender status
- **Updates**: Windows Update status, pending updates, driver updates
- **Hardware**: Disk usage, CPU temp, Battery health
- **Services**: Stopped services, recent failures
- **Drivers**: Problem devices, outdated drivers

## Stopping the Agent

### If Running Interactively
```powershell
# Press Ctrl+C in the PowerShell window
```

### If Running as Scheduled Task
```powershell
Disable-ScheduledTask -TaskName "AiOps Agent"
# Or remove it completely:
Unregister-ScheduledTask -TaskName "AiOps Agent" -Confirm:$false
```

### On Remote Machine
```powershell
Invoke-Command -ComputerName remote-machine -ScriptBlock {
    Unregister-ScheduledTask -TaskName "AiOps Agent" -Confirm:$false
}
```
