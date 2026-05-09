$ErrorActionPreference = 'Stop'

$DashboardDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$StartScript  = Join-Path $DashboardDir 'start-dashboard.ps1'
$TaskName     = 'Automatenlager Dashboard'
$Description  = 'Startet das lokale Automatenlager Dashboard nach der Windows-Anmeldung.'

$action = New-ScheduledTaskAction `
  -Execute 'powershell.exe' `
  -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$StartScript`"" `
  -WorkingDirectory $DashboardDir

$trigger   = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$settings  = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Hours 12) `
  -MultipleInstances IgnoreNew

Register-ScheduledTask `
  -TaskName    $TaskName `
  -Action      $action `
  -Trigger     $trigger `
  -Principal   $principal `
  -Settings    $settings `
  -Description $Description `
  -Force | Out-Null

Write-Output "Aufgabe registriert: $TaskName"
Write-Output "Der Task startet das Dashboard kuenftig automatisch bei der Windows-Anmeldung."
