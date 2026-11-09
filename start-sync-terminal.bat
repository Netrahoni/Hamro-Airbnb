@echo off
title Hamro-Airbnb Git Auto-Sync
cd /d "%~dp0"
echo ===========================================================
echo Starting Hamro-Airbnb Continuous Git Auto-Sync...
echo Press Ctrl+C at any time to stop.
echo ===========================================================
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0auto-sync.ps1"
pause
