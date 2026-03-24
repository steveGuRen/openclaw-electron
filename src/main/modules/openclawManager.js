import os from 'os'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import systemWorkerManager from './systemWorkerManager.js'
import security from './security.js'
import depsManager from './depsManager.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// OpenClaw配置
const OPENCLAW_CONFIG = {
  repoUrl: 'https://github.com/openclaw-ai/openclaw.git',
  defaultBranch: 'main',
  baseInstallDir: path.join(os.homedir(), '.dclaw', 'openclaw'),
  configFile: '.env',
  defaultPort: 9600,
  dashboardCommand: ['npm', 'run', 'dashboard'],
  processName: 'openclaw-dashboard',
  supportedProviders: new Set(['deepseek', 'z.ai', 'z.ai-coding', 'kimi', 'minimax', 'qwen'])
}

class OpenclawManager {
  constructor() {
    this.baseInstallDir = OPENCLAW_CONFIG.baseInstallDir
    this.installDir = OPENCLAW_CONFIG.baseInstallDir
    this.installProgress = 0
    this.installLogs = []
    this.runningProcess = null
    this.currentInstance = 'default'
  }

  /**
   * 设置安装路径
   * @param {string} installPath - 自定义安装路径
   */
  setInstallDir(installPath) {
    if (installPath) {
      // 路径安全校验
      const allowedPaths = [os.homedir(), path.join(os.homedir(), '.dclaw')]
      if (security.isPathAllowed(installPath, allowedPaths)) {
        this.installDir = path.resolve(installPath)
      } else {
        throw new Error('安装路径不被允许')
      }
    } else {
      this.installDir = this.baseInstallDir
    }
  }

  /**
   * 检测已存在的openclaw实例
   * @returns {Array} 实例列表
   */
  async scanExistingInstances() {
    const instances = []
    const baseDir = path.dirname(this.baseInstallDir)

    try {
      const entries = await fs.readdir(baseDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('openclaw')) {
          const instancePath = path.join(baseDir, entry.name)
          try {
            const packageJsonPath = path.join(instancePath, 'package.json')
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'))
            instances.push({
              name: entry.name,
              path: instancePath,
              version: packageJson.version || 'unknown',
              installed: true
            })
          } catch {
            // 无效实例，跳过
          }
        }
      }
    } catch {}

