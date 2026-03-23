# Dclaw 技术决策

> 文档创建时间：2026-03-13

## 项目概述

Dclaw 是一个桌面应用，用于自动为用户安装部署 OpenClaw 并集成消息渠道（主要是企微）。

## 技术栈选择

| 类别 | 技术选择 | 决策理由 |
|------|----------|----------|
| **应用架构** | Electron + 进程隔离模式 | 模块独立、资源不阻塞、容错性高 |
| **前端框架** | React 18 + TypeScript + Vite | 生态成熟、AI 友好、开发体验好 |
| **UI 组件库** | Ant Design | 企业级设计、组件丰富、适合后台系统 |
| **状态管理** | Zustand | 轻量级、API 简单、适合中小型应用 |
| **后端 API** | Express.js + RESTful API | 生态成熟、标准通用、调试方便 |
| **Playwright** | 服务化设计 | 资源可控、可复用、可维护 |
| **内嵌网页** | BrowserView | 跨平台支持、安全性高、IPC 通信 |
| **实时通信** | WebSocket | 实时性强、双向通信、资源高效 |
| **页面布局** | 混合式（首页卡片 + 流程向导）| 兼顾简单和复杂场景、扩展性好 |
| **错误处理** | 混合模式（关键错误模态，次要通知）| 平衡重要性和流程 |
| **数据存储** | 内存中临时存储（MVP 无持久化）| 简化 MVP 阶段 |
| **打包分发** | Electron Forge | 官方推荐、配置简单、Vite 集成好 |
| **CLI 调用** | 子进程调用 | 通用性强、实时输出、稳定性好 |
| **企微集成** | 全自动模式 | 符合产品定位、用户体验好 |
| **环境检测** | 混合模式（尽可能自动安装）| 平衡可靠性和体验 |
| **Windows 支持** | 直接安装（不使用 WSL2）| 用户明确要求 |
| **日志展示** | 混合模式（文本流 + 关键步骤高亮）| 信息完整、易读性好 |
| **目录结构** | Monorepo 风格 | 模块独立、清晰明确、便于测试 |
| **主题风格** | 亮色主题，米黄 + 炭黑色调 | 参考 Claude 官网风格 |
| **开发工具** | ESLint + Prettier + Husky + lint-staged | 保证代码质量和提交质量 |

## 进程隔离架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron 主进程                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   窗口管理    │  │   进程管理    │  │   IPC 路由    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  UI 渲染进程   │  │  任务子进程    │  │  API 后端进程  │
│  (React/Vue)   │  │  (安装/Playwright) │  │  (Express/Fastify) │
└───────────────┘  └───────────────┘  └───────────────┘
       │                   │                   │
       │                   ▼                   ▼
       │            ┌───────────────┐  ┌───────────────┐
       └───────────►│  OpenClaw CLI │  │  OpenClaw 本地 │
                      │  (通过 Node child_process) │  │  文件读取       │
                      └───────────────┘  └───────────────┘
```

## 目录结构

```
dclaw/
├── main/              # Electron 主进程
│   ├── windows/       # 窗口管理
│   ├── ipc/          # IPC 通信
│   └── services/      # 主进程服务
├── renderer/          # 渲染进程（React）
│   ├── src/
│   │   ├── pages/     # 页面组件
│   │   ├── components/
│   │   ├── stores/    # Zustand stores
│   │   └── utils/
├── backend/           # Express.js 后端
│   ├── routes/       # API 路由
│   └── services/     # 业务逻辑
├── playwright/        # Playwright 自动化服务
└── shared/           # 共享类型和工具
```

## OpenClaw CLI 非交互式安装

OpenClaw 支持 `--non-interactive --accept-risk` 参数，可以实现全自动安装。

```bash
openclaw onboard --non-interactive --accept-risk \
  --zai-api-key <key> \
  --minimax-api-key <key> \
  --qianfan-api-key <key> \
  ...
