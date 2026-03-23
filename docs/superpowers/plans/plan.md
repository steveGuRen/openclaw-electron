# Dclaw 实现计划

## Goal

为 Dclaw 创建一个完整的实现计划，将 OpenClaw 桌面安装部署工具从设计文档转换为可执行的开发任务。

## Architecture

### 进程架构
```
┌─────────────────────────────────────────────────────────────┐
│                    Electron 主进程                        │
│  - 窗口管理、IPC 事件分发、子进程管理                   │
└─────────────┬─────────────────┬───────────────────────┘
              │                 │
              ▼                 ▼
┌──────────────────┐   ┌──────────────────────────────────┐
│  渲染进程        │   │  Express 后端进程               │
│  (React + TS)   │   │  - RESTful API                 │
│  - UI 渲染      │◄──┤  - WebSocket 服务              │
│  - 状态管理      │   │  - 配置文件读写                │
└──────────────────┘   └──────────────────────────────────┘
                                    │
                                    ▼
                            ┌───────────────────┐
                            │ Playwright 服务    │
                            │ (子进程，按需)    │
                            │ - 浏览器自动化    │
                            └───────────────────┘
```

### 技术栈
- **前端**: React 18 + TypeScript + Vite + Ant Design + Zustand
- **桌面**: Electron 30 + Electron Forge
- **后端**: Express.js + WebSocket + TypeScript
- **自动化**: Playwright (子进程独立运行)
- **构建**: Webpack + Electron Forge
- **开发工具**: ESLint + Prettier + Husky + Jest

## File Structure Mapping

