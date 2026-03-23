# Dclaw 设计文档

> 文档创建时间：2026-03-13
> 版本：1.0

---

## 1. 项目概述

### 1.1 产品定位

Dclaw 是一个桌面应用，用于自动为用户安装部署 OpenClaw 并集成消息渠道（主要是企微）。

**核心价值：**
- 让小白用户能够傻瓜式操作完成 OpenClaw 的安装部署
- 自动集成消息渠道，降低使用门槛
- 为未来功能扩展奠定基础

### 1.2 目标用户

- 不了解 OpenClaw 安装部署的小白用户
- 不熟悉命令行操作的用户
- 希望快速完成配置的用户

---

## 2. 技术栈

| 层级 | 技术选择 | 版本/说明 |
|------|----------|-----------|
| 应用架构 | Electron + 进程隔离模式 | - |
| 前端框架 | React 18 + TypeScript + Vite | - |
| UI 组件库 | Ant Design | - |
| 状态管理 | Zustand | - |
| 后端 API | Express.js + RESTful API | - |
| Playwright | 服务化设计 | - |
| 内嵌网页 | BrowserView | - |
| 实时通信 | WebSocket | - |
| 页面布局 | 混合式（首页卡片 + 流程向导）| - |
| 错误处理 | 混合模式（关键错误模态，次要通知）| - |
| 数据存储 | 内存中临时存储（MVP 无持久化）| - |
| 打包分发 | Electron Forge | - |
| CLI 调用 | 子进程调用 | - |
| 企微集成 | 全自动模式 | - |
| 环境检测 | 混合模式（尽可能自动安装）| - |
| Windows 支持 | 直接安装（不使用 WSL2）| - |
| 日志展示 | 混合模式（文本流 + 关键步骤高亮）| - |
| 目录结构 | Monorepo 风格 | - |
| 主题风格 | 亮色主题，米黄 + 炭黑色调 | - |
| 开发工具 | ESLint + Prettier + Husky + lint-staged | - |

---

## 3. 系统架构

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│              Electron 主进程 (Main)                      │
│  ┌─────────────────────────────────────────────────┐     │
│  │           IPC Handlers                          │     │
│  │  - install:start / cancel / timeout            │     │
│  │  - channel:integrate:start / cancel / timeout  │     │
│  │  - window:control (关闭、最小化)                │     │
│  └─────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ IPC (electron-store)
                          ▼
