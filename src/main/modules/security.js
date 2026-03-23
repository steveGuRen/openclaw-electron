import crypto from 'crypto'
import path from 'path'
import fs from 'fs/promises'
import os from 'os'

// 加密配置
const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const KEY_DERIVATION_ITERATIONS = 100000
const KEY_LENGTH = 32

// 敏感信息模式，用于日志脱敏
const SENSITIVE_PATTERNS = [
  /(api[_-]key|secret|password|token|auth[_-]token|access[_-]token|corp[id]|agent[id]|encoding[a-z_-]*key)[:=]\s*['"]?[a-zA-Z0-9_\-]+['"]?/gi,
  /(https?:\/\/)[^:@]+:[^@]+@/gi, // URL中的密码
  /(sk-[a-zA-Z0-9]{20,})/gi, // OpenAI风格密钥
  /(key-[a-zA-Z0-9]{20,})/gi, // 其他密钥格式
  /[a-zA-Z0-9]{32,}/g, // 32位以上随机字符串
]

// 命令执行白名单
const ALLOWED_COMMANDS = new Set([
  'node', 'npm', 'pnpm', 'yarn', 'git', 'curl', 'wget',
  'python', 'pip', 'tar', 'unzip', '7z', 'taskkill', 'pkill',
  'winget', 'brew', 'sudo', 'apt'
])

// 路径遍历检测模式
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.\\/g,
  /%2e%2e%2f/gi,
  /%2e%2e\\/gi,
  /\.\.%2f/gi,
  /\.\.%5c/gi
]

/**
 * 生成加密密钥
 * @param {string} password - 加密密码
 * @param {Buffer} salt - 盐值
 * @returns {Buffer} 加密密钥
 */
const generateKey = (password, salt) => {
  return crypto.pbkdf2Sync(password, salt, KEY_DERIVATION_ITERATIONS, KEY_LENGTH, 'sha256')
}

/**
 * 加密敏感信息
 * @param {string} plaintext - 明文
 * @param {string} password - 加密密码
 * @returns {string} 加密后的字符串（base64格式）
 */
export const encrypt = (plaintext, password) => {
  try {
    const salt = crypto.randomBytes(SALT_LENGTH)
    const iv = crypto.randomBytes(IV_LENGTH)
    const key = generateKey(password, salt)

    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()

    return Buffer.concat([salt, iv, tag, encrypted]).toString('base64')
  } catch (error) {
    throw new Error(`加密失败: ${error.message}`)
  }
}

/**
 * 解密敏感信息
 * @param {string} encryptedData - 加密后的字符串（base64格式）
 * @param {string} password - 解密密码
 * @returns {string} 明文
 */
export const decrypt = (encryptedData, password) => {
  try {
    const data = Buffer.from(encryptedData, 'base64')

    const salt = data.subarray(0, SALT_LENGTH)
    const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
    const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
    const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)

    const key = generateKey(password, salt)
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv)
    decipher.setAuthTag(tag)

    const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
    return plaintext
  } catch (error) {
    throw new Error(`解密失败: ${error.message}`)
  }
}

/**
 * 验证命令是否安全
 * @param {string} command - 要执行的命令
 * @param {Array} args - 命令参数
 * @returns {boolean} 是否安全
 */
