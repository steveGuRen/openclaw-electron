@echo off
chcp 65001 >nul
REM OpenClaw + Electron 启动脚本

setlocal enabledelayedexpansion

echo ========================================
echo OpenClaw Electron 启动向导
echo ========================================
echo.
echo 选择操作：
echo   [1] 首次安装 - 配置 OpenClaw 服务
echo   [2] 启动已有的 OpenClaw 服务
echo   [3] 启动 Electron 应用
echo   [4] 完整启动（服务 + 应用）
echo.

setlocal
set /p choice="请选择 (1-4): "

if "%choice%"=="1" (
    echo.
    echo 开始首次安装...
    echo 选择脚本版本：
    echo   [A] PowerShell 版本（推荐，功能完整）
    echo   [B] 批处理脚本版本（兼容性好）
    echo.
    set /p version="请选择 (A/B): "
    
    if /i "%version%"=="A" (
        echo.
        echo 📝 运行 PowerShell 安装脚本...
        powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-openclaw-service.ps1"
    ) else (
        echo.
        echo 📝 运行批处理安装脚本...
        call "%~dp0scripts\install-openclaw-service.bat"
    )
    goto :EOF
)

if "%choice%"=="2" (
    echo.
    echo 启动 OpenClaw 服务...
    net start OpenClawGateway
    if %ERRORLEVEL% EQU 0 (
        echo ✅ OpenClaw 服务已启动
    ) else (
        echo ⚠️  服务启动失败，请确保已运行安装脚本
    )
    pause
    goto :EOF
)

if "%choice%"=="3" (
    echo.
    echo 启动 Electron 应用...
    electron .
    goto :EOF
)

if "%choice%"=="4" (
    echo.
    echo 启动 OpenClaw 服务...
    net start OpenClawGateway
    if %ERRORLEVEL% NEQ 0 (
        echo ⚠️  服务启动失败，请先运行安装脚本
        pause
        goto :EOF
    )
    
    timeout /t 3 /nobreak
    
    echo.
    echo 启动 Electron 应用...
    electron .
    goto :EOF
)

echo ❌ 无效选择
pause