┌─────────────────────────────────────────────────────┐
│            渲染进程 (Renderer - React)                  │
│  ┌─────────────────────────────────────────────────┐     │
│  │     React + Ant Design + Zustand            │     │
│  │     - WebSocket Client (实时通信）              │     │
│  │     - IPC Invokers (窗口控制、任务启动）        │     │
│  └─────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP/WS
                          ▼
┌─────────────────────────────────────────────────────┐
│            任务子进程 (安装/更新）                │     │
│  ┌─────────────────────────────────────────────────┐     │
│  │     OpenClaw CLI 调用                     │     │
│  │     输出流 → WebSocket Server              │     │
│  └─────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP/WS
                          ▼
┌─────────────────────────────────────────────────────┐
│            Playwright 服务进程                          │     │
│  ┌─────────────────────────────────────────────────┐     │
│  │     Browser 自动化操作                      │     │
│  │     BrowserView 展示                          │     │
│  └─────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ IPC
                          ▼
┌─────────────────────────────────────────────────────┐
│            Express.js API 后端                         │     │
│  ┌─────────────────────────────────────────────────┐     │
│  │     RESTful API 端点                      │     │
│  │     WebSocket Server                        │     │
│  │     读取 OpenClaw 配置文件                   │     │
│  └─────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 进程职责

#### 3.2.1 Electron 主进程
- 窗口管理和创建
- 进程生命周期管理
- IPC 事件处理
- 子进程 spawn/kill

#### 3.2.2 渲染进程
- React 组件渲染
- 用户交互处理
- WebSocket 连接管理

#### 3.2.3 任务子进程
- 执行 OpenClaw CLI 命令
- 捕获并转发命令输出
- 环境检测和依赖安装

#### 3.2.4 Playwright 服务进程
- 启动和管理浏览器实例
- 执行自动化脚本（企微集成）
- 元素查找和操作
- 状态管理和进度报告

#### 3.2.5 Express.js 后端进程
- 提供 RESTful API 端点
- WebSocket Server 管理
- 读取 OpenClaw 配置文件
- 日志文件读写

---

## 4. 目录结构

```
dclaw/
├── main/                    # Electron 主进程
│   ├── windows/           # 窗口管理
│   ├── ipc/              # IPC 通信处理器
│   ├── services/          # 主进程服务
│   └── index.ts         # 主进程入口
├── renderer/               # 渲染进程（React）
│   ├── src/
│   │   ├── pages/        # 页面组件
│   │   │   ├── HomePage/              # 初始页
│   │   │   ├── RiskWarningPage/       # 风险提示页
│   │   │   ├── CollectInfoPage/      # 信息收集页
│   │   │   ├── InstallPage/          # 自动安装页
│   │   │   ├── IntegrateChannelsPage/ # 渠道集成选择页
│   │   │   ├── channels/
│   │   │   │   └── WechatPage/    # 企微集成页
│   │   │   ├── UpdatePage/           # 更新页
│   │   │   └── UninstallPage/       # 卸载页
│   │   ├── components/    # 共享组件
│   │   │   ├── LogPanel/            # 日志面板
│   │   │   ├── ProgressBar/          # 进度条
│   │   │   ├── StatusCard/          # 状态卡片
│   │   │   └── ChannelCard/         # 渠道卡片
│   │   └── stores/        # Zustand stores
│   │   │   └── utils/         # 工具函数
│   └── public/        # 静态资源
│       └── assets/      # 图片、图标
├── backend/                # Express.js 后端
│   ├── routes/           # API 路由
│   ├── services/         # 业务逻辑
│   └── index.ts        # 后端入口
├── playwright/             # Playwright 自动化服务
│   ├── channels/        # 各渠道自动化脚本
│   │   ├── wechat.ts    # 企微集成
│   └── service.ts     # Playwright 服务基类
├── shared/                # 共享类型和工具
│   ├── types/          # TypeScript 类型定义
│   └── utils/         # 共享工具函数
└── package.json
```

---

## 5. 核心模块设计

### 5.1 页面路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | HomePage | 初始页，三大入口 |
| `/risk-warning` | RiskWarningPage | 风险提示页，用户确认 |
| `/collect-info` | CollectInfoPage | 信息收集，表单验证 |
| `/install` | InstallPage | 自动安装，环境检测+安装+配置 |
| `/integrate-channels` | IntegrateChannelsPage | 渠道选择页 |
| `/integrate-channels/wechat` | WechatPage | 企微集成，自动/手动 |
| `/update` | UpdatePage | 更新 OpenClaw |
| `/uninstall` | UninstallPage | 卸载 OpenClaw |

### 5.2 IPC 通道设计

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

### 5.3 WebSocket 消息格式

```typescript
// 基础消息接口
interface WsMessage {
  type: 'log' | 'progress' | 'status' | 'error' | 'success' | 'ping' | 'pong';
  timestamp: number;
}

// 日志消息
interface LogMessage extends WsMessage {
  type: 'log';
  data: {
    level: 'info' | 'warn' | 'error' | 'success';
    message: string;
    taskId?: string;
  };
}

// 进度消息
interface ProgressMessage extends WsMessage {
  type: 'progress';
  data: {
    stage: string;      // 当前阶段：环境检测、安装、配置...
    percent: number;    // 百分比 0-100
    message: string;    // 状态描述
    taskId: string;
  };
}

// 状态消息
interface StatusMessage extends WsMessage {
  type: 'status';
  data: {
    taskId: string;
    status: 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
    details?: Record<string, any>;
  };
}

// 错误消息
interface ErrorMessage extends WsMessage {
  type: 'error';
  data: {
    code: string;      // 错误码：E001-E008
    message: string;   // 错误描述
    taskId: string;
    stack?: string;    // 错误堆栈（开发环境）
  };
}

// 成功消息
interface SuccessMessage extends WsMessage {
  type: 'success';
  data: {
    taskId: string;
    result?: any;     // 操作结果数据
  };
}

// 心跳消息
interface PingMessage extends WsMessage {
  type: 'ping';
}

interface PongMessage extends WsMessage {
  type: 'pong';
}
```

### 5.4 前端 Zustand Store

```typescript
// 安装状态
interface InstallState {
  isInstalling: boolean;
  progress: number;
  currentStage: string;
  logs: LogEntry[];
  error: Error | null;
}

// 渠道集成状态（WebSocket 状态映射）
interface ChannelIntegrationState {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  currentPhase: 'waiting-login' | 'monitoring-page' | 'automating' | 'completed' | 'paused' | 'error';
  currentStep: number;
  progress: number;
  botId: string | null;
  secret: string | null;
  errorMessage: string | null;
}

// WebSocket 状态消息直接映射到 ChannelIntegrationState.status
// 细分状态（currentPhase）由 Playwright 服务提供并通过 WebSocket 传递
```

---

## 6. OpenClaw 安装流程设计

### 6.1 环境检测流程

```
开始
  │
  ├─ 1. 检测操作系统
  │   └─ platform + release (Windows/macOS/Linux)
  │
  ├─ 2. 检测 Node.js
  │   ├─ 检查命令: node --version
  │   ├─ 版本 >= 22? ✓ → 继续
  │   └─ 未安装或版本不足 → 尝试自动安装
  │
  ├─ 3. 检测 Git
  │   ├─ 检查命令: git --version
  │   ├─ 已安装? ✓ → 继续
  │   └─ 未安装 → 尝试自动安装
  │
  └─ 4. 检测包管理器
  │      ├─ 检查 pnpm: pnpm --version
  │      ├─ 已安装? ✓ → 继续
  │      ├─ 检查 npm: npm --version
  │      ├─ npm 已安装 → 安装 pnpm
  │      └─ 都未安装 → 先安装 npm，再安装 pnpm
```

### 6.2 自动安装策略（按平台）

#### 6.2.1 Windows 平台

| 依赖 | 检测命令 | 安装命令 | 验证命令 |
|------|----------|----------|----------|
| **Node.js** | `node --version` | `winget install OpenJS.NodeJS.LTS` 或下载官方安装器 | `node --version` (≥ 22.0.0) |
| **Git** | `git --version` | `winget install Git.Git` 或下载 Git for Windows | `git --version` |
| **pnpm** | `pnpm --version` | `npm install -g pnpm` | `pnpm --version` |

#### 6.2.2 macOS 平台

| 依赖 | 检测命令 | 安装命令 | 验证命令 |
|------|----------|----------|----------|
| **Node.js** | `node --version` | `brew install node` 或 `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash && source ~/.bashrc && nvm install --lts` | `node --version` (≥ 22.0.0) |
| **Git** | `git --version` | `brew install git` | `git --version` |
| **pnpm** | `pnpm --version` | `npm install -g pnpm` | `pnpm --version` |

#### 6.2.3 Linux 平台

| 依赖 | 检测命令 | 安装命令 | 验证命令 |
|------|----------|----------|----------|
| **Node.js** | `node --version` | Ubuntu: `curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs`<br>CentOS: `curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash - && sudo yum install -y nodejs` | `node --version` (≥ 22.0.0) |
| **Git** | `git --version` | Ubuntu: `sudo apt-get install -y git`<br>CentOS: `sudo yum install -y git` | `git --version` |
| **pnpm** | `pnpm --version` | `npm install -g pnpm` | `pnpm --version` |

#### 6.2.4 镜像源配置（所有平台）

```bash
# npm 淘宝镜像
npm config set registry https://registry.npmmirror.com

# pnpm 淘宝镜像
pnpm config set registry https://registry.npmmirror.com

# 验证配置
npm config get registry
pnpm config get registry
```

#### 6.2.5 安装成功检测

```typescript
async function verifyInstallation(component: string): Promise<boolean> {
  try {
    const commands: Record<string, string> = {
      'node': 'node --version',
      'git': 'git --version',
      'pnpm': 'pnpm --version'
    };
    const { stdout } = await exec(commands[component]);
    return stdout.length > 0;
  } catch (error) {
    return false;
  }
}

async function verifyOpenClaw(): Promise<boolean> {
  try {
    const { stdout } = await exec('openclaw --version');
    return stdout.includes('openclaw');
  } catch (error) {
    return false;
  }
}
```

### 6.3 OpenClaw 安装命令

```bash
# 全局安装
pnpm add -g openclaw@latest

# 从源码安装
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
```

### 6.4 OpenClaw 非交互式配置

```bash
openclaw onboard --non-interactive --accept-risk \
  --zai-api-key <key> \
  --minimax-api-key <key> \
  --qianfan-api-key <key> \
  ...
```

### 6.5 国内镜像配置

```bash
# npm 淘宝镜像
npm config set registry https://registry.npmmirror.com

# pnpm 淘宝镜像
pnpm config set registry https://registry.npmmirror.com
```

---

## 7. 企微集成流程设计

### 7.1 自动化步骤（10 步）

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

### 7.2 获取的数据

- **BotId**：暂存到内存
- **Secret**：暂存到内存

### 7.3 配置到 OpenClaw

#### 7.3.1 BotId 和 Secret 配置

通过 OpenClaw CLI 将企微集成信息配置到 OpenClaw：

```bash
# 配置企微渠道
openclaw channel:config wechat \
  --bot-id <botId> \
  --secret <secret>
```

配置成功后，OpenClaw 会生成一个匹配码（Match Code），用于验证企微机器人连接。

#### 7.3.2 匹配码验证流程

**匹配码（Match Code）说明：**
- OpenClaw 在配置企微渠道后会生成一个 6 位数字或字母组合的验证码
- 用户需要在企微智能机器人聊天窗口发送该验证码
- OpenClaw 收到验证码后验证有效性，完成渠道连接

**验证流程：**
1. Dclaw 获取 OpenClaw 生成的匹配码
2. 在界面显示匹配码
3. 引导用户在企微机器人聊天窗口发送该验证码
4. Dclaw 轮询 OpenClaw API 检查验证状态
5. 验证成功后更新界面状态为"已连接"

**CLI 命令示例：**

```bash
# 生成匹配码
openclaw channel:generate-match wechat

# 验证匹配码状态
openclaw channel:verify-status wechat

# 返回状态说明：
# - pending: 等待用户发送验证码
# - verifying: 正在验证中
# - success: 验证成功
# - failed: 验证失败
# - expired: 验证码已过期
```

**Dclaw 轮询逻辑：**

```typescript
// 每 5 秒检查一次验证状态，最多轮询 120 次（10 分钟）
const pollVerification = async (channel: string): Promise<boolean> => {
  for (let i = 0; i < 120; i++) {
    const result = await exec('openclaw channel:verify-status ' + channel);
    const status = JSON.parse(result.stdout).status;

    if (status === 'success') {
      return true;
    } else if (status === 'failed' || status === 'expired') {
      throw new Error('验证失败或已过期');
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  throw new Error('验证超时');
};
```

### 7.4 错误处理

- **元素未找到**：等待页面加载后重试
- **超时**：暂停并提示用户手动操作
- **网络问题**：重试 3 次后失败

---

## 8. Playwright 服务设计

### 8.1 服务类设计

```typescript
// playwright/service.ts
class PlaywrightService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  // 初始化浏览器
  async init() {
    this.browser = await chromium.launch({
      headless: false,  // 非无头模式，让用户看到
      args: ['--start-maximized']
    });
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    this.page = await this.context.newPage();
  }

  // 执行企微集成
  async executeWechatIntegration(config: WechatConfig) {
    // 企微管理后台 URL
    const wechatUrl = 'https://work.weixin.qq.com/k/list';

    await this.page.goto(wechatUrl);
    await this.page.waitForLoadState('networkidle');

    // 步骤1：点击智能机器人按钮
    await this.executeWithRetry(async () => {
      await this.page.click('button.create_btn');
    }, 3, 10000);

    // 步骤2：点击手动创建
    await this.executeWithRetry(async () => {
      await this.page.click('div.blank_create_btn');
    }, 3, 5000);

    // 步骤3：点击 API 模式创建
    await this.executeWithRetry(async () => {
      await this.page.click('a:has-text("API 模式创建")');
    }, 3, 5000);

    // 步骤4：点击编辑按钮
    await this.executeWithRetry(async () => {
      await this.page.click('button.edit_title_button');
    }, 3, 5000);

    // 步骤5：编辑机器人信息
    await this.page.fill('input[placeholder="输入智能机器人名称"]', config.robotName || 'Dclaw Bot');
    await this.page.fill('textarea[placeholder*="简介"]', config.description || 'Dclaw 自动创建的智能机器人');
    await this.executeWithRetry(async () => {
      await this.page.click('button:has-text("确定")');
    }, 3, 5000);

    // 步骤6：配置可见范围
    await this.executeWithRetry(async () => {
      await this.page.click('a.add_btn');
    }, 3, 5000);
    await this.page.fill('#memberSearchInput', config.username);
    await this.page.press('#memberSearchInput', 'Enter');
    await this.executeWithRetry(async () => {
      await this.page.click('a#footer_submit_btn');
    }, 3, 5000);

    // 步骤7：复制 BotId
    const botId = await this.page.evaluate(() => {
      const btn = document.querySelector('span.sdk-copy-icon');
      if (btn) {
        btn.click();
        return navigator.clipboard.readText();
      }
      return null;
    });

    // 步骤8：点击获取 Secret
    await this.executeWithRetry(async () => {
      await this.page.click('span.sdk-get-secret');
    }, 3, 10000);

    // 步骤9：复制 Secret
    const secret = await this.page.evaluate(() => {
      const btn = document.querySelector('span.sdk-copy-icon');
      if (btn) {
        btn.click();
        return navigator.clipboard.readText();
      }
      return null;
    });

    // 步骤10：保存机器人信息
    await this.executeWithRetry(async () => {
      await this.page.click('button.navi_button');
    }, 3, 5000);

    return { botId, secret };
  }

  // 清理资源
  async cleanup() {
    await this.context?.close();
    await this.browser?.close();
  }
}
```

### 8.2 错误处理和重试机制

```typescript
async function executeWithRetry<T>(
  action: () => Promise<T>,
  maxRetries = 3,
  delay = 2000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await action();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1));
    }
  }
}
```

### 8.3 状态管理

```typescript
interface PlaywrightStatus {
  phase: 'waiting-login' | 'monitoring-page' | 'automating' | 'completed' | 'paused' | 'error';
  currentStep: number;
  errorMessage: string | null;
}
```

### 8.4 用户流程

1. **页面加载等待**：导航到企微管理后台后，等待页面完全加载
2. **用户扫码登录**：提示用户在企微管理后台扫码登录
3. **监测目标元素**：持续监测【创建机器人】按钮是否出现
4. **条件触发**：只有监测到按钮后，才开始自动化流程

---

## 9. 日志文件管理

### 9.1 策略

1. **每次运行只保留 1 个日志文件**：当前运行的日志覆盖同名文件
2. **最多保留 5 个历史文件**：超过数量的旧文件自动删除

### 9.2 日志文件

| 文件名 | 说明 |
|--------|------|
| `dclaw-install.log` | OpenClaw 安装日志（当前）|
| `dclaw-install-1.log` ~ `dclaw-install-4.log` | 历史安装日志（最多 4 个）|
| `dclaw-integrate-wechat.log` | 企微集成日志（当前）|
| `dclaw-integrate-wechat-1.log` ~ `dclaw-integrate-wechat-4.log` | 历史集成日志（最多 4 个）|

### 9.3 日志文件位置

- **Windows**：`%APPDATA%/dclaw/logs/`
- **macOS**：`~/Library/Application Support/dclaw/logs/`
- **Linux**：`~/.config/dclaw/logs/`

### 9.4 自动清理

每次开始新操作时：
1. 将当前日志文件重命名为 `name-N.log`（N 为 1-4）
2. 如果已有 5 个历史文件，删除最旧的（`name-4.log`）
3. 创建新的当前日志文件

---

## 10. 配色方案

### 10.1 主色调

- **背景色**：米黄/米白色 (#F9F7F2)
- **主色调**：炭黑 (#1A1A1A)
- **强调色**：深棕/暗橙 (#B8860B)
- **文字色**：深灰 (#333333) 和 中灰 (#666666)

### 10.2 配色值

```css
:root {
  --color-primary: #B8860B;
  --color-success: #52C41A;
  --color-warning: #FAAD14;
  --color-error: #FF4D4F;
  --color-info: #1890FF;
  --color-bg-primary: #F9F7F2;
  --color-bg-secondary: #1A1A1A;
  --color-text-primary: #333333;
  --color-text-secondary: #666666;
}
```

---

## 11. 开发阶段

### 11.1 阶段 1：基础设施搭建

**任务列表：**
- 项目初始化（Monorepo 结构）
- Electron 主进程基础框架
- Express 后端基础框架
- React 渲染进程基础框架
- WebSocket 通信基础设施
- IPC 通信基础设施
- 开发工具配置（ESLint、Prettier、Husky）

**验收标准：**
1. 能够启动 Electron 应用并显示基础窗口
2. 渲染进程能够通过 IPC 调用主进程方法
3. Express 后端 API 能够响应基础请求
4. WebSocket 连接能够正常建立并收发消息

**测试检查点：**
- [ ] 窗口正常显示
- [ ] IPC 双向通信正常
- [ ] RESTful API 响应正常
- [ ] WebSocket 消息收发正常

**预估时间：** 3-5 天

### 11.2 阶段 2：核心功能（MVP）

**任务列表：**
- 初始页
- 风险提示页
- 信息收集页
- 自动安装页（环境检测 + 安装 + 配置）
- 日志面板组件
- 进度条组件

**验收标准：**
1. 用户能够完成从初始页到安装成功的完整流程
2. 环境检测能够识别 Node.js、Git、pnpm 的安装状态
3. 自动安装能够在空白系统上成功安装 OpenClaw
4. 日志和进度能够实时展示

**测试检查点：**
- [ ] 空白系统环境检测正确
- [ ] 已安装系统环境检测正确
- [ ] 自动安装成功完成
- [ ] 安装失败时能够正确回滚
- [ ] 用户取消操作能够正常终止

**预估时间：** 5-7 天

**阶段依赖：** 依赖阶段 1 完成

### 11.3 阶段 3：企微集成

**任务列表：**
- 渠道集成选择页
- 企微集成页（自动模式）
- 企微集成页（手动模式）
- Playwright 服务实现
- 企微自动化 10 步骤流程
- 匹配码验证逻辑

**验收标准：**
1. 用户能够选择自动或手动模式
2. 自动模式能够完成企微机器人创建和信息获取
3. 手动模式能够提交 BotId 和 Secret
4. 匹配码验证流程能够成功完成
5. 企微渠道能够在 OpenClaw 中正确配置

**测试检查点：**
- [ ] 自动模式 10 步骤全部成功
- [ ] 页面元素超时后能够正确提示
- [ ] 手动模式表单验证正确
- [ ] 匹配码生成和验证成功
- [ ] 企微机器人能够接收和发送消息

**预估时间：** 7-10 天

**阶段依赖：** 依赖阶段 2 完成（OpenClaw 已安装）

### 11.4 阶段 4：辅助功能

**任务列表：**
- 更新 OpenClaw 页
- 卸载 OpenClaw 页
- 启动 OpenClaw 功能（Dashboard 跳转）
- 注册/登录页面（BrowserView 内嵌）

**验收标准：**
1. 用户能够更新 OpenClaw 到最新版本
2. 用户能够安全卸载 OpenClaw
3. 用户能够启动 OpenClaw Dashboard
4. 用户能够通过应用完成注册和登录

**测试检查点：**
- [ ] 更新功能正确检测新版本
- [ ] 更新过程不会丢失现有配置
- [ ] 卸载过程能够清理所有相关文件
- [ ] Dashboard URL 能够正确提取和打开
- [ ] 注册/登录流程能够正确识别成功状态

**预估时间：** 3-5 天

**阶段依赖：** 依赖阶段 2 完成

---

## 12. 安全和错误处理

### 12.1 错误等级划分

- **致命错误**：模态对话框，必须处理（安装失败、无法启动等）
- **警告**：通知，可稍后处理（部分功能不可用）
- **信息**：Toast，轻量提示（操作成功、进度更新）

### 12.2 取消和超时处理

#### 12.2.1 超时定义

| 操作类型 | 超时时长 | 说明 |
|---------|----------|------|
| **OpenClaw 安装** | 30 分钟 | 包括环境检测、依赖安装、OpenClaw 安装、配置 |
| **企微渠道集成** | 15 分钟 | 从访问企微后台到完成 10 步自动化 |
| **Playwright 单步操作** | 按步骤定义 | 见第 7.1 表格，最长 10 秒 |
| **匹配码验证** | 10 分钟 | 用户发送验证码 + 轮询验证状态 |

#### 12.2.2 超时处理实现

```typescript
class TimeoutManager {
  private timers: Map<string, NodeJS.Timeout> = new Map();

  // 设置超时
  setTimeout(taskId: string, duration: number, callback: () => void) {
    this.clearTimeout(taskId);
    const timer = setTimeout(callback, duration);
    this.timers.set(taskId, timer);
  }

  // 清除超时
  clearTimeout(taskId: string) {
    const timer = this.timers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(taskId);
    }
  }

  // 清除所有超时
  clearAll() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }
}

// 使用示例
const timeoutManager = new TimeoutManager();

// 安装任务超时
timeoutManager.setTimeout('install-task', 30 * 60 * 1000, () => {
  // 终止安装子进程
  installProcess.kill('SIGTERM');

  // 通知前端超时
  wsServer.clients.forEach(client => {
    client.send(JSON.stringify({
      type: 'error',
      data: {
        code: 'E008',
        message: '安装超时，请检查网络或手动重试',
        taskId: 'install-task'
      },
      timestamp: Date.now()
    }));
  });
});
```

#### 12.2.3 取消和超时处理

1. **用户主动取消**：渲染进程点击取消按钮 → 发送 `install:cancel`/`channel:integrate:cancel` IPC → 主进程终止子进程
2. **窗口意外关闭**：主进程监听 `closed` 事件 → 自动终止所有子进程和清理超时
3. **超时机制**：主进程设置超时（见上表时长）→ 超时后自动终止并通知前端

---

## 13. 测试策略

### 13.1 单元测试

**测试目标：**
- 组件单元测试（Jest/Vitest）
- Hooks 测试（React Testing Library）
- 类型检查（TypeScript）

**覆盖率要求：**
- 核心组件：覆盖率 ≥ 80%
- 工具函数：覆盖率 ≥ 90%
- 类型检查：无错误、无警告

### 13.2 集成测试

**测试场景：**

#### 13.2.1 安装流程测试
- [ ] 空白系统完整安装流程
- [ ] 部分依赖已安装时的安装流程
- [ ] 用户取消安装的中断场景
- [ ] 安装失败后的回滚验证
- [ ] 超时场景的处理

#### 13.2.2 企微集成测试
- [ ] 自动模式 10 步骤完整执行
- [ ] 页面元素超时后的手动切换
- [ ] 手动模式表单验证
- [ ] 匹配码生成和验证流程
- [ ] 企微机器人消息发送接收

#### 13.2.3 错误恢复测试
- [ ] 网络中断后重连
- [ ] 子进程崩溃后恢复
- [ ] WebSocket 连接断开后重连
- [ ] 重复提交防护

**性能基准：**
- 应用启动时间：< 3 秒
- 页面切换响应：< 500ms
- 日志实时更新延迟：< 100ms
- WebSocket 重连时间：< 5 秒

### 13.3 测试环境配置

#### 13.3.1 本地开发环境

```bash
# 本地开发环境
NODE_ENV=development
VITE_WS_URL=ws://localhost:5173/ws
VITE_API_URL=http://localhost:5173/api
BACKEND_PORT=5173
```

#### 13.3.2 集成测试环境

```bash
# 集成测试环境（本地测试服务器）
NODE_ENV=integration-test
VITE_WS_URL=ws://localhost:5174/ws
VITE_API_URL=http://localhost:5174/api
BACKEND_PORT=5174
```

#### 13.3.3 生产环境配置

生产环境的端口和 URL 通过配置文件管理，见第 28 章。

---

## 14. 部署策略

### 14.1 构建阶段

- Electron Forge 打包
- 多平台构建（Windows、macOS、Linux）
- 代码签名（生产环境）

### 14.2 分发阶段

- GitHub Releases
- 可选的应用商店分发
- 自动更新机制（未来）

---

## 15. 后续扩展性

### 15.1 可扩展的渠道集成架构

当前架构支持未来扩展其他消息渠道：

| 路由 | 渠道 | 说明 |
|------|------|------|
| `/integrate-channels/telegram` | Telegram（未来）|
| `/integrate-channels/discord` | Discord（未来）|
| `/integrate-channels/slack` | Slack（未来）|
| `/integrate-channels/feishu` | 飞书（未来）|

每个渠道有自己的 Playwright 自动化脚本和配置。

### 15.2 未来功能预留

根据需求文档中的"未来展望"，架构已预留扩展点：

- 会话管理：管理所有 agent 的会话，可以查看所有会话记录
- 定时计划管理：管理所有 agent 的定时计划
- 空间管理：统一管理 agent 空间的文件、技能、工具、渠道等
- 进化体系：为 OpenClaw 加入进化体系

---

## 16. 依赖包清单

### 16.1 生产依赖

```json
{
  "dependencies": {
    "electron": "^30.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "antd": "^5.15.0",
    "zustand": "^4.5.0",
    "express": "^4.19.0",
    "ws": "^8.17.0",
    "playwright": "^1.45.0",
    "typescript": "^5.5.0"
    "electron-store": "^8.1.0"
    "electron-builder": "^24.13.0"
    "vite": "^5.3.0"
    "react-router-dom": "^6.26.0"
    "@ant-design/icons": "^5.3.0"
  }
}
```

### 16.2 开发依赖

```json
{
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "electron-forge": "^7.3.0",
    "electron-builder": "^24.13.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.57.0",
    "eslint-config-prettier": "^9.1.0",
    "prettier": "^3.2.0",
    "husky": "^8.0.0",
    "lint-staged": "^15.2.0"
    "jest": "^29.7.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.0",
    "@testing-library/user-event": "^14.5.0"
    "commitlint": "^19.3.0"
    "commitlint-config-conventional": "^19.1.0"
  }
}
```

---

## 17. RESTful API 端点详细定义

### 17.1 安装相关 API

| 端点 | 方法 | 请求参数 | 响应 | 说明 |
|------|------|----------|------|------|
| `/api/install/start` | POST | `{ os: string, installDir?: string }` | `{ taskId: string }` | 开始安装任务 |
| `/api/install/status` | GET | `{ taskId: string }` | `{ status: 'running' | 'completed' | 'failed', progress: number, message: string }` | 查询安装状态 |
| `/api/install/cancel` | POST | `{ taskId: string }` | `{ success: boolean }` | 取消安装任务 |
| `/api/install/logs` | GET | `{ taskId: string, offset?: number, limit?: number }` | `{ logs: string[] }` | 获取安装日志 |

### 17.2 渠道集成相关 API

| 端点 | 方法 | 请求参数 | 响应 | 说明 |
|------|------|----------|------|------|
| `/api/channel/integrate/start` | POST | `{ channel: 'wechat', mode: 'auto' | 'manual' }` | `{ taskId: string }` | 开始集成任务 |
| `/api/channel/integrate/status` | GET | `{ taskId: string }` | `{ status: string, step: number, progress: number, botId?: string, secret?: string }` | 查询集成状态 |
| `/api/channel/integrate/submit` | POST | `{ channel: 'wechat', botId: string, secret: string }` | `{ success: boolean }` | 手动提交集成信息 |
| `/api/channel/integrate/cancel` | POST | `{ taskId: string }` | `{ success: boolean }` | 取消集成任务 |

### 17.3 OpenClaw 配置 API

| 端点 | 方法 | 请求参数 | 响应 | 说明 |
|------|------|----------|------|------|
| `/api/openclaw/config` | GET | - | `{ isInstalled: boolean, version?: string, configPath?: string }` | 获取 OpenClaw 配置信息 |
| `/api/openclaw/start` | POST | `{ options?: string[] }` | `{ success: boolean, url?: string }` | 启动 OpenClaw Dashboard |
| `/api/openclaw/update` | POST | - | `{ success: boolean }` | 更新 OpenClaw |
| `/api/openclaw/uninstall` | POST | - | `{ success: boolean }` | 卸载 OpenClaw |

### 17.4 错误码定义

| 错误码 | 说明 | HTTP 状态码 |
|--------|------|-------------|
| `E001` | 任务不存在 | 404 |
| `E002` | 任务已取消 | 400 |
| `E003` | 环境检测失败 | 500 |
| `E004` | 安装失败 | 500 |
| `E005` | 网络错误 | 503 |
| `E006` | 参数错误 | 400 |
| `E007` | OpenClaw 未安装 | 404 |
| `E008` | 超时 | 408 |

---

## 18. OpenClaw 安装配置细节

### 18.1 安装目录规范

| 平台 | 默认安装路径 | OpenClaw 配置路径 |
|------|-------------|-------------------|
| **Windows** | `%LOCALAPPDATA%\Programs\openclaw` | `%APPDATA%\openclaw\` |
| **macOS** | `/usr/local/lib/node_modules/openclaw` | `~/.openclaw/` |
| **Linux** | `/usr/local/lib/node_modules/openclaw` | `~/.openclaw/` |

### 18.2 配置文件结构

```
~/.openclaw/
├── config.json          # 主配置文件
├── agent/               # Agent 配置目录
│   └── default/
├── channels/            # 渠道配置目录
│   └── wechat/
│       └── config.json  # 企微集成配置
└── logs/                # OpenClaw 日志目录
```

### 18.3 安装验证步骤

1. **命令验证**：执行 `openclaw --version` 检查是否成功安装
2. **目录检查**：验证安装目录和配置目录是否存在
3. **权限验证**：验证用户是否有读写权限
4. **命令测试**：执行 `openclaw --help` 检查命令是否可用

### 18.4 回滚策略

#### 18.4.1 快照备份

安装前创建当前环境快照：

```typescript
async function createSnapshot() {
  const snapshot = {
    timestamp: new Date().toISOString(),
    nodeVersion: (await exec('node --version')).stdout.trim(),
    npmVersion: (await exec('npm --version')).stdout.trim(),
    pnpmVersion: (await exec('pnpm --version')).stdout.trim(),
    gitVersion: (await exec('git --version')).stdout.trim(),
    globalPackages: JSON.parse((await exec('npm list -g --depth=0 --json')).stdout),
    openclawInstalled: await verifyOpenClaw()
  };

  // 保存快照到临时目录
  const snapshotPath = path.join(os.tmpdir(), `dclaw-snapshot-${Date.now()}.json`);
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

  return snapshotPath;
}
```

#### 18.4.2 失败回滚

安装失败时执行回滚操作：

```typescript
async function rollback(snapshotPath: string) {
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));

  // 如果之前没有安装 OpenClaw，则卸载
  if (!snapshot.openclawInstalled) {
    try {
      await exec('pnpm remove -g openclaw');
    } catch (error) {
      console.error('Failed to uninstall OpenClaw:', error);
    }
  }

  // 清理不完整的配置文件
  const configDir = path.join(os.homedir(), '.openclaw');
  if (fs.existsSync(configDir)) {
    const files = fs.readdirSync(configDir);
    for (const file of files) {
      const filePath = path.join(configDir, file);
      const stats = fs.statSync(filePath);
      // 删除安装后 1 小时内创建的文件（可能是安装过程中创建的）
      if (stats.isFile() && (Date.now() - stats.mtimeMs) < 3600000) {
        fs.unlinkSync(filePath);
      }
    }
  }

  return true;
}
```

#### 18.4.3 回滚验证

```typescript
async function verifyRollbackSuccess(originalSnapshot: any): Promise<boolean> {
  const currentSnapshot = {
    openclawInstalled: await verifyOpenClaw(),
    nodeVersion: (await exec('node --version')).stdout.trim(),
    npmVersion: (await exec('npm --version')).stdout.trim(),
    pnpmVersion: (await exec('pnpm --version')).stdout.trim(),
    gitVersion: (await exec('git --version')).stdout.trim()
  };

  // 验证 OpenClaw 安装状态
  if (originalSnapshot.openclawInstalled === false) {
    if (currentSnapshot.openclawInstalled !== false) {
      return false; // 回滚失败，OpenClaw 仍然安装中
    }
  }

  // 验证环境版本一致性
  if (currentSnapshot.nodeVersion !== originalSnapshot.nodeVersion) {
    console.warn('Node.js version changed during rollback');
  }

  // 验证全局包列表（简化验证）
  // 完整实现需要比较包列表

  // 验证配置文件完整性
  const configDir = path.join(os.homedir(), '.openclaw');
  if (fs.existsSync(configDir)) {
    const files = fs.readdirSync(configDir);
    // 如果之前没有安装，现在应该不存在配置文件
    if (!originalSnapshot.openclawInstalled && files.length > 0) {
      console.warn('Config files still exist after rollback');
    }
  }

  return true;
}
```

#### 18.4.4 权限处理

```typescript
async function checkPermissions() {
  const checks = {
    homeWrite: false,
    installWrite: false,
    canSudo: false
  };

  try {
    // 检查主目录写权限
    const testFile = path.join(os.homedir(), '.dclaw-permission-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    checks.homeWrite = true;
  } catch (error) {
    console.error('Home directory write permission denied:', error);
  }

  // 检查安装目录写权限
  try {
    const installDir = os.platform() === 'win32'
      ? path.join(os.localDataPath(), 'Programs')
      : '/usr/local/lib/node_modules';
    fs.accessSync(installDir, fs.constants.W_OK);
    checks.installWrite = true;
  } catch (error) {
    console.error('Install directory write permission denied:', error);
  }

  // 检查 sudo 权限（Linux/macOS）
  if (os.platform() !== 'win32') {
    try {
      await exec('sudo -n true');
      checks.canSudo = true;
    } catch (error) {
      console.warn('No sudo access');
    }
  }

  return checks;
}

// 在安装前检查权限并提示用户
async function verifyPermissionsBeforeInstall() {
  const permissions = await checkPermissions();

  if (!permissions.homeWrite) {
    throw new Error('主目录无写权限，请检查文件系统权限');
  }

  if (os.platform() !== 'win32' && !permissions.installWrite && !permissions.canSudo) {
    throw new Error('安装目录需要管理员权限，请使用 sudo 或以管理员身份运行');
  }

  return true;
}
```

---

## 19. Playwright 进程集成方式

### 19.1 启动流程

```
1. 渲染进程用户点击开始集成
   ↓
2. IPC 调用 channel:integrate:start
   ↓
3. 主进程创建子进程（独立进程运行 Playwright 服务）
   ↓
4. 主进程建立与子进程的 IPC 通道
   ↓
5. 子进程启动 Playwright 服务
   ↓
6. 子进程通过 IPC 将日志/进度发回主进程
   ↓
7. 主进程通过 WebSocket 推送到渲染进程
```

### 19.2 子进程与主进程通信

#### 19.2.1 通信模式说明

**主进程 → 子进程**：通过子进程 stdin 发送 JSON 格式命令
**子进程 → 主进程**：通过子进程 stdout 发送 JSON 格式消息
**主进程 → 前端**：通过 WebSocket 推送到渲染进程

**RESTful API 的用途**：供渲染进程直接调用后端服务，不涉及子进程通信

```typescript
// 主进程启动子进程
const playwrightProcess = spawn('node', ['playwright/service.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: path.join(__dirname, '..')
});

// 监听子进程消息
playwrightProcess.stdout.on('data', (data) => {
  try {
    const message = JSON.parse(data.toString());

    // 转发到 WebSocket Server
    wsServer.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  } catch (error) {
    console.error('Failed to parse subprocess message:', error);
  }
});

// 监听子进程错误
playwrightProcess.stderr.on('data', (data) => {
  console.error('Subprocess error:', data.toString());
});

// 发送控制命令到子进程
const sendCommandToSubprocess = (command: string, payload: any) => {
  playwrightProcess.stdin.write(JSON.stringify({
    command,
    payload,
    timestamp: Date.now()
  }) + '\n');
};
```

#### 19.2.2 命令协议定义

```typescript
// 主进程 → 子进程 命令格式
interface SubprocessCommand {
  command: 'start' | 'execute-wechat' | 'pause' | 'resume' | 'stop';
  payload?: any;
  timestamp: number;
}

// 子进程 → 主进程 消息格式
interface SubprocessMessage {
  type: 'log' | 'progress' | 'status' | 'error' | 'result';
  data: any;
  timestamp: number;
}
```

### 19.3 子进程独立运行

#### 19.3.1 启动时机

- 用户点击"开始集成"按钮时启动
- 渲染进程通过 `channel:integrate:start` IPC 通知主进程
- 主进程创建子进程并返回 taskId

#### 19.3.2 生命周期管理

```typescript
// 子进程退出处理
playwrightProcess.on('close', (code, signal) => {
  console.log(`Subprocess exited with code ${code}, signal ${signal}`);

  // 通知前端
  wsServer.clients.forEach(client => {
    client.send(JSON.stringify({
      type: 'status',
      data: {
        taskId,
        status: code === 0 ? 'completed' : 'failed'
      },
      timestamp: Date.now()
    }));
  });
});

// 窗口关闭时清理子进程
mainWindow.on('closed', () => {
  if (playwrightProcess && !playwrightProcess.killed) {
    playwrightProcess.kill('SIGTERM');
  }
});
```

#### 19.3.3 Playwright 服务与 Express 后端的区别

| 服务 | 类型 | 启动时机 | 用途 | 通信方式 |
|------|------|----------|------|----------|
| **Playwright 服务** | 子进程 | 用户开始集成时 | 执行浏览器自动化 | stdin/stdout + 主进程转发 |
| **Express 后端** | 独立进程 | 应用启动时 | 提供 API 和 WebSocket | HTTP/WebSocket |

---

## 20. WebSocket 生命周期管理

### 20.1 连接建立

```typescript
// 渲染进程 - 从预加载脚本获取后端 URL
const getBackendUrl = () => {
  // 优先使用预加载脚本提供的配置
  if (window.electron?.backendUrl) {
    return window.electron.backendUrl;
  }
  // 开发环境使用默认端口
  return 'ws://localhost:5173/ws';
};

const ws = new WebSocket(getBackendUrl());

ws.onopen = () => {
  console.log('WebSocket connected');
  // 发送连接确认
  ws.send(JSON.stringify({ type: 'connect', timestamp: Date.now() }));
};
```

### 20.2 重连策略

```typescript
class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;

  connect() {
    this.ws = new WebSocket('ws://localhost:PORT/ws');

    this.ws.onclose = () => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connect();
        }, this.reconnectDelay * this.reconnectAttempts);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }
}
```

### 20.3 心跳机制

```typescript
// 每 30 秒发送心跳
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
  }
}, 30000);