```
dclaw/
├── main/                           # Electron 主进程
│   ├── index.ts                     # 应用入口
│   ├── window/                     # 窗口管理
│   │   ├── index.ts                # 窗口创建和配置
│   │   └── browser-view.ts         # BrowserView 管理（注册/登录）
│   ├── ipc/                        # IPC 处理
│   │   ├── handlers.ts             # IPC 事件注册
│   │   ├── install.ts              # 安装相关 IPC
│   │   ├── channel.ts             # 渠道集成相关 IPC
│   │   └── openclaw.ts          # OpenClaw 管理 IPC
│   ├── backend-manager.ts           # 后端进程管理
│   ├── playwright-manager.ts        # Playwright 子进程管理
│   ├── timeout-manager.ts          # 超时管理
│   └── tsconfig.json             # TS 配置
│
├── renderer/                      # 渲染进程
│   ├── index.html                 # HTML 模板
│   ├── src/
│   │   ├── index.tsx              # React 入口
│   │   ├── preload.ts             # 预加载脚本
│   │   ├── App.tsx               # 根组件
│   │   ├── components/            # 共享组件
│   │   │   ├── LogPanel.tsx      # 日志面板
│   │   │   ├── ProgressBar.tsx   # 进度条
│   │   │   ├── Header.tsx        # 页头
│   │   │   └── index.ts         # 组件导出
│   │   ├── pages/               # 页面组件
│   │   │   ├── HomePage.tsx              # 首页
│   │   │   ├── RiskWarningPage.tsx       # 风险提示页
│   │   │   ├── CollectInfoPage.tsx       # 信息收集页
│   │   │   ├── InstallPage.tsx           # 安装页
│   │   │   ├── IntegrateChannelsPage.tsx # 渠道集成选择页
│   │   │   ├── channels/               # 渠道集成页面
│   │   │   │   ├── WechatAutoPage.tsx   # 企微自动模式
│   │   │   │   └── WechatManualPage.tsx # 企微手动模式
│   │   │   ├── ManagePage.tsx           # 管理页面
│   │   │   │   ├── UpdatePage.tsx       # 更新页
│   │   │   │   ├── UninstallPage.tsx     # 卸载页
│   │   │   │   └── StartPage.tsx        # 启动页
│   │   │   ├── auth/                   # 认证页面
│   │   │   │   ├── RegisterPage.tsx     # 注册页（BrowserView）
│   │   │   │   └── LoginPage.tsx        # 登录页（BrowserView）
│   │   │   └── index.ts               # 页面导出
│   │   ├── hooks/               # 自定义 Hooks
│   │   │   ├── useWebSocket.ts          # WebSocket 连接
│   │   │   ├── useInstallStatus.ts      # 安装状态
│   │   │   ├── useChannelStatus.ts      # 渠道集成状态
│   │   │   └── index.ts
│   │   ├── store/               # Zustand 状态
│   │   │   ├── appStore.ts              # 应用状态
│   │   │   ├── installStore.ts          # 安装状态
│   │   │   └── index.ts
│   │   ├── utils/               # 工具函数
│   │   │   ├── api.ts                   # API 调用封装
│   │   │   ├── validation.ts            # 表单验证
│   │   │   └── index.ts
│   │   └── styles/              # 全局样式
│   │       ├── global.css               # 全局样式
│   │       └── theme.ts                # Ant Design 主题
│   ├── vite.config.ts            # Vite 配置
│   └── tsconfig.json             # TS 配置
│
├── backend/                       # Express 后端
│   ├── src/
│   │   ├── index.ts               # 服务器入口
│   │   ├── api/                  # API 路由
│   │   │   ├── install.ts         # 安装 API
│   │   │   ├── channel.ts        # 渠道集成 API
│   │   │   ├── openclaw.ts       # OpenClaw 管理 API
│   │   │   └── index.ts
│   │   ├── websocket/            # WebSocket 服务
│   │   │   ├── server.ts         # WS 服务器
│   │   │   ├── manager.ts        # 连接管理
│   │   │   └── index.ts
│   │   ├── services/             # 业务逻辑
│   │   │   ├── install.ts        # 安装服务
│   │   │   ├── channel.ts        # 渠道集成服务
│   │   │   ├── openclaw.ts       # OpenClaw CLI 调用
│   │   │   └── index.ts
│   │   ├── utils/               # 工具函数
│   │   │   ├── logger.ts         # 日志管理
│   │   │   ├── task-manager.ts   # 任务管理
│   │   │   └── index.ts
│   │   └── config/              # 配置
│   │       ├── ports.ts          # 端口配置
│   │       └── index.ts
│   └── tsconfig.json
│
├── playwright/                    # Playwright 服务（子进程）
│   ├── index.ts                 # 子进程入口
│   ├── service.ts               # Playwright 服务类
│   ├── wechat/                 # 企微自动化脚本
│   │   ├── auto-mode.ts         # 自动模式
│   │   └── steps.ts           # 自动化步骤
│   ├── utils/
│   │   ├── retry.ts           # 重试机制
│   │   └── index.ts
│   └── tsconfig.json
│
├── shared/                       # 共享代码
│   ├── types/                  # 类型定义
│   │   ├── index.ts           # 主类型导出
│   │   ├── api.ts             # API 类型
│   │   ├── task.ts            # 任务类型
│   │   ├── channel.ts         # 渠道类型
│   │   └── install.ts         # 安装类型
│   ├── constants/              # 常量
│   │   ├── index.ts
│   │   ├── errors.ts         # 错误码
│   │   ├── timeouts.ts       # 超时时长
│   │   └── config.ts        # 配置常量
│   └── utils/                # 共享工具
│       └── index.ts
│
├── resources/                    # 资源文件
│   └── icon/                 # 应用图标
│
├── docs/                       # 文档
│   └── superpowers/
│       ├── specs/             # 设计文档
│       └── plans/             # 实现计划
│
├── forge.config.js              # Electron Forge 配置
├── package.json               # 项目配置
├── .eslintrc.js             # ESLint 配置
├── .prettierrc.js           # Prettier 配置
├── tsconfig.json             # 根 TS 配置
├── .gitignore               # Git 忽略
└── README.md               # 项目说明
```

## Chunk 1: 项目初始化和 Electron 主进程

### 1.1 项目初始化

- [ ] 创建项目根目录结构
- [ ] 初始化 package.json，添加基本依赖
- [ ] 配置 TypeScript（根 tsconfig.json）
- [ ] 配置 ESLint（.eslintrc.js）
- [ ] 配置 Prettier（.prettierrc.js）
- [ ] 创建 .gitignore 文件
- [ ] 初始化 Git 仓库

### 1.2 Electron 主进程基础

- [ ] 创建 main/index.ts 主进程入口
- [ ] 配置 Electron 应用基本设置
- [ ] 实现应用生命周期处理
- [ ] 创建 main/tsconfig.json
- [ ] 配置 Webpack（webpack.main.config.js）

### 1.3 窗口管理

- [ ] 创建 main/window/index.ts 窗口管理模块
- [ ] 实现主窗口创建逻辑
- [ ] 配置窗口尺寸和属性
- [ ] 实现窗口关闭事件处理
- [ ] 创建 main/window/browser-view.ts BrowserView 管理
- [ ] 实现 BrowserView 加载和显示逻辑