```

## API 端点设计

```
GET  /api/status              # 获取系统状态
POST /api/install/start        # 开始安装
GET  /api/install/progress    # 获取安装进度
POST /api/channel/wechat/start # 开始企微集成
GET  /api/logs               # 获取日志
```

## 企微集成流程（8 步骤）

1. 点击【智能机器人】- 创建机器人
2. 点击【手动创建】
3. 点击【API模式创建】
4. 编辑机器人信息（名称、简介）
5. 配置可见范围（添加用户）
6. 复制 BotId
7. 获取 Secret
8. 复制 Secret
9. 提交机器人信息

## 配色方案

- **背景色**：米黄/米白色 (#F9F7F2)
- **主色调**：炭黑 (#1A1A1A)
- **强调色**：深棕/暗橙 (#B8860B)
- **文字色**：深灰 (#333333) 和 中灰 (#666666)

## 错误等级划分

- **致命错误**：模态对话框，必须处理（安装失败、无法启动等）
- **警告**：通知，可稍后处理（部分功能不可用）
- **信息**：Toast，轻量提示（操作成功、进度更新）

## 环境检测项目

- 操作系统及版本
- Node.js（需要 >= 22，尝试自动安装）
- Git（尝试自动安装）
- 包管理器（npm/pnpm，尝试自动安装 pnpm）

## 空白系统安装策略

**假设系统环境**：全新安装的操作系统，没有 Node.js、Git、npm/pnpm

### 自动安装尝试策略

| 平台 | Node.js | Git | pnpm | 镜像源 |
|------|---------|------|-------|---------|
| **Windows** | 官方安装器 / nvm-windows | Git for Windows | npm install -g pnpm | 使用淘宝镜像 |
| **macOS** | Homebrew / nvm | Homebrew | npm install -g pnpm | 使用淘宝镜像 |
| **Linux** | apt / yum / nvm | apt / yum | npm install -g pnpm | 使用淘宝镜像 |

### 国内镜像配置

```bash
# npm 淘宝镜像
npm config set registry https://registry.npmmirror.com

# pnpm 淘宝镜像
pnpm config set registry https://registry.npmmirror.com

# Git 国内加速
# Windows: Git for Windows 已内置加速
# macOS/Linux: 根据发行版配置
```

## OpenClaw 安装方式

1. **全局安装（推荐）**：
   ```bash
   npm install -g openclaw@latest
   # 或
   pnpm add -g openclaw@latest
   ```

2. **从源码安装**：
   ```bash
   git clone https://github.com/openclaw/openclaw.git
   cd openclaw
   pnpm install
   ```

3. **安装后配置**：
   ```bash
   openclaw onboard --non-interactive --accept-risk \
     --zai-api-key <key> \
     --minimax-api-key <key> \
     --qianfan-api-key <key> \
     ...
   ```

## 企微集成流程（全自动）

### 前提条件
1. 用户已登录企微管理后台（在 BrowserView 中）
2. 用户已填写机器人信息（名称、简介、用户名）

### Playwright 自动化步骤

| 步骤 | 操作 | DOM 选择器 | 超时 | 失败重试 |
|------|------|-----------|------|---------|
| 1 | 点击【智能机器人】按钮 | `button.create_btn` | 10s | 3次 |
| 2 | 点击【手动创建】 | `div.blank_create_btn` | 5s | 3次 |
| 3 | 点击【API模式创建】链接 | `a[href*="API模式"]` | 5s | 3次 |
| 4 | 点击【编辑】按钮 | `button.edit_title_button` | 5s | 3次 |
| 5a | 输入机器人名称 | `input[placeholder="输入智能机器人名称"]` | 2s | - |
| 5b | 输入机器人简介 | `textarea[placeholder*="简介"]` | 2s | - |
| 5c | 点击【确定】 | `button:has-text("确定")` | 5s | 3次 |
| 6a | 点击【添加】链接 | `a.add_btn` | 5s | 3次 |
| 6b | 输入搜索用户名 | `#memberSearchInput` | 2s | - |
| 6c | 回车提交 | `#memberSearchInput` (Enter) | 5s | 3次 |
| 6d | 点击【确认】 | `a#footer_submit_btn` | 5s | 3次 |
| 7 | 复制 BotId | `span.sdk-copy` | 3s | 3次 |
| 8 | 点击【点击获取】 | `span.sdk-get-secret` | 10s | 3次 |
| 9 | 复制 Secret | `span.sdk-copy-icon` | 3s | 3次 |
| 10 | 点击【保存】 | `button.navi_button` | 5s | 3次 |

### 获取的数据
- **BotId**：暂存到内存
- **Secret**：暂存到内存

### 配置到 OpenClaw
1. 通过 CLI 将 BotId 和 Secret 配置到 OpenClaw
2. 引导用户在企微智能机器人聊天
3. 用户将匹配码填回到 Dclaw
4. Dclaw 将匹配码通过 CLI 传给 OpenClaw