// 服务端响应心跳
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'pong') {
    // 心跳响应，连接正常
  }
};
```

### 20.4 错误处理

| 错误类型 | 处理方式 |
|---------|---------|
| 连接失败 | 自动重试 5 次，每次延迟加倍 |
| 心跳超时 | 断开连接并尝试重连 |
| 消息解析失败 | 记录错误日志，忽略该消息 |
| 网络中断 | 显示网络错误提示，暂停任务 |

---

## 21. Electron Forge 配置

### 21.1 forge.config.js

```javascript
module.exports = {
  packagerConfig: {
    name: 'Dclaw',
    executableName: 'dclaw',
    icon: './resources/icon',
    asar: true,
    ignore: [
      /^\/src/,
      /^\/.git/,
      /^\/docs/
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'Dclaw',
        authors: 'Dclaw Team',
        description: 'OpenClaw 自动安装部署工具',
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux']
    },
    {
      name: '@electron-forge/maker-deb',
      config: {}
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {}
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
    },
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './webpack.main.config.js',
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              name: 'main_window',
              html: './renderer/index.html',
              js: './renderer/src/index.tsx',
              preload: {
                js: './renderer/src/preload.ts'
              }
            }
          ]
        }
      }
    }
  ]
};
```

---

## 22. 配置文件示例

### 22.1 项目根目录 .eslintrc.js

```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier'
  ],
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-module-boundary-types': 'off'
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
};
```

### 22.2 项目根目录 .prettierrc.js

```javascript
module.exports = {
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 100,
  arrowParens: 'always',
  endOfLine: 'lf'
};
```

### 22.3 渲染进程 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["vite/client", "@types/node"]
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

### 22.4 主进程 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["node"],
    "outDir": "./dist"
  },
  "include": ["."],
  "exclude": ["node_modules", "renderer", "backend", "playwright"]
}
```

