const { app, BrowserWindow } = require('electron')
const path = require('path')
const net = require('net')

let mainWindow = null
const PORT = 18789

// ================= 检测端口 =================

function waitPort(port, maxRetries = 30) {
  return new Promise((resolve, reject) => {
    let retries = 0

    function check() {
      const socket = net.connect(port, '127.0.0.1')

      socket.on('connect', () => {
        socket.destroy()
        console.log('✅ OpenClaw Gateway Connected')
        resolve()
      })

      socket.on('error', () => {
        retries++
        if (retries >= maxRetries) {
          reject(new Error('OpenClaw Gateway 无响应，请确保服务已启动'))
        } else {
          setTimeout(check, 500)
        }
      })
    }

    check()
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
  try {
    console.log('🔍 正在连接 OpenClaw Gateway...')
    await waitPort(PORT)
    createWindow()
  } catch (e) {
    console.error('❌ 错误:', e.message)
    
    // 显示错误对话框
    const { dialog } = require('electron')
    dialog.showErrorBox(
      'OpenClaw Gateway 连接失败',
      e.message + '\n\n请确保 OpenClaw 服务已启动在端口 ' + PORT
    )
    app.quit()
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})