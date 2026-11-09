@echo off
title Stop Hamro-Airbnb Auto-Sync
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-sync.ps1"
pause