### 22.5 后端进程 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["node"],
    "outDir": "./dist"
  },
  "include": ["."],
  "exclude": ["node_modules", "main", "renderer", "playwright"]
}
```

---

## 23. 注册/登录页面设计

### 23.1 BrowserView 内嵌设计

注册页和登录页通过 BrowserView 内嵌方式展示：

```typescript
// 主进程
const mainWindow = new BrowserWindow({ ... });

// 创建 BrowserView
const browserView = new BrowserView({
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    preload: path.join(__dirname, 'preload-auth.js')
  }
});

// 设置内嵌页面
const embedView = (url: string, type: 'register' | 'login') => {
  browserView.webContents.loadURL(url);
  const bounds = mainWindow.getBounds();
  browserView.setBounds({
    x: 0,
    y: 80,
    width: bounds.width,
    height: bounds.height - 80
  });

  // 存储当前页面类型
  browserView.webContents.executeJavaScript(`
    window.authType = '${type}';
  `);
};

// 加载注册页
embedView('https://openclaw.ai/register', 'register');

// 加载登录页
embedView('https://openclaw.ai/login', 'login');
```

### 23.2 成功回调处理

#### 23.2.1 URL 变化检测

```typescript
// 监听导航事件（用于检测登录/注册成功）
browserView.webContents.on('did-navigate', (event, url) => {
  console.log('Navigated to:', url);

  // 成功标识：页面跳转到 Dashboard 或 Home 页面
  const successPatterns = ['/dashboard', '/home', '/workspace'];
  const isSuccess = successPatterns.some(pattern => url.includes(pattern));

  if (isSuccess) {
    // 登录/注册成功
    mainWindow.webContents.send('auth:success', {
      type: 'register', // 或 'login'
      url: url,
      timestamp: Date.now()
    });

    // 关闭 BrowserView
    mainWindow.setBrowserView(null);
  }
});

