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
