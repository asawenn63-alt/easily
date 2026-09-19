@echo off
cd /d "%~dp0"
title Easily
set "PORT=3847"

echo.
echo Startar Easily...
echo.

REM --- Hitta node.exe ---
set "NODE_EXE="

REM 1) Finns node i PATH?
where node >nul 2>&1
if not errorlevel 1 (
  for /f "delims=" %%N in ('where node') do set "NODE_EXE=%%N"
)

REM 2) Vanliga installationsplatsen (64-bit)
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
REM 3) Vanliga installationsplatsen (32-bit pa 64-bit system)
if not defined NODE_EXE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
REM 4) Nvm-windows nuvarande version
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
REM 5) Volta
if not defined NODE_EXE if exist "%LOCALAPPDATA%\Volta\bin\node.exe" set "NODE_EXE=%LOCALAPPDATA%\Volta\bin\node.exe"
REM 6) nvm-windows
if not defined NODE_EXE if exist "%APPDATA%\nvm\node.exe" set "NODE_EXE=%APPDATA%\nvm\node.exe"
REM 7) Scoop
if not defined NODE_EXE if exist "%USERPROFILE%\scoop\apps\nodejs\current\node.exe" set "NODE_EXE=%USERPROFILE%\scoop\apps\nodejs\current\node.exe"

if not defined NODE_EXE (
  echo FEL: Node.js hittades inte!
  echo.
  echo Jag letade pa:
  echo   - System PATH
  echo   - %ProgramFiles%\nodejs\
  echo   - %ProgramFiles^(x86^)%\nodejs\
  echo   - %LOCALAPPDATA%\Volta\bin\
  echo   - %APPDATA%\nvm\
  echo   - %USERPROFILE%\scoop\apps\nodejs\
  echo.
  echo Installera Node.js LTS fran https://nodejs.org och boerja om.
  echo Om du redan installerat: starta om datorn sa PATH uppdateras.
  echo.
  pause
  exit /b 1
)

echo Hittade Node: %NODE_EXE%

REM Lagg Node-katalogen i PATH for den har sessionen (sa npm hittas)
for %%I in ("%NODE_EXE%") do set "NODE_DIR=%%~dpI"
set "PATH=%NODE_DIR%;%PATH%"

REM --- Hitta npm.cmd (ligger oftast i samma katalog som node) ---
set "NPM_CMD="
if exist "%NODE_DIR%\npm.cmd" (
  set "NPM_CMD=%NODE_DIR%\npm.cmd"
) else (
  where npm >nul 2>&1
  if not errorlevel 1 (
    for /f "delims=" %%N in ('where npm') do set "NPM_CMD=%%N"
  )
)

REM --- Synka beroenden ---
if defined NPM_CMD (
  echo Synkar server-beroenden...
  cd /d "%~dp0server"
  call "%NPM_CMD%" install
  cd /d "%~dp0"
  echo Synkar v2-beroenden...
  cd /d "%~dp0v2"
  call "%NPM_CMD%" install
  cd /d "%~dp0"
) else (
  echo VARNING: npm hittades inte - hoppar over npm install.
  echo Om servern inte startar, installera om Node.js fran https://nodejs.org
  echo.
)

REM Hamta OpenAI-nyckel fran Windows-anvandarmiljo
for /f "usebackq delims=" %%K in (`powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('OPENAI_API_KEY','User')"`) do set "OPENAI_API_KEY=%%K"

if "%OPENAI_API_KEY%"=="" (
  echo VARNING: OpenAI-nyckel saknas!
  echo Konfigurera med 4-KONFIGURERA-OPENAI-NYCKEL.bat forst.
  echo.
)

REM Oppna webblasaren efter 5 sekunder i en separat process
start /b "" cmd /c "timeout /t 5 /nobreak >nul && start "" "http://localhost:3847/studio.html?new=1&questionEngine=1"

cd /d "%~dp0server"
"%NODE_EXE%" index.mjs

echo.
echo === Servern har stangts ===
echo Om det finns ett felmeddelande ovan, kopiera det.
echo.
pause
