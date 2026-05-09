$ErrorActionPreference = 'Stop'

$DashboardDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$StartScript  = Join-Path $DashboardDir 'start-dashboard.ps1'
$StartupDir   = [Environment]::GetFolderPath('Startup')
$ShortcutPath = Join-Path $StartupDir 'Automatenlager Dashboard.lnk'

# Shortcut ruft powershell.exe direkt mit -WindowStyle Hidden auf.
# Kein VBScript-Wrapper noetig – vermeidet Antivirus-Fehlalarme.
$shell    = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($ShortcutPath)
$shortcut.TargetPath       = Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
$shortcut.Arguments        = "-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$StartScript`""
$shortcut.WorkingDirectory = $DashboardDir
$shortcut.Description      = 'Startet das lokale Automatenlager Dashboard beim Windows-Login.'
$shortcut.IconLocation     = Join-Path $env:WINDIR 'System32\shell32.dll,220'
$shortcut.Save()

Write-Output "Startup-Verknuepfung erstellt: $ShortcutPath"
Write-Output "Tipp: 'register-dashboard-autostart.ps1' nutzt den Windows Task Scheduler"
Write-Output "      und ist der empfohlene Weg fuer den automatischen Start."
