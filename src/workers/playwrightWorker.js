import { parentPort } from 'worker_threads'
import { chromium } from 'playwright'
import crypto from 'crypto'

/**
 * Playwright自动化工作进程
 * 负责企微后台的自动化操作，独立子进程运行，异常不影响主进程
 */

// 全局状态管理
let browser = null
let page = null
let isCancelled = false
let currentOperation = null

// 企微后台地址
const WECOM_ADMIN_URL = 'https://work.weixin.qq.com/wework_admin/frame#/aiHelper/list?from=manage_tools'

// 操作超时配置（毫秒）
const TIMEOUT_CONFIG = {
  PAGE_LOAD: 30000,
  LOGIN_WAIT: 300000, // 5分钟登录等待时间
  ELEMENT_WAIT: 10000,
  OPERATION_RETRY: 3 // 操作重试次数
}

/**
 * 发送进度信息到主进程
 * @param {number} step - 当前步骤
 * @param {number} totalSteps - 总步骤数
 * @param {string} message - 进度消息
 */
const sendProgress = (step, totalSteps, message) => {
  parentPort.postMessage({
    type: 'progress',
    data: {
      step,
      totalSteps,
      message: desensitizeLog(message)
    }
  })
}

/**
 * 发送日志信息到主进程
 * @param {string} level - 日志级别: info, warn, error
 * @param {string} message - 日志内容
 */
const sendLog = (level, message) => {
  parentPort.postMessage({
    type: 'log',
    data: {
      level,
      message: desensitizeLog(message),
      timestamp: new Date().toISOString()
    }
  })
}

/**
 * 发送错误信息到主进程
 * @param {string} error - 错误信息
 */
const sendError = (error) => {
  parentPort.postMessage({
    type: 'error',
    error: desensitizeLog(error)
  })
}

/**
 * 发送操作结果到主进程
 * @param {object} data - 结果数据
 */
const sendResult = (data) => {
  parentPort.postMessage({
    type: 'result',
    data
  })
}

/**
 * 日志脱敏
 * @param {string} log - 原始日志
 * @returns {string} 脱敏后的日志
 */
const desensitizeLog = (log) => {
  if (!log || typeof log !== 'string') {
    return log
  }

  // 敏感信息模式
  const SENSITIVE_PATTERNS = [
    /(secret|token|password|access[_-]token|corpId|agentId|encodingAesKey)[:=]\s*['"]?[a-zA-Z0-9_\-]+['"]?/gi,
    /[a-zA-Z0-9]{32,}/g,
    /(ww[a-f0-9]{16})/gi, // 企业ID格式
    /([a-zA-Z0-9_-]{43})/g // Secret和AES Key格式
  ]

  let desensitized = log

  for (const pattern of SENSITIVE_PATTERNS) {
    desensitized = desensitized.replace(pattern, (match) => {
      if (match.includes(':') || match.includes('=')) {
        const [key] = match.split(/[:=]/)
        return `${key}=***`
      }
      if (match.length > 8) {
        return `${match.slice(0, 4)}****${match.slice(-4)}`
      }
      return '***'
    })
  }

  return desensitized
}

/**
 * 清理内存中的敏感信息
 * @param {string|Buffer} data - 敏感数据
 */
const clearSensitiveData = (data) => {
  if (Buffer.isBuffer(data)) {
    crypto.randomFillSync(data, 0, data.length)
    data.fill(0)
    return true
  }
  if (typeof data === 'string') {
    return ' '.repeat(data.length)
  }
  return false
}

/**
 * 清理所有浏览器资源
 */
const cleanupBrowser = async () => {
  try {
    if (page) {
      await page.close().catch(() => {})
      page = null
    }
    if (browser) {
      await browser.close().catch(() => {})
      browser = null
    }
    sendLog('info', '浏览器资源已清理')
  } catch (error) {
    sendLog('warn', `清理浏览器资源时出现警告: ${error.message}`)
  }
}

/**
 * 检查是否已取消操作
 * @returns {boolean} 是否已取消
 */
const checkCancelled = () => {
  if (isCancelled) {
    throw new Error('操作已被用户取消')
  }
  return false
}

/**
 * 带重试的操作执行
 * @param {Function} operation - 要执行的操作
 * @param {number} retries - 重试次数
 * @param {string} operationName - 操作名称
 * @returns {Promise<any>} 操作结果
 */
const executeWithRetry = async (operation, retries = TIMEOUT_CONFIG.OPERATION_RETRY, operationName = '操作') => {
  let lastError = null

  for (let i = 0; i <= retries; i++) {
    try {
      checkCancelled()
      return await operation()
    } catch (error) {
      lastError = error
      if (error.message.includes('操作已被用户取消')) {
        throw error
      }
      if (i < retries) {
        sendLog('warn', `${operationName}失败，正在进行第${i + 1}次重试: ${error.message}`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))) // 指数退避
      }
    }
  }

  throw lastError
}

