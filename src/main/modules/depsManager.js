import os from 'os'
import fs from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import systemWorkerManager from './systemWorkerManager.js'
import security from './security.js'

const execAsync = promisify(exec)

// 依赖配置
const DEPENDENCIES = {
  node: {
    minVersion: '24.0.0',
    required: true
  },
  git: {
    minVersion: '2.30.0',
    required: true
  },
  npm: {
    minVersion: '9.0.0',
    required: true
  },
  pnpm: {
    minVersion: '8.0.0',
    required: false
  },
  yarn: {
    minVersion: '1.22.0',
    required: false
  }
}

// 最小磁盘空间要求（字节）- 10GB
const MIN_REQUIRED_SPACE = 10 * 1024 * 1024 * 1024

// 最小内存要求（字节）- 2GB
const MIN_REQUIRED_MEMORY = 2 * 1024 * 1024 * 1024

// 安装缓存目录
const INSTALL_CACHE_DIR = path.join(os.homedir(), '.dclaw', 'cache')

// 依赖安装目录
const DEPS_INSTALL_DIR = path.join(os.homedir(), '.dclaw', 'tools')

class DepsManager {
  constructor() {
    this.depsStatus = {}
    this.installProgress = 0
    this.installLogs = []
  }

  /**
   * 比较版本号
   * @param {string} v1 - 版本号1
   * @param {string} v2 - 版本号2
   * @returns {number} 1: v1 > v2, -1: v1 < v2, 0: 相等
   */
  compareVersions(v1, v2) {
    const parts1 = v1.replace(/[^0-9.]/g, '').split('.').map(Number)
    const parts2 = v2.replace(/[^0-9.]/g, '').split('.').map(Number)

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const a = parts1[i] || 0
      const b = parts2[i] || 0
      if (a > b) return 1
      if (a < b) return -1
    }
    return 0
  }

  /**
   * 检测Node.js版本
   */
  async checkNodeVersion() {
    try {
      // 执行node -v命令检测系统安装的Node.js版本，避免Electron内置版本的干扰
      const { stdout } = await execAsync('node -v')
      const version = stdout.trim().slice(1) // 去掉v前缀
      const minVersion = DEPENDENCIES.node.minVersion
      const isSatisfied = this.compareVersions(version, minVersion) >= 0

      // 获取Node.js安装路径
      let nodePath = ''
      try {
        if (process.platform === 'win32') {
          const { stdout: whereOutput } = await execAsync('where node')
          nodePath = whereOutput.split('\n')[0].trim()
        } else {
          const { stdout: whichOutput } = await execAsync('which node')
          nodePath = whichOutput.trim()
        }
      } catch {}

      return {
        name: 'node',
        installed: true,
        version,
        minVersion,
        isSatisfied,
        path: nodePath || process.execPath
      }
    } catch (error) {
      return {
        name: 'node',
        installed: false,
        error: error.message
      }
    }
  }

  /**
   * 检测Git版本
   */
  async checkGitVersion() {
    try {
      const { stdout } = await execAsync('git --version')
      const versionMatch = stdout.match(/git version ([\d.]+)/)
      if (!versionMatch) {
        throw new Error('无法获取Git版本')
      }

      const version = versionMatch[1]
      const minVersion = DEPENDENCIES.git.minVersion
      const isSatisfied = this.compareVersions(version, minVersion) >= 0

      // 获取Git安装路径
      let gitPath = ''
      try {
        if (process.platform === 'win32') {
          const { stdout: whereOutput } = await execAsync('where git')
          gitPath = whereOutput.split('\n')[0].trim()
        } else {
          const { stdout: whichOutput } = await execAsync('which git')
          gitPath = whichOutput.trim()
        }
      } catch {}

      return {
        name: 'git',
        installed: true,
        version,
        minVersion,
        isSatisfied,
        path: gitPath
      }
    } catch (error) {
      return {
        name: 'git',
        installed: false,
        error: error.message
      }
    }
  }

  /**
   * 检测包管理器版本
   */
  async checkPackageManager(name) {
    try {
      const { stdout } = await execAsync(`${name} --version`)
      const version = stdout.trim()
      const minVersion = DEPENDENCIES[name].minVersion
      const isSatisfied = this.compareVersions(version, minVersion) >= 0

      // 获取安装路径
      let pmPath = ''
      try {
        if (process.platform === 'win32') {
          const { stdout: whereOutput } = await execAsync(`where ${name}`)
          pmPath = whereOutput.split('\n')[0].trim()
        } else {
          const { stdout: whichOutput } = await execAsync(`which ${name}`)
          pmPath = whichOutput.trim()
        }
      } catch {}

      return {
        name,
        installed: true,
        version,
        minVersion,
        isSatisfied,
        path: pmPath
      }
    } catch (error) {
      return {
        name,
        installed: false,
        error: error.message
      }
    }
  }

  /**
   * 检测磁盘空间
   */
  async checkDiskSpace() {
    try {
      const checkPath = os.homedir() // 检查用户目录所在磁盘

      if (process.platform === 'win32') {
        // Windows平台使用wmic获取磁盘信息
        const driveLetter = checkPath.split(':')[0] + ':\\'
        const { stdout } = await execAsync(`wmic logicaldisk where DeviceID="${driveLetter}" get FreeSpace,Size /format:csv`)
        const lines = stdout.trim().split('\n')
        if (lines.length >= 2) {
          const [, freeSpace, totalSpace] = lines[1].split(',').map(Number)
          return {
            total: totalSpace,
            free: freeSpace,
            hasEnough: freeSpace >= MIN_REQUIRED_SPACE,
            required: MIN_REQUIRED_SPACE
          }
        }
      } else {
        // Unix平台使用df命令
        const { stdout } = await execAsync(`df -k "${checkPath}"`)
        const lines = stdout.trim().split('\n')
        if (lines.length >= 2) {
          const parts = lines[1].split(/\s+/)
          const total = parseInt(parts[1]) * 1024
          const free = parseInt(parts[3]) * 1024
          return {
            total,
            free,
            hasEnough: free >= MIN_REQUIRED_SPACE,
            required: MIN_REQUIRED_SPACE
          }
        }
      }

      throw new Error('无法获取磁盘空间信息')
    } catch (error) {
      return {
        error: error.message,
        hasEnough: true // 检测失败时默认通过，避免误判
      }
    }
  }

  /**
   * 检测内存
   */
  async checkMemory() {
    try {
      const totalMemory = os.totalmem()
      const freeMemory = os.freemem()

      return {
        total: totalMemory,
        free: freeMemory,
        hasEnough: totalMemory >= MIN_REQUIRED_MEMORY,
        required: MIN_REQUIRED_MEMORY
      }
    } catch (error) {
      return {
        error: error.message,
        hasEnough: true // 检测失败时默认通过，避免误判
      }
    }
  }

  /**
   * 检测系统版本
   */
  async checkSystemVersion() {
    try {
      const platform = process.platform
      const release = os.release()
      let isSupported = false
      let systemInfo = ''

      if (platform === 'win32') {
        // Windows 10+ 版本号 >= 10.0.10240
        const versionParts = release.split('.').map(Number)
        isSupported = versionParts[0] > 10 ||
                     (versionParts[0] === 10 && versionParts[2] >= 10240)
        systemInfo = `Windows ${release}`
      } else if (platform === 'darwin') {
        // macOS 11+ 版本号 >= 20.1.0 (Darwin version)
        const versionParts = release.split('.').map(Number)
        isSupported = versionParts[0] >= 20
        systemInfo = `macOS ${release}`
      } else if (platform === 'linux') {
        // Linux 内核版本 >= 5.0
        const versionParts = release.split('.').map(Number)
        isSupported = versionParts[0] >= 5
        systemInfo = `Linux ${release}`
      } else {
        systemInfo = `未知系统: ${platform}`
      }

      return {
        platform,
        release,
        systemInfo,
        isSupported
      }
    } catch (error) {
      return {
        error: error.message,
        isSupported: true // 检测失败时默认通过，避免误判
      }
    }
  }

  /**
   * 检测所有依赖
   * @param {Function} progressCallback - 进度回调函数
   * @returns {object} 依赖检测结果
   */
  async checkAllDependencies(progressCallback = null) {
    this.depsStatus = {}
    const totalSteps = 8 // system, memory, node, git, npm, pnpm, yarn, disk
    let currentStep = 0

    const updateProgress = (step, message) => {
      currentStep++
      const progress = Math.round((currentStep / totalSteps) * 100)
      if (progressCallback) {
        progressCallback(progress, message)
      }
    }

    // 检测系统版本
    updateProgress(currentStep, '正在检测系统兼容性...')
    this.depsStatus.system = await this.checkSystemVersion()

    // 检测内存
    updateProgress(currentStep, '正在检测系统内存...')
    this.depsStatus.memory = await this.checkMemory()

    // 检测Node.js
    updateProgress(currentStep, '正在检测Node.js版本...')
    this.depsStatus.node = await this.checkNodeVersion()

    // 检测Git
    updateProgress(currentStep, '正在检测Git版本...')
    this.depsStatus.git = await this.checkGitVersion()

    // 检测包管理器
    updateProgress(currentStep, '正在检测npm版本...')
    this.depsStatus.npm = await this.checkPackageManager('npm')

    updateProgress(currentStep, '正在检测pnpm版本...')
    this.depsStatus.pnpm = await this.checkPackageManager('pnpm')

    updateProgress(currentStep, '正在检测yarn版本...')
    this.depsStatus.yarn = await this.checkPackageManager('yarn')

    // 检测磁盘空间
    updateProgress(currentStep, '正在检测磁盘空间...')
    this.depsStatus.disk = await this.checkDiskSpace()

    // 检查是否所有必需依赖都满足
    const allRequiredSatisfied = Object.values(DEPENDENCIES)
      .filter(dep => dep.required)
      .every(dep => this.depsStatus[dep.name]?.isSatisfied) &&
      this.depsStatus.system.isSupported &&
      this.depsStatus.memory.hasEnough &&
      this.depsStatus.disk.hasEnough

    return {
      status: allRequiredSatisfied ? 'satisfied' : 'unsatisfied',
      dependencies: this.depsStatus,
      missing: Object.values(this.depsStatus)
        .filter(dep => dep.name && DEPENDENCIES[dep.name]?.required && (!dep.installed || !dep.isSatisfied))
        .map(dep => dep.name),
      system: this.depsStatus.system,
      memory: this.depsStatus.memory,
      diskSpace: this.depsStatus.disk
    }
  }

  /**
   * 获取缺失的依赖
   */
  getMissingDependencies() {
    return Object.values(this.depsStatus)
      .filter(dep => dep.name && DEPENDENCIES[dep.name]?.required && (!dep.installed || !dep.isSatisfied))
  }

  /**
   * 安装缺失的依赖
   * @param {Function} progressCallback - 进度回调
   * @param {Function} logCallback - 日志回调
   * @returns {object} 安装结果
   */
  async installMissingDependencies(progressCallback = null, logCallback = null) {
    this.installProgress = 0
    this.installLogs = []

    const log = (message) => {
      const logEntry = `[${new Date().toISOString()}] ${message}`
      this.installLogs.push(logEntry)
      if (logCallback) {
        logCallback(security.desensitizeLog(logEntry))
      }
    }

    const missingDeps = this.getMissingDependencies()
    if (missingDeps.length === 0) {
      log('所有依赖已满足，无需安装')
      return { success: true, message: '所有依赖已满足' }
    }

    log(`开始安装缺失的依赖: ${missingDeps.map(d => d.name).join(', ')}`)
    const totalSteps = missingDeps.length
    let currentStep = 0

    try {
      // 创建缓存目录
      await fs.mkdir(INSTALL_CACHE_DIR, { recursive: true })

      for (const dep of missingDeps) {
        currentStep++
        const progress = Math.round((currentStep / totalSteps) * 100)
        if (progressCallback) {
          progressCallback(progress, `正在安装 ${dep.name}...`)
        }
        log(`开始安装 ${dep.name}`)

        await this.installDependency(dep.name, log)
        log(`${dep.name} 安装完成`)
      }

      // 安装完成后重新检测
      log('安装完成，重新检测依赖...')
      const checkResult = await this.checkAllDependencies(
        (p, msg) => progressCallback?.(Math.round(90 + p * 0.1), msg)
      )

      if (checkResult.status === 'satisfied') {
        progressCallback?.(100, '所有依赖安装完成')
        log('所有依赖安装成功')
        return { success: true, dependencies: checkResult.dependencies }
      } else {
        const stillMissing = checkResult.missing.join(', ')
        log(`安装后仍有依赖不满足: ${stillMissing}`)
        throw new Error(`以下依赖安装失败或版本不满足要求: ${stillMissing}`)
      }

    } catch (error) {
      log(`依赖安装失败: ${error.message}`)
      return { success: false, error: error.message, logs: this.installLogs }
    }
  }

  /**
   * 安装指定依赖
   * @param {string} depName - 依赖名称
   * @param {Function} log - 日志函数
   */
  async installDependency(depName, log) {
    switch (depName) {
      case 'node':
        return await this.installNode(log)
      case 'git':
        return await this.installGit(log)
      case 'npm':
        return await this.installNpm(log)
      default:
        throw new Error(`不支持自动安装依赖: ${depName}`)
    }
  }

  /**
   * 安装Node.js
   */
  async installNode(log) {
    log('开始安装Node.js...')
    const platform = process.platform
    const arch = process.arch === 'x64' ? 'x64' : 'arm64'
    const version = DEPENDENCIES.node.minVersion

    let downloadUrl = ''
    let fileExt = ''
    if (platform === 'win32') {
      downloadUrl = `https://nodejs.org/dist/v${version}/node-v${version}-win-${arch}.zip`
      fileExt = '.zip'
    } else if (platform === 'darwin') {
      downloadUrl = `https://nodejs.org/dist/v${version}/node-v${version}-darwin-${arch}.tar.gz`
      fileExt = '.tar.gz'
    } else if (platform === 'linux') {
      downloadUrl = `https://nodejs.org/dist/v${version}/node-v${version}-linux-${arch}.tar.xz`
      fileExt = '.tar.xz'
    } else {
      throw new Error(`不支持的平台: ${platform}`)
    }

    log(`下载Node.js: ${downloadUrl}`)
    const downloadPath = path.join(INSTALL_CACHE_DIR, `node-v${version}-${platform}-${arch}${fileExt}`)
    const installDir = path.join(os.homedir(), '.dclaw', 'tools', 'node')

    try {
      // 下载Node.js
      await systemWorkerManager.downloadFileAsync({
        url: downloadUrl,
        destPath: downloadPath,
        onDownloadProgress: (progress) => {
          log(`下载进度: ${progress}%`)
        }
      })
      log('Node.js下载完成')

      // 解压文件
      log('开始解压Node.js...')
      await systemWorkerManager.extractFileAsync({
        filePath: downloadPath,
        destDir: installDir
      })
      log('Node.js解压完成')

      // 保存Node.js安装路径，在执行命令时通过env参数传递
      const nodeBinDir = platform === 'win32'
        ? installDir
        : path.join(installDir, `node-v${version}-${platform}-${arch}`, 'bin')

      this.nodeBinDir = nodeBinDir
      log('Node.js安装成功')

    } catch (error) {
      log(`Node.js安装失败: ${error.message}`)
      throw new Error(`Node.js自动安装失败，请手动安装Node.js >= 24.0.0，下载地址: https://nodejs.org/`)
    }
  }

  /**
   * 安装Git
   */
  async installGit(log) {
    log('开始安装Git...')
    const platform = process.platform

    if (platform === 'win32') {
      try {
        // Windows下尝试使用winget安装
        log('尝试使用winget安装Git...')
        await systemWorkerManager.executeCommandAsync({
          command: 'winget',
          args: ['install', '--id', 'Git.Git', '--silent', '--accept-package-agreements', '--accept-source-agreements'],
          onStdout: (data) => log(data.trim()),
          onStderr: (data) => log(`错误: ${data.trim()}`)
        })
        log('Git安装成功')
      } catch (error) {
        log('winget安装失败，请手动下载并安装Git: https://git-scm.com/download/win')
        throw error
      }
    } else if (platform === 'darwin') {
      log('正在使用brew安装Git...')
      try {
        await systemWorkerManager.executeCommandAsync({
          command: 'brew',
          args: ['install', 'git'],
          onStdout: (data) => log(data.trim()),
          onStderr: (data) => log(`错误: ${data.trim()}`)
        })
        log('Git安装成功')
      } catch (error) {
        log('brew安装失败，请手动安装Git: https://git-scm.com/download/mac')
        throw error
      }
    } else if (platform === 'linux') {
      log('正在使用apt安装Git...')
      try {
        // 使用数组参数，避免shell注入
        await systemWorkerManager.executeCommandAsync({
          command: 'sudo',
          args: ['apt', 'update'],
          onStdout: (data) => log(data.trim()),
          onStderr: (data) => log(`错误: ${data.trim()}`)
        })

        await systemWorkerManager.executeCommandAsync({
          command: 'sudo',
          args: ['apt', 'install', '-y', 'git'],
          onStdout: (data) => log(data.trim()),
          onStderr: (data) => log(`错误: ${data.trim()}`)
        })
        log('Git安装成功')
      } catch (error) {
        log('apt安装失败，请手动安装Git')
        throw error
      }
    } else {
      throw new Error(`不支持的平台: ${platform}`)
    }
  }

  /**
   * 安装npm
   */
  async installNpm(log) {
    log('开始更新npm...')
    try {
      await systemWorkerManager.executeCommandAsync({
        command: 'npm',
        args: ['install', '-g', 'npm@latest'],
        onStdout: (data) => log(data.trim()),
        onStderr: (data) => log(`错误: ${data.trim()}`)
      })
    } catch (error) {
      log('npm更新失败，请手动更新: npm install -g npm@latest')
      throw error
    }
  }

  /**
   * 获取环境变量配置
   * @returns {object} 环境变量
   */
  getEnvironmentVariables() {
    const env = {}

    // 构建自定义PATH
    const pathParts = []

    // 添加本地安装的Node.js到PATH
    if (this.nodeBinDir) {
      pathParts.push(this.nodeBinDir)
    }

    // 添加本地安装的依赖到PATH
    const localBinPath = path.join(os.homedir(), '.dclaw', 'bin')
    pathParts.push(localBinPath)

    // 添加系统原始PATH
    pathParts.push(process.env.PATH)

    env.PATH = pathParts.join(path.delimiter)

    // 配置npm使用国内镜像
    env.npm_config_registry = 'https://registry.npmmirror.com'
    env.npm_config_disturl = 'https://npmmirror.com/mirrors/node'

    return env
  }

  /**
   * 获取安装日志
   * @returns {Array} 日志列表
   */
  getInstallLogs() {
    return this.installLogs.map(log => security.desensitizeLog(log))
  }

  /**
   * 清理安装缓存
   */
  async cleanCache() {
    try {
      await fs.rm(INSTALL_CACHE_DIR, { recursive: true, force: true })
      await fs.mkdir(INSTALL_CACHE_DIR, { recursive: true })
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}

export default new DepsManager()