// 监听加载失败
browserView.webContents.on('did-fail-load', (event, errorCode, errorDescription, url) => {
  console.error('Page load failed:', errorCode, errorDescription);

  mainWindow.webContents.send('auth:error', {
    code: errorCode,
    message: errorDescription,
    url: url
  });
});
```

#### 23.2.2 IPC 事件处理

```typescript
// 渲染进程
import { useEffect } from 'react';

const useAuth = () => {
  const [authState, setAuthState] = useState({
    status: 'idle' as 'idle' | 'loading' | 'success' | 'error',
    error: null as string | null
  });

  useEffect(() => {
    const handleSuccess = (event: any, data: { type: string; url: string }) => {
      setAuthState({ status: 'success', error: null });
      // 可选：提取并存储认证 token
      const token = extractTokenFromUrl(data.url);
      localStorage.setItem('authToken', token);
    };

    const handleError = (event: any, data: { code: number; message: string }) => {
      setAuthState({ status: 'error', error: data.message });
    };

    window.electron.ipcRenderer.on('auth:success', handleSuccess);
    window.electron.ipcRenderer.on('auth:error', handleError);

    return () => {
      window.electron.ipcRenderer.removeListener('auth:success', handleSuccess);
      window.electron.ipcRenderer.removeListener('auth:error', handleError);
    };
  }, []);

  return authState;
};

// 从 URL 中提取 token 的辅助函数
function extractTokenFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('token') || urlObj.hash.match(/token=([^&]+)/)?.[1] || null;
  } catch (error) {
    return null;
  }
}
```

### 23.3 错误处理

```typescript
// 网络错误处理
browserView.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
  const errorMessages: Record<number, string> = {
    -2: '网络连接失败，请检查网络设置',
    -3: '无效的 URL 地址',
    -5: 'DNS 解析失败',
    -6: '服务器连接超时',
    -7: '服务器响应超时'
  };

  const message = errorMessages[errorCode] || `加载失败：${errorDescription}`;

  // 显示错误提示并允许重试
  mainWindow.webContents.send('auth:error', {
    code: errorCode,
    message,
    canRetry: true
  });
});

