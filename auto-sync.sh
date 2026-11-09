#!/usr/bin/env bash
# ==============================================================================
# Hamro-Airbnb Automated Continuous Git Sync Script (Bash / Git Bash / Linux / macOS)
# ==============================================================================

INTERVAL=60
REMOTE="origin"
TARGET_BRANCH=""
LOG_FILE="auto-sync.log"
ONCE=false

# Parse optional command-line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -i|--interval) INTERVAL="$2"; shift ;;
        -b|--branch) TARGET_BRANCH="$2"; shift ;;
        -r|--remote) REMOTE="$2"; shift ;;
        -l|--log) LOG_FILE="$2"; shift ;;
        --once) ONCE=true ;;
        -h|--help)
            echo "Usage: ./auto-sync.sh [options]"
            echo "Options:"
            echo "  -i, --interval <sec>   Check interval in seconds (default: 60)"
            echo "  -b, --branch <name>    Target branch (default: current checked out branch)"
            echo "  -r, --remote <name>    Remote name (default: origin)"
            echo "  -l, --log <file>       Log output file (default: auto-sync.log)"
            echo "  --once                 Run once then exit"
            exit 0
            ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

# Resolve Git repository root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

GIT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -n "$GIT_ROOT" ] && [ -d "$GIT_ROOT" ]; then
    cd "$GIT_ROOT" || exit 1
fi

LOG_FILE_PATH="$(pwd)/$LOG_FILE"

# Color definitions (ANSI)
COLOR_RESET="\033[0m"
COLOR_GREEN="\033[0;32m"
COLOR_CYAN="\033[0;36m"
COLOR_YELLOW="\033[1;33m"
COLOR_RED="\033[0;31m"
COLOR_DARK="\033[1;30m"

log_msg() {
    local level="$1"
    local msg="$2"
    local timestamp
    timestamp="$(date +"%Y-%m-%d %H:%M:%S")"
    local formatted="[$timestamp] [$level] $msg"

    # Append to log file
    echo "$formatted" >> "$LOG_FILE_PATH" 2>/dev/null

    # Print to console with colors
    case "$level" in
        SUCCESS) echo -e "${COLOR_GREEN}${formatted}${COLOR_RESET}" ;;
        INFO)    echo -e "${COLOR_CYAN}${formatted}${COLOR_RESET}" ;;
        WARN)    echo -e "${COLOR_YELLOW}${formatted}${COLOR_RESET}" ;;
        ERROR)   echo -e "${COLOR_RED}${formatted}${COLOR_RESET}" ;;
        *)       echo "$formatted" ;;
    esac
}

# Graceful exit handler
cleanup() {
    echo ""
    log_msg "WARN" "Received shutdown signal. Stopping auto-sync engine."
    exit 0
}
trap cleanup SIGINT SIGTERM

# Check for active in-progress merge, rebase, or lock
test_git_in_progress() {
    local git_dir
    git_dir="$(git rev-parse --git-dir 2>/dev/null)"
    [ -z "$git_dir" ] && return 1

    local markers=("MERGE_HEAD" "rebase-merge" "rebase-apply" "CHERRY_PICK_HEAD" "BISECT_LOG" "index.lock")
    for marker in "${markers[@]}"; do
        if [ -e "$git_dir/$marker" ]; then
            echo "$marker"
            return 0
        fi
    done
    return 1
}

echo -e "${COLOR_GREEN}===========================================================${COLOR_RESET}"
echo -e "${COLOR_GREEN}   Hamro-Airbnb Continuous Git Auto-Sync (Bash / CLI)      ${COLOR_RESET}"
echo -e "${COLOR_GREEN}===========================================================${COLOR_RESET}"
log_msg "INFO" "Auto-sync engine initialized."
log_msg "INFO" "Working Directory: $(pwd)"
log_msg "INFO" "Check Interval   : Every $INTERVAL seconds"
log_msg "INFO" "Remote Target    : $REMOTE"
log_msg "INFO" "Log Output File  : $LOG_FILE_PATH"
echo -e "${COLOR_DARK}-----------------------------------------------------------${COLOR_RESET}"

