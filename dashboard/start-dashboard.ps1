$ErrorActionPreference = 'Stop'

$DashboardDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Port = 8787
$LogDir = Join-Path $DashboardDir 'logs'

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$existing = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($existing) {
  exit 0
}

$node = (Get-Command node -ErrorAction Stop).Source
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stdout = Join-Path $LogDir "dashboard-$timestamp.out.log"
$stderr = Join-Path $LogDir "dashboard-$timestamp.err.log"

Start-Process `
  -FilePath $node `
  -ArgumentList 'server.js' `
  -WorkingDirectory $DashboardDir `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdout `
  -RedirectStandardError $stderr