### 错误处理
- **元素未找到**：等待页面加载后重试
- **超时**：暂停并提示用户手动操作
- **网络问题**：重试 3 次后失败

## 页面组件和路由设计

### 页面列表

| 页面 | 说明 | 路由 |
|------|------|-------|
| 初始页 | 三大入口（初次安装、已有 OpenClaw、启动）| `/` |
| 风险提示页 | 用户确认风险 | `/risk-warning` |
| 信息收集页 | 收集大模型配置信息 | `/collect-info` |
| 自动安装页 | 环境检测、安装、配置 | `/install` |
| 渠道集成页 | 渠道选择页 | `/integrate-channels` |
| 企微集成页 | 自动或手动集成企微 | `/integrate-channels/wechat` |
| 更新 OpenClaw 页 | 检测并更新 | `/update` |
| 卸载 OpenClaw 页 | 卸载操作 | `/uninstall` |

### 组件结构

```
renderer/src/
├── pages/
│   ├── HomePage/              # 初始页
│   ├── RiskWarningPage/       # 风险提示页
│   ├── CollectInfoPage/      # 信息收集页
│   ├── InstallPage/          # 自动安装页
│   ├── IntegrateChannelsPage/ # 渠道集成选择页
│   ├── channels/
│   │   └── WechatPage/    # 企微集成页
│   ├── UpdatePage/           # 更新页
│   └── UninstallPage/       # 卸载页
├── components/
│   ├── LogPanel/            # 日志面板
│   ├── ProgressBar/          # 进度条
│   ├── StatusCard/          # 状态卡片
│   └── ChannelCard/         # 渠道卡片
└── stores/
    └── appStore.ts          # 全局状态
```

### 渠道集成模块化

未来可扩展的渠道：
- `/integrate-channels/wechat` - 企业微信
- `/integrate-channels/telegram` - Telegram（未来）
- `/integrate-channels/discord` - Discord（未来）
- `/integrate-channels/slack` - Slack（未来）
- `/integrate-channels/feishu` - 飞书（未来）

每个渠道有自己的 Playwright 自动化脚本和配置。

## WebSocket 实时通信设计

### 架构
```
┌─────────────────────────────────────────────────────────────┐
│                    后端 (Express.js)                      │
│  ┌─────────────────────────────────────────────────┐     │
│  │     WebSocket Server (ws 库)              │     │
│  │  端口: 5678 (随机生成)                 │     │
│  └─────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ WebSocket 消息
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  前端 (React)                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │     WebSocket Client (useWebSocket hook)      │     │
│  │  - 连接状态管理                              │     │
│  │  - 消息解析                                   │     │
│  │  - 日志渲染                                   │     │
│  └─────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 消息格式

```typescript
// 后端 → 前端
interface WsMessage {
  type: 'log' | 'progress' | 'status' | 'error' | 'success';
  timestamp: number;
  data: any;
}

// 日志消息
interface LogMessage extends WsMessage {
  type: 'log';
  data: {
    level: 'info' | 'warn' | 'error' | 'success';
    message: string;
  };
}

// 进度消息
interface ProgressMessage extends WsMessage {
  type: 'progress';
  data: {
    stage: string;      // 当前阶段：环境检测、安装、配置...
    percent: number;    // 百分比
    message: string;    // 状态描述
  };
}
```

### 前端 Zustand Store

```typescript
interface InstallState {
  isInstalling: boolean;
  progress: number;
  currentStage: string;
  logs: LogEntry[];
  error: Error | null;
}
```

## IPC 通信设计

### 架构
```
┌─────────────────────────────────────────────────────────────┐
│              Electron 主进程 (Main)                      │
│  ┌─────────────────────────────────────────────────┐     │
│  │           IPC Handlers                          │     │
│  │  - install:start                               │     │
│  │  - install:cancel (用户取消)                   │     │
│  │  - install:timeout (超时终止)                   │     │
│  │  - channel:integrate:start                       │     │
│  │  - channel:integrate:cancel (用户取消)             │     │
│  │  - window:control (关闭、最小化)                │     │
│  └─────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ IPC (electron-store)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│            渲染进程 (Renderer - React)                  │
│  ┌─────────────────────────────────────────────────┐     │
│  │           IPC Invokers                           │     │
│  │  - window.electronAPI.install.start()          │     │
│  │  - window.electronAPI.install.cancel()          │     │
│  │  - window.electronAPI.channel.integrate()        │     │
│  │  - window.electronAPI.channel.cancel()          │     │
│  │  - window.electronAPI.window.minimize()         │     │
│  └─────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 主要 IPC 通道

