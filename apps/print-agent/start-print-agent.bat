@echo off
setlocal

set SCRIPT_DIR=%~dp0
set CONFIG_FILE=%SCRIPT_DIR%print-agent-path.txt
set AGENT_DIR=

if exist "%SCRIPT_DIR%index.js" (
  set AGENT_DIR=%SCRIPT_DIR%
) else if exist "%SCRIPT_DIR%print-agent\\index.js" (
  set AGENT_DIR=%SCRIPT_DIR%print-agent
) else if exist "%CONFIG_FILE%" (
  set /p AGENT_DIR=<"%CONFIG_FILE%"
)

if not exist "%AGENT_DIR%\index.js" (
  echo ERROR: Cannot find print-agent folder.
  echo Place this .bat inside the print-agent folder, or next to a print-agent folder on Desktop.
  pause
  exit /b 1
)

echo %AGENT_DIR%>"%CONFIG_FILE%"
cd /d "%AGENT_DIR%"

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

if not exist "node_modules" (
  echo Installing dependencies...
  npm install
  if errorlevel 1 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
  )
)

echo Starting print agent...
node index.js
