# 🚀 快速开始指南

## 5 分钟快速部署

### 第 1 步：以管理员身份运行 PowerShell

```powershell
# 右键点击 PowerShell 图标 → "以管理员身份运行"
```

### 第 2 步：执行安装脚本

```powershell
cd "F:\ai\openclaw-electron"
powershell -ExecutionPolicy Bypass .\scripts\install-openclaw-service.ps1
```

**等待脚本完成（通常 5-10 分钟），脚本会自动：**
- ✅ 安装 NVM (Node Version Manager)
- ✅ 安装 Node.js 24
- ✅ 安装 OpenClaw
- ✅ 注册 Windows 服务
- ✅ 启动服务

### 第 3 步：验证安装

```cmd
# 检查服务是否运行
sc query OpenClawGateway

# 在浏览器中测试
# http://localhost:18789
```

### 第 4 步：构建并启动 Electron 应用

```cmd
cd "F:\ai\openclaw-electron"
npm run electron:build
```

然后运行生成的 `.exe` 文件或：

```cmd
npx electron .
```

---

## 常用命令速查表

| 操作 | 命令 |
|------|------|
| **查看服务状态** | `sc query OpenClawGateway` |
| **启动服务** | `net start OpenClawGateway` |
| **停止服务** | `net stop OpenClawGateway` |
| **重启服务** | `net stop OpenClawGateway && timeout /t 2 && net start OpenClawGateway` |
| **删除服务** | `sc delete OpenClawGateway` |
| **查看 NVM 列表** | `%APPDATA%\nvm\nvm.exe list` |
| **切换 Node 版本** | `%APPDATA%\nvm\nvm.exe use 24.0.0` |
| **测试 OpenClaw** | `openclaw gateway --port 18789 --verbose` |
| **查看 Node 版本** | `node --version` |

---

## 🎯 工作流概览

```
┌─────────────────────┐
│  首次安装（一次）     │
├─────────────────────┤
│ 1. 运行安装脚本      │
│ 2. 自动安装 NVM     │
│ 3. 自动安装 Node 24 │
│ 4. 自动安装 OpenClaw │
│ 5. 注册 Windows 服务 │
└──────────┬──────────┘
           │
    ┌──────▼────────┐
    │ 系统启动时    │
    ├───────────────┤
    │ OpenClaw 服务 │
    │   自动启动     │
    │  (ws://...)    │
    └──────┬────────┘
           │
    ┌──────▼──────────┐
    │  Electron 应用   │
    ├──────────────────┤
    │ 连接到 OpenClaw  │
    │ 通过 WebView     │
    │  显示网页界面     │
    └──────────────────┘
```

---

## 📁 文件说明

| 文件/目录 | 说明 |
|----------|------|
| `scripts/install-openclaw-service.ps1` | PowerShell 安装脚本（推荐） |
| `scripts/install-openclaw-service.bat` | 批处理安装脚本 |
| `service-wrapper/run.js` | Windows 服务启动脚本（自动生成） |
| `start.bat` | 启动向导菜单 |
| `main.js` | Electron 主进程（已简化） |
| `OPENCLAW_SERVICE_SETUP.md` | 详细安装指南 |

---

## ⚙️ 架构概览

```
OpenClaw Windows 服务部署架构
┌──────────────────────────────────────┐
│       Windows 操作系统               │
├──────────────────────────────────────┤
│                                      │
│  ┌──────────────────────────────┐   │
│  │   NVM (Node Version Manager) │   │
│  │  (管理 Node.js 版本)         │   │
│  └───────────────┬──────────────┘   │
│                  │                   │
│  ┌───────────────▼──────────────┐   │
│  │     Node.js 24.x             │   │
│  │   (JavaScript Runtime)       │   │
│  └───────────────┬──────────────┘   │
│                  │                   │
│  ┌───────────────▼──────────────┐   │
│  │    OpenClaw Gateway          │   │
│  │  (AI LLM Gateway Service)    │   │
│  │  Port: 18789                 │   │
│  │  Protocol: WebSocket/HTTP    │   │
│  └───────────────┬──────────────┘   │
│                  │                   │
│  ┌───────────────▼──────────────┐   │
│  │  Windows Service Manager     │   │
│  │  • 自动启动                  │   │
│  │  • 故障重启                  │   │
│  │  • 日志管理                  │   │
│  └──────────────────────────────┘   │
│                                      │
├──────────────────────────────────────┤
│       Electron 应用 (GUI)             │
│  • 连接到 OpenClaw 网关              │
│  • 通过 WebView 显示网页             │
│  • 提供用户界面                      │
└──────────────────────────────────────┘
```

---

## 🔧 故障排除速查

### 问题：服务无法启动

**解决：**
```cmd
# 1. 手动测试 OpenClaw
openclaw gateway --port 18789 --verbose

# 2. 检查端口占用
netstat -ano | findstr :18789

# 3. 查看服务日志
Get-EventLog -LogName System -Source "Service Control Manager" -Newest 5
```

### 问题：NVM 命令不可用

**解决：**
```powershell
# 重启 PowerShell 或执行
$env:PATH = "$env:APPDATA\nvm;$env:PATH"
```

### 问题：Node 版本错误

**解决：**
```cmd
# 检查当前版本
node --version

# 使用 NVM 切换
%APPDATA%\nvm\nvm.exe use 24.0.0
```

---

## 📊 性能预期

| 指标 | 数值 |
|------|------|
| 启动时间 | 3-5 秒 |
| 内存用量 | 50-100 MB |
| CPU 占用 | < 5% |
| 网络端口 | 18789 |
| 协议支持 | WebSocket, HTTP/1.1 |

---

## 📖 获取更多帮助

详细的安装和配置指南请参考：
👉 **[OPENCLAW_SERVICE_SETUP.md](OPENCLAW_SERVICE_SETUP.md)**

---

## ✅ 部署检查清单

- [ ] 以管理员权限运行脚本
- [ ] NVM 成功安装
- [ ] Node.js 24 成功安装
- [ ] OpenClaw 成功安装
- [ ] Windows 服务已创建
- [ ] 服务成功启动
- [ ] 可访问 http://localhost:18789
- [ ] Electron 应用成功构建
- [ ] 系统重启后服务自动启动

---

## 📝 脚本执行记录

安装脚本将生成以下信息供参考：
- ✅ NVM 安装位置
- ✅ Node.js 版本和路径
- ✅ OpenClaw 可执行文件位置
- ✅ Windows 服务信息
- ✅ 访问地址和端口

---

**预计总耗时：10-15 分钟（含下载和打包时间）**
