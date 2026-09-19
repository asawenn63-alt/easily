@echo off
cd /d "%~dp0\server"
title Easily
set "PORT=3847"

echo.
echo  Startar Easily...
echo  Lat detta fonster vara oppet.
echo.

REM Hamta OpenAI-nyckel fran Windows-anvandarprofil
for /f "usebackq delims=" %%K in (`powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('OPENAI_API_KEY','User')"`) do set "OPENAI_API_KEY=%%K"

REM Om nyckel saknas, hamta fran system-miljon
if "%OPENAI_API_KEY%"=="" for /f "usebackq delims=" %%K in (`powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('OPENAI_API_KEY','Machine')"`) do set "OPENAI_API_KEY=%%K"

if "%OPENAI_API_KEY%"=="" (
  echo  VARNING: OpenAI-nyckel saknas!
  echo  Konfigurera med 4-KONFIGURERA-OPENAI-NYCKEL.bat forst.
  echo.
)

REM Oppna webblasaren nar servern ar redo
start "" powershell -NoProfile -WindowStyle Hidden -Command "1..60 | ForEach-Object { if ((Test-NetConnection 127.0.0.1 -Port 3847 -WarningAction SilentlyContinue).TcpTestSucceeded) { Start-Process 'http://localhost:3847/'; Start-Sleep -Seconds 2; Start-Process 'http://localhost:3847/studio.html?new=1^&questionEngine=1'; exit 0 }; Start-Sleep -Seconds 1 }"

node index.mjs

if errorlevel 1 pause
