@echo off
chcp 65001 >nul
title OpenClaw Installer

echo.
echo ========================================
echo   OpenClaw One-Click Installer
echo ========================================
echo.
echo Checking administrator privileges...

net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Administrator privileges granted
    goto run_script
)

echo [WARN] Administrator privileges required, requesting...
echo.

set "CURRENT_SCRIPT=%~f0"
powershell -Command "Start-Process '%CURRENT_SCRIPT%' -Verb RunAs"
exit /b

:run_script
echo.
echo ========================================
echo   Starting deployment script...
echo ========================================
echo.

cd /d "%~dp0"
set "PS_SCRIPT=%cd%\deploy-openclaw.ps1"

if not exist "%PS_SCRIPT%" (
    echo [ERROR] deploy-openclaw.ps1 not found
    echo Please ensure deploy-openclaw.ps1 is in the same directory
    pause
    exit /b 1
)

echo [OK] Found deployment script
echo.

powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%PS_SCRIPT%"

if %errorLevel% == 0 (
    echo.
    echo ========================================
    echo   Deployment completed!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo   Deployment failed (error: %errorLevel%)
    echo ========================================
)

echo.
pause
