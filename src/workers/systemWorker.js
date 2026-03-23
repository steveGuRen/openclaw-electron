import { parentPort } from 'worker_threads'
import { spawn } from 'child_process'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'
import https from 'https'
import http from 'http'
import zlib from 'zlib'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import security from '../main/modules/security.js'

const runningProcesses = new Map()
const downloadTasks = new Map()

/**
 * 执行系统命令
 * @param {object} options - 命令选项
 * @param {string} options.command - 要执行的命令
 * @param {Array} options.args - 命令参数
 * @param {string} options.cwd - 工作目录
 * @param {object} options.env - 环境变量
 * @param {string} options.taskId - 任务ID
 * @param {boolean} options.shell - 是否使用shell执行
 * @param {number} options.timeout - 超时时间（毫秒）
 */
const executeCommand = async (options) => {
  const { command, args = [], cwd, env = {}, taskId, shell = false, timeout = 3600000 } = options

  try {
    // 安全校验
    if (!security.validateCommand(command, args)) {
      throw new Error(`命令不被允许: ${command}`)
    }

    // 准备环境变量，合并系统环境变量
    const processEnv = {
      ...process.env,
      ...env
    }

    // 启动子进程
    const childProcess = spawn(command, args, {
      cwd,
      env: processEnv,
      shell,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    // 存储进程引用
    runningProcesses.set(taskId, childProcess)

    // 设置超时
    const timeoutId = setTimeout(() => {
      if (childProcess && !childProcess.killed) {
        childProcess.kill('SIGTERM')
        setTimeout(() => {
          if (!childProcess.killed) {
            childProcess.kill('SIGKILL')
          }
        }, 5000)
        parentPort.postMessage({
          type: 'error',
          taskId,
          error: `命令执行超时（${timeout}ms）`
        })
      }
    }, timeout)

    let stdout = ''
    let stderr = ''

    // 处理标准输出
    childProcess.stdout.on('data', (data) => {
      const output = data.toString()
      stdout += output
      parentPort.postMessage({
        type: 'stdout',
        taskId,
        data: security.desensitizeLog(output)
      })
    })

    // 处理标准错误
    childProcess.stderr.on('data', (data) => {
      const output = data.toString()
      stderr += output
      parentPort.postMessage({
        type: 'stderr',
        taskId,
        data: security.desensitizeLog(output)
      })
    })

    // 处理进程退出
    childProcess.on('close', (code) => {
      clearTimeout(timeoutId)
      runningProcesses.delete(taskId)

      if (code === 0) {
        parentPort.postMessage({
          type: 'exit',
          taskId,
          code,
          stdout: security.desensitizeLog(stdout),
          stderr: security.desensitizeLog(stderr)
        })
      } else {
        parentPort.postMessage({
          type: 'error',
          taskId,
          error: `命令执行失败，退出码: ${code}`,
          code,
          stdout: security.desensitizeLog(stdout),
          stderr: security.desensitizeLog(stderr)
        })
      }
    })

    // 处理进程错误
    childProcess.on('error', (error) => {
      clearTimeout(timeoutId)
      runningProcesses.delete(taskId)
      parentPort.postMessage({
        type: 'error',
        taskId,
        error: `进程启动失败: ${error.message}`
      })
    })

  } catch (error) {
    parentPort.postMessage({
      type: 'error',
      taskId,
      error: error.message
    })
  }
}

/**
 * 终止正在运行的进程
 * @param {string} taskId - 任务ID
 */
const killProcess = (taskId) => {
  const childProcess = runningProcesses.get(taskId)
  if (childProcess && !childProcess.killed) {
    childProcess.kill('SIGTERM')
    setTimeout(() => {
      if (!childProcess.killed) {
        childProcess.kill('SIGKILL')
      }
    }, 5000)
    runningProcesses.delete(taskId)
    parentPort.postMessage({
      type: 'killed',
      taskId,
      message: '进程已终止'
    })
  } else {
    parentPort.postMessage({
      type: 'error',
      taskId,
      error: '进程不存在或已结束'
    })
  }
}

/**
 * 获取系统信息
 */
const getSystemInfo = async () => {
  try {
    const info = {
      platform: process.platform,
      arch: process.arch,
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      homedir: os.homedir(),
      tmpdir: os.tmpdir(),
      hostname: os.hostname(),
      release: os.release()
    }
    parentPort.postMessage({
      type: 'systemInfo',
      data: info
    })
  } catch (error) {
    parentPort.postMessage({
      type: 'error',
      error: `获取系统信息失败: ${error.message}`
    })
  }
}

/**
 * 下载文件
 * @param {object} options - 下载选项
 * @param {string} options.url - 下载URL
 * @param {string} options.destPath - 目标路径
 * @param {string} options.taskId - 任务ID
 * @param {boolean} options.verifyHash - 是否验证哈希
 * @param {string} options.expectedHash - 期望的哈希值
 * @param {string} options.hashAlgorithm - 哈希算法
 */
const downloadFile = async (options) => {
  const { url, destPath, taskId, verifyHash = false, expectedHash = '', hashAlgorithm = 'sha256' } = options
  let abortController = null

  try {
    // 路径安全校验
    const normalizedDest = path.resolve(destPath)
    const allowedPaths = [os.tmpdir(), os.homedir()]
    if (!security.isPathAllowed(normalizedDest, allowedPaths)) {
      throw new Error('下载路径不被允许')
    }

    // 创建目录
    await fs.mkdir(path.dirname(normalizedDest), { recursive: true })

    // 创建HTTP/HTTPS请求
    const urlObj = new URL(url)
    const httpModule = urlObj.protocol === 'https:' ? https : http

    abortController = new AbortController()
    downloadTasks.set(taskId, abortController)

    const response = await new Promise((resolve, reject) => {
      const req = httpModule.get(url, {
        signal: abortController.signal,
        timeout: 30000
      }, resolve)

      req.on('error', reject)
      req.on('timeout', () => {
        req.destroy()
        reject(new Error('下载请求超时'))
      })
    })

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(`下载失败，HTTP状态码: ${response.statusCode}`)
    }

    const totalSize = parseInt(response.headers['content-length'] || '0', 10)
    let downloadedSize = 0

    // 创建写入流
    const writeStream = createWriteStream(normalizedDest)

    // 监听数据事件计算进度
    response.on('data', (chunk) => {
      downloadedSize += chunk.length
      const progress = totalSize > 0 ? Math.round((downloadedSize / totalSize) * 100) : 0
      parentPort.postMessage({
        type: 'downloadProgress',
        taskId,
        progress,
        downloaded: downloadedSize,
        total: totalSize
      })
    })

    // 下载文件
    await pipeline(response, writeStream)
    downloadTasks.delete(taskId)

    // 验证文件哈希
    if (verifyHash && expectedHash) {
      const isValid = await security.verifyFileHash(normalizedDest, expectedHash, hashAlgorithm)
      if (!isValid) {
        await fs.unlink(normalizedDest)
        throw new Error('文件哈希验证失败，可能已被篡改')
      }
    }

    parentPort.postMessage({
      type: 'downloadComplete',
      taskId,
      filePath: normalizedDest,
      size: downloadedSize
    })

  } catch (error) {
    downloadTasks.delete(taskId)
    if (error.name === 'AbortError') {
      parentPort.postMessage({
        type: 'downloadAborted',
        taskId,
        message: '下载已取消'
      })
    } else {
      parentPort.postMessage({
        type: 'error',
        taskId,
        error: `下载失败: ${error.message}`
      })
    }
  }
}

/**
 * 取消下载任务
 * @param {string} taskId - 任务ID
 */
const cancelDownload = (taskId) => {
  const abortController = downloadTasks.get(taskId)
  if (abortController) {
    abortController.abort()
    downloadTasks.delete(taskId)
  }
}

/**
 * 解压文件
 * @param {object} options - 解压选项
 * @param {string} options.filePath - 压缩文件路径
 * @param {string} options.destDir - 目标目录
 * @param {string} options.taskId - 任务ID
 */
const extractFile = async (options) => {
  const { filePath, destDir, taskId } = options

  try {
    // 路径安全校验
    const normalizedFile = path.resolve(filePath)
    const normalizedDest = path.resolve(destDir)

    const allowedPaths = [os.tmpdir(), os.homedir()]
    if (!security.isPathAllowed(normalizedFile, allowedPaths) ||
        !security.isPathAllowed(normalizedDest, allowedPaths)) {
      throw new Error('路径不被允许')
    }

    // 创建目标目录
    await fs.mkdir(normalizedDest, { recursive: true })

    let command, args

    // 根据文件扩展名选择解压方式
    const ext = path.extname(filePath).toLowerCase()
    if (ext === '.zip') {
      if (process.platform === 'win32') {
        command = 'powershell'
        args = [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          'Expand-Archive',
          '-Path', normalizedFile,
          '-DestinationPath', normalizedDest,
          '-Force'
        ]
      } else {
        command = 'unzip'
        args = ['-o', normalizedFile, '-d', normalizedDest]
      }
    } else if (ext === '.tar.gz' || ext === '.tgz') {
      command = 'tar'
      args = ['xzf', normalizedFile, '-C', normalizedDest]
    } else if (ext === '.tar.xz') {
      command = 'tar'
      args = ['xJf', normalizedFile, '-C', normalizedDest]
    } else if (ext === '.7z') {
      command = '7z'
      args = ['x', normalizedFile, `-o${normalizedDest}`, '-y']
    } else {
      throw new Error(`不支持的压缩格式: ${ext}`)
    }

    // 执行解压命令
    await new Promise((resolve, reject) => {
      const childProcess = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
      })

      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`解压失败，退出码: ${code}`))
        }
      })

      childProcess.on('error', reject)
    })

    parentPort.postMessage({
      type: 'extractComplete',
      taskId,
      destDir: normalizedDest
    })

  } catch (error) {
    parentPort.postMessage({
      type: 'error',
      taskId,
      error: `解压失败: ${error.message}`
    })
  }
}