    return instances
  }

  /**
   * 检查OpenClaw是否已安装
   * @returns {boolean} 是否已安装
   */
  async isInstalled() {
    try {
      const packageJsonPath = path.join(this.installDir, 'package.json')
      await fs.access(packageJsonPath)
      return true
    } catch {
      return false
    }
  }

  /**
   * 获取当前安装版本
   * @returns {string} 版本号
   */
  async getCurrentVersion() {
    try {
      const packageJsonPath = path.join(this.installDir, 'package.json')
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'))
      return packageJson.version || 'unknown'
    } catch {
      return 'unknown'
    }
  }

  /**
   * 安装OpenClaw
   * @param {object} config - 配置信息
   * @param {Function} progressCallback - 进度回调
   * @param {Function} logCallback - 日志回调
   * @returns {object} 安装结果
   */
  async install(config = {}, progressCallback = null, logCallback = null) {
    this.installProgress = 0
    this.installLogs = []
    const env = depsManager.getEnvironmentVariables()

    // 设置自定义安装路径
    if (config.installPath) {
      try {
        this.setInstallDir(config.installPath)
      } catch (error) {
        return {
          success: false,
          error: error.message,
          logs: []
        }
      }
    }

    const log = (message) => {
      const logEntry = `[${new Date().toISOString()}] ${message}`
      this.installLogs.push(logEntry)
      if (logCallback) {
        logCallback(security.desensitizeLog(logEntry))
      }
    }

    try {
      log('开始安装OpenClaw')

      // 步骤0: 验证配置
      progressCallback?.(5, '验证安装配置...')
      this.validateInstallConfig(config, log)

      // 步骤1: 检查依赖
      progressCallback?.(10, '检查系统依赖...')
      const depsCheck = await depsManager.checkAllDependencies(
        (p, msg) => progressCallback?.(10 + p * 0.1, msg)
      )

      if (depsCheck.status !== 'satisfied') {
        throw new Error('依赖检查不通过，请先安装必需的依赖')
      }

      // 步骤2: 检查现有安装
      progressCallback?.(15, '检查现有安装...')
      const existingInstances = await this.scanExistingInstances()
      if (existingInstances.length > 0) {
        log(`检测到 ${existingInstances.length} 个现有OpenClaw实例`)
        // 这里可以根据配置决定是升级、新建还是取消
      }

      // 步骤3: 创建安装目录
      progressCallback?.(20, '创建安装目录...')
      log(`创建安装目录: ${this.installDir}`)
      await fs.mkdir(this.installDir, { recursive: true })

      // 步骤4: 克隆仓库
      progressCallback?.(30, '克隆OpenClaw仓库...')
      log(`克隆仓库: ${OPENCLAW_CONFIG.repoUrl}`)
      await this.cloneRepository(log, env)

      // 步骤5: 安装依赖
      progressCallback?.(50, '安装项目依赖...')
      log('安装项目依赖')
      await this.installDependencies(log, env)

      // 步骤6: 写入配置文件
      progressCallback?.(70, '写入配置文件...')
      log('写入配置文件')
      await this.writeConfig(config, log)

      // 步骤7: 初始化服务
      progressCallback?.(80, '初始化服务...')
      log('初始化服务')
      await this.initializeService(log, env)

      // 步骤8: 启动服务
      progressCallback?.(90, '启动Dashboard服务...')
      log('启动Dashboard服务')
      const accessUrl = await this.startService(log, env)

      progressCallback?.(100, '安装完成')
      log('OpenClaw安装成功')

      // 清理敏感信息
      security.clearSensitiveData(config.apiKey)
      if (config.secret) security.clearSensitiveData(config.secret)

      return {
        success: true,
        installDir: this.installDir,
        version: await this.getCurrentVersion(),
        accessUrl,
        logs: this.getInstallLogs()
      }

    } catch (error) {
      log(`安装失败: ${error.message}`)
      // 安装失败回滚
      await this.rollbackInstallation(log)
      return {
        success: false,
        error: error.message,
        logs: this.getInstallLogs()
      }
    }
  }

  /**
   * 验证安装配置
   */
  validateInstallConfig(config, log) {
    // 验证必填字段
    if (!config.llmProvider || !OPENCLAW_CONFIG.supportedProviders.has(config.llmProvider)) {
      throw new Error(`不支持的大模型提供商: ${config.llmProvider}`)
    }

    if (!config.apiKey || !security.validateInput(config.apiKey, /^[a-zA-Z0-9_\-]+$/)) {
      throw new Error('API Key格式不正确')
    }

    if (config.endpoint && !security.validateInput(config.endpoint, /^https?:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=]+$/)) {
      throw new Error('Endpoint格式不正确')
    }

    if (!config.botName || !security.validateInput(config.botName, /^[\u4e00-\u9fa5a-zA-Z0-9_\- ]+$/)) {
      throw new Error('机器人名称格式不正确')
    }

    log('配置验证通过')
  }

  /**
   * 安装失败回滚
   */
  async rollbackInstallation(log) {
    try {
      log('开始回滚安装操作...')

      // 停止可能运行的服务
      await this.stopService(log)

      // 删除安装目录
      if (this.installDir) {
        await fs.rm(this.installDir, { recursive: true, force: true })
        log(`已删除安装目录: ${this.installDir}`)
      }

      log('回滚完成')
    } catch (rollbackError) {
      log(`回滚失败: ${rollbackError.message}`)
    }
  }

  /**
   * 克隆仓库
   */
  async cloneRepository(log, env) {
    try {
      // 创建临时目录进行安装
      const tempInstallDir = `${this.installDir}.tmp.${Date.now()}`
      log(`创建临时安装目录: ${tempInstallDir}`)
      await fs.rm(tempInstallDir, { recursive: true, force: true })
      await fs.mkdir(tempInstallDir, { recursive: true })

      await systemWorkerManager.executeCommandAsync({
        command: 'git',
        args: ['clone', '--depth', '1', '-b', OPENCLAW_CONFIG.defaultBranch, OPENCLAW_CONFIG.repoUrl, '.'],
        cwd: tempInstallDir,
        env,
        onStdout: (data) => log(data.trim()),
        onStderr: (data) => log(data.trim())
      })

      // 克隆成功后，原子移动到目标目录
      log('原子移动临时目录到目标安装目录')
      await fs.rm(this.installDir, { recursive: true, force: true })
      await fs.rename(tempInstallDir, this.installDir)
    } catch (error) {
      log(`克隆仓库失败: ${error.message}`)
      throw new Error(`克隆仓库失败: ${error.message}`)
    }
  }

  /**
   * 安装项目依赖
   */
  async installDependencies(log, env) {
    try {
      // 优先使用pnpm，然后是yarn，最后是npm
      let packageManager = 'npm'
      if (depsManager.depsStatus.pnpm?.isSatisfied) {
        packageManager = 'pnpm'
      } else if (depsManager.depsStatus.yarn?.isSatisfied) {
        packageManager = 'yarn'
      }

      log(`使用${packageManager}安装依赖`)
      await systemWorkerManager.executeCommandAsync({
        command: packageManager,
        args: ['install'],
        cwd: this.installDir,
        env,
        onStdout: (data) => log(data.trim()),
        onStderr: (data) => log(data.trim())
      })
    } catch (error) {
      log(`安装依赖失败: ${error.message}`)
      throw new Error(`安装依赖失败: ${error.message}`)
    }
  }

  /**
   * 写入配置文件
   */
  async writeConfig(config, log) {
    try {
      const configPath = path.join(this.installDir, OPENCLAW_CONFIG.configFile)

      // 读取现有配置（如果存在）
      let existingConfig = ''
      try {
        existingConfig = await fs.readFile(configPath, 'utf8')
      } catch {}

      // 构建新配置
      const configEntries = []

      // 基础配置
      configEntries.push(`PORT=${OPENCLAW_CONFIG.defaultPort}`)
      configEntries.push(`HOST=127.0.0.1`)
      configEntries.push(`NODE_ENV=production`)

      // 大模型配置
      if (config.llmProvider) {
        configEntries.push(`LLM_PROVIDER=${config.llmProvider}`)
      }
      if (config.apiKey) {
        configEntries.push(`LLM_API_KEY=${config.apiKey}`)
      }
      if (config.endpoint) {
        configEntries.push(`LLM_ENDPOINT=${config.endpoint}`)
      }
      if (config.model) {
        configEntries.push(`LLM_MODEL=${config.model}`)
      }
      if (config.botName) {
        configEntries.push(`BOT_NAME=${config.botName}`)
      }
      if (config.botDescription) {
        configEntries.push(`BOT_DESCRIPTION=${config.botDescription}`)
      }
      if (config.userName) {
        configEntries.push(`USER_NAME=${config.userName}`)
      }

      // 企微配置
      if (config.wecomCorpId) {
        configEntries.push(`WECOM_CORP_ID=${config.wecomCorpId}`)
      }
      if (config.wecomSecret) {
        configEntries.push(`WECOM_SECRET=${config.wecomSecret}`)
      }
      if (config.wecomAgentId) {
        configEntries.push(`WECOM_AGENT_ID=${config.wecomAgentId}`)
      }
      if (config.wecomToken) {
        configEntries.push(`WECOM_TOKEN=${config.wecomToken}`)
      }
      if (config.wecomEncodingAesKey) {
        configEntries.push(`WECOM_ENCODING_AES_KEY=${config.wecomEncodingAesKey}`)
      }

      // 其他配置
      Object.entries(config).forEach(([key, value]) => {
        if (value && !key.startsWith('llm') && !key.startsWith('wecom')) {
          configEntries.push(`${key}=${value}`)
        }
      })

      // 合并配置，保留原有未覆盖的配置
      const existingLines = existingConfig.split('\n').filter(line => line.trim() && !line.startsWith('#'))
      const existingKeys = new Set(existingLines.map(line => line.split('=')[0]))

      configEntries.forEach(entry => {
        const key = entry.split('=')[0]
        existingKeys.delete(key)
      })

      // 保留原有未被覆盖的配置
      existingLines.forEach(line => {
        const key = line.split('=')[0]
        if (existingKeys.has(key)) {
          configEntries.push(line)
        }
      })

      // 写入配置文件
      const configContent = configEntries.join('\n') + '\n'
      await fs.writeFile(configPath, configContent, 'utf8')
      log('配置文件写入成功')

    } catch (error) {
      log(`写入配置文件失败: ${error.message}`)
      throw new Error(`写入配置文件失败: ${error.message}`)
    }
  }

  /**
   * 初始化服务
   */
  async initializeService(log, env) {
    try {
      // 运行初始化脚本（如果有）
      const initScriptPath = path.join(this.installDir, 'scripts', 'init.js')
      try {
        await fs.access(initScriptPath)
        log('运行初始化脚本')
        await systemWorkerManager.executeCommandAsync({
          command: 'node',
          args: ['scripts/init.js'],
          cwd: this.installDir,
          env,
          onStdout: (data) => log(data.trim()),
          onStderr: (data) => log(data.trim())
        })
      } catch {
        log('没有找到初始化脚本，跳过')
      }
    } catch (error) {
      log(`初始化服务失败: ${error.message}`)
      throw new Error(`初始化服务失败: ${error.message}`)
    }
  }

  /**
   * 启动服务
   */
  async startService(log, env) {
    try {
      // 先停止已运行的服务
      await this.stopService(log)

      // 启动Dashboard服务
      log('启动Dashboard服务')

      const accessUrl = `http://localhost:${OPENCLAW_CONFIG.defaultPort}`

      // 异步启动服务，不阻塞安装流程
      this.runningProcess = systemWorkerManager.executeCommand({
        command: OPENCLAW_CONFIG.dashboardCommand[0],
        args: OPENCLAW_CONFIG.dashboardCommand.slice(1),
        cwd: this.installDir,
        env,
        onStdout: (data) => {
          log(`[服务] ${data.trim()}`)
          // 检测服务启动成功
          if (data.includes('running') || data.includes('started') || data.includes(OPENCLAW_CONFIG.defaultPort.toString())) {
            log(`服务启动成功，访问地址: ${accessUrl}`)
          }
        },
        onStderr: (data) => {
          log(`[服务错误] ${data.trim()}`)
        },
        onExit: (code) => {
          log(`服务已退出，退出码: ${code}`)
          this.runningProcess = null
        },
        onError: (error) => {
          log(`服务启动失败: ${error.message}`)
          this.runningProcess = null
        }
      })

      // 等待服务启动
      await new Promise(resolve => setTimeout(resolve, 3000))

      return accessUrl
    } catch (error) {
      log(`启动服务失败: ${error.message}`)
      throw new Error(`启动服务失败: ${error.message}`)
    }
  }

  /**
   * 停止服务
   */
  async stopService(log) {
    try {
      if (this.runningProcess) {
        log('停止正在运行的服务')
        systemWorkerManager.killTask(this.runningProcess)
        this.runningProcess = null
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      // 额外检查并杀死相关进程
      if (process.platform === 'win32') {
        try {
          await systemWorkerManager.executeCommandAsync({
            command: 'taskkill',
            args: ['/f', '/im', 'node.exe', '/fi', `WINDOWTITLE eq ${OPENCLAW_CONFIG.processName}*`],
            shell: false
          })
        } catch {}
      } else {
        try {
          await systemWorkerManager.executeCommandAsync({
            command: 'pkill',
            args: ['-f', OPENCLAW_CONFIG.processName],
            shell: false
          })
        } catch {}
      }

      log('服务已停止')
    } catch (error) {
      log(`停止服务失败: ${error.message}`)
    }
  }

  /**
   * 更新OpenClaw
   * @param {Function} progressCallback - 进度回调
   * @param {Function} logCallback - 日志回调
   * @returns {object} 更新结果
   */
  async update(progressCallback = null, logCallback = null) {
    this.installProgress = 0
    this.installLogs = []
    const env = depsManager.getEnvironmentVariables()
    let backupDir = null

    const log = (message) => {
      const logEntry = `[${new Date().toISOString()}] ${message}`
      this.installLogs.push(logEntry)
      if (logCallback) {
        logCallback(security.desensitizeLog(logEntry))
      }
    }

    try {
      if (!await this.isInstalled()) {
        throw new Error('OpenClaw尚未安装')
      }

      log('开始更新OpenClaw')

      // 步骤1: 停止服务
      progressCallback?.(10, '停止运行中的服务...')
      await this.stopService(log)

      // 步骤2: 创建备份
      progressCallback?.(20, '创建备份...')
      backupDir = `${this.installDir}.backup.${Date.now()}`
      log(`创建备份目录: ${backupDir}`)
      await fs.cp(this.installDir, backupDir, { recursive: true, force: true })

      // 步骤3: 拉取最新代码
      progressCallback?.(40, '拉取最新代码...')
      log('拉取最新代码')
      await systemWorkerManager.executeCommandAsync({
        command: 'git',
        args: ['pull', 'origin', OPENCLAW_CONFIG.defaultBranch],
        cwd: this.installDir,
        env,
        onStdout: (data) => log(data.trim()),
        onStderr: (data) => log(data.trim())
      })

      // 步骤4: 更新依赖
      progressCallback?.(60, '更新项目依赖...')
      log('更新项目依赖')
      await this.installDependencies(log, env)

      // 步骤5: 重启服务
      progressCallback?.(80, '重启服务...')
      log('重启服务')
      const accessUrl = await this.startService(log, env)

      // 步骤6: 验证服务正常运行
      progressCallback?.(90, '验证服务状态...')
      await new Promise(resolve => setTimeout(resolve, 3000)) // 等待服务启动
      const serviceStatus = await this.getServiceStatus()
      if (!serviceStatus.running) {
        throw new Error('服务启动失败')
      }

      // 更新成功，删除备份
      log('更新成功，删除备份')
      await fs.rm(backupDir, { recursive: true, force: true })

      progressCallback?.(100, '更新完成')
      log('OpenClaw更新成功')

      return {
        success: true,
        version: await this.getCurrentVersion(),
        accessUrl,
        logs: this.getInstallLogs()
      }

    } catch (error) {
      log(`更新失败: ${error.message}`)

      // 更新失败，从备份恢复
      if (backupDir && await fs.access(backupDir).then(() => true).catch(() => false)) {
        log('正在从备份恢复...')
        try {
          await this.stopService(log)
          await fs.rm(this.installDir, { recursive: true, force: true })
          await fs.rename(backupDir, this.installDir)
          // 尝试恢复服务
          await this.startService(log, env)
          log('恢复成功')
        } catch (restoreError) {
          log(`恢复失败: ${restoreError.message}`)
        }
      }

      return {
        success: false,
        error: error.message,
        logs: this.getInstallLogs()
      }
    }
  }

  /**
   * 卸载OpenClaw
   * @param {Function} progressCallback - 进度回调
   * @param {Function} logCallback - 日志回调
   * @returns {object} 卸载结果
   */
  async uninstall(progressCallback = null, logCallback = null) {
    this.installProgress = 0
    this.installLogs = []
    let backupDir = null

    const log = (message) => {
      const logEntry = `[${new Date().toISOString()}] ${message}`
      this.installLogs.push(logEntry)
      if (logCallback) {
        logCallback(security.desensitizeLog(logEntry))
      }
    }

    try {
      if (!await this.isInstalled()) {
        throw new Error('OpenClaw尚未安装')
      }

      log('开始卸载OpenClaw')

      // 步骤1: 停止服务
      progressCallback?.(20, '停止运行中的服务...')
      await this.stopService(log)

      // 步骤2: 创建备份（可选，用于恢复）
      progressCallback?.(30, '创建卸载备份...')
      backupDir = `${this.installDir}.uninstall_backup.${Date.now()}`
      log(`创建卸载备份: ${backupDir}`)
      await fs.cp(this.installDir, backupDir, { recursive: true, force: true })

      // 步骤3: 删除安装目录
      progressCallback?.(60, '删除安装文件...')
      log(`删除安装目录: ${this.installDir}`)
      await fs.rm(this.installDir, { recursive: true, force: true })

      // 步骤4: 清理配置
      progressCallback?.(90, '清理配置文件...')
      log('清理配置文件')
      // 这里可以添加清理其他配置的逻辑

      // 验证卸载成功
      if (await fs.access(this.installDir).then(() => true).catch(() => false)) {
        throw new Error('安装目录删除失败')
      }

      // 卸载成功，删除备份（可选：可以保留一段时间供用户恢复）
      log('卸载成功，删除备份')
      await fs.rm(backupDir, { recursive: true, force: true })

      progressCallback?.(100, '卸载完成')
      log('OpenClaw卸载成功')

      return {
        success: true,
        logs: this.getInstallLogs()
      }

    } catch (error) {
      log(`卸载失败: ${error.message}`)

      // 卸载失败，从备份恢复
      if (backupDir && await fs.access(backupDir).then(() => true).catch(() => false)) {
        log('卸载失败，正在从备份恢复...')
        try {
          await fs.rename(backupDir, this.installDir)
          log('恢复成功')
        } catch (restoreError) {
          log(`恢复失败: ${restoreError.message}`)
        }
      }

      return {
        success: false,
        error: error.message,
        logs: this.getInstallLogs()
      }
    }
  }

  /**
   * 启动OpenClaw服务
   * @param {Function} logCallback - 日志回调
   * @returns {object} 启动结果
   */
  async start(logCallback = null) {
    const log = (message) => {
      const logEntry = `[${new Date().toISOString()}] ${message}`
      if (logCallback) {
        logCallback(security.desensitizeLog(logEntry))
      }
    }

    try {
      if (!await this.isInstalled()) {
        throw new Error('OpenClaw尚未安装')
      }

      const env = depsManager.getEnvironmentVariables()
      const accessUrl = await this.startService(log, env)

      return {
        success: true,
        accessUrl
      }
    } catch (error) {
      log(`启动失败: ${error.message}`)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 修改配置
   * @param {object} newConfig - 新配置
   * @param {Function} logCallback - 日志回调
   * @returns {object} 修改结果
   */
  async updateConfig(newConfig, logCallback = null) {
    const log = (message) => {
      const logEntry = `[${new Date().toISOString()}] ${message}`
      if (logCallback) {
        logCallback(security.desensitizeLog(logEntry))
      }
    }

    try {
      if (!await this.isInstalled()) {
        throw new Error('OpenClaw尚未安装')
      }

      log('更新配置文件')
      await this.writeConfig(newConfig, log)

      // 重启服务使配置生效
      log('重启服务使配置生效')
      const env = depsManager.getEnvironmentVariables()
      const accessUrl = await this.startService(log, env)

      return {
        success: true,
        accessUrl
      }
    } catch (error) {
      log(`更新配置失败: ${error.message}`)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 获取安装日志
   * @returns {Array} 日志列表
   */
  getInstallLogs() {
    return this.installLogs.map(log => security.desensitizeLog(log))
  }

  /**
   * 获取服务状态
   * @returns {object} 服务状态
   */
  async getServiceStatus() {
    return {
      installed: await this.isInstalled(),
      version: await this.getCurrentVersion(),
      running: this.runningProcess !== null,
      installDir: this.installDir,
      port: OPENCLAW_CONFIG.defaultPort,
      accessUrl: this.runningProcess ? `http://localhost:${OPENCLAW_CONFIG.defaultPort}` : null
    }
  }
}

export default new OpenclawManager()
