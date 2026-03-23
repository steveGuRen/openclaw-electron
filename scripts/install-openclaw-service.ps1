# ========================================
# OpenClaw Windows Service 安装脚本 (PowerShell 版本)
# ========================================
# 
# 此脚本用于完整配置 OpenClaw 服务：
# 1. 自动安装 NVM (Node Version Manager)
# 2. 使用 NVM 安装 Node 24
# 3. 自动安装全局 OpenClaw
# 4. 注册为 Windows 服务自动启动
# 
# 使用方法:
#   PowerShell -ExecutionPolicy Bypass -File install-openclaw-service.ps1
#
# 卸载:
#   sc delete OpenClawGateway
# ========================================

param(
    [switch]$SkipNVM = $false,
    [switch]$SkipNode = $false,
    [switch]$SkipOpenClaw = $false
)

# 设置错误处理
$ErrorActionPreference = "Stop"

# 检查管理员权限
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentUser)

if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "❌ 此脚本需要管理员权限运行"
    Write-Host "请右键单击 PowerShell 选择'以管理员身份运行'"
    pause
    exit 1
}

Write-Host "========================================"
Write-Host "🚀 OpenClaw Windows 服务完整安装向导"
Write-Host "========================================"
Write-Host ""

# 设置 NVM 目录
$NVM_HOME = "$env:APPDATA\nvm"
$NVM_SYMLINK = "$env:ProgramFiles\nodejs"

# ========== 步骤 1: 检查并安装 NVM ==========
if (-not $SkipNVM) {
    Write-Host "[步骤 1/5] 检查 NVM 安装状态..."
    
    if (-not (Test-Path $NVM_HOME)) {
        Write-Host "⬇️  NVM 未安装，开始下载..."
        
        New-Item -ItemType Directory -Path $NVM_HOME -Force > $null
        
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            $nvmUrl = "https://github.com/coreybutler/nvm-windows/releases/download/1.1.12/nvm-setup.exe"
            $nvmPath = "$env:TEMP\nvm-setup.exe"
            
            Write-Host "📥 从 GitHub 下载 NVM..."
            Invoke-WebRequest -Uri $nvmUrl -OutFile $nvmPath -ProgressAction SilentlyContinue
            
            Write-Host "💿 运行 NVM 安装程序..."
            Start-Process -FilePath $nvmPath -Wait
            
            Write-Host "✅ NVM 安装完成"
            Remove-Item -Path $nvmPath -Force
        }
        catch {
            Write-Host "❌ NVM 安装失败：$($_.Exception.Message)"
            Write-Host "📌 请手动访问: https://github.com/coreybutler/nvm-windows/releases"
            pause
            exit 1
        }
    } else {
        Write-Host "✅ NVM 已安装: $NVM_HOME"
    }
}

Write-Host ""

# ========== 步骤 2: 检查 NVM 可用性 ==========
if (-not $SkipNVM) {
    Write-Host "[步骤 2/5] 检查 NVM 可用性..."
    
    $nvmExe = "$NVM_HOME\nvm.exe"
    
    if (-not (Test-Path $nvmExe)) {
        Write-Host "❌ 无法找到 NVM 可执行文件"
        Write-Host "📌 请确保 NVM 已正确安装在: $NVM_HOME"
        pause
        exit 1
    }
    
    Write-Host "✅ NVM 可用: $nvmExe"
}

Write-Host ""

# ========== 步骤 3: 安装 Node 24 ==========
if (-not $SkipNode) {
    Write-Host "[步骤 3/5] 检查并安装 Node 24..."
    
    $nvmExe = "$NVM_HOME\nvm.exe"
    
    # 检查 Node 24 是否已安装
    $nodeList = & $nvmExe list 2>$null
    $node24Installed = $nodeList -match "24\." -or (Test-Path "$NVM_HOME\v24*")
    
    if ($node24Installed) {
        Write-Host "✅ Node 24 已安装"
    } else {
        Write-Host "⬇️  安装 Node 24（这可能需要几分钟）..."
        
        try {
            & $nvmExe install 24.0.0
            Write-Host "✅ Node 24 安装完成"
        }
        catch {
            Write-Host "❌ Node 24 安装失败：$($_.Exception.Message)"
            Write-Host "📌 可以手动运行: $nvmExe install 24.0.0"
            pause
            exit 1
        }
    }
}

Write-Host ""

# ========== 步骤 4: 切换到 Node 24 ==========
if (-not $SkipNode) {
    Write-Host "[步骤 4/5] 切换到 Node 24..."
    
    $nvmExe = "$NVM_HOME\nvm.exe"
    
    try {
        & $nvmExe use 24.0.0
        Write-Host "✅ 已切换到 Node 24"
    }
    catch {
        Write-Host "❌ 切换 Node 版本失败：$($_.Exception.Message)"
        pause
        exit 1
    }
    
    # 获取 Node 路径
    $nodePath = "$NVM_SYMLINK\node.exe"
    if (-not (Test-Path $nodePath)) {
        $nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
    }
    
    if (-not (Test-Path $nodePath)) {
        Write-Host "❌ 无法确定 Node 路径"
        pause
        exit 1
    }
    
    Write-Host "Node.js 路径: $nodePath"
}