/**
 * 文件操作
 * @param {object} options - 文件操作选项
 * @param {string} options.operation - 操作类型：read, write, delete, exists, mkdir, readdir, stat
 * @param {string} options.path - 文件路径
 * @param {any} options.data - 写入数据
 * @param {object} options.options - 操作选项
 * @param {string} options.taskId - 任务ID
 */
const fileOperation = async (options) => {
  const { operation, path: filePath, data, options: fsOptions = {}, taskId } = options

  try {
    // 路径安全校验
    const normalizedPath = path.resolve(filePath)
    const allowedPaths = [os.tmpdir(), os.homedir()]
    if (!security.isPathAllowed(normalizedPath, allowedPaths)) {
      throw new Error('路径不被允许')
    }

    let result

    switch (operation) {
      case 'read':
        result = await fs.readFile(normalizedPath, fsOptions.encoding || 'utf8')
        break
      case 'write':
        await fs.mkdir(path.dirname(normalizedPath), { recursive: true })
        await fs.writeFile(normalizedPath, data, fsOptions)
        result = { success: true, path: normalizedPath }
        break
      case 'delete':
        await fs.rm(normalizedPath, { recursive: true, force: true, ...fsOptions })
        result = { success: true, path: normalizedPath }
        break
      case 'exists':
        try {
          await fs.access(normalizedPath)
          result = true
        } catch {
          result = false
        }
        break
      case 'mkdir':
        await fs.mkdir(normalizedPath, { recursive: true, ...fsOptions })
        result = { success: true, path: normalizedPath }
        break
      case 'readdir':
        result = await fs.readdir(normalizedPath, fsOptions)
        break
      case 'stat':
        result = await fs.stat(normalizedPath)
        break
      default:
        throw new Error(`未知的文件操作类型: ${operation}`)
    }

    parentPort.postMessage({
      type: 'fileOperationResult',
      taskId,
      operation,
      result
    })

  } catch (error) {
    parentPort.postMessage({
      type: 'error',
      taskId,
      error: `文件操作失败: ${error.message}`
    })
  }
}