### 1.4 IPC 处理器框架

- [ ] 创建 main/ipc/handlers.ts IPC 注册模块
- [ ] 实现 IPC 处理器注册函数
- [ ] 创建 main/ipc/install.ts 安装 IPC 预留
- [ ] 创建 main/ipc/channel.ts 渠道 IPC 预留
- [ ] 创建 main/ipc/openclaw.ts OpenClaw IPC 预留

### 1.5 后端进程管理

- [ ] 创建 main/backend-manager.ts 后端管理器
- [ ] 实现端口检查函数
- [ ] 实现可用端口查找
- [ ] 实现后端进程启动
- [ ] 实现后端进程停止
- [ ] 实现 IPC 处理器：backend:get-config

### 1.6 Playwright 进程管理

- [ ] 创建 main/playwright-manager.ts Playwright 管理器
- [ ] 实现子进程创建逻辑
- [ ] 实现 stdin 命令发送
- [ ] 实现 stdout 消息接收
- [ ] 实现子进程清理

### 1.7 超时管理

- [ ] 创建 main/timeout-manager.ts 超时管理器
- [ ] 实现 setTimeout 函数
- [ ] 实现 clearTimeout 函数
- [ ] 实现clearAll 函数

### 1.8 Electron Forge 配置

- [ ] 创建 forge.config.js
- [ ] 配置 packager 选项
- [ ] 配置 makers（Windows、macOS、Linux）
- [ ] 配置 webpack 插件
- [ ] 配置 webpack.main.config.js
- [ ] 配置 webpack.renderer.config.js

### 1.9 测试主进程

- [ ] 测试应用启动
- [ ] 测试窗口显示
- [ ] 测试后端进程启动
- [ ] 测试 IPC 通信

## Chunk 2: Express 后端框架

### 2.1 后端目录结构和配置

- [ ] 创建 backend/src 目录结构
- [ ] 创建 backend/tsconfig.json
- [ ] 创建 backend/src/config/index.ts 配置入口
- [ ] 创建 backend/src/config/ports.ts 端口配置

### 2.2 Express 服务器基础

- [ ] 创建 backend/src/index.ts 服务器入口
- [ ] 实现 Express 应用初始化
- [ ] 配置 CORS 中间件
- [ ] 配置 JSON 解析中间件
- [ ] 实现端口监听启动
- [ ] 实现 Graceful Shutdown

### 2.3 WebSocket 服务器

- [ ] 创建 backend/src/websocket/server.ts WS 服务器
- [ ] 实现 WebSocket 连接处理
- [ ] 实现消息广播功能
- [ ] 创建 backend/src/websocket/manager.ts 连接管理器
- [ ] 实现客户端注册和注销
- [ ] 实现心跳检测机制
- [ ] 实现连接超时处理
- [ ] 创建 backend/src/websocket/index.ts 导出

### 2.4 API 路由框架

- [ ] 创建 backend/src/api/index.ts 路由入口
- [ ] 实现 API 路由聚合
- [ ] 创建 backend/src/api/install.ts 安装路由预留
- [ ] 创建 backend/src/api/channel.ts 渠道路由预留
- [ ] 创建 backend/src/api/openclaw.ts OpenClaw 路由预留

### 2.5 工具函数

- [ ] 创建 backend/src/utils/index.ts
- [ ] 创建 backend/src/utils/logger.ts 日志工具
- [ ] 实现日志级别控制
- [ ] 实现日志文件轮转
- [ ] 创建 backend/src/utils/task-manager.ts 任务管理器
- [ ] 实现任务 ID 生成
- [ ] 实现任务状态存储
- [ ] 实现任务查询接口

### 2.6 OpenClaw CLI 服务

- [ ] 创建 backend/src/services/index.ts
- [ ] 创建 backend/src/services/openclaw.ts OpenClaw 服务
- [ ] 实现 execPromise 包装函数
- [ ] 实现 openclaw --version 调用
- [ ] 实现 openclaw --help 调用
- [ ] 实现命令输出解析

### 2.7 测试后端框架

- [ ] 测试后端启动
- [ ] 测试 WebSocket 连接
- [ ] 测试消息广播
- [ ] 测试 API 响应

---

## Chunk 8: 共享类型和常量

### 8.1 共享类型定义