Write-Host ""

# ========== 步骤 5: 安装 OpenClaw ==========
if (-not $SkipOpenClaw) {
    Write-Host "[步骤 5/5] 检查并安装 OpenClaw..."
    
    # 更新 PATH
    $env:PATH = "$NVM_SYMLINK;$env:PATH"
    
    # 检查 OpenClaw 是否已安装
    $openclawCmd = (Get-Command openclaw -ErrorAction SilentlyContinue).Source
    
    if ($openclawCmd) {
        Write-Host "✅ OpenClaw 已安装: $openclawCmd"
    } else {
        Write-Host "⬇️  OpenClaw 未安装，使用 npm 全局安装..."
        
        try {
            npm install -g openclaw
            Write-Host "✅ OpenClaw 安装完成"
            $openclawCmd = (Get-Command openclaw -ErrorAction SilentlyContinue).Source
        }
        catch {
            Write-Host "❌ OpenClaw 安装失败：$($_.Exception.Message)"
            Write-Host "📌 也可手动运行: npm install -g openclaw"
            pause
            exit 1
        }
    }
    
    Write-Host "OpenClaw: $openclawCmd"
}

Write-Host ""
Write-Host "========================================"
Write-Host "✅ 前置条件检查完成！现在注册 Windows 服务"
Write-Host "========================================"
Write-Host ""

# ========== 注册 Windows 服务 ==========
Write-Host "📝 配置 OpenClaw Windows 服务..."

# 停止旧服务
Write-Host "⏹️  停止旧服务..."
net stop OpenClawGateway 2>$null
Start-Sleep -Seconds 2

# 删除旧服务
Write-Host "🗑️  删除旧服务..."
sc delete OpenClawGateway 2>$null

# 创建包装脚本目录
$serviceWrapperDir = Join-Path $PSScriptRoot "service-wrapper"
New-Item -ItemType Directory -Path $serviceWrapperDir -Force > $null

# 创建 Node.js 包装脚本
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

Write-Host "🚀 创建新 Windows 服务..."

$nodePath = "$NVM_SYMLINK\node.exe"
if (-not (Test-Path $nodePath)) {
    $nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
}

# 创建服务
sc create OpenClawGateway binPath= "`"$nodePath`" `"$wrapperScript`"" DisplayName= "OpenClaw Gateway" Description= "OpenClaw AI Assistant - Personal AI Gateway Service (Node 24 via NVM)" start= auto type= own

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 服务创建失败"
    pause
    exit 1
}

Write-Host "✅ 服务创建成功！"

# 设置服务恢复选项
sc failure OpenClawGateway reset= 60 actions= restart/5000/restart/5000/restart/5000

# 启动服务
Write-Host "🚀 启动服务..."
net start OpenClawGateway

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 服务启动失败"
    Write-Host "📋 请检查以下信息："
    Write-Host "   - Node.js 路径: $nodePath"
    Write-Host "   - 包装脚本: $wrapperScript"
    Write-Host ""
    Write-Host "📌 故障排除："
    Write-Host "   1. 查看服务日志: Get-EventLog -LogName System -Source Service Control Manager"
    Write-Host "   2. 手动测试 OpenClaw: openclaw gateway --port 18789 --verbose"
    Write-Host "   3. 检查 Node 版本: node --version"
    pause
    exit 1
}

Write-Host "✅ OpenClaw 服务已启动！"

Write-Host ""
Write-Host "========================================"
Write-Host "✅ 安装完成！"
Write-Host "========================================"
Write-Host ""
Write-Host "📌 服务信息："
Write-Host "   名称：OpenClawGateway"
Write-Host "   状态：正在运行"
Write-Host "   启动方式：自动（开机启动）"
Write-Host "   访问地址：ws://localhost:18789"
Write-Host "   Node.js 版本：24（通过 NVM 管理）"
Write-Host ""
Write-Host "📋 常用命令："
Write-Host "   启动服务：net start OpenClawGateway"
Write-Host "   停止服务：net stop OpenClawGateway"
Write-Host "   查看状态：sc query OpenClawGateway"
Write-Host "   删除服务：sc delete OpenClawGateway"
Write-Host ""
Write-Host "📌 NVM 命令："
Write-Host "   查看已安装版本：$NVM_HOME\nvm.exe list"
Write-Host "   切换 Node 版本：$NVM_HOME\nvm.exe use 24.0.0"
Write-Host "   安装其他版本：$NVM_HOME\nvm.exe install [版本号]"
Write-Host ""
Write-Host "📌 下一步："
Write-Host "   运行 Electron 应用连接到 ws://localhost:18789"
Write-Host ""
pause
