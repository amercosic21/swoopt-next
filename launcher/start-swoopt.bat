@echo off
title Swoopt Server
REM Launcher lives in launcher\ - step up to the project root where package.json is
cd /d "%~dp0.."

REM --- First-run setup: install deps / build if they are missing ---
if not exist "node_modules" (
    echo First run: installing dependencies, this happens only once...
    call npm install
)
if not exist ".next" (
    echo First run: building the app, this happens only once...
    call npm run build
)

REM --- Guard: if a server is already listening on port 3000, just open the browser ---
netstat -ano | findstr /c:":3000 " | findstr /c:"LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo Swoopt is already running. Opening the browser...
    explorer http://localhost:3000
    timeout /t 2 >nul
    exit /b
)

echo ============================================
echo   Starting Swoopt...
echo   A browser tab will open in a few seconds.
echo.
echo   Keep this window OPEN while you use the app.
echo   Close it to stop the server.
echo ============================================
echo.
start "" /min cmd /c "timeout /t 5 >nul & explorer http://localhost:3000"
npm run start
