# ========================================
# OpenClaw Windows Service Installation Script (PowerShell)
# ========================================
# 
# This script fully configures OpenClaw service:
# 1. Automatically install NVM (Node Version Manager)
# 2. Use NVM to install Node 24
# 3. Automatically install global OpenClaw
# 4. Register as Windows service with auto-start
# 
# Usage:
#   PowerShell -ExecutionPolicy Bypass -File install-openclaw-service.ps1
#
# Uninstall:
#   sc delete OpenClawGateway
# ========================================

param(
    [switch]$SkipNVM = $false,
    [switch]$SkipNode = $false,
    [switch]$SkipOpenClaw = $false
)

# Set error handling
$ErrorActionPreference = "Stop"

# Check administrator privileges
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentUser)

if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "[X] This script requires administrator privileges"
    Write-Host "Please right-click PowerShell and select 'Run as administrator'"
    pause
    exit 1
}

Write-Host "========================================"
Write-Host "[START] OpenClaw Windows Service Setup Wizard"
Write-Host "========================================"
Write-Host ""

# Set NVM directories
$NVM_HOME = "$env:APPDATA\nvm"
$NVM_SYMLINK = "$env:ProgramFiles\nodejs"

# ========== Step 1: Check and Install NVM ==========
if (-not $SkipNVM) {
    Write-Host "[Step 1/5] Checking NVM installation status..."
    
    if (-not (Test-Path $NVM_HOME)) {
        Write-Host "[*] NVM not installed, starting download..."
        
        New-Item -ItemType Directory -Path $NVM_HOME -Force > $null
        
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            $nvmUrl = "https://github.com/coreybutler/nvm-windows/releases/download/1.1.12/nvm-setup.exe"
            $nvmPath = "$env:TEMP\nvm-setup.exe"
            
            Write-Host "[*] Downloading NVM from GitHub..."
            # Use $ProgressPreference for compatibility with Windows PowerShell (5.1)
            $ProgressPreference = 'SilentlyContinue'
            Invoke-WebRequest -Uri $nvmUrl -OutFile $nvmPath
            
            Write-Host "[*] Running NVM installer..."
            Start-Process -FilePath $nvmPath -Wait
            
            Write-Host "[OK] NVM installation completed"
            Remove-Item -Path $nvmPath -Force
        }
        catch {
            Write-Host "[X] NVM installation failed: $($_.Exception.Message)"
            Write-Host "[*] Please visit manually: https://github.com/coreybutler/nvm-windows/releases"
            pause
            exit 1
        }
    } else {
        Write-Host "[OK] NVM already installed: $NVM_HOME"
    }
}

Write-Host ""

# ========== Step 2: Check NVM availability ==========
if (-not $SkipNVM) {
    Write-Host "[Step 2/5] Checking NVM availability..."
    
    $nvmExe = "$NVM_HOME\nvm.exe"
    
    if (-not (Test-Path $nvmExe)) {
        Write-Host "[X] Cannot find NVM executable"
        Write-Host "[*] Please make sure NVM is properly installed in: $NVM_HOME"
        pause
        exit 1
    }
    
    Write-Host "[OK] NVM available: $nvmExe"
}

Write-Host ""

# ========== Step 3: Install Node 24 ==========
if (-not $SkipNode) {
    Write-Host "[Step 3/5] Checking and installing Node 24..."
    
    $nvmExe = "$NVM_HOME\nvm.exe"
    
    # Check if Node 24 is already installed
    $nodeList = & $nvmExe list 2>$null
    $node24Installed = $nodeList -match "24\." -or (Test-Path "$NVM_HOME\v24*")
    
    if ($node24Installed) {
        Write-Host "[OK] Node 24 already installed"
    } else {
        Write-Host "[*] Installing Node 24 (this may take a few minutes)..."
        
        try {
            & $nvmExe install 24.0.0
            Write-Host "[OK] Node 24 installation completed"
        }
        catch {
            Write-Host "[X] Node 24 installation failed: $($_.Exception.Message)"
            Write-Host "[*] You can run manually: $nvmExe install 24.0.0"
            pause
            exit 1
        }
    }
}

Write-Host ""

# ========== Step 4: Switch to Node 24 ==========
if (-not $SkipNode) {
    Write-Host "[Step 4/5] Switching to Node 24..."
    
    $nvmExe = "$NVM_HOME\nvm.exe"
    
    try {
        & $nvmExe use 24.0.0
        Write-Host "[OK] Switched to Node 24"
    }
    catch {
        Write-Host "[X] Node version switch failed: $($_.Exception.Message)"
        pause
        exit 1
    }
    
    # Get Node path
    $nodePath = "$NVM_SYMLINK\node.exe"
    if (-not (Test-Path $nodePath)) {
        $nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
    }
    
    if (-not (Test-Path $nodePath)) {
        Write-Host "[X] Cannot determine Node path"
        pause
        exit 1
    }
    
    Write-Host "Node.js path: $nodePath"
}

Write-Host ""

