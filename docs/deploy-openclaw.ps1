# OpenClaw One-Click Installer (China-Optimized)

$ErrorActionPreference = "Stop"

$NPM_MIRROR = "https://registry.npmmirror.com"
$GITHUB_MIRRORS = @(
    "https://gitclone.com/github.com",
    "https://mirror.ghproxy.com/https://github.com",
    "https://ghproxy.com/https://github.com"
)
$NODE_DOWNLOAD_URLS = @(
    "https://npmmirror.com/mirrors/node/",
    "https://mirrors.huaweicloud.com/nodejs/",
    "https://cdn.npmmirror.com/binaries/node/",
    "https://nodejs.org/dist/"
)

$NODE_VERSION = "22.12.0"
$NODE_FULL_VERSION = "v$NODE_VERSION"
$OPENCLAW_VERSION = "latest"
$INSTALL_DIR = "$env:USERPROFILE\.openclaw"
$DESKTOP = [Environment]::GetFolderPath("Desktop")
$DOWNLOAD_DIR = "$env:TEMP\openclaw-install"

if (-not (Test-Path $DOWNLOAD_DIR)) {
    New-Item -ItemType Directory -Path $DOWNLOAD_DIR -Force | Out-Null
}

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Step {
    Write-ColorOutput Cyan "`n=== $args ==="
}

function Write-Success {
    Write-ColorOutput Green "[OK] $args"
}

function Write-Error {
    Write-ColorOutput Red "[ERROR] $args"
}

function Write-Warning {
    Write-ColorOutput Yellow "[WARN] $args"
}

function Write-Info {
    Write-ColorOutput Gray "[INFO] $args"
}

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Administrator)) {
    Write-Error "Administrator privileges required!"
    Write-ColorOutput Yellow "Please right-click and 'Run as Administrator'"
    pause
    exit 1
}