- [ ] 创建 shared/types/index.ts
- [ ] 创建 shared/types/api.ts
- [ ] 定义 BackendConfig 接口
- [ ] 定义 InstallConfig 接口
- [ ] 定义 InstallStatus 接口
- [ ] 定义 ChannelIntegrationConfig 接口
- [ ] 定义 TaskStatus 接口
- [ ] 定义 WechatConfig 接口

### 8.2 任务相关类型

- [ ] 创建 shared/types/task.ts
- [ ] 定义 TaskId 类型
- [ ] 定义 TaskPhase 类型
- [ ] 定义 TaskMessage 接口
- [ ] 导出类型

### 8.3 渠道相关类型

- [ ] 创建 shared/types/channel.ts
- [ ] 定义 ChannelType 类型
- [ ] 定义 ChannelMode 类型
- [ ] 定义 ChannelCredential 接口
- [ ] 导出类型

### 8.4 安装相关类型

- [ ] 创建 shared/types/install.ts
- [ ] 定义 EnvironmentCheck 接口
- [ ] 定义 InstallStep 类型
- [ ] 导出类型

### 8.5 错误码常量

- [ ] 创建 shared/constants/errors.ts
- [ ] 定义 E001 任务不存在
- [ ] 定义 E002 任务已取消
- [ ] 定义 E003 环境检测失败
- [ ] 定义 E004 安装失败
- [ ] 定义 E005 网络错误
- [ ] 定义 E006 参数错误
- [ ] 定义 E007 OpenClaw 未安装
- [ ] 定义 E008 超时
- [ ] 导出错误码映射

### 8.6 超时常量

- [ ] 创建 shared/constants/timeouts.ts
- [ ] 定义 INSTALL_TIMEOUT（30分钟）
- [ ] 定义 CHANNEL_INTEGRATION_TIMEOUT（15分钟）
- [ ] 定义 MATCH_CODE_TIMEOUT（10分钟）
- [ ] 定义 HEARTBEAT_INTERVAL（30秒）
- [ ] 导出超时常量

### 8.7 配置常量

- [ ] 创建 shared/constants/config.ts
- [ ] 定义 DEFAULT_BACKEND_PORT（5173）
- [ ] 定义 PORT_RANGE（5173-5180）
- [ ] 定义 DEFAULT_ROBOT_NAME（Dclaw Bot）
- [ ] 定义 LOG_MAX_FILES（5）
- [ ] 定义 WS_RECONNECT_ATTEMPTS（5）
- [ ] 导出配置常量

### 8.8 共享工具

- [ ] 创建 shared/utils/index.ts
- [ ] 实现 generateTaskId 函数
- [ ] 实现 formatError 函数
- [ ] 实现 sanitizeInput 函数
- [ ] 导出工具函数

---

## 总结

### 优先级说明

- **P0（必须）**: Chunk 1-5，保证核心安装流程可用
- **P1（重要）**: Chunk 6 企微集成，完成 MVP 核心功能
- **P2（延后）**: Chunk 7 辅助功能，可根据时间安排

### 开发顺序建议

1. **阶段 1（Chunk 1-2）**: 基础设施搭建（3-5天）
2. **阶段 2（Chunk 3-4）**: 渲染进程和核心页面（3-4天）
3. **阶段 3（Chunk 5）**: OpenClaw 安装逻辑（5-7天）
4. **阶段 4（Chunk 6）**: 企微集成功能（7-10天）
5. **阶段 5（Chunk 7-8）**: 辅助功能和收尾（3-5天）

### MVP 验收标准

- [x] 用户能够在空白系统上成功安装 OpenClaw
- [x] 用户能够完成企微集成（自动或手动）
- [x] 用户能够启动 OpenClaw Dashboard
- [x] 所有操作有清晰的进度反馈
- [x] 错误信息易于理解
- [x] 用户能够随时取消操作

### 参考文档

- 设计文档: `docs/superpowers/specs/2026-03-13-dclaw-design.md`
- Electron 文档: https://www.electronjs.org/docs
- React 文档: https://react.dev
- Ant Design: https://ant.design
- Playwright: https://playwright.dev
## Chunk 7: 辅助功能（更新、卸载、启动、认证）

### 7.1 管理页面 ManagePage

- [ ] 创建 renderer/src/pages/ManagePage.tsx
- [ ] 实现功能菜单展示
- [ ] 显示 OpenClaw 状态
- [ ] 添加启动按钮
- [ ] 添加更新按钮
- [ ] 添加卸载按钮
- [ ] 添加注册/登录入口
- [ ] 配置页面路由

### 7.2 更新页面 UpdatePage

