$ErrorActionPreference = 'Stop'

$DashboardDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$VbsLauncher = Join-Path $DashboardDir 'start-dashboard-hidden.vbs'
$StartupDir = [Environment]::GetFolderPath('Startup')
$ShortcutPath = Join-Path $StartupDir 'Automatenlager Dashboard.lnk'

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($ShortcutPath)
$shortcut.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
$shortcut.Arguments = "`"$VbsLauncher`""
$shortcut.WorkingDirectory = $DashboardDir
$shortcut.Description = 'Startet das lokale Automatenlager Dashboard beim Windows-Login.'
$shortcut.IconLocation = Join-Path $env:WINDIR 'System32\shell32.dll,220'
$shortcut.Save()

Write-Output "Created startup shortcut: $ShortcutPath"
