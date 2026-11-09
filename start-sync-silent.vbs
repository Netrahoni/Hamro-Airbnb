' ==============================================================================
' Hamro-Airbnb Background Auto-Sync Launcher (Silent / Hidden Window)
' Double-click this file to start the 60-second auto-sync in the background.
' ==============================================================================

Dim WshShell, FSO, ScriptDir, PsCommand

Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)

' Command to launch PowerShell in hidden window mode
PsCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & ScriptDir & "\auto-sync.ps1"""

' Launch with WindowStyle = 0 (completely hidden, no terminal)
WshShell.Run PsCommand, 0, False

' Show friendly Windows notification that auto-dismisses after 5 seconds
WshShell.Popup "Hamro-Airbnb Git Auto-Sync is now active in the background!" & vbCrLf & vbCrLf & _
               "• Checks and syncs changes every 60 seconds." & vbCrLf & _
               "• Live logs are saved to: auto-sync.log" & vbCrLf & _
               "• Double-click 'stop-sync.bat' to stop anytime.", 5, "NepalStay Git Auto-Sync Active", 64
