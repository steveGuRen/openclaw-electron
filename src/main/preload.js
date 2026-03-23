import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipcChannels'

// 安全暴露API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 通用方法
  sendMessage: (channel, data) => {
    const allowedChannels = ['ping', 'get-system-info']
    if (allowedChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },

  onMessage: (channel, callback) => {
    const allowedChannels = ['pong', 'system-info']
    if (allowedChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args))
      return () => ipcRenderer.removeListener(channel, callback)
    }
    return () => {}
  },

  invoke: (channel, data) => {
    const allowedChannels = ['get-app-version', 'open-dialog']
    if (allowedChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data)
    }
    return Promise.reject(new Error('Channel not allowed'))
  },

  // 依赖检查安装相关
  checkDeps: () => {
    ipcRenderer.send(IPC_CHANNELS.DEPS_CHECK)
  },

  installDeps: () => {
    ipcRenderer.send(IPC_CHANNELS.DEPS_INSTALL)
  },

  onDepsProgress: (callback) => {
    ipcRenderer.on(IPC_CHANNELS.DEPS_PROGRESS, (event, ...args) => callback(...args))
    return () => ipcRenderer.removeListener(IPC_CHANNELS.DEPS_PROGRESS, callback)
  },

  onDepsLog: (callback) => {
    ipcRenderer.on(IPC_CHANNELS.DEPS_LOG, (event, ...args) => callback(...args))
    return () => ipcRenderer.removeListener(IPC_CHANNELS.DEPS_LOG, callback)
  },

  onDepsSuccess: (callback) => {
    ipcRenderer.on(IPC_CHANNELS.DEPS_SUCCESS, (event, ...args) => callback(...args))
    return () => ipcRenderer.removeListener(IPC_CHANNELS.DEPS_SUCCESS, callback)
  },

  onDepsError: (callback) => {
    ipcRenderer.on(IPC_CHANNELS.DEPS_ERROR, (event, ...args) => callback(...args))
    return () => ipcRenderer.removeListener(IPC_CHANNELS.DEPS_ERROR, callback)
  },

  // Openclaw安装相关
  installOpenclaw: () => {
    ipcRenderer.send(IPC_CHANNELS.OPENCLAW_INSTALL)
  },

  onInstallProgress: (callback) => {
    ipcRenderer.on(IPC_CHANNELS.INSTALL_PROGRESS, (event, ...args) => callback(...args))
    return () => ipcRenderer.removeListener(IPC_CHANNELS.INSTALL_PROGRESS, callback)
  },

  onInstallLog: (callback) => {
    ipcRenderer.on(IPC_CHANNELS.INSTALL_LOG, (event, ...args) => callback(...args))
    return () => ipcRenderer.removeListener(IPC_CHANNELS.INSTALL_LOG, callback)
  },

  onInstallSuccess: (callback) => {
    ipcRenderer.on(IPC_CHANNELS.INSTALL_SUCCESS, (event, ...args) => callback(...args))
    return () => ipcRenderer.removeListener(IPC_CHANNELS.INSTALL_SUCCESS, callback)
  },

  onInstallError: (callback) => {
    ipcRenderer.on(IPC_CHANNELS.INSTALL_ERROR, (event, ...args) => callback(...args))
    return () => ipcRenderer.removeListener(IPC_CHANNELS.INSTALL_ERROR, callback)
  },

  // Openclaw启动相关
  startOpenclaw: () => {
    ipcRenderer.send(IPC_CHANNELS.OPENCLAW_START)
  },

  // 自动集成相关
  startAutoIntegration: (config) => {
    ipcRenderer.send(IPC_CHANNELS.INTEGRATION_AUTO_START, config)
  },

  onIntegrationStep: (callback) => {
    ipcRenderer.on(IPC_CHANNELS.INTEGRATION_STEP, (event, ...args) => callback(...args))
    return () => ipcRenderer.removeListener(IPC_CHANNELS.INTEGRATION_STEP, callback)
  },

  onIntegrationSuccess: (callback) => {
    ipcRenderer.on(IPC_CHANNELS.INTEGRATION_SUCCESS, (event, ...args) => callback(...args))
    return () => ipcRenderer.removeListener(IPC_CHANNELS.INTEGRATION_SUCCESS, callback)
  },

  onIntegrationError: (callback) => {
    ipcRenderer.on(IPC_CHANNELS.INTEGRATION_ERROR, (event, ...args) => callback(...args))
    return () => ipcRenderer.removeListener(IPC_CHANNELS.INTEGRATION_ERROR, callback)
  },

  // 手动集成相关
  submitManualIntegration: (data) => {
    return ipcRenderer.invoke(IPC_CHANNELS.INTEGRATION_MANUAL_SUBMIT, data)
  },

  // 更新相关
  updateOpenclaw: () => {
    ipcRenderer.send(IPC_CHANNELS.OPENCLAW_UPDATE)
  },

  onUpdateProgress: (callback) => {
    ipcRenderer.on('update-progress', (event, ...args) => callback(...args))
    return () => ipcRenderer.removeListener('update-progress', callback)
  },

  onUpdateLog: (callback) => {
    ipcRenderer.on('update-log', (event, ...args) => callback(...args))
    return () => ipcRenderer.removeListener('update-log', callback)
  },

  onUpdateSuccess: (callback) => {
    ipcRenderer.on('update-success', (event, ...args) => callback(...args))
    return () => ipcRenderer.removeListener('update-success', callback)
  },

  onUpdateError: (callback) => {
    ipcRenderer.on('update-error', (event, ...args) => callback(...args))
    return () => ipcRenderer.removeListener('update-error', callback)
  },

  // 卸载相关
  uninstallOpenclaw: () => {
    ipcRenderer.send(IPC_CHANNELS.OPENCLAW_UNINSTALL)
  },

  onUninstallProgress: (callback) => {
    ipcRenderer.on('uninstall-progress', (event, ...args) => callback(...args))
    return () => ipcRenderer.removeListener('uninstall-progress', callback)
  },

  onUninstallLog: (callback) => {
    ipcRenderer.on('uninstall-log', (event, ...args) => callback(...args))
    return () => ipcRenderer.removeListener('uninstall-log', callback)
  },

  onUninstallSuccess: (callback) => {
    ipcRenderer.on('uninstall-success', (event, ...args) => callback(...args))
    return () => ipcRenderer.removeListener('uninstall-success', callback)
  },

  onUninstallError: (callback) => {
    ipcRenderer.on('uninstall-error', (event, ...args) => callback(...args))
    return () => ipcRenderer.removeListener('uninstall-error', callback)
  },

  // 移除监听器通用方法
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback)
  },

  // 移除所有监听器
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  }
})
