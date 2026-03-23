# Dclaw 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现Dclaw跨平台桌面应用，为用户提供一键式openclaw安装、配置和企微集成能力，支持Windows/macOS/Linux。

**Architecture:** 采用Electron三层进程架构：
1. 主进程负责IPC路由、状态管理和进程调度
2. 渲染进程(Vue3 SPA)负责用户界面和交互
3. 独立工具子进程负责耗时操作（系统命令、Playwright自动化）
进程间通过标准化IPC协议通信，所有敏感信息加密存储，遵循安全最佳实践。

**Tech Stack:**
- 桌面容器: Electron 29.x
- 前端: Vue 3.x + Vite 5.x + Element Plus
- 状态管理: Pinia
- 自动化: Playwright
- 打包: electron-builder
- 工具库: axios, fs-extra, node-os-utils, keytar (系统密钥管理)

---

## 项目文件结构

```
├── package.json                  # 项目依赖和脚本配置
├── vite.config.js               # Vite构建配置
├── electron-builder.json        # electron-builder打包配置
├── preload.js                   # 预加载脚本，暴露IPC接口给渲染进程
├── src/
│   ├── main/                    # 主进程代码
│   │   ├── index.js             # 主进程入口
│   │   ├── ipc.js               # IPC事件注册和路由
│   │   ├── state.js             # 全局状态管理和持久化
│   │   ├── mutex.js             # 操作互斥锁管理
│   │   └── modules/             # 业务模块
│   │       ├── depsManager.js   # 依赖检测和安装
│   │       ├── openclawManager.js # openclaw安装/更新/卸载
│   │       ├── integrationManager.js # 企微集成管理
│   │       └── security.js      # 加密和安全工具
│   ├── renderer/                # 渲染进程(Vue)代码
│   │   ├── main.js              # Vue入口
│   │   ├── router/
│   │   │   └── index.js         # 路由配置
│   │   ├── store/
│   │   │   └── index.js         # Pinia状态管理
│   │   ├── components/          # 公共组件
│   │   │   ├── Layout.vue       # 全局布局
│   │   │   ├── ProgressBar.vue  # 进度条组件
│   │   │   ├── LogViewer.vue    # 日志展示组件
│   │   │   └── ErrorTip.vue     # 错误提示组件
│   │   └── pages/               # 页面组件
│   │       ├── Index.vue        # 初始页
│   │       ├── Risk.vue         # 风险提示页
│   │       ├── InfoCollect.vue  # 信息收集页
│   │       ├── DepsInstall.vue  # 依赖安装页
│   │       ├── Install.vue      # openclaw安装页
│   │       ├── IntegrationSelect.vue # 集成选择页
│   │       ├── AutoIntegration.vue # 自动集成页
│   │       ├── ManualIntegration.vue # 手动集成页
│   │       ├── Update.vue       # 更新页
│   │       └── Uninstall.vue    # 卸载页
│   ├── workers/                 # 独立子进程
│   │   ├── systemWorker.js      # 系统操作子进程
│   │   └── playwrightWorker.js  # Playwright自动化子进程
│   └── shared/                  # 公共代码
│       ├── types.js             # 类型定义
│       ├── ipcChannels.js       # IPC事件名常量
│       └── utils.js             # 通用工具函数
└── docs/                        # 文档
```

---

## 实施任务

### Task 1: 项目初始化和基础配置

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `electron-builder.json`
- Modify: `.gitignore`

- [ ] **Step 1: 初始化package.json，配置项目依赖和脚本**

```json
{
  "name": "dclaw",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "electron:dev": "concurrently -k \"vite\" \"electron . --dev\"",
    "electron:build": "vite build && electron-builder",
    "postinstall": "electron-builder install-app-deps"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "pinia": "^2.1.0",
    "vue-router": "^4.2.0",
    "element-plus": "^2.5.0",
    "electron-store": "^8.1.0",
    "keytar": "^7.9.0",
    "fs-extra": "^11.2.0",
    "axios": "^1.6.0",
    "playwright": "^1.42.0",
    "node-os-utils": "^1.3.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.0.0",
    "electron": "^29.0.0",
    "electron-builder": "^24.12.0",
    "concurrently": "^8.2.0"
  },
  "main": "main.js"
}
```

