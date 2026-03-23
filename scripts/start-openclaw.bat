@echo off
chcp 65001 >nul
REM ========================================
REM OpenClaw + Electron Startup Script
REM ========================================
REM
REM This script manages the startup of OpenClaw service and Electron app
REM
REM Usage:
REM   start-openclaw.bat start   - Start service and app
REM   start-openclaw.bat stop    - Stop service
REM   start-openclaw.bat restart - Restart service
REM   start-openclaw.bat status  - View service status
REM ========================================

setlocal enabledelayedexpansion

if "%1"=="" goto SHOW_USAGE

set ACTION=%1
set PORT=18789
set TIMEOUT=30

if "%ACTION%"=="start" (
    goto START_SERVICE
) else if "%ACTION%"=="stop" (
    goto STOP_SERVICE
) else if "%ACTION%"=="restart" (
    goto RESTART_SERVICE
) else if "%ACTION%"=="status" (
    goto STATUS
) else (
    goto SHOW_USAGE
)

:START_SERVICE
echo [*] Starting OpenClaw Gateway service...

REM Check if service is already running
for /F "tokens=3" %%i in ('sc query OpenClawGateway ^| findstr STATE') do set SERVICE_STATE=%%i

if "!SERVICE_STATE!"=="RUNNING" (
    echo [OK] OpenClaw service is already running
) else (
    echo [*] Starting OpenClaw service...
    net start OpenClawGateway
    if !ERRORLEVEL! NEQ 0 (
        echo [X] Service start failed, please make sure it is installed
        echo [*] Run: scripts\install-openclaw-service.bat (requires administrator)
        pause
        exit /b 1
    )
    echo [OK] OpenClaw service started
)

REM Wait for port ready
echo [*] Waiting for OpenClaw ready (ws://localhost:%PORT%) ...
timeout /t 3 >nul

setlocal enabledelayedexpansion
set RETRY=0
:CHECK_PORT
set /a RETRY=!RETRY!+1
if !RETRY! gtr %TIMEOUT% (
    echo [X] OpenClaw was not ready in %TIMEOUT% seconds
    echo [*] Please check service logs
    pause
    exit /b 1
)

REM Use PowerShell to check port
powershell -Command "try { $tcp = New-Object System.Net.Sockets.TcpClient; $tcp.Connect('127.0.0.1', %PORT%); $tcp.Close(); exit 0 } catch { exit 1 }"

if !ERRORLEVEL! NEQ 0 (
    timeout /t 1 >nul
    goto CHECK_PORT
)

echo [OK] OpenClaw Gateway is ready!
echo.
echo [*] Starting Electron application...

REM Find built exe file
if exist "dist\OpenClaw Electron Setup 0.0.0.exe" (
    echo [*] Found installer, starting app...
    start "" "dist\OpenClaw Electron Setup 0.0.0.exe"
    goto END_SUCCESS
)

REM If no exe found, run in development mode
if exist "main.js" (
    echo [*] Built app not found, running in development mode...
    call npm run electron:dev
    goto END_SUCCESS
)

echo [X] Cannot find Electron application
echo [*] Please run first: npm run electron:build
pause
exit /b 1

:STOP_SERVICE
echo [*] Stopping OpenClaw service...
for /F "tokens=3" %%i in ('sc query OpenClawGateway ^| findstr STATE') do set SERVICE_STATE=%%i

if "!SERVICE_STATE!"=="RUNNING" (
    net stop OpenClawGateway
    if !ERRORLEVEL! NEQ 0 (
        echo [X] Service stop failed
        exit /b 1
    )
    echo [OK] OpenClaw service stopped
) else (
    echo [i] OpenClaw service is not running
)
exit /b 0

:RESTART_SERVICE
echo [*] Restarting OpenClaw service...
call :STOP_SERVICE
timeout /t 2 >nul
call :START_SERVICE
exit /b 0

:STATUS
echo [*] Checking OpenClaw service status...
echo.

for /F "tokens=3" %%i in ('sc query OpenClawGateway ^| findstr STATE') do set SERVICE_STATE=%%i

if "!SERVICE_STATE!"=="RUNNING" (
    echo [OK] Status: Running
    
    REM Check network connection
    powershell -Command "try { $tcp = New-Object System.Net.Sockets.TcpClient; $tcp.Connect('127.0.0.1', %PORT%); $tcp.Close(); Write-Host '[OK] Network: Accessible'; exit 0 } catch { Write-Host '[X] Network: Not accessible'; exit 1 }"
) else if "!SERVICE_STATE!"=="STOPPED" (
    echo [X] Status: Stopped
) else if "!SERVICE_STATE!"=="" (
    echo [X] Status: Service not installed
    echo [*] Please run: scripts\install-openclaw-service.bat
) else (
    echo [*] Status: !SERVICE_STATE!
)

echo.
echo [*] Gateway address: ws://localhost:%PORT%
echo [*] Log location: /logs
echo.
pause
exit /b 0

:SHOW_USAGE
echo.
echo Usage:
echo   start-openclaw.bat start   - Start OpenClaw service and Electron app
echo   start-openclaw.bat stop    - Stop OpenClaw service
echo   start-openclaw.bat restart - Restart OpenClaw service
echo   start-openclaw.bat status  - View service status
echo.
echo Examples:
echo   start-openclaw.bat start
echo.
pause
exit /b 1

:END_SUCCESS
echo.
echo [OK] Completed!
echo [*] Double-click start-openclaw.bat to quickly start OpenClaw + Electron
echo.
pause
exit /b 0