function Test-NetworkConnection {
    param([string]$Url = "https://www.baidu.com", [int]$Timeout = 5)
    try {
        Invoke-WebRequest -Uri $Url -Method Head -TimeoutSec $Timeout -UseBasicParsing | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Test-UrlAccessible {
    param([string]$Url, [int]$Timeout = 10)
    try {
        Invoke-WebRequest -Uri $Url -Method Head -TimeoutSec $Timeout -UseBasicParsing -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Set-NpmMirror {
    Write-Info "Configuring npm to use China mirror..."
    npm config set registry $NPM_MIRROR
    Write-Success "npm registry set to: $NPM_MIRROR"
    try {
        npm config set electron_mirror https://npmmirror.com/mirrors/electron/
        npm config set electron_builder_binaries_mirror https://npmmirror.com/mirrors/electron-builder-binaries/
        Write-Info "Electron mirrors configured"
    } catch {
        Write-Warning "Electron mirror config skipped (not critical for OpenClaw)"
    }
}

function Set-GitMirror {
    $gitCheck = Get-Command git -ErrorAction SilentlyContinue
    if (-not $gitCheck) {
        Write-Warning "Git not available, skipping mirror configuration"
        return $false
    }
    Write-Info "Configuring Git to use mirrors..."
    git config --global url."https://".insteadof ssh://git@
    foreach ($mirror in $GITHUB_MIRRORS) {
        try {
            Write-Info "Testing git mirror: $mirror"
            git ls-remote "$mirror/openclaw/openclaw.git" 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                $mirrorWithoutHttps = $mirror -replace "https://"
                git config --global url."https://$mirror/".insteadOf "https://github.com/"
                Write-Success "Git configured to use mirror: $mirror"
                return $true
            }
        } catch {
            continue
        }
    }
    Write-Warning "Could not configure git mirror, will try direct access"
    return $false
}

function Check-Proxy {
    Write-Info "Detecting proxy settings..."
    $proxySettings = Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings" -ErrorAction SilentlyContinue
    if ($proxySettings.ProxyEnable -eq 1) {
        $proxyServer = $proxySettings.ProxyServer
        Write-Success "System proxy detected: $proxyServer"
        $useProxy = Read-Host "Use this proxy? (Y/n)"
        if ($useProxy -ne "n" -and $useProxy -ne "N") {
            $env:HTTP_PROXY = "http://$proxyServer"
            $env:HTTPS_PROXY = "http://$proxyServer"
            return $true
        }
    }
    $manualProxy = Read-Host "Configure proxy? (leave empty to skip)"
    if ($manualProxy) {
        $env:HTTP_PROXY = $manualProxy
        $env:HTTPS_PROXY = $manualProxy
        return $true
    }
    return $false
}

function Refresh-Environment {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

function Install-NodeJs {
    Write-Step "Installing Node.js $NODE_FULL_VERSION"
    $nodeVersionOutput = node --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        $currentNodeVersion = $nodeVersionOutput.TrimStart('v')
        Write-Success "Node.js already installed (version: v$currentNodeVersion)"
        $versionParts = $currentNodeVersion.Split('.')
        if ([int]$versionParts[0] -lt 22 -or ([int]$versionParts[0] -eq 22 -and [int]$versionParts[1] -lt 12)) {
            Write-Warning "Node.js version too low, OpenClaw requires >=22.12.0"
            $upgrade = Read-Host "Upgrade Node.js? (Y/n)"
            if ($upgrade -ne "n" -and $upgrade -ne "N") {
                return $false
            } else {
                return $true
            }
        }
        return $true
    }

    Write-Info "Node.js not found. Trying installation methods..."

    $installed = $false

    Write-Info "Method 1: Trying Winget..."
    try {
        $wingetCheck = Get-Command winget -ErrorAction SilentlyContinue
        if ($wingetCheck) {
            Write-Info "Winget found. Installing Node.js LTS..."
            winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements -e --source winget 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Node.js installed (Winget)"
                Refresh-Environment
                $installed = $true
            } else {
                Write-Warning "Winget install returned error"
            }
        } else {
            Write-Info "Winget not available"
        }
    } catch {
        Write-Warning "Winget install failed: $_"
    }

    if (-not $installed) {
        Write-Info "Method 2: Trying Scoop..."
        try {
            $scoopCheck = Get-Command scoop -ErrorAction SilentlyContinue
            if ($scoopCheck) {
                Write-Info "Scoop found. Installing Node.js..."
                scoop install nodejs-lts 2>&1 | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "Node.js installed (Scoop)"
                    Refresh-Environment
                    $installed = $true
                }
            } else {
                Write-Info "Scoop not found, installing Scoop first..."
                Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
                irm get.scoop.sh | iex
                $env:Path = [System.Environment]::GetEnvironmentVariable("Path","User") + ";" + [System.Environment]::GetEnvironmentVariable("Path","Machine")
                scoop install nodejs-lts 2>&1 | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "Node.js installed (Scoop)"
                    Refresh-Environment
                    $installed = $true
                }
            }
        } catch {
            Write-Warning "Scoop install failed: $_"
        }
    }
    Write-Info "Preparing to download Node.js from China mirror..."
    $architecture = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
    $fileName = "node-$NODE_FULL_VERSION-$architecture.msi"
    $downloaded = $false
    foreach ($mirror in $NODE_DOWNLOAD_URLS) {
        $downloadUrl = "$mirror$NODE_FULL_VERSION/$fileName"
        $localPath = Join-Path $DOWNLOAD_DIR $fileName
        Write-Info "Trying download from $downloadUrl ..."
        if (Test-UrlAccessible -Url $downloadUrl -Timeout 10) {
            try {
                Write-Info "Downloading Node.js (approx 30MB)..."
                Invoke-WebRequest -Uri $downloadUrl -OutFile $localPath -UseBasicParsing
                Write-Success "Download complete"
                Write-Info "Installing Node.js..."
                $installArgs = @("/i", "`"$localPath`"", "/qn", "/norestart")
                Start-Process "msiexec.exe" -ArgumentList $installArgs -Wait -NoNewWindow
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "Node.js installed"
                    Refresh-Environment
                    $downloaded = $true
                    break
                }
            } catch {
                Write-Warning "Download failed from $mirror"
                if (Test-Path $localPath) {
                    Remove-Item $localPath -Force
                }
            }
        }
    }
    if (-not $downloaded) {
        Write-Error "All mirror sources failed to download"
        Write-ColorOutput Cyan ""
        Write-ColorOutput Cyan "Manual download recommended:"
        Write-ColorOutput Cyan ""
        Write-ColorOutput Cyan "Node.js v$NODE_VERSION mirrors:"
        Write-ColorOutput Cyan "  - Taobao/NPMMirror: https://npmmirror.com/mirrors/node/v$NODE_VERSION/"
        Write-ColorOutput Cyan "  - Huawei Cloud: https://mirrors.huaweicloud.com/nodejs/v$NODE_VERSION/"
        Write-ColorOutput Cyan ""
        Write-ColorOutput Cyan "Official download:"
        Write-ColorOutput Cyan "  - https://nodejs.org/"
        Write-ColorOutput Cyan ""
        Write-ColorOutput Cyan "Re-run this script after manual installation."
        pause
        exit 1
    }
    return $true
}

function Install-Git {
    Write-Step "Installing Git"
    $gitCheck = Get-Command git -ErrorAction SilentlyContinue
    if ($gitCheck) {
        $gitVersion = & git --version 2>$null
        Write-Success "Git already installed ($gitVersion)"
        Set-GitMirror
        return $true
    }

    Write-Info "Git not found. Trying installation methods..."

    $installed = $false

    Write-Info "Method 1: Trying Winget..."
    try {
        $wingetCheck = Get-Command winget -ErrorAction SilentlyContinue
        if ($wingetCheck) {
            Write-Info "Winget found. Installing Git..."
            winget install Git.Git --accept-package-agreements --accept-source-agreements -e --source winget 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Git installed (Winget)"
                Refresh-Environment
                Set-GitMirror
                $installed = $true
            } else {
                Write-Warning "Winget install returned error"
            }
        } else {
            Write-Info "Winget not available"
        }
    } catch {
        Write-Warning "Winget install failed: $_"
    }

    if (-not $installed) {
        Write-Info "Method 2: Trying Scoop..."
        try {
            $scoopCheck = Get-Command scoop -ErrorAction SilentlyContinue
            if ($scoopCheck) {
                Write-Info "Scoop found. Installing Git..."
                scoop install git 2>&1 | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "Git installed (Scoop)"
                    Refresh-Environment
                    Set-GitMirror
                    $installed = $true
                }
            } else {
                Write-Info "Scoop not found, installing Scoop first..."
                Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
                Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
                $env:Path = [System.Environment]::GetEnvironmentVariable("Path","User") + ";" + [System.Environment]::GetEnvironmentVariable("Path","Machine")
                scoop install git 2>&1 | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "Git installed (Scoop)"
                    Refresh-Environment
                    Set-GitMirror
                    $installed = $true
                }
            }
        } catch {
            Write-Warning "Scoop install failed: $_"
        }
    }

    if (-not $installed) {
        Write-Error "Git installation failed"
        Write-ColorOutput Cyan ""
        Write-ColorOutput Cyan "Manual download:"
        Write-ColorOutput Cyan "  - Official: https://git-scm.com/download/win"
        Write-ColorOutput Cyan "  - China mirror: https://npm.taobao.org/mirrors/git-for-windows/"
        Write-ColorOutput Cyan ""
        Write-ColorOutput Cyan "Re-run this script after installation."
        pause
        exit 1
    }
    return $true
}

function Install-Pnpm {
    Write-Step "Installing pnpm"
    $pnpmCheck = Get-Command pnpm -ErrorAction SilentlyContinue
    if ($pnpmCheck) {
        $pnpmVersion = & pnpm --version 2>$null
        Write-Success "pnpm already installed (version: $pnpmVersion)"
        return $true
    }
    Write-Info "Installing pnpm silently..."
    try {
        npm install -g pnpm --silent --no-audit --no-fund
        Write-Success "pnpm installed"
        Refresh-Environment
        return $true
    } catch {
        Write-Warning "pnpm installation failed, will use npm"
        return $false
    }
}

function Install-OpenClaw {
    Write-Step "Installing OpenClaw"
    $openclawPath = Get-Command "openclaw" -ErrorAction SilentlyContinue
    if ($openclawPath) {
        Write-Success "OpenClaw already installed"
        return $true
    }
    Write-Warning "Installing OpenClaw (this may take a few minutes)..."
    try {
        npm install -g openclaw@latest --silent --no-audit --no-fund
        Write-Success "OpenClaw installed"
    } catch {
        Write-Error "OpenClaw installation failed"
        Write-ColorOutput Yellow "Possible solutions:"
        Write-ColorOutput Yellow "  1. Check network connection"
        Write-ColorOutput Yellow "  2. Configure proxy"
        Write-ColorOutput Yellow "  3. Try: npm install -g openclaw manually"
        pause
        exit 1
    }
    $openclawVersion = openclaw --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "OpenClaw version: $openclawVersion"
        return $true
    } else {
        Write-Error "OpenClaw installation verification failed"
        pause
        exit 1
    }
}

function Configure-OpenClaw {
    Write-Step "Configuring OpenClaw"
    if (-not (Test-Path $INSTALL_DIR)) {
        New-Item -ItemType Directory -Path $INSTALL_DIR -Force | Out-Null
        Write-Success "Created config directory: $INSTALL_DIR"
    }
    $envFile = Join-Path $INSTALL_DIR ".env"
    if (-not (Test-Path $envFile)) {
        Write-Warning "Creating .env configuration file..."
        $randomToken = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

        $envLines = @(
            "# OpenClaw Configuration",
            "# Generated: $timestamp",
            "",
            "# Gateway authentication",
            "OPENCLAW_GATEWAY_TOKEN=$randomToken",
            "",
            "# AI Model Provider API Keys (set at least one)",
            "# OpenAI (requires proxy for China users)",
            "# OPENAI_API_KEY=sk-...",
            "",
            "# Anthropic/Claude (requires proxy for China users)",
            "# ANTHROPIC_API_KEY=sk-ant-...",
            "",
            "# Google Gemini",
            "# GEMINI_API_KEY=...",
            "",
            "# China-friendly providers",
            "# ZAI_API_KEY=...",
            "",
            "# OpenRouter (supports China access)",
            "# OPENROUTER_API_KEY=sk-or-...",
            "",
            "# Channel configuration (only set what you use)",
            "# Telegram",
            "# TELEGRAM_BOT_TOKEN=123456:ABCDEF...",
            "",
            "# Discord",
            "# DISCORD_BOT_TOKEN=...",
            "",
            "# Slack",
            "# SLACK_BOT_TOKEN=xoxb-...",
            "# SLACK_APP_TOKEN=xapp-...",
            "",
            "# WhatsApp (configure via wizard)",
            "",
            "# Proxy settings (if needed for foreign services)",
            "# HTTPS_PROXY=http://127.0.0.1:7890",
            "# HTTP_PROXY=http://127.0.0.1:7890",
            "# NO_PROXY=localhost,127.0.0.1"
        )
        $envLines | Out-File -FilePath $envFile -Encoding UTF8
        Write-Success ".env file created: $envFile"
        Write-ColorOutput Yellow "Please edit this file and add your API keys"
    } else {
        Write-Success ".env file already exists"
    }
    $shortcutPath = Join-Path $DESKTOP "Edit OpenClaw Config.lnk"
    if (-not (Test-Path $shortcutPath)) {
        try {
            $WshShell = New-Object -comObject WScript.Shell
            $Shortcut = $WshShell.CreateShortcut($shortcutPath)
            $Shortcut.TargetPath = "notepad.exe"
            $Shortcut.Arguments = $envFile
            $Shortcut.WorkingDirectory = $INSTALL_DIR
            $Shortcut.Description = "Edit OpenClaw configuration file"
            $Shortcut.Save()
            Write-Success "Desktop shortcut created: Edit OpenClaw Config.lnk"
        } catch {
            Write-Warning "Could not create desktop shortcut"
        }
    }
}

function Run-Onboarding {
    Write-Step "Running initialization wizard"
    Write-ColorOutput Cyan "Starting OpenClaw configuration wizard..."
    Write-ColorOutput Yellow "The wizard will guide you through:"
    Write-ColorOutput Yellow "  - Select AI model provider"
    Write-ColorOutput Yellow "  - Configure chat channels"
    Write-ColorOutput Yellow "  - Install daemon service"
    $runWizard = Read-Host "Run wizard now? (Y/n)"
    if ($runWizard -ne "n" -and $runWizard -ne "N") {
        Write-Warning "Starting wizard..."
        openclaw onboard --install-daemon
    }
}

function Create-StartupScripts {
    Write-Step "Creating startup scripts"

    $startScriptLines = @(
        "@echo off",
        "title OpenClaw Gateway",
        "chcp 65001 >nul",
        "echo ========================================",
        "echo   OpenClaw Gateway",
        "echo ========================================",
        "echo.",
        "echo Press Ctrl+C to stop service",
        "echo.",
        "",
        "cd /d ""%USERPROFILE%\.openclaw""",
        "openclaw gateway --port 18789 --verbose",
        "",
        "pause"
    )
    $startScriptPath = Join-Path $DESKTOP "Start OpenClaw.bat"
    $startScriptLines | Out-File -FilePath $startScriptPath -Encoding ASCII
    Write-Success "Startup script created: Start OpenClaw.bat"

    $checkScriptLines = @(
        "@echo off",
        "title OpenClaw Config Check",
        "chcp 65001 >nul",
        "echo ========================================",
        "echo   OpenClaw Config Check",
        "echo ========================================",
        "echo.",
        "",
        "cd /d ""%USERPROFILE%\.openclaw""",
        "echo Checking .env file...",
        "if exist .env (",
        "    echo [OK] .env file exists",
        "    echo.",
        "    echo Current config:",
        "    type .env | findstr /V ""^[#]"" | findstr /V ""^$""",
        ") else (",
        "    echo [WARN] .env file not found",
        ")",
        "echo.",
        "echo.",
        "echo Checking OpenClaw installation...",
        "openclaw --version",
        "echo.",
        "echo.",
        "pause"
    )
    $checkScriptPath = Join-Path $DESKTOP "OpenClaw Config Check.bat"
    $checkScriptLines | Out-File -FilePath $checkScriptPath -Encoding ASCII
    Write-Success "Config check script created: OpenClaw Config Check.bat"
}

function Show-Completion {
    Write-ColorOutput Green ""
    Write-ColorOutput Green "========================================="
    Write-ColorOutput Green "        OpenClaw deployment complete!"
    Write-ColorOutput Green "========================================="
    Write-ColorOutput Green ""

    Write-ColorOutput Cyan "Next steps:"
    Write-ColorOutput White "  1. Edit configuration file, add your AI API key:"
    Write-ColorOutput Yellow "     $envFile"
    Write-ColorOutput White "  2. Run configuration wizard (if not done):"
    Write-ColorOutput Yellow "     openclaw onboard --install-daemon"
    Write-ColorOutput White "  3. Start OpenClaw:"
    Write-ColorOutput Yellow "     Double-click 'Start OpenClaw.bat' on desktop"
    Write-ColorOutput White "  4. Or run command:"
    Write-ColorOutput Yellow "     openclaw gateway --port 18789"

    Write-ColorOutput Cyan ""
    Write-ColorOutput Cyan ""
    Write-ColorOutput Cyan "Documentation: https://docs.openclaw.ai"
    Write-ColorOutput Cyan "Discord: https://discord.gg/clawd"
    Write-ColorOutput Cyan ""
    Write-ColorOutput Cyan "China users note:"
    Write-ColorOutput White "   1. Access to OpenAI/Anthropic APIs requires proxy or domestic relay"
    Write-ColorOutput White "   2. Recommended: Use domestic AI services"
    Write-ColorOutput White "   3. OpenRouter provides unified API with China access"
    Write-ColorOutput Cyan ""
    Write-ColorOutput Cyan "Domestic AI services:"
    Write-ColorOutput White "   - Zhipu AI: https://open.bigmodel.cn/"
    Write-ColorOutput White "   - Qwen: https://tongyi.aliyun.com/"
    Write-ColorOutput White "   - Wenxin: https://yiyan.baidu.com/"
    Write-ColorOutput White "   - OpenRouter: https://openrouter.ai/"
    Write-ColorOutput Cyan ""
    Write-ColorOutput Cyan "Proxy settings:"
    Write-ColorOutput White "   Add to .env file:"
    Write-ColorOutput Yellow "   HTTPS_PROXY=http://127.0.0.1:your-proxy-port"
    Write-ColorOutput Yellow "   HTTP_PROXY=http://127.0.0.1:your-proxy-port"
    Write-ColorOutput Yellow "   NO_PROXY=localhost,127.0.0.1"
}

Write-ColorOutput Cyan ""
Write-ColorOutput Cyan "========================================="
Write-ColorOutput Cyan "  OpenClaw One-Click Installer v2.5"
Write-ColorOutput Cyan "  (China-Optimized)"
Write-ColorOutput Cyan "========================================="
Write-ColorOutput Cyan ""
Write-ColorOutput Cyan "  Personal AI Assistant"
Write-ColorOutput Cyan "  Multi-channel support"
Write-ColorOutput Cyan ""
Write-ColorOutput Cyan "  China network optimization"
Write-ColorOutput Cyan "  Auto npm mirror config"
Write-ColorOutput Cyan "  Multi-source Node.js download"
Write-ColorOutput Cyan ""

Write-Info "Checking network connection..."
if (Test-NetworkConnection) {
    Write-Success "Network connection OK"
} else {
    Write-Warning "Cannot connect to network, please check settings"
    $continue = Read-Host "Continue anyway? (Y/n)"
    if ($continue -eq "n" -or $continue -eq "N") {
        exit 0
    }
}

Write-Info ""
$configureProxy = Read-Host "Configure proxy? (Y/n)"
if ($configureProxy -ne "n" -and $configureProxy -ne "N") {
    Check-Proxy
}

Set-NpmMirror
Install-NodeJs
Install-Git
Install-Pnpm
Install-OpenClaw
Configure-OpenClaw
Run-Onboarding
Create-StartupScripts
Show-Completion

Write-ColorOutput Yellow "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

if (Test-Path $DOWNLOAD_DIR) {
    Remove-Item $DOWNLOAD_DIR -Recurse -Force -ErrorAction SilentlyContinue
}