/**
 * 取消所有正在运行的任务
 */
const cancelAllTasks = () => {
  // 终止所有进程
  runningProcesses.forEach((process, taskId) => {
    if (!process.killed) {
      process.kill('SIGTERM')
      setTimeout(() => {
        if (!process.killed) {
          process.kill('SIGKILL')
        }
      }, 5000)
    }
  })
  runningProcesses.clear()

  // 取消所有下载
  downloadTasks.forEach(abortController => {
    abortController.abort()
  })
  downloadTasks.clear()

  parentPort.postMessage({
    type: 'allTasksCancelled',
    message: '所有任务已取消'
  })
}

// 监听主进程消息
parentPort.on('message', async (message) => {
  try {
    switch (message.type) {
      case 'execute':
        await executeCommand(message.payload)
        break
      case 'kill':
        killProcess(message.payload.taskId)
        break
      case 'getSystemInfo':
        await getSystemInfo()
        break
      case 'download':
        await downloadFile(message.payload)
        break
      case 'cancelDownload':
        cancelDownload(message.payload.taskId)
        break
      case 'extract':
        await extractFile(message.payload)
        break
      case 'fileOperation':
        await fileOperation(message.payload)
        break
      case 'cancelAll':
        cancelAllTasks()
        break
      default:
        parentPort.postMessage({
          type: 'error',
          error: `未知的消息类型: ${message.type}`
        })
    }
  } catch (error) {
    parentPort.postMessage({
      type: 'workerError',
      error: `消息处理失败: ${error.message}`
    })
  }
})

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  parentPort.postMessage({
    type: 'workerError',
    error: `工作进程未捕获异常: ${error.message}`
  })
})

process.on('unhandledRejection', (reason) => {
  parentPort.postMessage({
    type: 'workerError',
    error: `工作进程未处理的Promise拒绝: ${reason}`
  })
})