# ========== Step 5: Install OpenClaw ==========
if (-not $SkipOpenClaw) {
    Write-Host "[Step 5/5] Checking and installing OpenClaw..."
    
    # Update PATH
    $env:PATH = "$NVM_SYMLINK;$env:PATH"
    
    # Check if OpenClaw is already installed
    $openclawCmd = (Get-Command openclaw -ErrorAction SilentlyContinue).Source
    
    if ($openclawCmd) {
        Write-Host "[OK] OpenClaw already installed: $openclawCmd"
    } else {
        Write-Host "[*] OpenClaw not installed, using npm to install globally..."
        
        try {
            npm install -g openclaw
            Write-Host "[OK] OpenClaw installation completed"
            $openclawCmd = (Get-Command openclaw -ErrorAction SilentlyContinue).Source
        }
        catch {
            Write-Host "[X] OpenClaw installation failed: $($_.Exception.Message)"
            Write-Host "[*] You can also run manually: npm install -g openclaw"
            pause
            exit 1
        }
    }
    
    Write-Host "OpenClaw: $openclawCmd"
}

Write-Host ""
Write-Host "========================================"
Write-Host "[OK] Pre-requisite checks completed! Now registering Windows service"
Write-Host "========================================"
Write-Host ""

# ========== Register Windows Service ==========
Write-Host "[*] Configuring OpenClaw Windows service..."

# Stop old service
Write-Host "[*] Stopping old service..."
net stop OpenClawGateway 2>$null
Start-Sleep -Seconds 2

# Delete old service
Write-Host "[*] Deleting old service..."
sc delete OpenClawGateway 2>$null

# Create wrapper script directory
$serviceWrapperDir = Join-Path $PSScriptRoot "service-wrapper"
New-Item -ItemType Directory -Path $serviceWrapperDir -Force > $null

# Create Node.js wrapper script
$wrapperScript = Join-Path $serviceWrapperDir "run.js"
$wrapperContent = @'
const { spawn } = require('child_process');

const proc = spawn('openclaw', ['gateway', '--port', '18789', '--verbose'], {
  stdio: 'inherit',
  shell: true,
  detached: false
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  proc.kill();
  process.exit(0);
});
'@

Set-Content -Path $wrapperScript -Value $wrapperContent -Force

Write-Host "[*] Creating new Windows service..."

$nodePath = "$NVM_SYMLINK\node.exe"
if (-not (Test-Path $nodePath)) {
    $nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
}

# Create service
sc create OpenClawGateway binPath= "`"$nodePath`" `"$wrapperScript`"" DisplayName= "OpenClaw Gateway" Description= "OpenClaw AI Assistant - Personal AI Gateway Service (Node 24 via NVM)" start= auto type= own

if ($LASTEXITCODE -ne 0) {
    Write-Host "[X] Service creation failed"
    pause
    exit 1
}

Write-Host "[OK] Service created successfully!"

# Set service recovery options
sc failure OpenClawGateway reset= 60 actions= restart/5000/restart/5000/restart/5000

# Start service
Write-Host "[*] Starting service..."
net start OpenClawGateway

if ($LASTEXITCODE -ne 0) {
    Write-Host "[X] Service startup failed"
    Write-Host "[*] Please check the following information:"
    Write-Host "   - Node.js path: $nodePath"
    Write-Host "   - Wrapper script: $wrapperScript"
    Write-Host ""
    Write-Host "[*] Troubleshooting:"
    Write-Host "   1. View service logs: Get-EventLog -LogName System -Source Service Control Manager"
    Write-Host "   2. Test OpenClaw manually: openclaw gateway --port 18789 --verbose"
    Write-Host "   3. Check Node version: node --version"
    pause
    exit 1
}

Write-Host "[OK] OpenClaw service started!"

Write-Host ""
Write-Host "========================================"
Write-Host "[OK] Installation completed!"
Write-Host "========================================"
Write-Host ""
Write-Host "[*] Service information:"
Write-Host "   Name: OpenClawGateway"
Write-Host "   Status: Running"
Write-Host "   Start type: Automatic (auto-start on boot)"
Write-Host "   Access address: ws://localhost:18789"
Write-Host "   Node.js version: 24 (managed by NVM)"
Write-Host ""
Write-Host "[*] Common commands:"
Write-Host "   Start service: net start OpenClawGateway"
Write-Host "   Stop service: net stop OpenClawGateway"
Write-Host "   View status: sc query OpenClawGateway"
Write-Host "   Delete service: sc delete OpenClawGateway"
Write-Host ""
Write-Host "[*] NVM commands:"
Write-Host "   View installed versions: $NVM_HOME\nvm.exe list"
Write-Host "   Switch Node version: $NVM_HOME\nvm.exe use 24.0.0"
Write-Host "   Install other versions: $NVM_HOME\nvm.exe install [version]"
Write-Host ""
Write-Host "[*] Next steps:"
Write-Host "   Run the Electron application to connect to ws://localhost:18789"
Write-Host ""
pause