/**
 * 等待元素并点击
 * @param {string} selector - 元素选择器
 * @param {object} options - 选项
 */
const waitAndClick = async (selector, options = {}) => {
  checkCancelled()
  const element = await page.waitForSelector(selector, {
    timeout: options.timeout || TIMEOUT_CONFIG.ELEMENT_WAIT,
    state: 'visible'
  })
  checkCancelled()
  await element.click(options)
}

/**
 * 等待元素并填写内容
 * @param {string} selector - 元素选择器
 * @param {string} value - 要填写的值
 * @param {object} options - 选项
 */
const waitAndFill = async (selector, value, options = {}) => {
  checkCancelled()
  const element = await page.waitForSelector(selector, {
    timeout: options.timeout || TIMEOUT_CONFIG.ELEMENT_WAIT,
    state: 'visible'
  })
  checkCancelled()
  await element.fill(value, options)
}

/**
 * 检测登录状态
 * @returns {Promise<boolean>} 是否已登录
 */
const checkLoginStatus = async () => {
  try {
    // 检查是否存在登录相关元素
    const loginElement = await page.$('.login_frame, .qrcode, .js_pc_qr_code')
    if (loginElement) {
      return false
    }

    // 检查是否已经进入管理后台
    const adminElement = await page.$('.header_menu, .menu_item, .aiHelper_list')
    return !!adminElement
  } catch (error) {
    return false
  }
}

/**
 * 等待用户扫码登录
 * @returns {Promise<boolean>} 登录是否成功
 */