// 渲染进程重试逻辑
const AuthPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    // 重新加载页面
    window.electron.ipcRenderer.send('auth:reload');
  };

  return (
    <div>
      {error && (
        <Alert
          message="加载失败"
          description={error}
          type="error"
          action={<Button onClick={handleRetry}>重试</Button>}
        />
      )}
    </div>
  );
};
```

### 23.4 注册与登录区分

```typescript
// 主进程 IPC 处理
ipcMain.on('auth:open', (event, { type, url }) => {
  if (type === 'register') {
    embedView(url || 'https://openclaw.ai/register', 'register');
  } else if (type === 'login') {
    embedView(url || 'https://openclaw.ai/login', 'login');
  }
});

// 渲染进程调用
const openRegister = () => {
  window.electron.ipcRenderer.send('auth:open', { type: 'register' });
};

const openLogin = () => {
  window.electron.ipcRenderer.send('auth:open', { type: 'login' });
};
```

---

## 24. 启动 OpenClaw 功能设计

### 24.1 启动流程

```typescript
// 主进程
import { exec } from 'child_process';

function startOpenClaw(options: string[] = []): Promise<string> {
  return new Promise((resolve, reject) => {
    const command = 'openclaw';
    const args = ['dashboard', ...options];

    exec(`${command} ${args.join(' ')}`, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Failed to start OpenClaw: ${error.message}`));
        return;
      }

      // 从输出中提取 URL
      const urlMatch = stdout.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        resolve(urlMatch[0]);
      } else {
        reject(new Error('URL not found in output'));
      }
    });
  });
}

// IPC 处理
ipcMain.handle('openclaw:start', async (event, options) => {
  try {
    const url = await startOpenClaw(options);

    // 显示 URL 弹窗
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'OpenClaw Dashboard',
      message: 'OpenClaw Dashboard 已启动',
      detail: `访问地址：${url}`,
      buttons: ['打开浏览器', '关闭']
    });

    if (result.response === 0) {
      shell.openExternal(url);
    }

    return { success: true, url };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

---

## 25. 核心页面设计

### 25.1 首页（HomePage）

#### 25.1.1 页面布局

```
┌─────────────────────────────────────────────────────┐
│  Dclaw                                    [设置] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  欢迎使用 Dclaw                           │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │                                       │    │
│  │     🚀 开始安装                          │    │
│  │    自动安装 OpenClaw                      │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │                                       │    │
│  │     🔗 集成渠道                        │    │
│  │    配置消息渠道（企微等）                │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │                                       │    │
│  │     ⚙️  管理配置                       │    │
│  │    更新、卸载、启动 OpenClaw             │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 25.1.2 组件实现

```typescript
// renderer/src/pages/HomePage.tsx
import React from 'react';
import { Card, Typography } from 'antd';
import { RocketOutlined, LinkOutlined, SettingOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const cards = [
    {
      key: 'install',
      title: '开始安装',
      description: '自动安装 OpenClaw',
      icon: <RocketOutlined style={{ fontSize: 48, color: '#B8860B' }} />,
      action: () => navigate('/risk-warning')
    },
    {
      key: 'integrate',
      title: '集成渠道',
      description: '配置消息渠道（企微等）',
      icon: <LinkOutlined style={{ fontSize: 48, color: '#1890FF' }} />,
      action: () => navigate('/integrate-channels')
    },
    {
      key: 'manage',
      title: '管理配置',
      description: '更新、卸载、启动 OpenClaw',
      icon: <SettingOutlined style={{ fontSize: 48, color: '#52C41A' }} />,
      action: () => {/* 跳转到管理页或显示菜单 */}
    }
  ];

  return (
    <div style={{
      padding: '48px',
      minHeight: '100vh',
      background: '#F9F7F2'
    }}>
      <Title level={2} style={{ textAlign: 'center', marginBottom: '48px' }}>
        欢迎使用 Dclaw
      </Title>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        maxWidth: '960px',
        margin: '0 auto'
      }}>
        {cards.map(card => (
          <Card
            key={card.key}
            hoverable
            style={{
              textAlign: 'center',
              padding: '32px',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
            }}
            onClick={card.action}
          >
            <div style={{ marginBottom: '16px' }}>
              {card.icon}
            </div>
            <Title level={4} style={{ marginBottom: '8px' }}>
              {card.title}
            </Title>
            <Paragraph style={{ color: '#666', marginBottom: 0 }}>
              {card.description}
            </Paragraph>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
```

### 25.2 风险提示页（RiskWarningPage）

#### 25.2.1 页面布局

```
┌─────────────────────────────────────────────────────┐
│  风险提示                                   [X]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ⚠️  重要提示                                 │
│                                                     │
│  在开始安装之前，请仔细阅读以下内容：           │
│                                                     │
│  1. OpenClaw 是一个开发工具，将在您的系统中  │
│     安装依赖和配置文件                          │
│                                                     │
│  2. 安装过程可能需要管理员权限              │
│                                                     │
│  3. 安装完成后，OpenClaw 将在后台运行       │
│                                                     │
│  4. 我们不会收集您的任何个人数据                │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ ☐ 我已阅读并理解以上风险提示              │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  [上一步]           [我已了解，继续]                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 25.2.2 组件实现

```typescript
// renderer/src/pages/RiskWarningPage.tsx
import React, { useState } from 'react';
import { Alert, Button, Checkbox, Typography } from 'antd';
import { WarningOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

const RiskWarningPage: React.FC = () => {
  const [checked, setChecked] = useState(false);
  const navigate = useNavigate();

  const handleContinue = () => {
    if (checked) {
      navigate('/collect-info');
    }
  };

  return (
    <div style={{
      padding: '48px',
      minHeight: '100vh',
      background: '#F9F7F2'
    }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <Title level={3} style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <WarningOutlined style={{ color: '#FAAD14', fontSize: 32 }} />
          重要提示
        </Title>

        <Alert
          message="在开始安装之前，请仔细阅读以下内容："
          type="warning"
          style={{ marginBottom: '24px' }}
        />

        <Paragraph style={{ fontSize: '16px', lineHeight: '1.8', marginBottom: '32px' }}>
          <ol style={{ paddingLeft: '24px' }}>
            <li>OpenClaw 是一个开发工具，将在您的系统中安装依赖和配置文件</li>
            <li>安装过程可能需要管理员权限</li>
            <li>安装完成后，OpenClaw 将在后台运行</li>
            <li>我们不会收集您的任何个人数据</li>
          </ol>
        </Paragraph>

        <Checkbox
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          style={{ marginBottom: '32px', fontSize: '16px' }}
        >
          我已阅读并理解以上风险提示
        </Checkbox>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
          <Button onClick={() => navigate('/')}>
            上一步
          </Button>
          <Button
            type="primary"
            disabled={!checked}
            onClick={handleContinue}
          >
            我已了解，继续
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RiskWarningPage;
```

### 25.3 信息收集页（CollectInfoPage）

#### 25.3.1 页面布局

```
┌─────────────────────────────────────────────────────┐
│  收集信息                                   [X]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  为了优化安装体验，请提供以下信息（可选）：     │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ 企微用户名  [_________________]              │    │
│  │  （用于自动配置企微集成可见范围）        │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ 机器人名称   [Dclaw Bot____________]      │    │
│  │  （企微机器人的显示名称，默认：Dclaw Bot）│    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ 机器人简介   [智能助手______________]      │    │
│  │  （企微机器人的功能描述，可选）          │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ☐ 配置 AI 服务（可选，可跳过）               │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │  Zai API Key  [_________________]        │    │
│  └─────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────┐    │
│  │  Minimax API Key [_________________]      │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  [上一步]           [跳过，直接安装]          │
│                          [下一步，开始安装]            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 25.3.2 表单验证规则

| 字段 | 是否必填 | 验证规则 |
|------|----------|----------|
| **企微用户名** | 否 | 长度 2-32 字符，允许中文、字母、数字、下划线 |
| **机器人名称** | 否 | 长度 2-20 字符，默认值 "Dclaw Bot" |
| **机器人简介** | 否 | 长度 0-100 字符 |
| **Zai API Key** | 否 | 如果填写，需符合 Zai API Key 格式 |
| **Minimax API Key** | 否 | 如果填写，需符合 Minimax API Key 格式 |

#### 25.3.3 组件实现

```typescript
// renderer/src/pages/CollectInfoPage.tsx
import React, { useState } from 'react';
import { Form, Input, Button, Typography, Collapse } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { Panel } = Collapse;

interface CollectInfoForm {
  wechatUsername?: string;
  robotName: string;
  robotDescription?: string;
  zaiApiKey?: string;
  minimaxApiKey?: string;
  configureAiServices: boolean;
}

const CollectInfoPage: React.FC = () => {
  const [form] = Form.useForm<CollectInfoForm>();
  const navigate = useNavigate();

  const initialValues: CollectInfoForm = {
    robotName: 'Dclaw Bot',
    configureAiServices: false
  };

  const handleSubmit = async (values: CollectInfoForm) => {
    // 保存到本地存储
    localStorage.setItem('collectInfo', JSON.stringify(values));

    // 如果配置了 AI 服务，跳转到安装页
    // 否则也可以直接跳过，安装时使用默认配置
    navigate('/install');
  };

  const handleSkip = () => {
    // 使用默认配置跳转
    navigate('/install');
  };

  return (
    <div style={{
      padding: '48px',
      minHeight: '100vh',
      background: '#F9F7F2'
    }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <Title level={3} style={{ marginBottom: '24px' }}>
          收集信息
        </Title>

        <Paragraph style={{ marginBottom: '32px' }}>
          为了优化安装体验，请提供以下信息（可选）：
        </Paragraph>

        <Form
          form={form}
          initialValues={initialValues}
          onFinish={handleSubmit}
          layout="vertical"
        >
          <Form.Item
            label="企微用户名"
            name="wechatUsername"
            tooltip="用于自动配置企微集成可见范围"
            rules={[
              {
                validator: (_, value) => {
                  if (value && (value.length < 2 || value.length > 32)) {
                    return Promise.reject('长度需为 2-32 字符');
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <Input
              placeholder="请输入企微用户名"
              prefix={<InfoCircleOutlined />}
            />
          </Form.Item>

          <Form.Item
            label="机器人名称"
            name="robotName"
            tooltip="企微机器人的显示名称，默认：Dclaw Bot"
          >
            <Input placeholder="默认：Dclaw Bot" />
          </Form.Item>

          <Form.Item
            label="机器人简介"
            name="robotDescription"
            tooltip="企微机器人的功能描述，可选"
          >
            <Input.TextArea
              placeholder="请输入机器人简介（可选）"
              maxLength={100}
              rows={3}
            />
          </Form.Item>

          <Form.Item name="configureAiServices" valuePropName="checked">
            <Collapse
              ghost
              items={[
                {
                  key: 'ai-services',
                  label: '配置 AI 服务（可选）',
                  children: (
                    <div style={{ padding: '16px 0' }}>
                      <Paragraph style={{ marginBottom: '16px' }}>
                        配置 AI 服务可以增强 OpenClaw 的智能回复能力。
                        如果不配置，安装时将跳过此步骤。
                      </Paragraph>

                      <Form.Item
                        label="Zai API Key"
                        name="zaiApiKey"
                        style={{ marginBottom: '16px' }}
                      >
                        <Input.Password
                          placeholder="请输入 Zai API Key（可选）"
                        />
                      </Form.Item>

                      <Form.Item
                        label="Minimax API Key"
                        name="minimaxApiKey"
                      >
                        <Input.Password
                          placeholder="请输入 Minimax API Key（可选）"
                        />
                      </Form.Item>
                    </div>
                  )
                }
              ]}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
              <Button onClick={() => navigate('/risk-warning')}>
                上一步
              </Button>
              <div style={{ display: 'flex', gap: '16px' }}>
                <Button onClick={handleSkip}>
                  跳过，直接安装
                </Button>
                <Button type="primary" htmlType="submit">
                  下一步，开始安装
                </Button>
              </div>
            </div>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default CollectInfoPage;
```

---

## 26. 手动集成企微页面设计

### 26.1 页面布局

```
┌─────────────────────────────────────────────────────┐
│  企微集成 - 手动模式                      [返回]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  步骤 1：创建企微智能机器人                          │
│  ┌───────────────────────────────────────────────┐  │
│  │ 1. 访问企微管理后台                         │  │
│  │    [https://work.weixin.qq.com/]             │  │
│  │ 2. 点击【智能机器人】→【手动创建】           │  │
│  │ 3. 选择【API 模式创建】                     │  │
│  │ 4. 完善机器人信息（名称、简介）             │  │
│  │ 5. 配置可见范围                             │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  步骤 2：获取 BotId 和 Secret                      │
│  ┌───────────────────────────────────────────────┐  │
│  │ • 复制 BotId（页面右上角）                  │  │
│  │ • 点击【点击获取】获取 Secret                │  │
│  │ • 复制 Secret                               │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  步骤 3：提交信息                                  │
│  ┌───────────────────────────────────────────────┐  │
│  │  BotId:  [________________________]          │  │
│  │  Secret: [________________________]          │  │
│  │                                           │  │
│  │  [提交配置]  [取消]                        │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 26.2 表单组件设计

```typescript
// renderer/src/pages/channels/WechatManualPage.tsx
import React from 'react';
import { Form, Input, Button, Steps, Typography } from 'antd';

const { Step } = Steps;
const { Title, Paragraph, Text } = Typography;

const WechatManualPage: React.FC = () => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const steps = [
    { title: '创建机器人', content: '在企微管理后台创建智能机器人' },
    { title: '获取信息', content: '复制 BotId 和 Secret' },
    { title: '提交配置', content: '提交信息完成集成' }
  ];

  const handleSubmit = async (values: { botId: string; secret: string }) => {
    setLoading(true);
    try {
      // 调用 API 提交配置
      const response = await fetch('/api/channel/integrate/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'wechat',
          ...values
        })
      });

      const result = await response.json();
      if (result.success) {
        message.success('企微集成成功！');
        // 跳转到下一步或完成页面
      }
    } catch (error) {
      message.error('提交失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Title level={2}>企微集成 - 手动模式</Title>

      <Steps current={currentStep} style={{ marginBottom: '32px' }}>
        {steps.map((step, index) => (
          <Step key={index} title={step.title} description={step.content} />
        ))}
      </Steps>

      <div style={{ background: '#f5f5f0', padding: '24px', borderRadius: '8px', marginBottom: '24px' }}>
        <Paragraph>
          <Text strong>步骤 1：创建企微智能机器人</Text>
        </Paragraph>
        <Paragraph>
          1. 访问企微管理后台：
          <Text code>https://work.weixin.qq.com/</Text>
        </Paragraph>
        <Paragraph>2. 点击【智能机器人】→【手动创建】</Paragraph>
        <Paragraph>3. 选择【API 模式创建】</Paragraph>
        <Paragraph>4. 完善机器人信息（名称、简介）</Paragraph>
        <Paragraph>5. 配置可见范围</Paragraph>
      </div>

      <div style={{ background: '#f5f5f0', padding: '24px', borderRadius: '8px', marginBottom: '24px' }}>
        <Paragraph>
          <Text strong>步骤 2：获取 BotId 和 Secret</Text>
        </Paragraph>
        <Paragraph>• 复制 BotId（页面右上角）</Paragraph>
        <Paragraph>• 点击【点击获取】获取 Secret</Paragraph>
        <Paragraph>• 复制 Secret</Paragraph>
      </div>

      <div style={{ background: '#f5f5f0', padding: '24px', borderRadius: '8px' }}>
        <Paragraph>
          <Text strong>步骤 3：提交信息</Text>
        </Paragraph>
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            label="BotId"
            name="botId"
            rules={[{ required: true, message: '请输入 BotId' }]}
          >
            <Input placeholder="请输入企微机器人的 BotId" />
          </Form.Item>

          <Form.Item
            label="Secret"
            name="secret"
            rules={[{ required: true, message: '请输入 Secret' }]}
          >
            <Input.Password placeholder="请输入企微机器人的 Secret" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: '16px' }}>
              提交配置
            </Button>
            <Button onClick={() => navigate('/integrate-channels')}>
              取消
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default WechatManualPage;
```

### 26.3 表单验证规则

- **BotId**：必填，长度 32-64 字符，只允许字母、数字、横线
- **Secret**：必填，长度 32-64 字符，只允许字母、数字
- **提交后**：调用 API 验证 BotId 和 Secret 的有效性

---

## 27. OpenClaw CLI 命令说明

### 27.1 命令验证

本文档中引用的 OpenClaw CLI 命令需要根据实际 OpenClaw 版本进行验证。在实现时，如果发现命令不存在或语法不匹配，应采取以下策略：

1. **命令查询**：首先执行 `openclaw --help` 或 `openclaw help` 查看可用命令列表
2. **命令映射**：将文档中的命令映射到实际可用的命令
3. **降级处理**：如果命令不存在，通过手动编辑配置文件实现相同功能
4. **错误记录**：记录命令不存在或失败的情况，供后续文档更新

### 27.2 文档中的 CLI 命令

| 命令 | 用途 | 验证状态 |
|------|------|----------|
| `openclaw --version` | 检查安装版本 | 需验证 |
| `openclaw onboard --non-interactive --accept-risk ...` | 非交互式配置 | 需验证 |
| `openclaw channel:config wechat --bot-id ... --secret ...` | 配置企微渠道 | 需验证 |
| `openclaw channel:generate-match wechat` | 生成匹配码 | 需验证 |
| `openclaw channel:verify-status wechat` | 验证匹配码状态 | 需验证 |
| `openclaw dashboard` | 启动 Dashboard | 需验证 |

### 27.3 配置文件降级策略

如果 CLI 命令不可用，通过直接编辑配置文件实现：

```typescript
// 备选方案：直接编辑配置文件
async function configureChannelDirectly(channel: string, config: any) {
  const configPath = path.join(os.homedir(), '.openclaw', 'channels', channel, 'config.json');

  try {
    // 确保目录存在
    await fs.promises.mkdir(path.dirname(configPath), { recursive: true });

    // 写入配置
    await fs.promises.writeFile(
      configPath,
      JSON.stringify(config, null, 2),
      'utf-8'
    );

    return { success: true };
  } catch (error) {
    console.error('Failed to write config file:', error);
    return { success: false, error: error.message };
  }
}
```

---

## 28. 架构边界与进程管理

### 28.1 进程职责与边界

#### 28.1.1 Electron 主进程

**职责：**
- 窗口管理和生命周期控制
- IPC 事件分发和处理
- 子进程创建和管理（Playwright 服务）
- 系统级资源访问（文件系统、系统命令）

**边界：**
- 不直接处理业务逻辑（业务逻辑由后端/子进程处理）
- 不存储业务数据（数据存储由后端处理）
- 通过 IPC 与渲染进程通信

**启动时机：** 应用启动时启动

#### 28.1.2 渲染进程

**职责：**
- UI 渲染和用户交互
- 状态管理（Zustand）
- 调用 API 和 WebSocket
- 显示实时日志和进度

**边界：**
- 不直接访问文件系统（通过 API 间接访问）
- 不执行系统命令（通过 IPC/API 间接调用）
- 只运行在沙箱环境中

**启动时机：** 主进程创建窗口时启动

#### 28.1.3 Express 后端进程

**职责：**
- 提供 RESTful API 端点
- 管理 WebSocket 连接
- 读写 OpenClaw 配置文件
- 读写日志文件

**边界：**
- 不执行浏览器自动化（由 Playwright 服务处理）
- 不直接管理窗口（由主进程处理）
- 独立运行，可通过 HTTP/WebSocket 访问

**启动时机：** 主进程启动后立即启动

#### 28.1.4 Playwright 服务进程

**职责：**
- 执行浏览器自动化脚本
- 操作 DOM 元素
- 捕获页面信息（BotId、Secret）
- 通过 stdin/stdout 与主进程通信

**边界：**
- 不直接与前端通信（通过主进程转发）
- 不存储业务数据
- 按需创建和销毁

**启动时机：** 用户开始集成时由主进程创建

### 28.2 共享类型定义

为了保持跨进程类型一致性，使用 `shared/types` 目录：

```typescript
// shared/types/index.ts
export interface InstallConfig {
  os: string;
  installDir?: string;
}

export interface ChannelIntegrationConfig {
  channel: 'wechat' | 'telegram' | 'discord';
  mode: 'auto' | 'manual';
  botId?: string;
  secret?: string;
}

export interface TaskStatus {
  taskId: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message: string;
}

// 企微集成配置（Playwright 自动化使用）
export interface WechatConfig {
  wechatUrl: string;
  robotName?: string;
  description?: string;
  username?: string;
}
```

### 28.3 进程启动顺序

```
1. 用户启动应用
   ↓
2. Electron 主进程启动
   ↓
3. 主进程创建渲染进程
   ↓
4. 主进程启动 Express 后端
   ↓
5. Express 后端启动 WebSocket Server
   ↓
6. 渲染进程加载完成，连接 WebSocket
   ↓
7. 应用进入就绪状态
   ↓
8. 用户开始集成时 → 主进程创建 Playwright 子进程
```

---

## 29. MVP 范围定义

### 29.1 MVP 核心功能（必须）

| 功能模块 | 具体内容 | 优先级 |
|---------|----------|--------|
| **基础框架** | Electron + React + Express 架构 | P0 |
| **OpenClaw 安装** | 环境检测、自动安装、配置 | P0 |
| **企微集成** | 自动模式（10 步骤）+ 手动模式 | P0 |
| **日志展示** | 实时日志面板 + 进度显示 | P0 |
| **错误处理** | 关键错误提示 + 用户取消机制 | P0 |

### 29.2 MVP 辅助功能（重要）

| 功能模块 | 具体内容 | 优先级 |
|---------|----------|--------|
| **启动 OpenClaw** | Dashboard URL 提取和跳转 | P1 |
| **注册/登录** | BrowserView 内嵌 + 成功回调 | P1 |
| **更新功能** | 检测更新并执行更新 | P2 |
| **卸载功能** | 清理所有 OpenClaw 相关文件 | P2 |

### 29.3 MVP 暂不包含（延后）

| 功能模块 | 原因 |
|---------|------|
| **会话管理** | 需要更复杂的架构设计 |
| **定时计划** | 不属于核心安装部署功能 |
| **空间管理** | 需要独立的文件管理模块 |
| **自动更新** | 需要版本管理服务器 |

### 29.4 MVP 验收标准

1. **功能完整性**
   - [ ] 用户能够在空白系统上成功安装 OpenClaw
   - [ ] 用户能够完成企微集成（自动或手动）
   - [ ] 用户能够启动 OpenClaw Dashboard

2. **用户体验**
   - [ ] 所有操作有清晰的进度反馈
   - [ ] 错误信息易于理解
   - [ ] 用户能够随时取消操作

3. **稳定性**
   - [ ] 空白系统安装成功率 ≥ 95%
   - [ ] 企微集成成功率 ≥ 90%
   - [ ] 应用崩溃率 < 1%

4. **性能**
   - [ ] 应用启动时间 < 3 秒
   - [ ] 安装时间 < 5 分钟（正常网络）
   - [ ] 日志实时更新延迟 < 100ms

---

## 30. 配置管理

### 30.1 后端端口配置

后端默认监听端口为 `5173`，可通过环境变量覆盖：

```typescript
// backend/index.ts
const DEFAULT_PORT = 5173;
const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT || String(DEFAULT_PORT), 10);

app.listen(BACKEND_PORT, () => {
  console.log(`Backend server listening on port ${BACKEND_PORT}`);
});
```

### 30.2 主进程启动后端实现

```typescript
// main/index.ts
import { spawn, ChildProcess } from 'child_process';
import net from 'net';
import path from 'path';

class BackendManager {
  private backendProcess: ChildProcess | null = null;
  private readonly DEFAULT_PORT = 5173;
  private readonly PORT_RANGE = { min: 5173, max: 5180 };

  // 检查端口是否可用
  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise(resolve => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(port, '127.0.0.1');
    });
  }

  // 查找可用端口
  private async findAvailablePort(): Promise<number> {
    for (let port = this.DEFAULT_PORT; port <= this.PORT_RANGE.max; port++) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
    }
    throw new Error(`No available port in range ${this.PORT_RANGE.min}-${this.PORT_RANGE.max}`);
  }

  startBackend() {
    return this.findAvailablePort().then(async (port) => {
      const backendPath = path.join(__dirname, '..', 'backend');
      const entryFile = path.join(backendPath, 'dist', 'index.js');

      console.log(`Starting backend on port ${port}`);

      this.backendProcess = spawn('node', [entryFile], {
        cwd: backendPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: process.env.NODE_ENV || 'development',
          BACKEND_PORT: String(port)
        }
      });

      this.backendProcess.stdout.on('data', (data) => {
        console.log(`[Backend] ${data}`);
      });

      this.backendProcess.stderr.on('data', (data) => {
        console.error(`[Backend Error] ${data}`);
      });

      this.backendProcess.on('close', (code) => {
        console.log(`Backend process exited with code ${code}`);
      });

      // 保存端口到配置供前端使用
      // 见第 30.3 节预加载脚本

      return port;
    }).catch(error => {
      console.error('Failed to start backend:', error);
      throw error;
    });
  }

  stopBackend() {
    if (this.backendProcess) {
      this.backendProcess.kill('SIGTERM');
      this.backendProcess = null;
    }
  }
}

const backendManager = new BackendManager();
backendManager.startBackend().then(port => {
  console.log(`Backend started successfully on port ${port}`);
}).catch(error => {
  console.error('Failed to start backend:', error);
  // 通知用户无法启动后端
});

// 主窗口关闭时停止后端
app.on('window-all-closed', () => {
  backendManager.stopBackend();
});
```

### 30.3 前端发现后端地址

前端通过预加载脚本从主进程获取后端地址：

```typescript
// renderer/src/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

// 获取后端配置（包括动态分配的端口）
const getBackendConfig = async () => {
  try {
    const config = await ipcRenderer.invoke('backend:get-config');
    return config;
  } catch (error) {
    // 开发环境使用默认值
    return {
      wsUrl: 'ws://localhost:5173/ws',
      apiUrl: 'http://localhost:5173/api'
    };
  }
};

contextBridge.exposeInMainWorld('electron', {
  getBackendConfig,

  ipc: {
    send: (channel: string, data: any) => ipcRenderer.send(channel, data),
    on: (channel: string, callback: (...args: any[]) => void) => {
      const subscription = (_event: any, ...args: any[]) => callback(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    },
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args)
  }
});

// TypeScript 类型声明
export interface BackendConfig {
  wsUrl: string;
  apiUrl: string;
}

export interface ElectronAPI {
  getBackendConfig: () => Promise<BackendConfig>;
  ipc: {
    send: (channel: string, data: any) => void;
    on: (channel: string, callback: (...args: any[]) => void) => () => void;
    invoke: (channel: string, ...args: any[]) => Promise<any>;
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
```

#### 30.3.1 主进程 IPC 处理

```typescript
// main/ipc/handlers.ts
import { ipcMain } from 'electron';

let backendConfig: BackendConfig | null = null;

// 设置后端配置（由 BackendManager 调用）
export const setBackendConfig = (config: BackendConfig) => {
  backendConfig = config;
};

// 注册 IPC 处理器
export const registerIpcHandlers = () => {
  // 前端请求后端配置
  ipcMain.handle('backend:get-config', () => {
    if (!backendConfig) {
      throw new Error('Backend not configured');
    }
    return backendConfig;
  });
};
```

### 30.4 Webpack 配置文件

#### 30.4.1 webpack.main.config.js

```javascript
const path = require('path');

module.exports = {
  target: 'electron-main',
  entry: './main/index.ts',
  output: {
    path: path.join(__dirname, 'dist/main'),
    filename: 'index.js'
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.join(__dirname, 'shared')
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  node: {
    __dirname: false,
    __filename: false
  }
};
```

#### 30.4.2 webpack.renderer.config.js

```javascript
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  target: 'electron-renderer',
  entry: {
    main_window: './renderer/src/index.tsx'
  },
  output: {
    path: path.join(__dirname, 'dist/renderer'),
    filename: '[name].js'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.join(__dirname, 'shared'),
      '@components': path.join(__dirname, 'renderer/src/components'),
      '@pages': path.join(__dirname, 'renderer/src/pages')
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        type: 'asset/resource'
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './renderer/index.html',
      filename: 'index.html',
      chunks: ['main_window']
    })
  ]
};
```

---

## 附录：参考文档

- OpenClaw 官方文档：https://docs.openclaw.ai
- Electron 官方文档：https://www.electronjs.org/docs
- React 官方文档：https://react.dev
- Ant Design 官方文档：https://ant.design
- Playwright 官方文档：https://playwright.dev