- [ ] 创建 renderer/src/pages/ManagePage/UpdatePage.tsx
- [ ] 实现当前版本显示
- [ ] 实现检查更新按钮
- [ ] 实现更新进度显示
- [ ] 集成 LogPanel 组件
- [ ] 实现更新成功提示
- [ ] 添加返回按钮
- [ ] 配置页面路由

### 7.3 卸载页面 UninstallPage

- [ ] 创建 renderer/src/pages/ManagePage/UninstallPage.tsx
- [ ] 实现卸载确认对话框
- [ ] 列出将要删除的文件
- [ ] 实现卸载进度显示
- [ ] 集成 LogPanel 组件
- [ ] 实现卸载完成提示
- [ ] 添加返回按钮
- [ ] 配置页面路由

### 7.4 启动页面 StartPage

- [ ] 创建 renderer/src/pages/ManagePage/StartPage.tsx
- [ ] 实现 Dashboard URL 显示
- [ ] 实现启动按钮
- [ ] 实现打开浏览器按钮
- [ ] 实现状态提示
- [ ] 添加返回按钮
- [ ] 配置页面路由

### 7.5 注册页面 RegisterPage（BrowserView）

- [ ] 创建 renderer/src/pages/auth/RegisterPage.tsx
- [ ] 实现加载状态显示
- [ ] 添加返回按钮
- [ ] 实现成功跳转处理
- [ ] 实现错误提示
- [ ] 配置页面路由

### 7.6 登录页面 LoginPage（BrowserView）

- [ ] 创建 renderer/src/pages/auth/LoginPage.tsx
- [ ] 实现加载状态显示
- [ ] 添加返回按钮
- [ ] 实现成功跳转处理
- [ ] 实现错误提示
- [ ] 配置页面路由

### 7.7 BrowserView 管理

- [ ] 完善 main/window/browser-view.ts
- [ ] 实现 embedView 函数（加载URL）
- [ ] 实现 did-navigate 事件监听
- [ ] 实现成功跳转检测
- [ ] 实现 did-fail-load 错误处理
- [ ] 实现 auth:success IPC 发送
- [ ] 实现 auth:error IPC 发送
- [ ] 实现 BrowserView 清理

### 7.8 OpenClaw 管理服务

- [ ] 完善 backend/src/services/openclaw.ts
- [ ] 实现 checkUpdate 函数
- [ ] 实现 updateOpenClaw 函数
- [ ] 实现 uninstallOpenClaw 函数
- [ ] 实现 startDashboard 函数
- [ ] 实现 extractDashboardUrl 函数

### 7.9 OpenClaw 管理 API 路由

- [ ] 完善 backend/src/api/openclaw.ts
- [ ] 实现 GET /api/openclaw/config 端点
- [ ] 实现 POST /api/openclaw/start 端点
- [ ] 实现 POST /api/openclaw/update 端点
- [ ] 实现 POST /api/openclaw/uninstall 端点
- [ ] 添加错误码处理

### 7.10 OpenClaw 管理 IPC 处理

- [ ] 完善 main/ipc/openclaw.ts
- [ ] 实现 openclaw:config IPC 处理
- [ ] 实现 openclaw:start IPC 处理
- [ ] 实现 openclaw:update IPC 处理
- [ ] 实现 openclaw:uninstall IPC 处理
- [ ] 实现 auth:open IPC 处理（注册/登录）

### 7.11 测试辅助功能

- [ ] 测试更新功能
- [ ] 测试卸载功能
- [ ] 测试启动 Dashboard
- [ ] 测试 BrowserView 加载
- [ ] 测试认证成功回调

### 7.12 页面导出

- [ ] 完善 renderer/src/pages/index.ts
- [ ] 导出 ManagePage 及子页面
- [ ] 导出 RegisterPage
- [ ] 导出 LoginPage

---
## Chunk 6: 企微集成页面

### 6.1 渠道集成选择页

- [ ] 创建 renderer/src/pages/IntegrateChannelsPage.tsx
- [ ] 实现渠道列表展示
- [ ] 添加企微选项卡（仅支持企微）
- [ ] 实现模式选择（自动/手动）
- [ ] 实现开始集成按钮
- [ ] 添加返回首页按钮
- [ ] 配置页面路由

### 6.2 企微自动模式页

