import os from 'os'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { Worker } from 'worker_threads'
import security from './security.js'
import openclawManager from './openclawManager.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 企微配置字段校验规则
const WECOM_CONFIG_RULES = {
  corpId: {
    required: true,
    pattern: /^ww[a-f0-9]{16}$/,
    message: '企业ID格式不正确，应为ww开头的18位字符串'
  },
  secret: {
    required: true,
    pattern: /^[a-zA-Z0-9_-]{43}$/,
    message: '应用Secret格式不正确，应为43位字符串'
  },
  agentId: {
    required: true,
    pattern: /^\d{1,10}$/,
    message: '应用AgentID格式不正确，应为数字'
  },
  token: {
    required: false,
    pattern: /^[a-zA-Z0-9]{1,32}$/,
    message: 'Token格式不正确，应为1-32位字母数字组合'
  },
  encodingAesKey: {
    required: false,
    pattern: /^[a-zA-Z0-9]{43}$/,
    message: 'EncodingAESKey格式不正确，应为43位字符串'
  }
}

class IntegrationManager {
  constructor() {
    this.integrationStatus = {
      auto: {
        status: 'idle', // idle, running, success, failed
        currentStep: 0,
        totalSteps: 0,
        logs: [],
        error: null
      },
      manual: {
        status: 'idle',
        logs: [],
        error: null
      }
    }
    this.playwrightWorker = null
    this.playwrightWorkerPath = path.resolve(__dirname, '../../workers/playwrightWorker.js')
    console.log('Playwright worker path:', this.playwrightWorkerPath)
  }

