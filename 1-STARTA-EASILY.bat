@echo off
cd /d "%~dp0\server"
title Easily
set "PORT=3847"

echo.
echo  Startar Easily...
echo  Lat detta fonster vara oppet.
echo.

for /f "usebackq delims=" %%K in (`powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('OPENAI_API_KEY','User')"`) do set "OPENAI_API_KEY=%%K"

start "" powershell -NoProfile -WindowStyle Hidden -Command "1..60 | ForEach-Object { if ((Test-NetConnection 127.0.0.1 -Port 3847 -WarningAction SilentlyContinue).TcpTestSucceeded) { Start-Process 'http://localhost:3847/'; Start-Sleep -Seconds 2; Start-Process 'http://localhost:3847/studio.html?new=1^&questionEngine=1'; exit 0 }; Start-Sleep -Seconds 1 }"

node index.mjs

if errorlevel 1 pause
