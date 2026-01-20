@echo off
setlocal

set SCRIPT_DIR=%~dp0
set CONFIG_FILE=%SCRIPT_DIR%print-agent-path.txt
set REPO_DIR=

if exist "%CONFIG_FILE%" (
  set /p REPO_DIR=<"%CONFIG_FILE%"
)

if not exist "%REPO_DIR%\apps\print-agent\index.js" (
  echo Enter repo root path (e.g. C:\repo\Macho-Bbq):
  set /p REPO_DIR=
)

if not exist "%REPO_DIR%\apps\print-agent\index.js" (
  echo ERROR: Cannot find apps\print-agent\index.js under "%REPO_DIR%".
  pause
  exit /b 1
)

echo %REPO_DIR%>"%CONFIG_FILE%"
cd /d "%REPO_DIR%\apps\print-agent"

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js not found. Please install Node.js first.
  pause
  exit /b 1
)

if not exist ".env" (
  echo ERROR: .env not found in %CD%
  echo Create .env with:
  echo   SERVER_BASE_URL=https://www.wjlbbq.online/api
  echo   PRINTER_ID=...
  echo   AGENT_KEY=...
  echo   WINDOWS_PRINTER_NAME=...
  pause
  exit /b 1
)

echo Installing dependencies...
npm install
if errorlevel 1 (
  echo ERROR: npm install failed.
  pause
  exit /b 1
)

echo Starting print agent...
node index.js
