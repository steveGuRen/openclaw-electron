# OpenClaw Windows 服务安装指南

## 概述

本项目将 OpenClaw AI 网关封装为 Windows 服务，支持开机自动启动，并配合 Electron 应用通过 WebView 加载 OpenClaw 的页面。

## 系统要求

- Windows 10/11（64位）
- 管理员权限
- 网络连接（用于下载 NVM、Node.js 和 OpenClaw）

## 快速开始

### 方案 A：使用 PowerShell 脚本（推荐）

**优势：**功能完整，自动处理复杂的 NVM 环境变量问题

1. 右键点击 `PowerShell` → 选择 **"以管理员身份运行"**

2. 执行以下命令：
```powershell
cd "F:\ai\openclaw-electron"
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\scripts\install-openclaw-service.ps1
```

或者使用一行命令：
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "F:\ai\openclaw-electron\scripts\install-openclaw-service.ps1"
```

### 方案 B：使用批处理脚本

**优势：**使用 CMD，无需修改 PowerShell 执行策略

1. 右键点击 `install-openclaw-service.bat` → 选择 **"以管理员身份运行"**

或者在 CMD 中运行：
```cmd
cd F:\ai\openclaw-electron
scripts\install-openclaw-service.bat
```

## 脚本功能说明

### install-openclaw-service.ps1 （PowerShell 版）

这是推荐的安装脚本，自动完成以下步骤：

| 步骤 | 功能 | 说明 |
|------|------|------|
| 1 | 安装 NVM | 自动从 GitHub 下载并安装 Node Version Manager |
| 2 | 验证 NVM | 确保 NVM 安装正确 |
| 3 | 安装 Node 24 | 使用 NVM 安装 Node.js 24.x 版本 |
| 4 | 切换 Node 版本 | 将 Node 设置为 24.x |
| 5 | 安装 OpenClaw | 使用 npm 全局安装 openclaw 包 |
| 6 | 注册 Windows 服务 | 创建 OpenClawGateway Windows 服务 |
| 7 | 启动服务 | 启动服务并验证成功 |

#### 可选参数：

```powershell
# 跳过 NVM 安装（已安装）
.\install-openclaw-service.ps1 -SkipNVM

# 跳过 Node 安装（已安装）
.\install-openclaw-service.ps1 -SkipNode

# 跳过 OpenClaw 安装（已安装）
.\install-openclaw-service.ps1 -SkipOpenClaw

# 组合使用
.\install-openclaw-service.ps1 -SkipNVM -SkipNode
```

### install-openclaw-service.bat （批处理版）

与 PowerShell 版功能相同，但使用批处理语法。

## Windows 服务管理

### 查看服务状态
```cmd
sc query OpenClawGateway
```

### 启动服务
```cmd
net start OpenClawGateway
```

### 停止服务
```cmd
net stop OpenClawGateway
```

### 重启服务
```cmd
net stop OpenClawGateway && timeout /t 2 && net start OpenClawGateway
```

### 删除服务
```cmd
sc delete OpenClawGateway
```

### 查看服务日志
```powershell
Get-EventLog -LogName System -Source "Service Control Manager" -Newest 10
```

## NVM 及 Node.js 管理

### 查看已安装的 Node 版本
```cmd
%APPDATA%\nvm\nvm.exe list
```

### 切换 Node 版本
```cmd
%APPDATA%\nvm\nvm.exe use 24.0.0
```

### 安装指定 Node 版本
```cmd
%APPDATA%\nvm\nvm.exe install 18.0.0
```

### 查看 Node 信息
```cmd
node --version
npm --version
```

## OpenClaw 服务配置

### 服务启动命令

服务通过以下 Node.js 脚本启动 OpenClaw：

```javascript
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
```

### 手动测试 OpenClaw

```cmd
openclaw gateway --port 18789 --verbose
```

### OpenClaw 访问地址

- **WebSocket**: `ws://localhost:18789`
- **HTTP**: `http://localhost:18789`

## Electron 应用配置

### main.js 的修改

已修改 `main.js`，仅加载 WebView 并连接到 OpenClaw 网关：

```javascript
mainWindow.loadURL(`http://localhost:${PORT}`)
```

其中 `PORT = 18789`（OpenClaw 默认端口）

### 构建 Electron 应用

```cmd
npm run electron:build
```

这将生成 `.exe` 安装程序。

### 运行 Electron 应用

```cmd
npx electron .
```

## 完整工作流

### 首次部署

1. **以管理员身份打开 PowerShell**
2. **运行安装脚本**
   ```powershell
   .\scripts\install-openclaw-service.ps1
   ```
3. **检查服务状态**
   ```cmd
   sc query OpenClawGateway
   ```
4. **构建 Electron 应用**
   ```cmd
   npm run electron:build
   ```
5. **运行或安装 Electron 应用**

### 日常使用

- OpenClaw 服务会在系统启动时自动运行
- 通过 Electron 应用访问 OpenClaw 网页界面
- 或在浏览器中访问 `http://localhost:18789`

