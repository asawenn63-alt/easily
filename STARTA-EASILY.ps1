# Easily - starta servern
# Dubbelklicka for att starta

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Hamta OpenAI-nyckel fran Windows-anvandarprofil
$apiKey = [Environment]::GetEnvironmentVariable("OPENAI_API_KEY", "User")
if (-not $apiKey) { $apiKey = [Environment]::GetEnvironmentVariable("OPENAI_API_KEY", "Machine") }
if (-not $apiKey) {
  Write-Host "VARNING: OpenAI-nyckel saknas!" -ForegroundColor Yellow
  Write-Host "Konfigurera med 4-KONFIGURERA-OPENAI-NYCKEL.bat forst." -ForegroundColor Yellow
  Write-Host ""
}

$env:OPENAI_API_KEY = $apiKey
$env:PORT = "3847"

Write-Host "Startar Easily..." -ForegroundColor Green
Write-Host "Lat detta fonster vara oppet." -ForegroundColor Green
Write-Host ""

# Oppna webblasaren nar servern ar redo (i bakgrunden)
Start-Job -ScriptBlock {
  1..60 | ForEach-Object {
    if ((Test-NetConnection 127.0.0.1 -Port 3847 -WarningAction SilentlyContinue).TcpTestSucceeded) {
      Start-Process "http://localhost:3847/"
      Start-Sleep -Seconds 2
      Start-Process "http://localhost:3847/studio.html?new=1&questionEngine=1"
      break
    }
    Start-Sleep -Seconds 1
  }
} | Out-Null

# Starta servern
Set-Location "$root\server"
node index.mjs
