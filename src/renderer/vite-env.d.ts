/// <reference types="vite/client" />

declare interface Window {
  electronAPI: {
    // 依赖相关
    checkDeps: () => void
    installDeps: () => void
    onDepsProgress: (callback: (data: any) => void) => () => void
    onDepsLog: (callback: (data: any) => void) => () => void
    onDepsSuccess: (callback: () => void) => () => void
    onDepsError: (callback: (error: any) => void) => () => void

    // 安装相关
    installOpenclaw: (config: any) => void
    onInstallProgress: (callback: (data: any) => void) => () => void
    onInstallLog: (callback: (data: any) => void) => () => void
    onInstallSuccess: (callback: (data: any) => void) => () => void
    onInstallError: (callback: (error: any) => void) => () => void

    // 集成相关
    startAutoIntegration: (config: any) => void
    submitManualIntegration: (data: any) => Promise<any>

    // 更新相关
    updateOpenclaw: () => void
    onUpdateProgress: (callback: (data: any) => void) => () => void
    onUpdateLog: (callback: (data: any) => void) => () => void
    onUpdateSuccess: (callback: () => void) => () => void
    onUpdateError: (callback: (error: any) => void) => () => void

    // 卸载相关
    uninstallOpenclaw: () => void
    onUninstallProgress: (callback: (data: any) => void) => () => void
    onUninstallLog: (callback: (data: any) => void) => () => void
    onUninstallSuccess: (callback: () => void) => () => void
    onUninstallError: (callback: (error: any) => void) => () => void

    // 移除监听器
    removeAllListeners: (channel: string) => void

    [key: string]: any
  }
}