- [ ] 创建 renderer/src/pages/channels/WechatAutoPage.tsx
- [ ] 实现10步骤进度展示
- [ ] 集成 LogPanel 组件
- [ ] 集成 ProgressBar 组件
- [ ] 实现当前步骤提示
- [ ] 实现暂停/继续按钮
- [ ] 实现切换到手动模式按钮
- [ ] 配置页面路由

### 6.3 企微手动模式页

- [ ] 创建 renderer/src/pages/channels/WechatManualPage.tsx
- [ ] 实现操作指引（步骤1-3）
- [ ] 实现 BotId 输入框
- [ ] 实现 Secret 输入框
- [ ] 添加表单验证
- [ ] 实现提交按钮
- [ ] 实现取消按钮
- [ ] 配置页面路由

### 6.4 Playwright 服务基础

- [ ] 创建 playwright/index.ts 子进程入口
- [ ] 实现 stdin 命令监听
- [ ] 实现 stdout 消息发送
- [ ] 实现协议定义（command、payload）
- [ ] 创建 playwright/tsconfig.json

### 6.5 Playwright 服务类

- [ ] 创建 playwright/service.ts PlaywrightService 类
- [ ] 实现 init 方法（启动浏览器）
- [ ] 实现 executeWechatIntegration 方法
- [ ] 实现 cleanup 方法
- [ ] 添加错误处理

### 6.6 企微自动化步骤

- [ ] 创建 playwright/wechat/steps.ts
- [ ] 实现步骤1：点击智能机器人按钮
- [ ] 实现步骤2：点击手动创建
- [ ] 实现步骤3：点击API模式创建
- [ ] 实现步骤4：点击编辑按钮
- [ ] 实现步骤5：编辑机器人信息
- [ ] 实现步骤6：配置可见范围
- [ ] 实现步骤7：复制 BotId
- [ ] 实现步骤8：点击获取 Secret
- [ ] 实现步骤9：复制 Secret
- [ ] 实现步骤10：保存机器人信息

### 6.7 Playwright 重试机制

- [ ] 创建 playwright/utils/retry.ts
- [ ] 实现 executeWithRetry 函数
- [ ] 实现指数退避重试策略
- [ ] 添加最大重试次数限制

### 6.8 企微集成服务

- [ ] 创建 backend/src/services/channel.ts
- [ ] 实现 startPlaywright 函数
- [ ] 实现 verifyMatchCode 函数
- [ ] 实现 configureChannel 函数
- [ ] 实现 channel:config 命令调用
- [ ] 实现 channel:generate-match 命令调用
- [ ] 实现 channel:verify-status 命令调用

### 6.9 企微集成 API 路由

- [ ] 完善 backend/src/api/channel.ts
- [ ] 实现 POST /api/channel/integrate/start 端点
- [ ] 实现 GET /api/channel/integrate/status 端点
- [ ] 实现 POST /api/channel/integrate/submit 端点
- [ ] 实现 POST /api/channel/integrate/cancel 端点
- [ ] 添加错误码处理

### 6.10 企微集成 IPC 处理

- [ ] 完善 main/ipc/channel.ts
- [ ] 实现 channel:integrate:start IPC 处理
- [ ] 实现 channel:integrate:status IPC 处理
- [ ] 实现 channel:integrate:submit IPC 处理
- [ ] 实现 channel:integrate:cancel IPC 处理

### 6.11 测试企微集成

- [ ] 测试自动模式浏览器启动
- [ ] 测试10步骤自动化流程
- [ ] 测试手动模式表单提交
- [ ] 测试匹配码生成和验证
- [ ] 测试集成取消功能

---
## Chunk 5: OpenClaw 安装逻辑

### 5.1 安装页 InstallPage

- [ ] 创建 renderer/src/pages/InstallPage.tsx
- [ ] 实现安装状态展示区
- [ ] 集成 LogPanel 组件
- [ ] 集成 ProgressBar 组件
- [ ] 实现取消安装按钮
- [ ] 实现完成状态显示
- [ ] 实现返回首页按钮
- [ ] 配置页面路由

### 5.2 安装服务 - 环境检测

- [ ] 创建 backend/src/services/install.ts
- [ ] 实现 checkNodeJs 函数
- [ ] 实现 checkGit 函数
- [ ] 实现 checkPnpm 函数
- [ ] 实现 detectOS 函数
- [ ] 实现环境检测汇总接口
- [ ] 生成环境检测报告

### 5.3 安装服务 - 依赖安装

- [ ] 实现 installNodeJs 函数
- [ ] 实现 installGit 函数
- [ ] 实现 installPnpm 函数
- [ ] 实现 configureChinaMirror 函数（配置淘宝镜像）
- [ ] 实现依赖安装进度回调

