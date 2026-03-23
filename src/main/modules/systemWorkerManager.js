import { Worker } from 'worker_threads'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class SystemWorkerManager {
  constructor() {
    this.worker = null
    this.taskCallbacks = new Map()
    this.workerPath = path.resolve(__dirname, '../../workers/systemWorker.js')
    this.initWorker()
  }

  /**
   * 初始化工作进程
   */
  initWorker() {
    if (this.worker) {
      this.worker.terminate()
    }

    this.worker = new Worker(this.workerPath)

    this.worker.on('message', (message) => {
      this.handleWorkerMessage(message)
    })

    this.worker.on('error', (error) => {
      console.error('System worker error:', error)
      // 重启worker
      setTimeout(() => this.initWorker(), 1000)
    })

    this.worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`System worker exited with code ${code}`)
        // 重启worker
        setTimeout(() => this.initWorker(), 1000)
      }
    })
  }

  /**
   * 处理工作进程消息
   */
  handleWorkerMessage(message) {
    const { taskId, type } = message

    if (taskId && this.taskCallbacks.has(taskId)) {
      const callbacks = this.taskCallbacks.get(taskId)

      switch (type) {
        case 'stdout':
          if (callbacks.onStdout) {
            callbacks.onStdout(message.data)
          }
          break
        case 'stderr':
          if (callbacks.onStderr) {
            callbacks.onStderr(message.data)
          }
          break
        case 'exit':
          if (callbacks.onExit) {
            callbacks.onExit(message.code, message.stdout, message.stderr)
          }
          this.taskCallbacks.delete(taskId)
          break
        case 'error':
          if (callbacks.onError) {
            callbacks.onError(new Error(message.error), message.stdout, message.stderr)
          }
          this.taskCallbacks.delete(taskId)
          break
        case 'killed':
          if (callbacks.onKilled) {
            callbacks.onKilled(message.message)
          }
          this.taskCallbacks.delete(taskId)
          break
        case 'downloadProgress':
          if (callbacks.onDownloadProgress) {
            callbacks.onDownloadProgress(message.progress, message.downloaded, message.total)
          }
          break
        case 'downloadComplete':
          if (callbacks.onDownloadComplete) {
            callbacks.onDownloadComplete(message.filePath, message.size)
          }
          this.taskCallbacks.delete(taskId)
          break
        case 'downloadAborted':
          if (callbacks.onDownloadAborted) {
            callbacks.onDownloadAborted(message.message)
          }
          this.taskCallbacks.delete(taskId)
          break
        case 'extractComplete':
          if (callbacks.onExtractComplete) {
            callbacks.onExtractComplete(message.destDir)
          }
          this.taskCallbacks.delete(taskId)
          break
        case 'fileOperationResult':
          if (callbacks.onFileOperationResult) {
            callbacks.onFileOperationResult(message.operation, message.result)
          }
          this.taskCallbacks.delete(taskId)
          break
      }
    }

    // 处理非任务相关消息
    if (type === 'systemInfo' && this.systemInfoCallback) {
      this.systemInfoCallback(message.data)
    }

    if (type === 'workerError') {
      console.error('Worker internal error:', message.error)
    }

    if (type === 'allTasksCancelled') {
      console.log('All worker tasks cancelled:', message.message)
      this.taskCallbacks.clear()
    }
  }

  /**
   * 执行命令
   * @param {object} options - 命令选项
   * @param {string} options.command - 命令
   * @param {Array} options.args - 参数
   * @param {string} options.cwd - 工作目录
   * @param {object} options.env - 环境变量
   * @param {boolean} options.shell - 是否使用shell
   * @param {number} options.timeout - 超时时间
   * @param {Function} options.onStdout - 标准输出回调
   * @param {Function} options.onStderr - 标准错误回调
   * @param {Function} options.onExit - 退出回调
   * @param {Function} options.onError - 错误回调
   * @returns {string} 任务ID
   */
  executeCommand(options) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const callbacks = {
      onStdout: options.onStdout,
      onStderr: options.onStderr,
      onExit: options.onExit,
      onError: options.onError,
      onKilled: options.onKilled
    }

    this.taskCallbacks.set(taskId, callbacks)

    this.worker.postMessage({
      type: 'execute',
      payload: {
        command: options.command,
        args: options.args || [],
        cwd: options.cwd,
        env: options.env || {},
        shell: options.shell || false,
        timeout: options.timeout || 3600000,
        taskId
      }
    })

    return taskId
  }

  /**
   * 执行命令并返回Promise
   * @param {object} options - 命令选项
   * @returns {Promise<{code: number, stdout: string, stderr: string}>}
   */
  executeCommandAsync(options) {
    return new Promise((resolve, reject) => {
      const stdoutBuffer = []
      const stderrBuffer = []

      const wrappedOptions = {
        ...options,
        onStdout: (data) => {
          stdoutBuffer.push(data)
          if (options.onStdout) options.onStdout(data)
        },
        onStderr: (data) => {
          stderrBuffer.push(data)
          if (options.onStderr) options.onStderr(data)
        },
        onExit: (code, stdout, stderr) => {
          resolve({
            code,
            stdout: stdout || stdoutBuffer.join(''),
            stderr: stderr || stderrBuffer.join('')
          })
        },
        onError: (error, stdout, stderr) => {
          error.stdout = stdout || stdoutBuffer.join('')
          error.stderr = stderr || stderrBuffer.join('')
          reject(error)
        }
      }

      this.executeCommand(wrappedOptions)
    })
  }

  /**
   * 终止任务
   * @param {string} taskId - 任务ID
   */
  killTask(taskId) {
    if (this.taskCallbacks.has(taskId)) {
      this.worker.postMessage({
        type: 'kill',
        payload: { taskId }
      })
    }
  }

  /**
   * 获取系统信息
   * @returns {Promise<object>} 系统信息
   */
  getSystemInfo() {
    return new Promise((resolve) => {
      this.systemInfoCallback = resolve
      this.worker.postMessage({ type: 'getSystemInfo' })
    })
  }

  /**
   * 下载文件
   * @param {object} options - 下载选项
   * @param {string} options.url - 下载URL
   * @param {string} options.destPath - 目标路径
   * @param {boolean} options.verifyHash - 是否验证哈希
   * @param {string} options.expectedHash - 期望的哈希值
   * @param {string} options.hashAlgorithm - 哈希算法
   * @param {Function} options.onDownloadProgress - 下载进度回调
   * @param {Function} options.onDownloadComplete - 下载完成回调
   * @param {Function} options.onDownloadAborted - 下载取消回调
   * @param {Function} options.onError - 错误回调
   * @returns {string} 任务ID
   */
  downloadFile(options) {
    const taskId = `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const callbacks = {
      onDownloadProgress: options.onDownloadProgress,
      onDownloadComplete: options.onDownloadComplete,
      onDownloadAborted: options.onDownloadAborted,
      onError: options.onError
    }

    this.taskCallbacks.set(taskId, callbacks)

    this.worker.postMessage({
      type: 'download',
      payload: {
        url: options.url,
        destPath: options.destPath,
        verifyHash: options.verifyHash || false,
        expectedHash: options.expectedHash || '',
        hashAlgorithm: options.hashAlgorithm || 'sha256',
        taskId
      }
    })

    return taskId
  }

  /**
   * 下载文件并返回Promise
   * @param {object} options - 下载选项
   * @returns {Promise<{filePath: string, size: number}>}
   */
  downloadFileAsync(options) {
    return new Promise((resolve, reject) => {
      const wrappedOptions = {
        ...options,
        onDownloadComplete: (filePath, size) => {
          resolve({ filePath, size })
        },
        onDownloadAborted: (message) => {
          const error = new Error(message)
          error.name = 'AbortError'
          reject(error)
        },
        onError: reject
      }

      this.downloadFile(wrappedOptions)
    })
  }

  /**
   * 解压文件
   * @param {object} options - 解压选项
   * @param {string} options.filePath - 压缩文件路径
   * @param {string} options.destDir - 目标目录
   * @param {Function} options.onExtractComplete - 解压完成回调
   * @param {Function} options.onError - 错误回调
   * @returns {string} 任务ID
   */
  extractFile(options) {
    const taskId = `extract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const callbacks = {
      onExtractComplete: options.onExtractComplete,
      onError: options.onError
    }

    this.taskCallbacks.set(taskId, callbacks)

    this.worker.postMessage({
      type: 'extract',
      payload: {
        filePath: options.filePath,
        destDir: options.destDir,
        taskId
      }
    })

    return taskId
  }

  /**
   * 解压文件并返回Promise
   * @param {object} options - 解压选项
   * @returns {Promise<{destDir: string}>}
   */
  extractFileAsync(options) {
    return new Promise((resolve, reject) => {
      const wrappedOptions = {
        ...options,
        onExtractComplete: (destDir) => {
          resolve({ destDir })
        },
        onError: reject
      }

      this.extractFile(wrappedOptions)
    })
  }

  /**
   * 执行文件操作
   * @param {object} options - 文件操作选项
   * @param {string} options.operation - 操作类型
   * @param {string} options.path - 文件路径
   * @param {any} options.data - 写入数据
   * @param {object} options.options - 操作选项
   * @param {Function} options.onFileOperationResult - 结果回调
   * @param {Function} options.onError - 错误回调
   * @returns {string} 任务ID
   */
  fileOperation(options) {
    const taskId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const callbacks = {
      onFileOperationResult: options.onFileOperationResult,
      onError: options.onError
    }

    this.taskCallbacks.set(taskId, callbacks)

    this.worker.postMessage({
      type: 'fileOperation',
      payload: {
        operation: options.operation,
        path: options.path,
        data: options.data,
        options: options.options || {},
        taskId
      }
    })

    return taskId
  }

  /**
   * 执行文件操作并返回Promise
   * @param {object} options - 文件操作选项
   * @returns {Promise<any>} 操作结果
   */
  fileOperationAsync(options) {
    return new Promise((resolve, reject) => {
      const wrappedOptions = {
        ...options,
        onFileOperationResult: (operation, result) => {
          resolve(result)
        },
        onError: reject
      }

      this.fileOperation(wrappedOptions)
    })
  }

  /**
   * 取消下载任务
   * @param {string} taskId - 任务ID
   */
  cancelDownload(taskId) {
    if (this.taskCallbacks.has(taskId)) {
      this.worker.postMessage({
        type: 'cancelDownload',
        payload: { taskId }
      })
    }
  }

  /**
   * 取消所有正在运行的任务
   */
  cancelAllTasks() {
    this.worker.postMessage({ type: 'cancelAll' })
  }

  /**
   * 销毁工作进程
   */
  destroy() {
    if (this.worker) {
      this.cancelAllTasks()
      this.worker.terminate()
      this.worker = null
    }
    this.taskCallbacks.clear()
  }
}

// 导出单例
export default new SystemWorkerManager()
