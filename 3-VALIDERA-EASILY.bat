@echo off
cd /d "%~dp0"
title Easily Validation

echo.
echo  Easily System Validation
echo  ========================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo  Node.js kravs. Installera Node 18+.
  pause
  exit /b 1
)

echo  Kontrollerar att servern kor...
powershell -NoProfile -Command "if (-not (Test-NetConnection 127.0.0.1 -Port 3847 -WarningAction SilentlyContinue).TcpTestSucceeded) { Write-Host '  Server saknas - starta 1-STARTA-EASILY.bat forst'; exit 1 } else { exit 0 }"
if errorlevel 1 (
  echo.
  echo  Kor syntaxkontroll utan browser-scenarier...
  node scripts\run-validation.mjs --node-only
  pause
  exit /b 1
)

node scripts\run-validation.mjs
set EXIT=%ERRORLEVEL%

echo.
if %EXIT%==0 (
  echo  VALIDATION PASS
) else (
  echo  VALIDATION FAIL - se validation-report.txt
)

pause
exit /b %EXIT%