- [ ] **Step 2: 安装项目依赖**

Run: `npm install`
Expected: 所有依赖安装成功，无报错

- [ ] **Step 3: 配置vite.config.js**

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  base: './',
  root: 'src/renderer',
  build: {
    outDir: '../../dist',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared')
    }
  },
  server: {
    port: 5173
  }
})
```

- [ ] **Step 4: 配置electron-builder.json**

```json
{
  "appId": "com.do1.dclaw",
  "productName": "Dclaw",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "main.js",
    "preload.js",
    "src/main/**/*",
    "src/workers/**/*",
    "src/shared/**/*",
    "node_modules/**/*"
  ],
  "win": {
    "target": ["nsis", "portable"],
    "icon": "public/icon.ico"
  },
  "mac": {
    "target": ["dmg", "zip"],
    "icon": "public/icon.icns",
    "hardenedRuntime": true
  },
  "linux": {
    "target": ["AppImage", "deb", "rpm"],
    "icon": "public/icon.png"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeDirectory": true,
    "allowElevation": true
  }
}
```

- [ ] **Step 5: 更新.gitignore，添加忽略文件**

在现有.gitignore中添加：
```
dist/
release/
node_modules/
*.log
.DS_Store
*.exe
*.dmg
*.AppImage
```

- [ ] **Step 6: 提交基础配置**

Run:
```bash
git add package.json vite.config.js electron-builder.json .gitignore
git commit -m "chore: init project base configuration"
```

---

### Task 2: 基础架构和IPC通信搭建

**Files:**
- Create: `main.js` (主进程入口)
- Create: `preload.js` (预加载脚本)
- Create: `src/shared/ipcChannels.js`
- Create: `src/main/ipc.js`
- Create: `src/main/state.js`
- Create: `src/main/mutex.js`
- Create: `src/renderer/main.js` (Vue入口)

- [ ] **Step 1: 创建IP通道常量文件 src/shared/ipcChannels.js**

```javascript
export const IPC_CHANNELS = {
  // 渲染进程 -> 主进程
  DEPS_CHECK: 'deps:check',
  DEPS_INSTALL: 'deps:install',
  OPENCLAW_INSTALL: 'openclaw:install',
  OPENCLAW_UPDATE: 'openclaw:update',
  OPENCLAW_UNINSTALL: 'openclaw:uninstall',
  OPENCLAW_START: 'openclaw:start',
  INTEGRATION_AUTO_START: 'integration:auto:start',
  INTEGRATION_MANUAL_SUBMIT: 'integration:manual:submit',

  // 主进程 -> 渲染进程
  DEPS_PROGRESS: 'deps:progress',
  DEPS_LOG: 'deps:log',
  DEPS_SUCCESS: 'deps:success',
  DEPS_ERROR: 'deps:error',
  INSTALL_PROGRESS: 'install:progress',
  INSTALL_LOG: 'install:log',
  INSTALL_SUCCESS: 'install:success',
  INSTALL_ERROR: 'install:error',
  INTEGRATION_STEP: 'integration:step',
  INTEGRATION_SUCCESS: 'integration:success',
  INTEGRATION_ERROR: 'integration:error'
}
```

- [ ] **Step 2: 创建预加载脚本 preload.js**

```javascript
import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from './src/shared/ipcChannels.js'

