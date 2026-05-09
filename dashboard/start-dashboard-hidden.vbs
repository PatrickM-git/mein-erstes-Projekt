Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

dashboardDir = fso.GetParentFolderName(WScript.ScriptFullName)
scriptPath = fso.BuildPath(dashboardDir, "start-dashboard.ps1")

shell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & scriptPath & """", 0, False
