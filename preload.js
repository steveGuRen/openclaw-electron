import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from './src/shared/ipcChannels.js'

// 安全暴露API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 示例：发送消息到主进程
  sendMessage: (channel, data) => {
    const allowedChannels = ['ping', 'get-system-info', ...Object.values(IPC_CHANNELS)]
    if (allowedChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },

  // 示例：监听主进程消息
  onMessage: (channel, callback) => {
    const allowedChannels = ['pong', 'system-info', ...Object.values(IPC_CHANNELS)]
    if (allowedChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args))
    }
  },

  // 示例：调用主进程方法并等待返回
  invoke: (channel, data) => {
    const allowedChannels = ['get-app-version', 'open-dialog']
    if (allowedChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data)
    }
    return Promise.reject(new Error('Channel not allowed'))
  },

  // 业务API
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
