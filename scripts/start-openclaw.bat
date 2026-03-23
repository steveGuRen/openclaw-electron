@echo off
chcp 65001 >nul
REM ========================================
REM OpenClaw + Electron 启动脚本
REM ========================================
REM
REM 此脚本管理 OpenClaw 服务和 Electron 应用的启动
REM
REM 使用方法:
REM   start-openclaw.bat start   - 启动服务和应用
REM   start-openclaw.bat stop    - 停止服务
REM   start-openclaw.bat restart - 重启服务
REM   start-openclaw.bat status  - 查看服务状态
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
echo [*] 启动 OpenClaw Gateway 服务...

REM 检查服务是否已运行
for /F "tokens=3" %%i in ('sc query OpenClawGateway ^| findstr STATE') do set SERVICE_STATE=%%i

if "!SERVICE_STATE!"=="RUNNING" (
    echo [OK] OpenClaw 服务已在运行
) else (
    echo [*] 启动 OpenClaw 服务...
    net start OpenClawGateway
    if !ERRORLEVEL! NEQ 0 (
        echo [X] 服务启动失败，请确保已安装
        echo [*] 运行: scripts\install-openclaw-service.bat（需要管理员权限）
        pause
        exit /b 1
    )
    echo [OK] OpenClaw 服务已启动
)

REM 等待端口就绪
echo [*] 等待 OpenClaw 就绪 (ws://localhost:%PORT%) ...
timeout /t 3 >nul

setlocal enabledelayedexpansion
set RETRY=0
:CHECK_PORT
set /a RETRY=!RETRY!+1
if !RETRY! gtr %TIMEOUT% (
    echo [X] OpenClaw 未在 %TIMEOUT% 秒内就绪
    echo [*] 请检查服务日志
    pause
    exit /b 1
)

REM 使用 PowerShell 检查端口
powershell -Command "try { $tcp = New-Object System.Net.Sockets.TcpClient; $tcp.Connect('127.0.0.1', %PORT%); $tcp.Close(); exit 0 } catch { exit 1 }"

if !ERRORLEVEL! NEQ 0 (
    timeout /t 1 >nul
    goto CHECK_PORT
)

echo [OK] OpenClaw Gateway 已就绪！
echo.
echo [*] 启动 Electron 应用...

REM 查找构建的 exe 文件
if exist "dist\OpenClaw Electron Setup 0.0.0.exe" (
    echo [*] 发现安装程序，启动应用...
    start "" "dist\OpenClaw Electron Setup 0.0.0.exe"
    goto END_SUCCESS
)

REM 如果没有找到 exe，则在开发模式运行
if exist "main.js" (
    echo [*] 未找到构建的应用，在开发模式运行...
    call npm run electron:dev
    goto END_SUCCESS
)

echo [X] 找不到 Electron 应用
echo [*] 请先运行: npm run electron:build
pause
exit /b 1

:STOP_SERVICE
echo [停] 停止 OpenClaw 服务...
for /F "tokens=3" %%i in ('sc query OpenClawGateway ^| findstr STATE') do set SERVICE_STATE=%%i

if "!SERVICE_STATE!"=="RUNNING" (
    net stop OpenClawGateway
    if !ERRORLEVEL! NEQ 0 (
        echo [X] 服务停止失败
        exit /b 1
    )
    echo [OK] OpenClaw 服务已停止
) else (
    echo [i] OpenClaw 服务未运行
)
exit /b 0

:RESTART_SERVICE
echo [*] 重启 OpenClaw 服务...
call :STOP_SERVICE
timeout /t 2 >nul
call :START_SERVICE
exit /b 0

:STATUS
echo [*] 检查 OpenClaw 服务状态...
echo.

for /F "tokens=3" %%i in ('sc query OpenClawGateway ^| findstr STATE') do set SERVICE_STATE=%%i

if "!SERVICE_STATE!"=="RUNNING" (
    echo [OK] 状态：运行中
    
    REM 检查网络连接
    powershell -Command "try { $tcp = New-Object System.Net.Sockets.TcpClient; $tcp.Connect('127.0.0.1', %PORT%); $tcp.Close(); Write-Host '[OK] 网络：可连接'; exit 0 } catch { Write-Host '[X] 网络：无法连接'; exit 1 }"
) else if "!SERVICE_STATE!"=="STOPPED" (
    echo [X] 状态：已停止
) else if "!SERVICE_STATE!"=="" (
    echo [X] 状态：服务不存在
    echo [*] 请运行: scripts\install-openclaw-service.bat
) else (
    echo [*] 状态：!SERVICE_STATE!
)

echo.
echo [*] Gateway 地址：ws://localhost:%PORT%
echo [*] 日志位置：/logs
echo.
pause
exit /b 0

:SHOW_USAGE
echo.
echo 使用方法：
echo   start-openclaw.bat start   - 启动 OpenClaw 服务和 Electron 应用
echo   start-openclaw.bat stop    - 停止 OpenClaw 服务
echo   start-openclaw.bat restart - 重启 OpenClaw 服务
echo   start-openclaw.bat status  - 查看服务状态
echo.
echo 示例：
echo   start-openclaw.bat start
echo.
pause
exit /b 1

:END_SUCCESS
echo.
echo [OK] 完成！
echo [*] 双击 start-openclaw.bat 可快速启动 OpenClaw + Electron
echo.
pause
exit /b 0