contextBridge.exposeInMainWorld('electronAPI', {
  // 发送命令
  checkDeps: () => ipcRenderer.send(IPC_CHANNELS.DEPS_CHECK),
  installDeps: () => ipcRenderer.send(IPC_CHANNELS.DEPS_INSTALL),
  installOpenclaw: (config) => ipcRenderer.send(IPC_CHANNELS.OPENCLAW_INSTALL, config),
  updateOpenclaw: () => ipcRenderer.send(IPC_CHANNELS.OPENCLAW_UPDATE),
  uninstallOpenclaw: () => ipcRenderer.send(IPC_CHANNELS.OPENCLAW_UNINSTALL),
  startOpenclaw: () => ipcRenderer.send(IPC_CHANNELS.OPENCLAW_START),
  startAutoIntegration: () => ipcRenderer.send(IPC_CHANNELS.INTEGRATION_AUTO_START),
  submitManualIntegration: (config) => ipcRenderer.send(IPC_CHANNELS.INTEGRATION_MANUAL_SUBMIT, config),

  // 监听事件
  onDepsProgress: (callback) => ipcRenderer.on(IPC_CHANNELS.DEPS_PROGRESS, (_, data) => callback(data)),
  onDepsLog: (callback) => ipcRenderer.on(IPC_CHANNELS.DEPS_LOG, (_, data) => callback(data)),
  onDepsSuccess: (callback) => ipcRenderer.on(IPC_CHANNELS.DEPS_SUCCESS, () => callback()),
  onDepsError: (callback) => ipcRenderer.on(IPC_CHANNELS.DEPS_ERROR, (_, error) => callback(error)),
  onInstallProgress: (callback) => ipcRenderer.on(IPC_CHANNELS.INSTALL_PROGRESS, (_, data) => callback(data)),
  onInstallLog: (callback) => ipcRenderer.on(IPC_CHANNELS.INSTALL_LOG, (_, data) => callback(data)),
  onInstallSuccess: (callback) => ipcRenderer.on(IPC_CHANNELS.INSTALL_SUCCESS, (_, data) => callback(data)),
  onInstallError: (callback) => ipcRenderer.on(IPC_CHANNELS.INSTALL_ERROR, (_, error) => callback(error)),
  onIntegrationStep: (callback) => ipcRenderer.on(IPC_CHANNELS.INTEGRATION_STEP, (_, data) => callback(data)),
  onIntegrationSuccess: (callback) => ipcRenderer.on(IPC_CHANNELS.INTEGRATION_SUCCESS, () => callback()),
  onIntegrationError: (callback) => ipcRenderer.on(IPC_CHANNELS.INTEGRATION_ERROR, (_, error) => callback(error)),

  // 移除监听器
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
})
```

- [ ] **Step 3: 创建主进程入口 main.js**

```javascript
import { app, BrowserWindow } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import './src/main/ipc.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    resizable: true,
    autoHideMenuBar: true
  })

  if (process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 4: 创建主进程IPC路由 src/main/ipc.js**

```javascript
import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../shared/ipcChannels.js'
import Mutex from './mutex.js'

const operationMutex = new Mutex()

// 互斥锁包装器，确保同一时间只有一个操作执行
const withMutex = (handler) => async (event, ...args) => {
  if (!operationMutex.tryLock()) {
    event.reply(IPC_CHANNELS.DEPS_ERROR, { message: '已有操作正在进行，请稍后再试' })
    return
  }

  try {
    await handler(event, ...args)
  } finally {
    operationMutex.unlock()
  }
}

// 依赖检测
ipcMain.on(IPC_CHANNELS.DEPS_CHECK, withMutex(async (event) => {
  // TODO: 实现依赖检测逻辑
  event.reply(IPC_CHANNELS.DEPS_SUCCESS)
}))

// 依赖安装
ipcMain.on(IPC_CHANNELS.DEPS_INSTALL, withMutex(async (event) => {
  // TODO: 实现依赖安装逻辑
  event.reply(IPC_CHANNELS.DEPS_SUCCESS)
}))

// openclaw安装
ipcMain.on(IPC_CHANNELS.OPENCLAW_INSTALL, withMutex(async (event, config) => {
  // TODO: 实现openclaw安装逻辑
  event.reply(IPC_CHANNELS.INSTALL_SUCCESS, { accessUrl: 'http://localhost:9600' })
}))

// 其他IPC事件占位符，后续实现
ipcMain.on(IPC_CHANNELS.OPENCLAW_UPDATE, withMutex(async (event) => {}))
ipcMain.on(IPC_CHANNELS.OPENCLAW_UNINSTALL, withMutex(async (event) => {}))
ipcMain.on(IPC_CHANNELS.OPENCLAW_START, withMutex(async (event) => {}))
ipcMain.on(IPC_CHANNELS.INTEGRATION_AUTO_START, withMutex(async (event) => {}))
ipcMain.on(IPC_CHANNELS.INTEGRATION_MANUAL_SUBMIT, withMutex(async (event, config) => {}))
```

- [ ] **Step 5: 创建互斥锁管理 src/main/mutex.js**

```javascript
class Mutex {
  constructor() {
    this.locked = false
  }

  tryLock() {
    if (this.locked) return false
    this.locked = true
    return true
  }

  unlock() {
    this.locked = false
  }

  isLocked() {
    return this.locked
  }
}

export default Mutex
```

- [ ] **Step 6: 创建状态管理 src/main/state.js**

```javascript
import Store from 'electron-store'
import keytar from 'keytar'

const store = new Store({
  name: 'dclaw-config',
  encryptionKey: 'dclaw-secure-storage'
})

class AppState {
  constructor() {
    this.store = store
  }

  // 普通配置存储
  get(key, defaultValue = null) {
    return this.store.get(key, defaultValue)
  }

  set(key, value) {
    return this.store.set(key, value)
  }

  // 敏感信息存储（使用系统密钥链）
  async getSecure(key) {
    try {
      return await keytar.getPassword('dclaw', key)
    } catch (e) {
      console.error('Failed to get secure data:', e)
      return null
    }
  }

  async setSecure(key, value) {
    try {
      await keytar.setPassword('dclaw', key, value)
      return true
    } catch (e) {
      console.error('Failed to set secure data:', e)
      return false
    }
  }

  async deleteSecure(key) {
    try {
      await keytar.deletePassword('dclaw', key)
      return true
    } catch (e) {
      console.error('Failed to delete secure data:', e)
      return false
    }
  }
}

export default new AppState()
```

- [ ] **Step 7: 创建Vue渲染进程入口 src/renderer/main.js**

```javascript
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

app.mount('#app')
```

- [ ] **Step 8: 创建Vue根组件 src/renderer/App.vue**

```vue
<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

#app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>
```

- [ ] **Step 9: 测试基础架构是否正常运行**

Run: `npm run electron:dev`
Expected: Electron窗口正常打开，显示Vue默认页面，控制台无报错

- [ ] **Step 10: 提交基础架构代码**

Run:
```bash
git add main.js preload.js src/shared/ipcChannels.js src/main/ipc.js src/main/state.js src/main/mutex.js src/renderer/main.js src/renderer/App.vue
git commit -m "feat: implement base architecture and IPC communication"
```

---

### Task 3: 路由和公共组件实现

**Files:**
- Create: `src/renderer/router/index.js`
- Create: `src/renderer/store/index.js`
- Create: `src/renderer/components/Layout.vue`
- Create: `src/renderer/components/ProgressBar.vue`
- Create: `src/renderer/components/LogViewer.vue`
- Create: `src/renderer/components/ErrorTip.vue`

- [ ] **Step 1: 配置路由 src/renderer/router/index.js**

```javascript
import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Index',
    component: () => import('../pages/Index.vue')
  },
  {
    path: '/risk',
    name: 'Risk',
    component: () => import('../pages/Risk.vue')
  },
  {
    path: '/info',
    name: 'InfoCollect',
    component: () => import('../pages/InfoCollect.vue')
  },
  {
    path: '/deps-install',
    name: 'DepsInstall',
    component: () => import('../pages/DepsInstall.vue')
  },
  {
    path: '/install',
    name: 'Install',
    component: () => import('../pages/Install.vue')
  },
  {
    path: '/integration',
    name: 'IntegrationSelect',
    component: () => import('../pages/IntegrationSelect.vue')
  },
  {
    path: '/integration/auto',
    name: 'AutoIntegration',
    component: () => import('../pages/AutoIntegration.vue')
  },
  {
    path: '/integration/manual',
    name: 'ManualIntegration',
    component: () => import('../pages/ManualIntegration.vue')
  },
  {
    path: '/update',
    name: 'Update',
    component: () => import('../pages/Update.vue')
  },
  {
    path: '/uninstall',
    name: 'Uninstall',
    component: () => import('../pages/Uninstall.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
```

- [ ] **Step 2: 配置Pinia状态管理 src/renderer/store/index.js**

```javascript
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    // 安装配置
    installConfig: {
      llmProvider: 'deepseek',
      apiKey: '',
      botName: '',
      botDescription: '',
      userName: '',
      installPath: ''
    },
    // 全局日志
    logs: [],
    // 当前操作状态
    currentOperation: null,
    operationStatus: 'idle' // idle | running | success | error
  }),

  actions: {
    updateInstallConfig(config) {
      this.installConfig = { ...this.installConfig, ...config }
    },

    addLog(log) {
      this.logs.push({
        ...log,
        timestamp: new Date()
      })
    },

    clearLogs() {
      this.logs = []
    },

    setOperation(operation, status = 'running') {
      this.currentOperation = operation
      this.operationStatus = status
    },

    resetOperation() {
      this.currentOperation = null
      this.operationStatus = 'idle'
    }
  }
})
```

- [ ] **Step 3: 实现公共布局组件 src/renderer/components/Layout.vue**

```vue
<template>
  <div class="layout">
    <div class="header">
      <h1>Dclaw - openclaw 一键安装工具</h1>
    </div>
    <div class="content">
      <slot />
    </div>
    <div class="footer">
      <p>© 2026 Dclaw Team</p>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.layout {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.header {
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  padding: 0 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header h1 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.content {
  flex: 1;
  padding: 30px;
  overflow-y: auto;
}

.footer {
  height: 40px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid #e4e7ed;
  color: #909399;
  font-size: 12px;
}
</style>
```

- [ ] **Step 4: 实现进度条组件 src/renderer/components/ProgressBar.vue**

```vue
<template>
  <div class="progress-container">
    <div class="progress-header">
      <span class="step-name">{{ stepName }}</span>
      <span class="percentage">{{ percentage }}%</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: `${percentage}%` }"></div>
    </div>
    <div class="step-info">
      步骤 {{ currentStep }} / {{ totalSteps }}
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  currentStep: {
    type: Number,
    required: true
  },
  totalSteps: {
    type: Number,
    required: true
  },
  stepName: {
    type: String,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  }
})
</script>

<style scoped>
.progress-container {
  margin: 20px 0;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.step-name {
  font-weight: 500;
  color: #303133;
}

.percentage {
  color: #409eff;
  font-weight: 600;
}

.progress-bar {
  height: 12px;
  background: #ebeef5;
  border-radius: 6px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 6px;
  transition: width 0.3s ease;
}

.step-info {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  text-align: right;
}
</style>
```

- [ ] **Step 5: 实现日志查看组件 src/renderer/components/LogViewer.vue**

```vue
<template>
  <div class="log-viewer">
    <div class="log-header">
      <span>安装日志</span>
      <el-button size="small" @click="clearLogs">清空</el-button>
    </div>
    <div class="log-content" ref="logContent">
      <div v-for="(log, index) in logs" :key="index" :class="['log-item', log.type]">
        <span class="log-time">{{ formatTime(log.timestamp) }}</span>
        <span class="log-content-text">{{ log.content }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  logs: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['clear'])

const logContent = ref(null)

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString()
}

const clearLogs = () => {
  emit('clear')
}

watch(() => props.logs, async () => {
  await nextTick()
  if (logContent.value) {
    logContent.value.scrollTop = logContent.value.scrollHeight
  }
}, { deep: true })
</script>

<style scoped>
.log-viewer {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fafafa;
  margin: 20px 0;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid #dcdfe6;
  background: white;
  font-weight: 500;
}

.log-content {
  height: 200px;
  overflow-y: auto;
  padding: 10px 15px;
  font-family: monospace;
  font-size: 12px;
}

.log-item {
  margin-bottom: 4px;
  line-height: 1.5;
}

.log-time {
  color: #909399;
  margin-right: 8px;
}

.log-item.info .log-content-text {
  color: #303133;
}

.log-item.warn .log-content-text {
  color: #e6a23c;
}

.log-item.error .log-content-text {
  color: #f56c6c;
}
</style>
```

- [ ] **Step 6: 实现错误提示组件 src/renderer/components/ErrorTip.vue**

```vue
<template>
  <el-alert
    :title="title"
    type="error"
    :description="description"
    show-icon
    closable
  >
    <template #default>
      <div v-if="showDetail" class="error-detail">
        <el-divider />
        <pre>{{ detail }}</pre>
      </div>
      <el-button type="text" @click="showDetail = !showDetail">
        {{ showDetail ? '收起详情' : '查看详情' }}
      </el-button>
    </template>
  </el-alert>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: '操作失败'
  },
  description: {
    type: String,
    required: true
  },
  detail: {
    type: String,
    default: ''
  }
})

const showDetail = ref(false)
</script>

<style scoped>
.error-detail {
  margin-top: 10px;
}

pre {
  background: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  color: #f56c6c;
}
</style>
```

- [ ] **Step 7: 测试路由和组件是否正常**

Run: `npm run electron:dev`
Expected: 路由可以正常访问，公共组件渲染正常

- [ ] **Step 8: 提交路由和公共组件代码**

Run:
```bash
git add src/renderer/router/index.js src/renderer/store/index.js src/renderer/components/
git commit -m "feat: implement router and common components"
```

---

### Task 4: 页面实现（第一部分：核心流程页面）

**Files:**
- Create: `src/renderer/pages/Index.vue`
- Create: `src/renderer/pages/Risk.vue`
- Create: `src/renderer/pages/InfoCollect.vue`
- Create: `src/renderer/pages/DepsInstall.vue`
- Create: `src/renderer/pages/Install.vue`

这部分任务包含5个页面，每个页面实现独立的功能，具体代码根据需求文档编写。

---

### Task 5: 页面实现（第二部分：功能页面）

**Files:**
- Create: `src/renderer/pages/IntegrationSelect.vue`
- Create: `src/renderer/pages/AutoIntegration.vue`
- Create: `src/renderer/pages/ManualIntegration.vue`
- Create: `src/renderer/pages/Update.vue`
- Create: `src/renderer/pages/Uninstall.vue`

这部分任务包含5个功能页面，实现企微集成、更新、卸载等功能。

---

### Task 6: 主进程核心模块实现

**Files:**
- Create: `src/main/modules/depsManager.js`
- Create: `src/main/modules/openclawManager.js`
- Create: `src/main/modules/integrationManager.js`
- Create: `src/main/modules/security.js`
- Create: `src/workers/systemWorker.js`

实现核心业务逻辑：
- 依赖检测和自动安装
- openclaw安装、更新、卸载、配置写入
- 系统命令执行封装，安全沙箱
- 加密和安全工具

---

### Task 7: Playwright自动化集成实现

**Files:**
- Create: `src/workers/playwrightWorker.js`
- Update: `src/main/modules/integrationManager.js`

实现企微自动集成功能：
- Playwright浏览器自动化
- 企微后台操作流程实现
- 自动获取机器人配置
- 集成配置自动写入

---

### Task 8: 错误处理、测试和打包配置优化

**Files:**
- Update: 各个模块添加错误处理
- Create: 测试用例
- Update: `electron-builder.json` 优化打包配置

- 完善全局错误处理机制
- 实现安装回滚功能
- 测试各平台兼容性
- 优化打包配置，减小安装包体积
- 编写使用文档

---

## 后续计划
完成以上任务后，将进入测试和迭代阶段，修复bug，优化用户体验，发布第一个版本。
