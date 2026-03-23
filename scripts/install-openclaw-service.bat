@echo off
chcp 65001 >nul
REM ========================================
REM OpenClaw Windows Service Installation Script
REM ========================================
REM 
REM This script is used for complete OpenClaw service configuration:
REM 1. Automatically install NVM (Node Version Manager)
REM 2. Install Node 24 using NVM
REM 3. Automatically install global OpenClaw
REM 4. Register as Windows service with auto-startup
REM Requires administrator privileges
REM
REM Usage:
REM   install-openclaw-service.bat
REM
REM Uninstall:
REM   sc delete OpenClawGateway
REM ========================================

setlocal enabledelayedexpansion

REM Check for administrator privileges
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [X] This script requires administrator privileges
    echo Please right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo ========================================
echo [*] OpenClaw Windows Service Installation Wizard
echo ========================================
echo.

REM Set NVM directory
set NVM_HOME=%APPDATA%\nvm
set NVM_SYMLINK=%ProgramFiles%\nodejs

REM ========== Step 1: Check and install NVM ==========
echo [Step 1/5] Checking NVM installation status...

if not exist "%NVM_HOME%" (
    echo [↓] NVM not installed, starting download...
    
    REM Create NVM directory
    mkdir "%NVM_HOME%" >nul 2>&1
    
    REM Download and install NVM
    echo [*] Downloading NVM from GitHub...
    
    powershell -noProfile -Command ^
      "$ProgressPreference = 'SilentlyContinue'; ^
       try { ^
         [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; ^
         Invoke-WebRequest -Uri 'https://github.com/coreybutler/nvm-windows/releases/download/1.1.12/nvm-setup.exe' -OutFile '%temp%\nvm-setup.exe'; ^
         Write-Host '[OK] NVM installer downloaded'; ^
         Start-Process '%temp%\nvm-setup.exe' -Wait; ^
         Write-Host '[OK] NVM installation completed' ^
       } catch { ^
         Write-Host '[X] NVM download/installation failed: ' $_.Exception.Message; ^
         exit 1 ^
       }"
    
    if %ERRORLEVEL% NEQ 0 (
        echo [X] NVM installation failed, please check network connection
        echo [*] For manual installation, visit: https://github.com/coreybutler/nvm-windows/releases
        pause
        exit /b 1
    )
    
    REM Refresh PATH environment variable
    cls
    echo [OK] NVM installed, reloading environment variables...
) else (
    echo [OK] NVM already installed: %NVM_HOME%
)

echo.

REM ========== Step 2: Check NVM availability ==========
echo [Step 2/5] Checking NVM availability...

REM Register NVM to PATH
set PATH=%NVM_HOME%;%PATH%

REM Call NVM directly
%NVM_HOME%\nvm.exe --version >nul 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo [X] Cannot find NVM executable
    echo [*] Please ensure NVM is properly installed at: %NVM_HOME%
    echo [*] Or visit: https://github.com/coreybutler/nvm-windows/releases
    pause
    exit /b 1
)

echo [OK] NVM is available

echo.

REM ========== Step 3: Install Node 24 ==========
echo [Step 3/5] Checking and installing Node 24...

REM Check if Node 24 is already installed
%NVM_HOME%\nvm.exe list 2>nul | findstr "24\." >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo [OK] Node 24 already installed
) else (
    echo [↓] Installing Node 24 (this may take a few minutes)...
    
    REM Use NVM to install Node 24
    %NVM_HOME%\nvm.exe install 24.0.0
    
    if %ERRORLEVEL% NEQ 0 (
        echo [X] Node 24 installation failed
        echo [*] You can manually run: %NVM_HOME%\nvm.exe install 24.0.0
        pause
        exit /b 1
    )
    
    echo [OK] Node 24 installation completed
)

echo.

REM ========== Step 4: Switch to Node 24 ==========
echo [Step 4/5] Switching to Node 24...

%NVM_HOME%\nvm.exe use 24.0.0

if %ERRORLEVEL% NEQ 0 (
    echo [X] Failed to switch Node version
    pause
    exit /b 1
)

echo [OK] Switched to Node 24

REM Get Node path (from NVM symlink)
set NODE_PATH=%NVM_SYMLINK%\node.exe

REM Verify Node path
if not exist "%NODE_PATH%" (
    REM Try to get from where command
    for /f "tokens=*" %%i in ('%NVM_HOME%\nvm.exe use 24.0.0 ^> nul 2^>^&1 ^& where node 2^>nul') do set NODE_PATH=%%i
)

if not exist "%NODE_PATH%" (
    echo [X] Cannot determine Node path
    pause
    exit /b 1
)

echo Node.js path: %NODE_PATH%

