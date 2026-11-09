<#
.SYNOPSIS
    Stops all background instances of the auto-sync.ps1 script.
#>

$TargetScriptName = "auto-sync.ps1"
Write-Host "Searching for active $TargetScriptName processes..." -ForegroundColor Cyan

$StoppedCount = 0

try {
    # Query all running powershell processes
    $Processes = Get-CimInstance Win32_Process -Filter "Name LIKE '%powershell%'" -ErrorAction SilentlyContinue

    foreach ($Proc in $Processes) {
        if ($Proc.CommandLine -and $Proc.CommandLine.Contains($TargetScriptName)) {
            Write-Host "Terminating background auto-sync process (PID: $($Proc.ProcessId))..." -ForegroundColor Yellow
            Stop-Process -Id $Proc.ProcessId -Force -ErrorAction SilentlyContinue
            $StoppedCount++
        }
    }

    if ($StoppedCount -gt 0) {
        Write-Host "✓ Successfully stopped $StoppedCount background auto-sync process(es)." -ForegroundColor Green
    } else {
        Write-Host "ℹ No running auto-sync background processes found." -ForegroundColor Gray
    }
} catch {
    Write-Host "Error checking or stopping processes: $_" -ForegroundColor Red
}
