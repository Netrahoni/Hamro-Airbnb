<#
.SYNOPSIS
    Hamro-Airbnb Automated Continuous Git Sync Script (PowerShell)
.DESCRIPTION
    Monitors the repository for uncommitted/untracked changes every 60 seconds.
    If changes are detected, it automatically stages, commits with a local timestamp,
    and pushes to the remote branch while handling active git operations, merge
    locks, and network failures gracefully without terminating.
#>

[CmdletBinding()]
param (
    [int]$IntervalSeconds = 60,
    [string]$TargetBranch = "",       # Leave empty to sync currently checked out branch
    [string]$Remote = "origin",
    [string]$LogFile = "auto-sync.log",
    [switch]$Once                     # Run once for testing, then exit
)

# Set working directory to the Git repository root where this script resides
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Resolve actual Git root directory
try {
    $GitRoot = (& git rev-parse --show-toplevel 2>$null).Trim()
    if ($GitRoot -and (Test-Path $GitRoot)) {
        Set-Location $GitRoot
    }
} catch {
    # Fallback to ScriptDir if rev-parse fails
}

$LogFilePath = Join-Path (Get-Location) $LogFile

function Write-SyncLog {
    param (
        [string]$Message,
        [ValidateSet("INFO", "SUCCESS", "WARN", "ERROR")]
        [string]$Level = "INFO"
    )

    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $FormattedLog = "[$Timestamp] [$Level] $Message"

    # Write to log file
    try {
        Add-Content -Path $LogFilePath -Value $FormattedLog -Encoding UTF8 -ErrorAction SilentlyContinue
    } catch { }

    # Write to console with colors
    switch ($Level) {
        "SUCCESS" { Write-Host $FormattedLog -ForegroundColor Green }
        "INFO"    { Write-Host $FormattedLog -ForegroundColor Cyan }
        "WARN"    { Write-Host $FormattedLog -ForegroundColor Yellow }
        "ERROR"   { Write-Host $FormattedLog -ForegroundColor Red }
    }
}

function Test-GitConflictOrMerge {
    # Check if Git is in the middle of a merge, rebase, or cherry-pick
    $GitDir = (& git rev-parse --git-dir 2>$null).Trim()
    if (-not $GitDir) { return $false }

    $BlockingMarkers = @(
        "MERGE_HEAD",
        "rebase-merge",
        "rebase-apply",
        "CHERRY_PICK_HEAD",
        "BISECT_LOG",
        "index.lock"
    )

    foreach ($Marker in $BlockingMarkers) {
        $MarkerPath = Join-Path $GitDir $Marker
        if (Test-Path $MarkerPath) {
            return $Marker
        }
    }
    return $null
}

# Banner
Clear-Host
Write-Host "===========================================================" -ForegroundColor DarkGreen
Write-Host "   Hamro-Airbnb Continuous Git Auto-Sync (PowerShell)      " -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor DarkGreen
Write-SyncLog "Auto-sync engine initialized." "INFO"
Write-SyncLog "Working Directory: $(Get-Location)" "INFO"
Write-SyncLog "Check Interval   : Every $IntervalSeconds seconds" "INFO"
Write-SyncLog "Remote Target    : $Remote" "INFO"
Write-SyncLog "Log Output File  : $LogFilePath" "INFO"
Write-Host "-----------------------------------------------------------" -ForegroundColor DarkGray

$Iteration = 0

try {
    while ($true) {
        $Iteration++

        # 1. Verify inside a Git work tree
        $IsInsideWorkTree = (& git rev-parse --is-inside-work-tree 2>$null).Trim()
        if ($IsInsideWorkTree -ne "true") {
            Write-SyncLog "Not inside a valid Git repository. Waiting..." "ERROR"
            if ($Once) { break }
            Start-Sleep -Seconds $IntervalSeconds
            continue
        }

        # 2. Determine target branch
        $CurrentBranch = (& git rev-parse --abbrev-ref HEAD 2>$null).Trim()
        $SyncBranch = if ($TargetBranch) { $TargetBranch } else { $CurrentBranch }

        if (-not $SyncBranch -or $SyncBranch -eq "HEAD") {
            Write-SyncLog "Detached HEAD or invalid branch detected. Skipping iteration." "WARN"
            if ($Once) { break }
            Start-Sleep -Seconds $IntervalSeconds
            continue
        }

        # 3. Check for active Git operation (merge, rebase, lock)
        $ActiveOp = Test-GitConflictOrMerge
        if ($ActiveOp) {
            Write-SyncLog "Git operation/lock in progress ($ActiveOp). Skipping commit to avoid conflicts." "WARN"
            if ($Once) { break }
            Start-Sleep -Seconds $IntervalSeconds
            continue
        }

        # 4. Check for working tree changes (uncommitted or untracked)
        $StatusOutput = & git status --porcelain
        if (-not $StatusOutput) {
            Write-SyncLog "Iteration #$Iteration - Working tree clean ($SyncBranch). No changes detected." "INFO"
        } else {
            $ChangeCount = ($StatusOutput | Measure-Object).Count
            Write-SyncLog "Iteration #$Iteration - Detected $ChangeCount modified/untracked file(s) on branch '$SyncBranch'." "WARN"

            # Stage all changes
            & git add -A 2>&1 | Out-Null

            # Confirm staged changes exist
            & git diff --cached --quiet
            $HasStagedChanges = ($LASTEXITCODE -ne 0)

            if ($HasStagedChanges) {
                $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                $CommitMessage = "auto-sync: $Timestamp"

                Write-SyncLog "Creating commit: '$CommitMessage'..." "INFO"
                $CommitOutput = & git commit -m $CommitMessage 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-SyncLog "Committed successfully: $CommitMessage" "SUCCESS"

                    # Push to remote
                    Write-SyncLog "Pushing to $Remote/$SyncBranch..." "INFO"
                    $PushOutput = & git push $Remote $SyncBranch 2>&1
                    $PushExitCode = $LASTEXITCODE

                    if ($PushExitCode -eq 0) {
                        Write-SyncLog "Successfully pushed changes to $Remote/$SyncBranch!" "SUCCESS"
                    } else {
                        $PushError = ($PushOutput | Out-String).Trim()
                        Write-SyncLog "Push encountered an issue (Exit code $PushExitCode): $PushError" "ERROR"
                        Write-SyncLog "Will retry push automatically on next iteration." "WARN"
                    }
                } else {
                    $CommitError = ($CommitOutput | Out-String).Trim()
                    Write-SyncLog "Commit skipped or failed: $CommitError" "WARN"
                }
            } else {
                Write-SyncLog "No changes remained after staging (clean working tree)." "INFO"
            }
        }

        if ($Once) {
            Write-SyncLog "Single execution (-Once) complete. Exiting." "INFO"
            break
        }

        # Sleep until next check
        Start-Sleep -Seconds $IntervalSeconds
    }
} catch {
    Write-SyncLog "Unexpected exception caught in auto-sync loop: $_" "ERROR"
} finally {
    Write-SyncLog "Auto-sync engine stopped." "WARN"
}