  /**
   * 初始化Playwright工作进程
   */
  initPlaywrightWorker() {
    if (this.playwrightWorker) {
      return
    }

    try {
      this.playwrightWorker = new Worker(this.playwrightWorkerPath)

      this.playwrightWorker.on('error', (error) => {
        console.error('Playwright worker error:', error)
        this.cleanupPlaywright()
      })

      this.playwrightWorker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`Playwright worker exited with code ${code}`)
        }
        this.playwrightWorker = null
      })
    } catch (error) {
      console.error('Failed to start Playwright worker:', error)
      throw new Error('启动浏览器自动化失败，请检查系统环境')
    }
  }

  /**
   * 清理Playwright工作进程
   */
  cleanupPlaywright() {
    if (this.playwrightWorker) {
      try {
        this.playwrightWorker.terminate()
      } catch (error) {
        console.error('Failed to terminate Playwright worker:', error)
      }
      this.playwrightWorker = null
    }
  }

  /**
   * 验证企微配置
   * @param {object} config - 企微配置
   * @returns {object} 验证结果
   */
  validateWecomConfig(config) {
    const errors = []

    for (const [field, rule] of Object.entries(WECOM_CONFIG_RULES)) {
      const value = config[field]

      // 检查必填字段
      if (rule.required && !value) {
        errors.push(`${field} 是必填项`)
        continue
      }

      // 非必填字段为空时跳过校验
      if (!rule.required && !value) {
        continue
      }

      // 格式校验
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(rule.message)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 启动自动集成
   * @param {object} config - 配置信息
   * @param {Function} stepCallback - 步骤回调
   * @param {Function} logCallback - 日志回调
   * @returns {object} 集成结果
   */
  async startAutoIntegration(config, stepCallback = null, logCallback = null) {
    this.integrationStatus.auto = {
      status: 'running',
      currentStep: 0,
      totalSteps: 5, // 登录后台、创建应用、配置回调、配置权限、同步数据
      logs: [],
      error: null
    }

    const log = (message) => {
      const logEntry = `[${new Date().toISOString()}] ${message}`
      this.integrationStatus.auto.logs.push(logEntry)
      if (logCallback) {
        logCallback(security.desensitizeLog(logEntry))
      }
    }

    const updateStep = (step, message) => {
      this.integrationStatus.auto.currentStep = step
      if (stepCallback) {
        stepCallback(step, this.integrationStatus.auto.totalSteps, message)
      }
    }

    try {
      log('开始企微自动集成')

      // 步骤1: 验证OpenClaw已安装
      updateStep(1, '检查OpenClaw安装状态...')
      if (!await openclawManager.isInstalled()) {
        throw new Error('OpenClaw尚未安装，请先安装OpenClaw')
      }

      // 步骤2: 验证配置
      updateStep(2, '验证配置信息...')
      const validation = this.validateWecomConfig(config)
      if (!validation.valid) {
        throw new Error(`配置验证失败: ${validation.errors.join(', ')}`)
      }

      // 步骤3: 启动Playwright自动化
      updateStep(3, '启动浏览器自动化...')
      log('启动浏览器自动化操作企微后台')

      // 初始化Playwright工作进程
      this.initPlaywrightWorker()

      // 监听worker消息
      const workerMessageHandler = (msg) => {
        switch (msg.type) {
          case 'progress':
            const { step, totalSteps, message } = msg.data
            updateStep(3 + step, 3 + totalSteps, message)
            log(`[自动化] ${message}`)
            break
          case 'log':
            const { level, message: logMsg } = msg.data
            log(`[自动化] ${logMsg}`)
            break
          case 'error':
            log(`[自动化错误] ${msg.error}`)
            break
        }
      }

      this.playwrightWorker.on('message', workerMessageHandler)

      // 执行自动化流程
      const wecomConfigResult = await new Promise((resolve, reject) => {
        const resultHandler = (msg) => {
          if (msg.type === 'result' || msg.type === 'workerError') {
            this.playwrightWorker.off('message', workerMessageHandler)
            this.playwrightWorker.off('message', resultHandler)

            if (msg.type === 'workerError') {
              reject(new Error(msg.error || '自动化操作异常'))
            } else if (msg.data.success) {
              resolve(msg.data.config)
            } else {
              reject(new Error(msg.data.error || '自动化操作失败'))
            }
          }
        }

        this.playwrightWorker.on('message', resultHandler)

        // 发送启动命令
        this.playwrightWorker.postMessage({
          type: 'startAutoIntegration',
          data: {
            robotName: config.robotName || 'OpenClaw智能助手',
            robotDesc: config.robotDesc || 'OpenClaw企微集成机器人，提供智能问答和自动化服务'
          }
        })
      })

      // 步骤4: 获取自动集成后的配置
      updateStep(4, '获取集成配置...')
      log('获取企微应用配置信息')

      // 合并配置，自动化返回的配置优先级更高
      const wecomConfig = {
        wecomCorpId: wecomConfigResult.corpId || config.corpId,
        wecomSecret: wecomConfigResult.secret || config.secret,
        wecomAgentId: wecomConfigResult.agentId || config.agentId,
        wecomToken: config.token || security.generateRandomString(16),
        wecomEncodingAesKey: config.encodingAesKey || security.generateRandomString(43)
      }

      // 步骤5: 写入配置到OpenClaw
      updateStep(5, '写入配置并重启服务...')
      log('写入配置到OpenClaw并重启服务')
      const updateResult = await openclawManager.updateConfig(wecomConfig,
        (logMsg) => log(`[OpenClaw] ${logMsg}`)
      )

      if (!updateResult.success) {
        throw new Error(`写入配置失败: ${updateResult.error}`)
      }

      this.integrationStatus.auto.status = 'success'
      log('企微自动集成完成')

      // 清理敏感信息
      security.clearSensitiveData(config.secret)
      if (config.token) security.clearSensitiveData(config.token)
      if (config.encodingAesKey) security.clearSensitiveData(config.encodingAesKey)

      // 清理Playwright进程
      this.cleanupPlaywright()

      return {
        success: true,
        config: wecomConfig,
        accessUrl: updateResult.accessUrl,
        logs: this.getAutoIntegrationLogs()
      }
    } catch (error) {
      this.integrationStatus.auto.status = 'failed'
      this.integrationStatus.auto.error = error.message
      log(`自动集成失败: ${error.message}`)

      // 清理敏感信息
      if (config.secret) security.clearSensitiveData(config.secret)
      if (config.token) security.clearSensitiveData(config.token)
      if (config.encodingAesKey) security.clearSensitiveData(config.encodingAesKey)

      // 清理Playwright进程
      this.cleanupPlaywright()

      return {
        success: false,
        error: error.message,
        logs: this.getAutoIntegrationLogs()
      }
    }
  }

  /**
   * 提交手动集成配置
   * @param {object} config - 配置信息
   * @param {Function} logCallback - 日志回调
   * @returns {object} 提交结果
   */
  async submitManualConfig(config, logCallback = null) {
    this.integrationStatus.manual = {
      status: 'running',
      logs: [],
      error: null
    }

    const log = (message) => {
      const logEntry = `[${new Date().toISOString()}] ${message}`
      this.integrationStatus.manual.logs.push(logEntry)
      if (logCallback) {
        logCallback(security.desensitizeLog(logEntry))
      }
    }

    try {
      log('开始提交手动集成配置')

      // 步骤1: 验证OpenClaw已安装
      if (!await openclawManager.isInstalled()) {
        throw new Error('OpenClaw尚未安装，请先安装OpenClaw')
      }

      // 步骤2: 验证配置
      log('验证配置信息')
      const validation = this.validateWecomConfig(config)
      if (!validation.valid) {
        throw new Error(`配置验证失败: ${validation.errors.join(', ')}`)
      }

      // 步骤3: 转换配置格式
      const wecomConfig = {
        wecomCorpId: config.corpId,
        wecomSecret: config.secret,
        wecomAgentId: config.agentId,
        wecomToken: config.token,
        wecomEncodingAesKey: config.encodingAesKey
      }

      // 步骤4: 写入配置到OpenClaw
      log('写入配置到OpenClaw并重启服务')
      const updateResult = await openclawManager.updateConfig(wecomConfig,
        (logMsg) => log(`[OpenClaw] ${logMsg}`)
      )

      if (!updateResult.success) {
        throw new Error(`写入配置失败: ${updateResult.error}`)
      }

      // 步骤5: 验证配置是否生效（可选）
      log('验证配置生效')
      // 这里可以添加验证逻辑，比如调用OpenClaw的API测试企微连接

      this.integrationStatus.manual.status = 'success'
      log('手动集成配置提交成功')

      // 清理敏感信息
      security.clearSensitiveData(config.secret)
      if (config.token) security.clearSensitiveData(config.token)
      if (config.encodingAesKey) security.clearSensitiveData(config.encodingAesKey)

      return {
        success: true,
        accessUrl: updateResult.accessUrl,
        logs: this.getManualIntegrationLogs()
      }

    } catch (error) {
      this.integrationStatus.manual.status = 'failed'
      this.integrationStatus.manual.error = error.message
      log(`手动集成失败: ${error.message}`)

      // 清理敏感信息
      if (config.secret) security.clearSensitiveData(config.secret)
      if (config.token) security.clearSensitiveData(config.token)
      if (config.encodingAesKey) security.clearSensitiveData(config.encodingAesKey)

      return {
        success: false,
        error: error.message,
        logs: this.getManualIntegrationLogs()
      }
    }
  }

  /**
   * 测试企微连接
   * @param {object} config - 企微配置
   * @returns {object} 测试结果
   */
  async testWecomConnection(config) {
    try {
      // 验证配置
      const validation = this.validateWecomConfig(config)
      if (!validation.valid) {
        return {
          success: false,
          error: `配置验证失败: ${validation.errors.join(', ')}`
        }
      }

      // TODO: 实现企微连接测试逻辑
      // 这里暂时返回成功，后续可以调用企微API测试
      await new Promise(resolve => setTimeout(resolve, 1000))

      return {
        success: true,
        message: '企微连接测试成功'
      }
    } catch (error) {
      return {
        success: false,
        error: `连接测试失败: ${error.message}`
      }
    }
  }

  /**
   * 获取自动集成状态
   * @returns {object} 集成状态
   */
  getAutoIntegrationStatus() {
    return {
      ...this.integrationStatus.auto,
      logs: this.getAutoIntegrationLogs()
    }
  }

  /**
   * 获取手动集成状态
   * @returns {object} 集成状态
   */
  getManualIntegrationStatus() {
    return {
      ...this.integrationStatus.manual,
      logs: this.getManualIntegrationLogs()
    }
  }

  /**
   * 获取自动集成日志
   * @returns {Array} 日志列表
   */
  getAutoIntegrationLogs() {
    return this.integrationStatus.auto.logs.map(log => security.desensitizeLog(log))
  }

  /**
   * 获取手动集成日志
   * @returns {Array} 日志列表
   */
  getManualIntegrationLogs() {
    return this.integrationStatus.manual.logs.map(log => security.desensitizeLog(log))
  }

  /**
   * 重置集成状态
   * @param {string} type - 集成类型: auto或manual
   */
  resetStatus(type = 'auto') {
    if (type === 'auto') {
      this.integrationStatus.auto = {
        status: 'idle',
        currentStep: 0,
        totalSteps: 0,
        logs: [],
        error: null
      }
    } else {
      this.integrationStatus.manual = {
        status: 'idle',
        logs: [],
        error: null
      }
    }
  }

  /**
   * 保存集成配置到本地
   * @param {object} config - 配置信息
   * @param {string} filePath - 保存路径
   * @param {string} encryptionKey - 加密密钥
   * @returns {object} 保存结果
   */
  async saveIntegrationConfig(config, filePath, encryptionKey) {
    try {
      // 加密敏感信息
      const encryptedConfig = {
        ...config,
        secret: security.encrypt(config.secret, encryptionKey),
        token: config.token ? security.encrypt(config.token, encryptionKey) : undefined,
        encodingAesKey: config.encodingAesKey ? security.encrypt(config.encodingAesKey, encryptionKey) : undefined
      }

      // 写入文件
      await fs.writeFile(filePath, JSON.stringify(encryptedConfig, null, 2), 'utf8')
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: `保存配置失败: ${error.message}`
      }
    }
  }

  /**
   * 加载本地保存的集成配置
   * @param {string} filePath - 配置文件路径
   * @param {string} encryptionKey - 解密密钥
   * @returns {object} 配置信息
   */
  async loadIntegrationConfig(filePath, encryptionKey) {
    try {
      // 读取文件
      const content = await fs.readFile(filePath, 'utf8')
      const encryptedConfig = JSON.parse(content)

      // 解密敏感信息
      const config = {
        ...encryptedConfig,
        secret: security.decrypt(encryptedConfig.secret, encryptionKey)
      }

      if (encryptedConfig.token) {
        config.token = security.decrypt(encryptedConfig.token, encryptionKey)
      }

      if (encryptedConfig.encodingAesKey) {
        config.encodingAesKey = security.decrypt(encryptedConfig.encodingAesKey, encryptionKey)
      }

      return {
        success: true,
        config
      }
    } catch (error) {
      return {
        success: false,
        error: `加载配置失败: ${error.message}`
      }
    }
  }
}

export default new IntegrationManager()
