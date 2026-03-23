@echo off
chcp 65001 >nul
REM ========================================
REM OpenClaw Windows Service 安装脚本
REM ========================================
REM 
REM 此脚本用于完整配置 OpenClaw 服务：
REM 1. 自动安装 NVM (Node Version Manager)
REM 2. 使用 NVM 安装 Node 24
REM 3. 自动安装全局 OpenClaw
REM 4. 注册为 Windows 服务自动启动
REM 需要管理员权限运行
REM
REM 使用方法:
REM   install-openclaw-service.bat
REM
REM 卸载:
REM   sc delete OpenClawGateway
REM ========================================

setlocal enabledelayedexpansion

REM 检查管理员权限
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [X] 此脚本需要管理员权限运行
    echo 请右键单击选择"以管理员身份运行"
    pause
    exit /b 1
)

echo ========================================
echo [*] OpenClaw Windows 服务完整安装向导
echo ========================================
echo.

REM 设置 NVM 目录
set NVM_HOME=%APPDATA%\nvm
set NVM_SYMLINK=%ProgramFiles%\nodejs

REM ========== 步骤 1: 检查并安装 NVM ==========
echo [步骤 1/5] 检查 NVM 安装状态...

if not exist "%NVM_HOME%" (
    echo [↓] NVM 未安装，开始下载...
    
    REM 创建 NVM 目录
    mkdir "%NVM_HOME%" >nul 2>&1
    
    REM 下载并安装 NVM
    echo [*] 从 GitHub 下载 NVM...
    
    powershell -noProfile -Command ^
      "$ProgressPreference = 'SilentlyContinue'; ^
       try { ^
         [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; ^
         Invoke-WebRequest -Uri 'https://github.com/coreybutler/nvm-windows/releases/download/1.1.12/nvm-setup.exe' -OutFile '%temp%\nvm-setup.exe'; ^
         Write-Host '[OK] NVM 安装程序已下载'; ^
         Start-Process '%temp%\nvm-setup.exe' -Wait; ^
         Write-Host '[OK] NVM 安装完成' ^
       } catch { ^
         Write-Host '[X] NVM 下载/安装失败：' $_.Exception.Message; ^
         exit 1 ^
       }"
    
    if %ERRORLEVEL% NEQ 0 (
        echo [X] NVM 安装失败，请检查网络连接
        echo [*] 如需手动安装，请访问: https://github.com/coreybutler/nvm-windows/releases
        pause
        exit /b 1
    )
    
    REM 刷新 PATH 环境变量
    cls
    echo [OK] NVM 已安装，重新加载环境变量...
) else (
    echo [OK] NVM 已安装: %NVM_HOME%
)

echo.

REM ========== 步骤 2: 检查 NVM 可用性 ==========
echo [步骤 2/5] 检查 NVM 可用性...

REM 注册 NVM 到 PATH
set PATH=%NVM_HOME%;%PATH%

REM 直接调用 NVM
%NVM_HOME%\nvm.exe --version >nul 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo [X] 无法找到 NVM 可执行文件
    echo [*] 请确保 NVM 已正确安装在: %NVM_HOME%
    echo [*] 或手动访问: https://github.com/coreybutler/nvm-windows/releases
    pause
    exit /b 1
)

echo [OK] NVM 可用

echo.

REM ========== 步骤 3: 安装 Node 24 ==========
echo [步骤 3/5] 检查并安装 Node 24...

REM 检查 Node 24 是否已安装
%NVM_HOME%\nvm.exe list 2>nul | findstr "24\." >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo [OK] Node 24 已安装
) else (
    echo [↓] 安装 Node 24（这可能需要几分钟）...
    
    REM 使用 NVM 安装 Node 24
    %NVM_HOME%\nvm.exe install 24.0.0
    
    if %ERRORLEVEL% NEQ 0 (
        echo [X] Node 24 安装失败
        echo [*] 可以手动运行: %NVM_HOME%\nvm.exe install 24.0.0
        pause
        exit /b 1
    )
    
    echo [OK] Node 24 安装完成
)

echo.

REM ========== 步骤 4: 切换到 Node 24 ==========
echo [步骤 4/5] 切换到 Node 24...

%NVM_HOME%\nvm.exe use 24.0.0

if %ERRORLEVEL% NEQ 0 (
    echo [X] 切换 Node 版本失败
    pause
    exit /b 1
)

echo [OK] 已切换到 Node 24

REM 获取 Node 路径（从 NVM symlink）
set NODE_PATH=%NVM_SYMLINK%\node.exe

REM 验证 Node 路径
if not exist "%NODE_PATH%" (
    REM 尝试从 where 命令获取
    for /f "tokens=*" %%i in ('%NVM_HOME%\nvm.exe use 24.0.0 ^> nul 2^>^&1 ^& where node 2^>nul') do set NODE_PATH=%%i
)

if not exist "%NODE_PATH%" (
    echo [X] 无法确定 Node 路径
    pause
    exit /b 1
)

echo Node.js 路径: %NODE_PATH%

echo.

REM ========== 步骤 5: 安装 OpenClaw ==========
echo [步骤 5/5] 检查并安装 OpenClaw...

REM 更新 PATH 以使用当前 Node
set PATH=%NVM_SYMLINK%;%PATH%