export const validateCommand = (command, args = []) => {
  // 检查命令是否在白名单中
  const baseCommand = path.basename(command).toLowerCase()
  if (!ALLOWED_COMMANDS.has(baseCommand)) {
    return false
  }

  // 检查参数中是否有危险字符
  const dangerousPatterns = [
    /[;&|`<>{}]/, // 命令注入字符
    /\$\(.*\)/, // 命令替换
    /`.*`/, // 反引号执行
    /\${.*}/, // 变量替换
    /^\s*rm\s+/, // 删除命令
    /^\s*del\s+/, // Windows删除命令
    /^\s*format\s+/, // 格式化命令
    /^\s*mkfs\s+/, // 创建文件系统
    /^\s*dd\s+/, // dd命令
    /^\s*chmod\s+/, // 修改权限
    /^\s*chown\s+/, // 修改所有者
    /^\s*su\s+/, // 切换用户
    /^\/bin\/bash$/, // 直接调用bash
    /^bash$/, // 直接调用bash
    /^powershell$/, // 直接调用powershell
    /^cmd$/, // 直接调用cmd
    /^sh$/, // 直接调用sh
    /^\/bin\/sh$/, // 直接调用sh
  ]

  for (const arg of args) {
    for (const pattern of dangerousPatterns) {
      if (pattern.test(arg)) {
        return false
      }
    }
  }

  return true
}

/**
 * 验证路径是否安全，防止路径遍历
 * @param {string} basePath - 基础路径
 * @param {string} targetPath - 目标路径
 * @returns {boolean} 是否安全
 */
export const validatePath = (basePath, targetPath) => {
  try {
    // 规范化路径
    const normalizedBase = path.resolve(basePath)
    const normalizedTarget = path.resolve(normalizedBase, targetPath)

    // 检查目标路径是否在基础路径下
    if (!normalizedTarget.startsWith(normalizedBase + path.sep) && normalizedTarget !== normalizedBase) {
      return false
    }

    // 检查路径遍历模式
    for (const pattern of PATH_TRAVERSAL_PATTERNS) {
      if (pattern.test(targetPath)) {
        return false
      }
    }

    return true
  } catch (error) {
    return false
  }
}

/**
 * 计算文件哈希值
 * @param {string} filePath - 文件路径
 * @param {string} algorithm - 哈希算法，默认sha256
 * @returns {string} 哈希值（hex格式）
 */
export const calculateFileHash = async (filePath, algorithm = 'sha256') => {
  try {
    const fileBuffer = await fs.readFile(filePath)
    const hash = crypto.createHash(algorithm)
    hash.update(fileBuffer)
    return hash.digest('hex')
  } catch (error) {
    throw new Error(`计算文件哈希失败: ${error.message}`)
  }
}

/**
 * 验证文件哈希
 * @param {string} filePath - 文件路径
 * @param {string} expectedHash - 期望的哈希值
 * @param {string} algorithm - 哈希算法，默认sha256
 * @returns {boolean} 是否匹配
 */
export const verifyFileHash = async (filePath, expectedHash, algorithm = 'sha256') => {
  try {
    const actualHash = await calculateFileHash(filePath, algorithm)
    return actualHash.toLowerCase() === expectedHash.toLowerCase()
  } catch (error) {
    return false
  }
}

/**
 * 日志脱敏，移除敏感信息
 * @param {string} log - 原始日志内容
 * @returns {string} 脱敏后的日志
 */
export const desensitizeLog = (log) => {
  if (!log || typeof log !== 'string') {
    return log
  }

  let desensitized = log

  // 替换所有敏感模式
  for (const pattern of SENSITIVE_PATTERNS) {
    desensitized = desensitized.replace(pattern, (match) => {
      // 如果是键值对形式，保留键名
      if (match.includes(':') || match.includes('=')) {
        const [key] = match.split(/[:=]/)
        return `${key}=***`
      }
      // 保留前4位和后4位，中间用*替换
      if (match.length > 8) {
        const prefix = match.slice(0, 4)
        const suffix = match.slice(-4)
        return `${prefix}****${suffix}`
      }
      // 短于8位的全部替换为***
      return '***'
    })
  }

  // 替换URL中的密码
  desensitized = desensitized.replace(/(https?:\/\/)[^:@]+:[^@]+@/gi, '$1***:***@')

  return desensitized
}

/**
 * 生成随机字符串
 * @param {number} length - 字符串长度
 * @returns {string} 随机字符串
 */
export const generateRandomString = (length = 32) => {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length)
}

/**
 * 安全的JSON解析，防止原型污染
 * @param {string} jsonString - JSON字符串
 * @returns {object} 解析后的对象
 */
export const safeJsonParse = (jsonString) => {
  try {
    const obj = JSON.parse(jsonString)

    // 检查原型污染
    if (obj && typeof obj === 'object') {
      if (Object.prototype.hasOwnProperty.call(obj, '__proto__') ||
          Object.prototype.hasOwnProperty.call(obj, 'constructor')) {
        throw new Error('检测到潜在的原型污染')
      }
    }

    return obj
  } catch (error) {
    throw new Error(`JSON解析失败: ${error.message}`)
  }
}

/**
 * 清理内存中的敏感信息
 * @param {Buffer|string} sensitiveData - 敏感数据
 */
export const clearSensitiveData = (sensitiveData) => {
  if (Buffer.isBuffer(sensitiveData)) {
    // 用随机数据覆盖缓冲区
    crypto.randomFillSync(sensitiveData, 0, sensitiveData.length)
    // 然后用0覆盖
    sensitiveData.fill(0)
    return true
  }

  if (typeof sensitiveData === 'string') {
    // 字符串是不可变的，返回一个覆盖过的字符串
    return ' '.repeat(sensitiveData.length)
  }

  return false
}

/**
 * 安全比较两个字符串（防止时序攻击）
 * @param {string} a - 字符串A
 * @param {string} b - 字符串B
 * @returns {boolean} 是否相等
 */
export const secureCompare = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false
  }

  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)

  if (bufA.length !== bufB.length) {
    return false
  }

  return crypto.timingSafeEqual(bufA, bufB)
}

/**
 * 验证输入内容是否包含危险字符
 * @param {string} input - 输入内容
 * @param {RegExp} allowedPattern - 允许的字符正则模式
 * @returns {boolean} 是否安全
 */
export const validateInput = (input, allowedPattern = /^[a-zA-Z0-9_\-./@ ]*$/) => {
  if (!input || typeof input !== 'string') {
    return false
  }

  return allowedPattern.test(input)
}

/**
 * 清理输入中的特殊字符
 * @param {string} input - 输入内容
 * @param {RegExp} removePattern - 要移除的字符模式
 * @returns {string} 清理后的内容
 */
export const sanitizeInput = (input, removePattern = /[^\w\-./@ ]/g) => {
  if (!input || typeof input !== 'string') {
    return ''
  }

  return input.replace(removePattern, '').trim()
}

/**
 * 检查路径是否在允许的目录列表中
 * @param {string} targetPath - 要检查的路径
 * @param {string[]} allowedPaths - 允许的目录列表
 * @returns {boolean} 是否允许
 */
export const isPathAllowed = (targetPath, allowedPaths) => {
  if (!allowedPaths || !Array.isArray(allowedPaths)) {
    return false
  }

  try {
    const resolvedTarget = path.resolve(targetPath)

    return allowedPaths.some(allowedPath => {
      const resolvedAllowed = path.resolve(allowedPath)
      return resolvedTarget.startsWith(resolvedAllowed + path.sep) || resolvedTarget === resolvedAllowed
    })
  } catch (error) {
    return false
  }
}

export default {
  encrypt,
  decrypt,
  validateCommand,
  validatePath,
  calculateFileHash,
  verifyFileHash,
  desensitizeLog,
  generateRandomString,
  safeJsonParse,
  clearSensitiveData,
  secureCompare,
  validateInput,
  sanitizeInput,
  isPathAllowed
}
