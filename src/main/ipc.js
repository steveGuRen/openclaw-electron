import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../shared/ipcChannels.js'
import Mutex from './mutex.js'
import depsManager from './modules/depsManager.js'
import openclawManager from './modules/openclawManager.js'
import integrationManager from './modules/integrationManager.js'

const operationMutex = new Mutex()

// 互斥锁包装器，确保同一时间只有一个操作执行
const withMutex = (handler) => async (event, ...args) => {
  try {
    await operationMutex.withLock(async () => {
      await handler(event, ...args)
    })
  } catch (error) {
    if (error.message === '获取锁超时') {
      event.reply(IPC_CHANNELS.DEPS_ERROR, { message: '操作超时，请稍后再试' })
    } else {
      event.reply(IPC_CHANNELS.DEPS_ERROR, { message: error.message })
    }
  }
}

// 依赖检测
ipcMain.on(IPC_CHANNELS.DEPS_CHECK, withMutex(async (event) => {
  try {
    const result = await depsManager.checkAllDependencies(
      (progress, message) => {
        event.reply(IPC_CHANNELS.DEPS_PROGRESS, { progress, message })
      }
    )

    if (result.status === 'satisfied') {
      event.reply(IPC_CHANNELS.DEPS_SUCCESS, result)
    } else {
      event.reply(IPC_CHANNELS.DEPS_ERROR, {
        message: '依赖检测不通过',
        missing: result.missing,
        dependencies: result.dependencies
      })
    }
  } catch (error) {
    event.reply(IPC_CHANNELS.DEPS_ERROR, { message: error.message })
  }
}))

// 依赖安装
ipcMain.on(IPC_CHANNELS.DEPS_INSTALL, withMutex(async (event) => {
  try {
    const result = await depsManager.installMissingDependencies(
      (progress, message) => {
        event.reply(IPC_CHANNELS.DEPS_PROGRESS, { progress, message })
      },
      (log) => {
        event.reply(IPC_CHANNELS.DEPS_LOG, { log })
      }
    )

    if (result.success) {
      event.reply(IPC_CHANNELS.DEPS_SUCCESS, result)
    } else {
      event.reply(IPC_CHANNELS.DEPS_ERROR, {
        message: result.error,
        logs: result.logs
      })
    }
  } catch (error) {
    event.reply(IPC_CHANNELS.DEPS_ERROR, { message: error.message })
  }
}))

// openclaw安装
ipcMain.on(IPC_CHANNELS.OPENCLAW_INSTALL, withMutex(async (event, config) => {
  try {
    const result = await openclawManager.install(
      config,
      (progress, message) => {
        event.reply(IPC_CHANNELS.INSTALL_PROGRESS, { progress, message })
      },
      (log) => {
        event.reply(IPC_CHANNELS.INSTALL_LOG, { log })
      }
    )

    if (result.success) {
      event.reply(IPC_CHANNELS.INSTALL_SUCCESS, result)
    } else {
      event.reply(IPC_CHANNELS.INSTALL_ERROR, {
        message: result.error,
        logs: result.logs
      })
    }
  } catch (error) {
    event.reply(IPC_CHANNELS.INSTALL_ERROR, { message: error.message })
  }
}))

// openclaw更新
ipcMain.on(IPC_CHANNELS.OPENCLAW_UPDATE, withMutex(async (event) => {
  try {
    const result = await openclawManager.update(
      (progress, message) => {
        event.reply(IPC_CHANNELS.INSTALL_PROGRESS, { progress, message })
      },
      (log) => {
        event.reply(IPC_CHANNELS.INSTALL_LOG, { log })
      }
    )

    if (result.success) {
      event.reply(IPC_CHANNELS.INSTALL_SUCCESS, result)
    } else {
      event.reply(IPC_CHANNELS.INSTALL_ERROR, {
        message: result.error,
        logs: result.logs
      })
    }
  } catch (error) {
    event.reply(IPC_CHANNELS.INSTALL_ERROR, { message: error.message })
  }
}))

// openclaw卸载
ipcMain.on(IPC_CHANNELS.OPENCLAW_UNINSTALL, withMutex(async (event) => {
  try {
    const result = await openclawManager.uninstall(
      (progress, message) => {
        event.reply(IPC_CHANNELS.INSTALL_PROGRESS, { progress, message })
      },
      (log) => {
        event.reply(IPC_CHANNELS.INSTALL_LOG, { log })
      }
    )

    if (result.success) {
      event.reply(IPC_CHANNELS.INSTALL_SUCCESS, result)
    } else {
      event.reply(IPC_CHANNELS.INSTALL_ERROR, {
        message: result.error,
        logs: result.logs
      })
    }
  } catch (error) {
    event.reply(IPC_CHANNELS.INSTALL_ERROR, { message: error.message })
  }
}))

// openclaw启动
ipcMain.on(IPC_CHANNELS.OPENCLAW_START, withMutex(async (event) => {
  try {
    const result = await openclawManager.start(
      (log) => {
        event.reply(IPC_CHANNELS.INSTALL_LOG, { log })
      }
    )

    if (result.success) {
      event.reply(IPC_CHANNELS.INSTALL_SUCCESS, result)
    } else {
      event.reply(IPC_CHANNELS.INSTALL_ERROR, { message: result.error })
    }
  } catch (error) {
    event.reply(IPC_CHANNELS.INSTALL_ERROR, { message: error.message })
  }
}))

// 自动集成启动
ipcMain.on(IPC_CHANNELS.INTEGRATION_AUTO_START, withMutex(async (event, config) => {
  try {
    const result = await integrationManager.startAutoIntegration(
      config,
      (currentStep, totalSteps, message) => {
        event.reply(IPC_CHANNELS.INTEGRATION_STEP, { currentStep, totalSteps, message })
      },
      (log) => {
        event.reply(IPC_CHANNELS.INSTALL_LOG, { log })
      }
    )

    if (result.success) {
      event.reply(IPC_CHANNELS.INTEGRATION_SUCCESS, result)
    } else {
      event.reply(IPC_CHANNELS.INTEGRATION_ERROR, {
        message: result.error,
        logs: result.logs
      })
    }
  } catch (error) {
    event.reply(IPC_CHANNELS.INTEGRATION_ERROR, { message: error.message })
  }
}))

// 手动集成提交
ipcMain.on(IPC_CHANNELS.INTEGRATION_MANUAL_SUBMIT, withMutex(async (event, config) => {
  try {
    const result = await integrationManager.submitManualConfig(
      config,
      (log) => {
        event.reply(IPC_CHANNELS.INSTALL_LOG, { log })
      }
    )

    if (result.success) {
      event.reply(IPC_CHANNELS.INTEGRATION_SUCCESS, result)
    } else {
      event.reply(IPC_CHANNELS.INTEGRATION_ERROR, {
        message: result.error,
        logs: result.logs
      })
    }
  } catch (error) {
    event.reply(IPC_CHANNELS.INTEGRATION_ERROR, { message: error.message })
  }
}))

// 额外的IPC接口，用于获取状态
ipcMain.handle('openclaw:status', async () => {
  return await openclawManager.getServiceStatus()
})

ipcMain.handle('integration:validate-config', async (_, config) => {
  return integrationManager.validateWecomConfig(config)
})

ipcMain.handle('integration:test-connection', async (_, config) => {
  return await integrationManager.testWecomConnection(config)
})