## 故障排除

### 问题 1：服务创建失败

**症状：** `sc create` 命令返回错误

**解决方案：**
1. 确保以管理员身份运行脚本
2. 检查 Node.js 路径是否正确
3. 运行 `node --version` 验证 Node 安装

### 问题 2：OpenClaw 无法启动

**症状：** 服务创建成功但启动失败

**解决方案：**
1. 手动测试：`openclaw gateway --port 18789 --verbose`
2. 检查端口 18789 是否被占用：`netstat -ano | findstr :18789`
3. 查看服务日志

### 问题 3：NVM 命令不可用

**症状：** PowerShell 无法执行 NVM 命令

**解决方案：**
1. 重新启动 PowerShell
2. 检查 NVM 安装：
   ```powershell
   Test-Path "$env:APPDATA\nvm\nvm.exe"
   ```
3. 手动设置 PATH：
   ```powershell
   $env:PATH = "$env:APPDATA\nvm;$env:PATH"
   & "$env:APPDATA\nvm\nvm.exe" list
   ```

### 问题 4：Electron 应用无法连接

**症状：** Electron 应用打开但页面空白或加载失败

**解决方案：**
1. 确认 OpenClaw 服务正在运行：`net start OpenClawGateway`
2. 在浏览器中测试：http://localhost:18789
3. 检查 Electron 主进程 console错误日志

### 问题 5：端口被占用

**检查占用端口的进程：**
```cmd
netstat -ano | findstr :18789
taskkill /PID <PID> /F
```

## 高级配置

### 修改 OpenClaw 启动参数

编辑 `service-wrapper\run.js`：

```javascript
const proc = spawn('openclaw', [
  'gateway',
  '--port', '18789',
  '--verbose',
  // 添加其他参数
  '--config', '/path/to/config.json'
], {
  stdio: 'inherit',
  shell: true,
  detached: false
});
```

然后重新启动服务：
```cmd
net stop OpenClawGateway
net start OpenClawGateway
```

### 修改服务启动延迟

使用 PowerShell：
```powershell
Set-Service -Name OpenClawGateway -StartupType Automatic -PassThru
```

### 查看详细的服务信息

```powershell
Get-Service -Name OpenClawGateway | Format-List
```

## 脚本文件结构

```
openclaw-electron/
├── scripts/
│   ├── install-openclaw-service.ps1    (PowerShell 安装脚本)
│   ├── install-openclaw-service.bat    (批处理安装脚本)
│   └── ...
├── service-wrapper/                     (服务启动包装脚本)
│   └── run.js                          (Node.js 启动脚本)
├── start.bat                            (启动向导菜单)
├── main.js                              (Electron 主进程)
└── ...
```

## 日志文件位置

### Windows 事件日志
- **位置**：事件查看器 → Windows 日志 → 系统
- **来源**：Service Control Manager

### OpenClaw 日志
由于使用 `--verbose` 参数，OpenClaw 的日志会输出到控制台。

查看实时日志：
```cmd
sc query OpenClawGateway
```

## 环境变量

### NVM_HOME
```
%APPDATA%\nvm
```

### NVM 符号链接
```
C:\Program Files\nodejs
```

## 支持的 Node.js 版本

- **当前安装**: Node.js 24.x
- **支持范围**: Node.js 18.x+
- **修改版本**: 编辑安装脚本的版本号

## 常见问题 (FAQ)

**Q: 为什么选择 Node 24？**
A: Node 24 是最新的 LTS 版本，提供最佳的性能和安全性。

**Q: 可以使用其他 Node 版本吗？**
A: 可以，修改安装脚本中的版本号为需要的版本。

**Q: OpenClaw 占用多少资源？**
A: 通常占用 50-100MB 内存，CPU 使用率低于 5%。

**Q: 如何卸载所有组件？**
A: 执行以下命令：
```cmd
sc delete OpenClawGateway
%APPDATA%\nvm\nvm.exe uninstall 24.0.0
npm uninstall -g openclaw
```

**Q: 支持多实例运行吗？**
A: OpenClaw 可以在不同端口上为多个实例。修改脚本中的端口号即可。

## 联系方式

- OpenClaw 项目：https://github.com/openclaw/openclaw
- 问题报告：https://github.com/openclaw/openclaw/issues

## 许可证

遵循 OpenClaw 项目的许可证。