### 5.4 安装服务 - OpenClaw 安装

- [ ] 实现 installOpenClaw 函数
- [ ] 使用 pnpm install -g openclaw 命令
- [ ] 实现安装进度回调
- [ ] 处理安装超时（30分钟）

### 5.5 安装服务 - OpenClaw 配置

- [ ] 实现 createSnapshot 函数（环境快照）
- [ ] 实现 configureOpenClaw 函数
- [ ] 使用 openclaw onboard 命令配置
- [ ] 实现配置失败回滚
- [ ] 实现 verifyOpenClaw 函数
- [ ] 实现cleanup 函数

### 5.6 安装 API 路由

- [ ] 完善 backend/src/api/install.ts
- [ ] 实现 POST /api/install/start 端点
- [ ] 实现 GET /api/install/status 端点
- [ ] 实现 POST /api/install/cancel 端点
- [ ] 实现 GET /api/install/logs 端点
- [ ] 添加错误码处理（E001-E008）

### 5.7 安装 IPC 处理

- [ ] 完善 main/ipc/install.ts
- [ ] 实现 install:start IPC 处理
- [ ] 实现 install:status IPC 处理
- [ ] 实现 install:cancel IPC 处理
- [ ] 实现 install:logs IPC 处理

### 5.8 日志管理

- [ ] 完善 backend/src/utils/logger.ts
- [ ] 实现日志目录创建
- [ ] 实现 install.log 文件管理
- [ ] 实现日志轮转（最多保留5个历史文件）
- [ ] 实现日志读取功能

### 5.9 测试安装功能

- [ ] 测试环境检测功能
- [ ] 测试依赖安装功能
- [ ] 测试 OpenClaw 安装
- [ ] 测试安装取消功能
- [ ] 测试安装失败回滚
- [ ] 测试日志实时推送

---
## Chunk 4: 核心页面（首页、风险提示、信息收集）

### 4.1 首页 HomePage

- [ ] 创建 renderer/src/pages/HomePage.tsx
- [ ] 实现卡片式布局
- [ ] 实现三个功能卡片（安装、集成、管理）
- [ ] 添加图标（RocketOutlined、LinkOutlined、SettingOutlined）
- [ ] 实现卡片点击导航
- [ ] 配置页面路由

### 4.2 风险提示页 RiskWarningPage

- [ ] 创建 renderer/src/pages/RiskWarningPage.tsx
- [ ] 实现警告提示布局
- [ ] 添加 WarningOutlined 图标
- [ ] 实现风险内容列表（4项）
- [ ] 添加复选框确认
- [ ] 实现下一步按钮禁用/启用逻辑
- [ ] 添加上一步按钮
- [ ] 配置页面路由

### 4.3 信息收集页 CollectInfoPage

- [ ] 创建 renderer/src/pages/CollectInfoPage.tsx
- [ ] 实现 Ant Design 表单
- [ ] 添加企微用户名字段
- [ ] 添加机器人名称字段（默认值：Dclaw Bot）
- [ ] 添加机器人简介字段（TextArea）
- [ ] 实现表单验证规则
- [ ] 添加 AI 服务配置折叠面板
- [ ] 添加 Zai API Key 输入
- [ ] 添加 Minimax API Key 输入
- [ ] 实现表单数据存储到 localStorage
- [ ] 实现跳过按钮
- [ ] 实现下一步按钮
- [ ] 添加上一步按钮
- [ ] 配置页面路由

### 4.4 页面导出

- [ ] 创建 renderer/src/pages/index.ts
- [ ] 导出 HomePage
- [ ] 导出 RiskWarningPage
- [ ] 导出 CollectInfoPage

### 4.5 测试核心页面

- [ ] 测试首页导航到风险提示页
- [ ] 测试风险提示页确认逻辑
- [ ] 测试信息收集页表单提交
- [ ] 测试信息收集页跳过功能

---
## Chunk 3: React 渲染进程

### 3.1 渲染进程基础

- [ ] 创建 renderer 目录结构
- [ ] 创建 renderer/index.html 模板
- [ ] 创建 renderer/vite.config.ts 配置
- [ ] 创建 renderer/tsconfig.json 配置

### 3.2 预加载脚本

- [ ] 创建 renderer/src/preload.ts
- [ ] 实现 contextBridge 暴露 API
- [ ] 实现 getBackendConfig 函数
- [ ] 实现 IPC send/on/invoke 封装
- [ ] 定义 TypeScript 类型