REM 检查 OpenClaw 是否已安装
where openclaw >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] OpenClaw 已安装
    for /f "tokens=*" %%i in ('where openclaw 2^>nul') do set OPENCLAW_CMD=%%i
) else (
    echo [↓] OpenClaw 未安装，使用 npm 全局安装...
    echo [*] 执行: npm install -g openclaw
    
    REM 找到 npm
    for /f "tokens=*" %%i in ('where npm 2^>nul') do set NPM_PATH=%%i
    
    if "!NPM_PATH!"=="" (
        echo [X] 找不到 npm，请确保 Node 24 正确安装
        pause
        exit /b 1
    )
    
    "!NPM_PATH!" install -g openclaw
    
    if %ERRORLEVEL% NEQ 0 (
        echo [X] OpenClaw 安装失败
        echo [*] 也可手动运行: npm install -g openclaw
        pause
        exit /b 1
    )
    
    echo [OK] OpenClaw 安装完成
)

REM 保存 OpenClaw 路径供后续使用
for /f "tokens=*" %%i in ('where openclaw 2^>nul') do set OPENCLAW_CMD=%%i

echo OpenClaw: !OPENCLAW_CMD!

REM 获取 openclaw 父目录作为 working directory
for %%i in ("!OPENCLAW_CMD!") do set OPENCLAW_DIR=%%~dpi

echo.
echo ========================================
echo [OK] 前置条件检查完成！现在注册 Windows 服务
echo ========================================
echo.

REM ========== 注册 Windows 服务 ==========
echo [*] 配置 OpenClaw Windows 服务...

REM 停止并删除旧服务（如果存在）
echo [停] 停止旧服务...
net stop OpenClawGateway >nul 2>&1
timeout /t 2 >nul

echo [删] 删除旧服务...
sc delete OpenClawGateway >nul 2>&1

REM 创建新服务
echo [*] 创建新 Windows 服务...

REM 创建包装脚本来管理服务
if not exist "%CD%\service-wrapper" mkdir "%CD%\service-wrapper"

REM 创建 Node.js 包装脚本
(
    echo const { spawn } = require('child_process'^)
    echo.
    echo const proc = spawn('openclaw', ['gateway', '--port', '18789', '--verbose'^], {
    echo   stdio: 'inherit',
    echo   shell: true,
    echo   detached: false
    echo }^)
    echo.
    echo process.on('SIGTERM', (^) =^> {
    echo   console.log('Shutting down...''^)
    echo   proc.kill('^)
    echo   process.exit(0'^)
    echo }^)
) > "%CD%\service-wrapper\run.js"

set WRAPPER_SCRIPT=%CD%\service-wrapper\run.js

REM 使用 sc create 创建服务
sc create OpenClawGateway ^
  binPath= "!NODE_PATH! \"!WRAPPER_SCRIPT!\"" ^
  DisplayName= "OpenClaw Gateway" ^
  Description= "OpenClaw AI Assistant - Personal AI Gateway Service (Node 24 via NVM)" ^
  start= auto ^
  type= own

if %ERRORLEVEL% NEQ 0 (
    echo [X] 服务创建失败
    pause
    exit /b 1
)

echo [OK] 服务创建成功！

REM 设置服务恢复选项
sc failure OpenClawGateway reset= 60 actions= restart/5000/restart/5000/restart/5000

REM 启动服务
echo [*] 启动服务...

net start OpenClawGateway

if %ERRORLEVEL% NEQ 0 (
    echo [X] 服务启动失败
    echo [*] 请检查以下信息：
    echo    - Node.js 路径: !NODE_PATH!
    echo    - 包装脚本: !WRAPPER_SCRIPT!
    echo    - OpenClaw 安装: !OPENCLAW_CMD!
    echo.
    echo [*] 故障排除：
    echo    1. 查看服务日志: Get-EventLog -LogName System -Source Service Control Manager
    echo    2. 手动测试 OpenClaw: openclaw gateway --port 18789 --verbose
    echo    3. 检查 Node 版本: node --version
    pause
    exit /b 1
)

echo [OK] OpenClaw 服务已启动！

echo.
echo ========================================
echo [OK] 安装完成！
echo ========================================
echo.
echo [*] 服务信息：
echo   名称：OpenClawGateway
echo   状态：正在运行
echo   启动方式：自动（开机启动）
echo   访问地址：ws://localhost:18789
echo   Node.js 版本：24（通过 NVM 管理）
echo.
echo [*] 常用命令：
echo   启动服务：net start OpenClawGateway
echo   停止服务：net stop OpenClawGateway
echo   查看状态：sc query OpenClawGateway
echo   删除服务：sc delete OpenClawGateway
echo.
echo [*] NVM 命令：
echo   查看已安装版本：%NVM_HOME%\nvm.exe list
echo   切换 Node 版本：%NVM_HOME%\nvm.exe use 24.0.0
echo   安装其他版本：%NVM_HOME%\nvm.exe install [版本号]
echo.
echo [*] 下一步：
echo   运行 Electron 应用连接到 ws://localhost:18789
echo.
pause
exit /b 0
echo.
echo 📌 服务信息：
echo   名称：OpenClawGateway
echo   状态：正在运行
echo   启动方式：自动
echo   地址：ws://localhost:18789
echo.
pause
exit /b 0