const waitForLogin = async () => {
  sendLog('info', '等待用户扫码登录企微后台')
  sendProgress(2, 8, '请使用企微手机端扫码登录')

  const startTime = Date.now()

  while (Date.now() - startTime < TIMEOUT_CONFIG.LOGIN_WAIT) {
    checkCancelled()

    const isLoggedIn = await checkLoginStatus()
    if (isLoggedIn) {
      sendLog('info', '登录成功')
      return true
    }

    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  throw new Error('登录超时，请重试')
}

/**
 * 提取企微配置信息
 * @returns {Promise<object>} 配置信息
 */
const extractWecomConfig = async () => {
  sendLog('info', '正在提取机器人配置信息')

  // 等待配置信息加载
  await page.waitForSelector('.app_info, .secret_info, .corp_id_display', { timeout: TIMEOUT_CONFIG.ELEMENT_WAIT })

  // 提取corpId
  let corpId = ''
  try {
    // 从页面信息中提取corpId，通常在页面URL或全局变量中
    corpId = await page.evaluate(() => {
      // 尝试从全局变量获取
      if (window.wx && window.wx.corpId) {
        return window.wx.corpId
      }
      // 尝试从页面元素获取
      const corpIdElement = document.querySelector('.corp_id, [data-corp-id], .corpId_display')
      if (corpIdElement) {
        return corpIdElement.textContent.trim() || corpIdElement.getAttribute('data-corp-id')
      }
      // 尝试从URL获取
      const urlMatch = window.location.href.match(/corpId=([^&]+)/)
      if (urlMatch) {
        return urlMatch[1]
      }
      return ''
    })
  } catch (error) {
    sendLog('warn', `提取corpId时出现警告: ${error.message}`)
  }

  // 提取secret
  let secret = ''
  try {
    secret = await page.evaluate(() => {
      const secretElement = document.querySelector('.secret_value, [data-secret], .app_secret')
      if (secretElement) {
        return secretElement.textContent.trim() || secretElement.getAttribute('data-secret')
      }
      return ''
    })
  } catch (error) {
    sendLog('warn', `提取secret时出现警告: ${error.message}`)
  }

  // 提取agentId
  let agentId = ''
  try {
    agentId = await page.evaluate(() => {
      const agentIdElement = document.querySelector('.agent_id_value, [data-agent-id], .app_agentId')
      if (agentIdElement) {
        return agentIdElement.textContent.trim() || agentIdElement.getAttribute('data-agent-id')
      }
      // 尝试从URL获取
      const urlMatch = window.location.href.match(/agentId=(\d+)/)
      if (urlMatch) {
        return urlMatch[1]
      }
      return ''
    })
  } catch (error) {
    sendLog('warn', `提取agentId时出现警告: ${error.message}`)
  }

  // 验证配置信息
  if (!corpId || !secret || !agentId) {
    throw new Error('无法获取完整的机器人配置信息，请手动记录')
  }

  return {
    corpId,
    secret,
    agentId
  }
}

/**
 * 执行企微自动化集成流程
 * @param {object} config - 配置信息
 * @param {string} config.robotName - 机器人名称
 * @param {string} config.robotDesc - 机器人描述
 * @returns {Promise<object>} 集成结果
 */
const runWecomAutomation = async (config) => {
  const totalSteps = 8
  let wecomConfig = null

  try {
    isCancelled = false
    currentOperation = 'wecomIntegration'

    // 步骤1: 启动浏览器
    sendProgress(1, totalSteps, '启动浏览器（无痕模式）')
    sendLog('info', '正在启动Chromium浏览器（无痕模式）')

    browser = await executeWithRetry(async () => {
      return await chromium.launch({
        headless: false, // 显示浏览器窗口让用户扫码
        args: [
          '--incognito', // 无痕模式
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-sync',
          '--disable-cache',
          '--disable-application-cache',
          '--disable-offline-load-stale-cache',
          '--disk-cache-size=0'
        ]
      })
    }, 2, '启动浏览器')

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
      javaScriptEnabled: true,
      acceptDownloads: false,
      permissions: [] // 不授予任何额外权限
    })

    // 禁用所有存储
    await context.addInitScript(() => {
      // 禁用localStorage和sessionStorage
      Object.defineProperty(window, 'localStorage', { value: {} })
      Object.defineProperty(window, 'sessionStorage', { value: {} })
      // 禁用IndexedDB
      window.indexedDB = null
      // 禁用WebSQL
      window.openDatabase = null
    })

    page = await context.newPage()

    // 拦截所有网络请求，防止敏感数据泄露
    await page.route('**/*', (route) => {
      const request = route.request()
      const url = request.url()

      // 只允许企微相关的请求
      if (url.startsWith('https://work.weixin.qq.com/') ||
          url.startsWith('https://res.wx.qq.com/') ||
          url.startsWith('https://qzonestyle.gtimg.cn/')) {
        route.continue()
      } else {
        // 阻止所有第三方请求
        route.abort()
      }
    })

    // 步骤2: 访问企微管理后台
    sendProgress(2, totalSteps, '访问企微管理后台')
    sendLog('info', `正在访问企微管理后台: ${WECOM_ADMIN_URL}`)

    await executeWithRetry(async () => {
      await page.goto(WECOM_ADMIN_URL, {
        timeout: TIMEOUT_CONFIG.PAGE_LOAD,
        waitUntil: 'domcontentloaded'
      })
    }, 2, '访问企微管理后台')

    // 步骤3: 等待用户登录
    const isLoggedIn = await waitForLogin()
    if (!isLoggedIn) {
      throw new Error('登录失败')
    }

    sendProgress(3, totalSteps, '登录成功，进入智能机器人页面')

    // 步骤4: 进入智能机器人列表页面，点击创建机器人
    sendProgress(4, totalSteps, '进入智能机器人列表，准备创建机器人')
    sendLog('info', '正在查找创建机器人按钮')

    await executeWithRetry(async () => {
      // 等待机器人列表加载
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: TIMEOUT_CONFIG.PAGE_LOAD }).catch(() => {})

      // 尝试点击创建机器人按钮（根据实际页面结构调整选择器）
      const createSelectors = [
        '.create_robot_btn',
        '.js_create_robot',
        '[data-action="create"]',
        '.btn-primary:has-text("创建机器人")',
        '.create_btn'
      ]

      let clicked = false
      for (const selector of createSelectors) {
        try {
          await waitAndClick(selector, { timeout: 3000 })
          clicked = true
          break
        } catch (error) {
          continue
        }
      }

      if (!clicked) {
        throw new Error('找不到创建机器人按钮，请手动操作')
      }
    }, 2, '点击创建机器人按钮')

    // 步骤5: 填写机器人信息
    sendProgress(5, totalSteps, '填写机器人基本信息')
    sendLog('info', `正在填写机器人信息，名称: ${config.robotName}`)

    await executeWithRetry(async () => {
      // 等待表单加载
      await page.waitForSelector('input[name="robotName"], .robot_name_input', { timeout: TIMEOUT_CONFIG.ELEMENT_WAIT })

      // 填写机器人名称
      await waitAndFill('input[name="robotName"], .robot_name_input', config.robotName)

      // 填写机器人描述（如果有）
      if (config.robotDesc) {
        try {
          await waitAndFill('textarea[name="description"], .robot_desc_textarea', config.robotDesc, { timeout: 5000 })
        } catch (error) {
          sendLog('warn', '填写机器人描述失败，可能不需要描述')
        }
      }

      // 提交表单
      const submitSelectors = [
        '.submit_btn',
        '.js_submit_create',
        '.btn-primary:has-text("确定")',
        '.btn-primary:has-text("创建")',
        'button[type="submit"]'
      ]

      let submitted = false
      for (const selector of submitSelectors) {
        try {
          await waitAndClick(selector, { timeout: 3000 })
          submitted = true
          break
        } catch (error) {
          continue
        }
      }

      if (!submitted) {
        throw new Error('找不到提交按钮，请手动操作')
      }
    }, 2, '提交机器人创建表单')

    // 步骤6: 创建成功，获取配置信息
    sendProgress(6, totalSteps, '机器人创建成功，正在获取配置信息')
    sendLog('info', '机器人创建成功，正在提取配置信息')

    wecomConfig = await executeWithRetry(extractWecomConfig, 2, '提取配置信息')

    // 步骤7: 返回配置信息
    sendProgress(7, totalSteps, '配置信息获取完成')
    sendLog('info', '成功获取机器人配置信息')

    // 步骤8: 清理资源
    sendProgress(8, totalSteps, '清理浏览器资源')
    await cleanupBrowser()

    sendLog('info', '企微自动化集成完成')

    return {
      success: true,
      config: wecomConfig
    }

  } catch (error) {
    sendLog('error', `自动化流程失败: ${error.message}`)
    sendError(error.message)

    // 立即清理资源
    await cleanupBrowser()

    return {
      success: false,
      error: error.message
    }
  } finally {
    // 清理敏感信息
    if (wecomConfig) {
      if (wecomConfig.secret) clearSensitiveData(wecomConfig.secret)
      if (wecomConfig.corpId) clearSensitiveData(wecomConfig.corpId)
      if (wecomConfig.agentId) clearSensitiveData(wecomConfig.agentId)
    }
    if (config.robotName) clearSensitiveData(config.robotName)
    if (config.robotDesc) clearSensitiveData(config.robotDesc)

    currentOperation = null
    isCancelled = false
  }
}