| 通道 | 方向 | 说明 |
|------|--------|------|
| `install:start` | 渲染→主 | 开始安装 |
| `install:cancel` | 渲染→主 | 用户取消安装 |
| `install:timeout` | 主→内部 | 超时终止子进程 |
| `channel:integrate:start` | 渲染→主 | 开始渠道集成 |
| `channel:integrate:cancel` | 渲染→主 | 用户取消集成 |
| `channel:integrate:timeout` | 主→内部 | 超时终止集成 |
| `window:minimize` | 渲染→主 | 最小化窗口 |
| `window:close` | 渲染→主 | 关闭窗口 |

### 取消和超时处理

1. **用户主动取消**：渲染进程点击取消按钮 → 发送 `install:cancel`/`channel:integrate:cancel` IPC → 主进程终止子进程
2. **窗口意外关闭**：主进程监听 `closed` 事件 → 自动终止所有子进程
3. **超时机制**：主进程设置超时（如 30 分钟）→ 超时后自动终止并通知前端

## 日志文件管理

### 策略

1. **每次运行只保留 1 个日志文件**：当前运行的日志覆盖同名文件
2. **最多保留 5 个历史文件**：超过数量的旧文件自动删除

### 日志文件

| 文件名 | 说明 |
|--------|------|
| `dclaw-install.log` | OpenClaw 安装日志（当前）|
| `dclaw-install-1.log` ~ `dclaw-install-4.log` | 历史安装日志（最多 4 个）|
| `dclaw-integrate-wechat.log` | 企微集成日志（当前）|
| `dclaw-integrate-wechat-1.log` ~ `dclaw-integrate-wechat-4.log` | 历史集成日志（最多 4 个）|

### 日志文件位置

- **Windows**：`%APPDATA%/dclaw/logs/`
- **macOS**：`~/Library/Application Support/dclaw/logs/`
- **Linux**：`~/.config/dclaw/logs/`

### 自动清理

每次开始新操作时：
1. 将当前日志文件重命名为 `name-N.log`（N 为 1-4）
2. 如果已有 5 个历史文件，删除最旧的（`name-4.log`）
3. 创建新的当前日志文件


## Playwright 服务设计（更新）

### 关键用户流程

1. **页面加载等待**：导航到企微管理后台后，等待页面完全加载
2. **用户扫码登录**：提示用户在企微管理后台扫码登录
3. **监测目标元素**：持续监测【创建机器人】按钮是否出现
4. **条件触发**：只有监测到按钮后，才开始自动化流程

### 延时和重试机制

每个自动化操作都要加入：
- **等待元素出现**：`await page.waitForSelector(selector, { timeout: 30000 })`
- **操作前延时**：`await page.waitForTimeout(500-1000)`（防止页面未完全就绪）
- **重试机制**：元素未找到时，重试 3 次
- **超时处理**：单个步骤超时后，暂停并提示用户手动操作

### 状态管理

```typescript
interface PlaywrightStatus {
  phase: 'waiting-login' | 'monitoring-page' | 'automating' | 'completed' | 'paused' | 'error';
  currentStep: number;
  errorMessage: string | null;
}
```


## 实现方案选择

### 最终选择：方案 A - 按功能模块逐步实现

**理由：**
1. **快速验证** - 每个阶段独立测试，快速发现和解决问题
2. **迭代友好** - 符合敏捷开发，可以根据反馈调整
3. **AI 编程优势** - 阶段性任务在我的训练数据中有大量最佳实践
4. **风险可控** - 问题容易定位和回滚

### 开发阶段

**阶段 1：基础设施搭建**
- 项目初始化（Monorepo 结构）
- Electron 主进程基础框架
- Express 后端基础框架
- React 渲染进程基础框架
- WebSocket 通信基础设施
- IPC 通信基础设施

**阶段 2：核心功能（MVP）**
- 初始页
- 风险提示页
- 信息收集页
- 自动安装页（环境检测 + 安装 + 配置）
- 日志面板组件
- 进度条组件

**阶段 3：企微集成**
- 渠道集成选择页
- 企微集成页
- Playwright 服务实现
- 企微自动化 10 步骤流程

**阶段 4：辅助功能**
- 更新 OpenClaw 页
- 卸载 OpenClaw 页
- 启动 OpenClaw 功能

### 技术栈总结

所有技术决策已确定，详见上文各章节。

