$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "Easily - konfigurera OpenAI API-nyckel"
Write-Host "Nyckeln visas inte och sparas i din Windows-anvandarprofil."
Write-Host ""

$secureKey = Read-Host "Klistra in OpenAI API-nyckeln" -AsSecureString
$plainKey = [System.Net.NetworkCredential]::new("", $secureKey).Password.Trim()

if (-not $plainKey.StartsWith("sk-")) {
  Remove-Variable plainKey, secureKey -ErrorAction SilentlyContinue
  throw "Nyckeln har inte ett giltigt OpenAI-format (ska borja med sk-)."
}

[Environment]::SetEnvironmentVariable("OPENAI_API_KEY", $plainKey, [EnvironmentVariableTarget]::User)
$saved = [Environment]::GetEnvironmentVariable("OPENAI_API_KEY", [EnvironmentVariableTarget]::User)
Remove-Variable plainKey, secureKey -ErrorAction SilentlyContinue

if ([string]::IsNullOrWhiteSpace($saved)) {
  throw "Nyckeln kunde inte sparas i Windows-anvandarprofilen."
}

Remove-Variable saved -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "KLART: OPENAI_API_KEY ar sparad." -ForegroundColor Green
Write-Host "Starta om Easily-servern innan du testar."