### 3.3 React 入口和路由

- [ ] 创建 renderer/src/index.tsx React 入口
- [ ] 安装 react-router-dom
- [ ] 创建 renderer/src/App.tsx 根组件
- [ ] 实现 BrowserRouter 路由配置
- [ ] 配置基础路由（/、/risk-warning、/collect-info）

### 3.4 Ant Design 配置

- [ ] 安装 antd 和 @ant-design/icons
- [ ] 创建 renderer/src/styles/theme.ts
- [ ] 配置主题颜色（米黄背景、炭黑主色）
- [ ] 创建 renderer/src/styles/global.css
- [ ] 在 App.tsx 中引入样式

### 3.5 Zustand 状态管理

- [ ] 安装 zustand
- [ ] 创建 renderer/src/store/index.ts
- [ ] 创建 renderer/src/store/appStore.ts 应用状态
- [ ] 实现 WebSocket 连接状态管理
- [ ] 实现全局错误状态管理

### 3.6 共享组件 - LogPanel

- [ ] 创建 renderer/src/components/LogPanel.tsx
- [ ] 实现日志显示列表
- [ ] 实现自动滚动到底部
- [ ] 实现日志级别着色（error 红色、warning 黄色）
- [ ] 实现日志搜索功能

### 3.7 共享组件 - ProgressBar

- [ ] 创建 renderer/src/components/ProgressBar.tsx
- [ ] 实现进度百分比显示
- [ ] 实现状态文本显示
- [ ] 添加加载动画

### 3.8 共享组件 - Header

- [ ] 创建 renderer/src/components/Header.tsx
- [ ] 实现返回按钮
- [ ] 实现标题显示
- [ ] 实现设置菜单

### 3.9 组件导出

- [ ] 创建 renderer/src/components/index.ts
- [ ] 导出 LogPanel 组件
- [ ] 导出 ProgressBar 组件
- [ ] 导出 Header 组件

### 3.10 工具函数 - API 封装

- [ ] 创建 renderer/src/utils/api.ts
- [ ] 实现 fetchWithTimeout 函数
- [ ] 实现 API 基础路径配置
- [ ] 实现 install/start 调用
- [ ] 实现 install/status 调用
- [ ] 实现 install/cancel 调用

### 3.11 工具函数 - 表单验证

- [ ] 创建 renderer/src/utils/validation.ts
- [ ] 实现 validateBotId 函数
- [ ] 实现 validateSecret 函数
- [ ] 实现 validateUsername 函数

### 3.12 自定义 Hooks - WebSocket

- [ ] 创建 renderer/src/hooks/useWebSocket.ts
- [ ] 实现 WebSocket 连接逻辑
- [ ] 实现消息接收处理
- [ ] 实现重连机制
- [ ] 实现 cleanup 函数

### 3.13 测试渲染进程框架

- [ ] 测试应用启动
- [ ] 测试路由导航
- [ ] 测试组件渲染
- [ ] 测试 WebSocket 连接

---
## 总结

### 优先级说明

- **P0（必须）**: Chunk 1-5，保证核心安装流程可用
- **P1（重要）**: Chunk 6 企微集成，完成 MVP 核心功能
- **P2（延后）**: Chunk 7 辅助功能，可根据时间安排

### 开发顺序建议

1. **阶段 1（Chunk 1-2）**: 基础设施搭建（3-5天）
2. **阶段 2（Chunk 3-4）**: 渲染进程和核心页面（3-4天）
3. **阶段 3（Chunk 5）**: OpenClaw 安装逻辑（5-7天）
4. **阶段 4（Chunk 6）**: 企微集成功能（7-10天）
5. **阶段 5（Chunk 7-8）**: 辅助功能和收尾（3-5天）

### MVP 验收标准

- [ ] 用户能够在空白系统上成功安装 OpenClaw
- [ ] 用户能够完成企微集成（自动或手动）
- [ ] 用户能够启动 OpenClaw Dashboard
- [ ] 所有操作有清晰的进度反馈
- [ ] 错误信息易于理解
- [ ] 用户能够随时取消操作

### 参考文档

- 设计文档: `docs/superpowers/specs/2026-03-13-dclaw-design.md`
- Electron 文档: https://www.electronjs.org/docs
- React 文档: https://react.dev
- Ant Design: https://ant.design
- Playwright: https://playwright.dev
