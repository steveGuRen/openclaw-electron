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