iteration=0

while true; do
    iteration=$((iteration + 1))

    # 1. Verify inside a Git work tree
    inside_work_tree="$(git rev-parse --is-inside-work-tree 2>/dev/null)"
    if [ "$inside_work_tree" != "true" ]; then
        log_msg "ERROR" "Not inside a valid Git repository. Waiting..."
        [ "$ONCE" = true ] && break
        sleep "$INTERVAL"
        continue
    fi

    # 2. Determine target branch
    current_branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
    sync_branch="${TARGET_BRANCH:-$current_branch}"

    if [ -z "$sync_branch" ] || [ "$sync_branch" = "HEAD" ]; then
        log_msg "WARN" "Detached HEAD or invalid branch detected. Skipping iteration."
        [ "$ONCE" = true ] && break
        sleep "$INTERVAL"
        continue
    fi

    # 3. Check for active Git operation (merge, rebase, cherry-pick)
    if active_op="$(test_git_in_progress)"; then
        log_msg "WARN" "Git operation in progress ($active_op). Skipping auto-commit to prevent conflicts."
        [ "$ONCE" = true ] && break
        sleep "$INTERVAL"
        continue
    fi

    # 4. Check status porcelain
    status_output="$(git status --porcelain 2>/dev/null)"
    if [ -z "$status_output" ]; then
        log_msg "INFO" "Iteration #$iteration - Working tree clean ($sync_branch). No changes detected."
    else
        change_count="$(echo "$status_output" | grep -c '^' 2>/dev/null || echo "1")"
        log_msg "WARN" "Iteration #$iteration - Detected $change_count modified/untracked file(s) on branch '$sync_branch'."

        # Stage all changes
        git add -A 2>&1 >/dev/null

        # Check if anything is actually staged
        if ! git diff --cached --quiet 2>/dev/null; then
            timestamp="$(date +"%Y-%m-%d %H:%M:%S")"
            commit_msg="auto-sync: $timestamp"

            log_msg "INFO" "Creating commit: '$commit_msg'..."
            if commit_err="$(git commit -m "$commit_msg" 2>&1)"; then
                log_msg "SUCCESS" "Committed successfully: $commit_msg"

                log_msg "INFO" "Pushing to $REMOTE/$sync_branch..."
                if push_output="$(git push "$REMOTE" "$sync_branch" 2>&1)"; then
                    log_msg "SUCCESS" "Successfully pushed changes to $REMOTE/$sync_branch!"
                else
                    log_msg "ERROR" "Push failed: $push_output"

                    # If remote is ahead, attempt safe rebase
                    if echo "$push_output" | grep -qE "non-fast-forward|Updates were rejected"; then
                        log_msg "WARN" "Remote has newer changes. Attempting safe 'git pull --rebase $REMOTE $sync_branch'..."
                        if git pull --rebase "$REMOTE" "$sync_branch" 2>&1 >/dev/null; then
                            log_msg "INFO" "Rebase succeeded. Retrying push..."
                            if git push "$REMOTE" "$sync_branch" 2>&1 >/dev/null; then
                                log_msg "SUCCESS" "Push succeeded after rebase!"
                            else
                                log_msg "ERROR" "Retry push after rebase failed. Will retry on next iteration."
                            fi
                        else
                            log_msg "ERROR" "Rebase encountered conflict. Aborting rebase to preserve workspace."
                            git rebase --abort 2>/dev/null || true
                        fi
                    else
                        log_msg "WARN" "Network or permission issue detected. Will retry on next iteration."
                    fi
                fi
            else
                log_msg "WARN" "Commit skipped or failed: $commit_err"
            fi
        else
            log_msg "INFO" "No changes remained after staging (clean working tree)."
        fi
    fi

    [ "$ONCE" = true ] && { log_msg "INFO" "Single execution (--once) complete. Exiting."; break; }

    sleep "$INTERVAL"
done
