const { app, BrowserWindow } = require('electron')
const path = require('path')
const { spawn, exec, execSync } = require('child_process')
const net = require('net')

let mainWindow = null
let openClawProcess = null
const PORT = 18789

// ================= 提权 =================

function relaunchAsAdmin() {
  const exe = process.execPath

  exec(
    `powershell Start-Process "${exe}" -Verb runAs`,
    () => {
      app.quit()
    }
  )
}

// ================= 找 openclaw =================

function findOpenClaw() {
  try {
    const result = execSync('where openclaw', { encoding: 'utf8' })
    return result.split('\n')[0].trim()
  } catch (e) {
    console.error('❌ 找不到 openclaw，请确认已安装 global')
    return null
  }
}

// ================= 检测端口 =================

function waitPort(port, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const start = Date.now()

    function check() {
      const socket = net.connect(port, '127.0.0.1')

      socket.on('connect', () => {
        socket.destroy()
        resolve()
      })

      socket.on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error('openClaw 启动超时'))
        } else {
          setTimeout(check, 500)
        }
      })
    }

    check()
  })
}

// ================= kill 旧进程 =================

function killOldOpenClaw() {
  return new Promise((resolve) => {
    exec(
      'taskkill /IM openclaw.exe /F',
      () => resolve()
    )
  })
}

// ================= 启动 openclaw =================

function startOpenClaw() {
  return new Promise(async (resolve, reject) => {

    const openclawPath = findOpenClaw()

    if (!openclawPath) {
      reject('openclaw 未安装')
      return
    }

    await killOldOpenClaw()

    console.log('🚀 启动 OpenClaw:', openclawPath)

    openClawProcess = spawn(
      openclawPath,
      ['gateway', '--port', PORT, '--verbose'],
      {
        detached: true,
        shell: true,
        windowsHide: false,
        stdio: 'inherit'
      }
    )

    openClawProcess.on('error', (err) => {
      console.error('❌ openClaw 启动失败', err)
      reject(err)
    })

    openClawProcess.unref()

    try {
      await waitPort(PORT)
      console.log('✅ OpenClaw Gateway Ready')
      resolve()
    } catch (e) {
      reject(e)
    }
  })
}

// ================= 创建窗口 =================

function createWindow() {

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      contextIsolation: true
    }
  })

  mainWindow.loadURL(`http://localhost:${PORT}`)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ================= 生命周期 =================

app.whenReady().then(async () => {

  const { default: isElevated } = await import('is-elevated')
  const admin = await isElevated()

  if (!admin) {
    console.log('⚠️ 未管理员权限，准备提权')
    relaunchAsAdmin()
    return
  }

  try {
    await startOpenClaw()
    createWindow()
  } catch (e) {
    console.error('❌ 启动失败:', e)
    app.quit()
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  if (openClawProcess) {
    console.log('🧹 清理 OpenClaw 进程')
    exec('taskkill /IM openclaw.exe /F')
  }
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})