echo.

REM ========== Step 5: Install OpenClaw ==========
echo [Step 5/5] Checking and installing OpenClaw...

REM Update PATH to use current Node
set PATH=%NVM_SYMLINK%;%PATH%

REM Check if OpenClaw is already installed
where openclaw >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] OpenClaw already installed
    for /f "tokens=*" %%i in ('where openclaw 2^>nul') do set OPENCLAW_CMD=%%i
) else (
    echo [↓] OpenClaw not installed, using npm to install globally...
    echo [*] Executing: npm install -g openclaw
    
    REM Find npm
    for /f "tokens=*" %%i in ('where npm 2^>nul') do set NPM_PATH=%%i
    
    if "!NPM_PATH!"=="" (
        echo [X] Cannot find npm, please ensure Node 24 is properly installed
        pause
        exit /b 1
    )
    
    "!NPM_PATH!" install -g openclaw
    
    if %ERRORLEVEL% NEQ 0 (
        echo [X] OpenClaw installation failed
        echo [*] You can also manually run: npm install -g openclaw
        pause
        exit /b 1
    )
    
    echo [OK] OpenClaw installation completed
)

REM Save OpenClaw path for later use
for /f "tokens=*" %%i in ('where openclaw 2^>nul') do set OPENCLAW_CMD=%%i

echo OpenClaw: !OPENCLAW_CMD!

REM Get openclaw parent directory as working directory
for %%i in ("!OPENCLAW_CMD!") do set OPENCLAW_DIR=%%~dpi

echo.
echo ========================================
echo [OK] Pre-requisite checks completed! Now registering Windows service
echo ========================================
echo.

REM ========== Register Windows service ==========
echo [*] Configuring OpenClaw Windows service...

REM Stop and delete old service (if exists)
echo [STOP] Stopping old service...
net stop OpenClawGateway >nul 2>&1
timeout /t 2 >nul

echo [DEL] Deleting old service...
sc delete OpenClawGateway >nul 2>&1

REM Create new service
echo [*] Creating new Windows service...

REM Create service wrapper to manage the service
if not exist "%APPDATA%\OpencClawService" mkdir "%APPDATA%\OpencClawService"

REM Create Node.js wrapper script
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
) > "%APPDATA%\OpencClawService\run.js"

set WRAPPER_SCRIPT=%APPDATA%\OpencClawService\run.js

REM Create service using sc create
sc create OpenClawGateway ^
  binPath= "!NODE_PATH! \"!WRAPPER_SCRIPT!\"" ^
  DisplayName= "OpenClaw Gateway" ^
  Description= "OpenClaw AI Assistant - Personal AI Gateway Service (Node 24 via NVM)" ^
  start= auto ^
  type= own

if %ERRORLEVEL% NEQ 0 (
    echo [X] Service creation failed
    pause
    exit /b 1
)

echo [OK] Service created successfully!

REM Set service recovery options
sc failure OpenClawGateway reset= 60 actions= restart/5000/restart/5000/restart/5000

REM Start service
echo [*] Starting service...

net start OpenClawGateway

if %ERRORLEVEL% NEQ 0 (
    echo [X] Service startup failed
    echo [*] Please check the following information:
    echo    - Node.js path: !NODE_PATH!
    echo    - Wrapper script: !WRAPPER_SCRIPT!
    echo    - OpenClaw installation: !OPENCLAW_CMD!
    echo.
    echo [*] Troubleshooting:
    echo    1. View service logs: Get-EventLog -LogName System -Source Service Control Manager
    echo    2. Test OpenClaw manually: openclaw gateway --port 18789 --verbose
    echo    3. Check Node version: node --version
    pause
    exit /b 1
)

echo [OK] OpenClaw service has started!

echo.
echo ========================================
echo [OK] Installation completed!
echo ========================================
echo.
echo [*] Service information:
echo   Name: OpenClawGateway
echo   Status: Running
echo   Start type: Automatic (auto-start on boot)
echo   Access address: ws://localhost:18789
echo   Node.js version: 24 (managed by NVM)
echo.
echo [*] Common commands:
echo   Start service: net start OpenClawGateway
echo   Stop service: net stop OpenClawGateway
echo   View status: sc query OpenClawGateway
echo   Delete service: sc delete OpenClawGateway
echo.
echo [*] NVM commands:
echo   View installed versions: %NVM_HOME%\nvm.exe list
echo   Switch Node version: %NVM_HOME%\nvm.exe use 24.0.0
echo   Install other versions: %NVM_HOME%\nvm.exe install [version]
echo.
echo [*] Next steps:
echo   Run the Electron application to connect to ws://localhost:18789
echo.
pause
exit /b 0
