@echo off
chcp 65001 >nul
REM OpenClaw + Electron Startup Script

setlocal enabledelayedexpansion

echo ========================================
echo OpenClaw Electron Startup Wizard
echo ========================================
echo.
echo Select operation:
echo   [1] First-time installation - Configure OpenClaw service
echo   [2] Start existing OpenClaw service
echo   [3] Start Electron application
echo   [4] Full startup (service + application)
echo.

setlocal
set /p choice="Please select (1-4): "

if "%choice%"=="1" (
    echo.
    echo Starting first-time installation...
    echo Select script version:
    echo   [A] PowerShell version (recommended, full features)
    echo   [B] Batch script version (better compatibility)
    echo.
    set /p version="Please select (A/B): "
    
    if /i "%version%"=="A" (
        echo.
        echo [*] Running PowerShell installation script...
        powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-openclaw-service.ps1"
    ) else (
        echo.
        echo [*] Running batch installation script...
        call "%~dp0scripts\install-openclaw-service.bat"
    )
    goto :EOF
)

if "%choice%"=="2" (
    echo.
    echo Starting OpenClaw service...
    net start OpenClawGateway
    if %ERRORLEVEL% EQU 0 (
        echo [OK] OpenClaw service started
    ) else (
        echo [!] Service startup failed, please ensure installation script has been run
    )
    pause
    goto :EOF
)

if "%choice%"=="3" (
    echo.
    echo Starting Electron application...
    electron .
    goto :EOF
)

if "%choice%"=="4" (
    echo.
    echo Starting OpenClaw service...
    net start OpenClawGateway
    if %ERRORLEVEL% NEQ 0 (
        echo [!] Service startup failed, please run installation script first
        pause
        goto :EOF
    )
    
    timeout /t 3 /nobreak
    
    echo.
    echo Starting Electron application...
    electron .
    goto :EOF
)

echo [X] Invalid selection
pause

