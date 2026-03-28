/**
 * electronAPI安全封装，统一处理空判断和错误
 */
class ElectronAPI {
  constructor() {
    this.api = window.electronAPI || null
    this.isAvailable = !!this.api
  }

  // 通用调用方法
  call(method, ...args) {
    if (!this.isAvailable) {
      console.error(`electronAPI不可用，无法调用方法: ${method}`)
      return Promise.reject(new Error('electronAPI未加载，请重启应用'))
    }

    try {
      return this.api[method](...args)
    } catch (e) {
      console.error(`调用electronAPI方法失败: ${method}`, e)
      return Promise.reject(e)
    }
  }

  // 依赖相关
  checkDeps() {
    return this.call('checkDeps')
  }

  installDeps() {
    return this.call('installDeps')
  }

  onDepsProgress(callback) {
    return this.call('onDepsProgress', callback)
  }

  onDepsLog(callback) {
    return this.call('onDepsLog', callback)
  }

  onDepsSuccess(callback) {
    return this.call('onDepsSuccess', callback)
  }

  onDepsError(callback) {
    return this.call('onDepsError', callback)
  }

  // 安装相关
  installOpenclaw(config) {
    return this.call('installOpenclaw', config)
  }

  onInstallProgress(callback) {
    return this.call('onInstallProgress', callback)
  }

  onInstallLog(callback) {
    return this.call('onInstallLog', callback)
  }

  onInstallSuccess(callback) {
    return this.call('onInstallSuccess', callback)
  }

  onInstallError(callback) {
    return this.call('onInstallError', callback)
  }

  // 集成相关
  startAutoIntegration(config) {
    return this.call('startAutoIntegration', config)
  }

  submitManualIntegration(data) {
    return this.call('submitManualIntegration', data)
  }

  // 更新相关
  updateOpenclaw() {
    return this.call('updateOpenclaw')
  }

  onUpdateProgress(callback) {
    return this.call('onUpdateProgress', callback)
  }

  onUpdateLog(callback) {
    return this.call('onUpdateLog', callback)
  }

  onUpdateSuccess(callback) {
    return this.call('onUpdateSuccess', callback)
  }

  onUpdateError(callback) {
    return this.call('onUpdateError', callback)
  }

  // 卸载相关
  uninstallOpenclaw() {
    return this.call('uninstallOpenclaw')
  }

  onUninstallProgress(callback) {
    return this.call('onUninstallProgress', callback)
  }

  onUninstallLog(callback) {
    return this.call('onUninstallLog', callback)
  }

  onUninstallSuccess(callback) {
    return this.call('onUninstallSuccess', callback)
  }

  onUninstallError(callback) {
    return this.call('onUninstallError', callback)
  }

  // 配置相关
  saveOpenclawConfig(config) {
    return this.call('saveOpenclawConfig', config)
  }

  // 移除监听器
  removeAllListeners(channel) {
    return this.call('removeAllListeners', channel)
  }
}

export default new ElectronAPI()