// 监听主进程消息
parentPort.on('message', async (message) => {
  try {
    switch (message.type) {
      case 'startAutoIntegration':
        // 启动自动集成流程
        if (currentOperation) {
          sendError('已有正在执行的操作，请先停止当前操作')
          return
        }

        const { robotName, robotDesc } = message.data || {}
        if (!robotName) {
          sendError('机器人名称不能为空')
          return
        }

        const result = await runWecomAutomation({ robotName, robotDesc })
        sendResult(result)
        break

      case 'stop':
        // 停止当前操作
        sendLog('info', '收到停止操作命令')
        isCancelled = true

        // 立即清理浏览器资源
        await cleanupBrowser()

        parentPort.postMessage({
          type: 'info',
          message: 'Playwright worker已停止'
        })

        // 清空状态
        currentOperation = null
        isCancelled = false
        break

      case 'cancel':
        // 取消当前操作但不退出进程
        sendLog('info', '收到取消操作命令')
        isCancelled = true
        await cleanupBrowser()
        currentOperation = null
        break

      default:
        sendError(`未知的消息类型: ${message.type}`)
    }
  } catch (error) {
    sendError(`Playwright worker错误: ${error.message}`)
  }
})

// 处理未捕获的异常
process.on('uncaughtException', async (error) => {
  sendLog('error', `未捕获异常: ${error.message}`)
  await cleanupBrowser()
  parentPort.postMessage({
    type: 'workerError',
    error: `未捕获异常: ${desensitizeLog(error.message)}`
  })
})

process.on('unhandledRejection', async (reason) => {
  const errorMsg = reason instanceof Error ? reason.message : String(reason)
  sendLog('error', `未处理的Promise拒绝: ${errorMsg}`)
  await cleanupBrowser()
  parentPort.postMessage({
    type: 'workerError',
    error: `未处理的Promise拒绝: ${desensitizeLog(errorMsg)}`
  })
})

// 进程退出前清理资源
process.on('beforeExit', async () => {
  await cleanupBrowser()
})

process.on('SIGTERM', async () => {
  await cleanupBrowser()
  process.exit(0)
})

process.on('SIGINT', async () => {
  await cleanupBrowser()
  process.exit(0)
})
