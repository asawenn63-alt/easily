@echo off
cd /d "%~dp0"
title Easily
set "PORT=3847"

echo.
echo  Startar Easily...
echo.

REM Kontrollera att node finns
where node >nul 2>&1
if errorlevel 1 (
  echo  FEL: Node.js ar inte installerat!
  echo  Ladda ner och installera fran https://nodejs.org
  echo.
  pause
  exit /b 1
)

REM Installera beroenden om de saknas (server + v2)
if not exist "server\node_modules" (
  echo  Installerar server-beroenden (forsta gangen kan ta en stund)...
  cd /d "%~dp0server"
  call npm install --production
  cd /d "%~dp0"
)
if not exist "v2\node_modules" (
  echo  Installerar v2-beroenden...
  cd /d "%~dp0v2"
  call npm install --production
  cd /d "%~dp0"
)

REM Hamta OpenAI-nyckel fran Windows-anvandarmiljo
for /f "usebackq delims=" %%K in (`powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('OPENAI_API_KEY','User')"`) do set "OPENAI_API_KEY=%%K"

if "%OPENAI_API_KEY%"=="" (
  echo  VARNING: OpenAI-nyckel saknas!
  echo  Konfigurera med 4-KONFIGURERA-OPENAI-NYCKEL.bat forst.
  echo.
)

REM Oppna webblasaren efter 5 sekunder i en separat process
start /b "" cmd /c "timeout /t 5 /nobreak >nul && start "" "http://localhost:3847/studio.html?new=1&questionEngine=1""

cd /d "%~dp0server"
node index.mjs

echo.
echo  === Servern har stangts ===
echo  Om det finns ett felmeddelande ovan, kopiera det.
echo.
pause
