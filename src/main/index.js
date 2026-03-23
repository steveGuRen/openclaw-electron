import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import './ipc.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow = null
const isDev = process.argv.includes('--dev')
// 动态获取Vite端口，支持自动端口分配
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'

// ================= 安全配置 =================
// 禁用不安全的API
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors')
app.commandLine.appendSwitch('enable-features', 'SharedArrayBuffer')

// ================= IPC 处理 =================
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options)
  return result
})

ipcMain.on('ping', (event, data) => {
  event.reply('pong', `pong: ${data}`)
})

// ================= 创建窗口 =================
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Dclaw',
    webPreferences: {
      preload: path.join(__dirname, '../../preload.js'),
      contextIsolation: true, // 必须启用，安全要求
      nodeIntegration: false, // 必须禁用，安全要求
      sandbox: false, // 因为需要使用preload，所以设置为false
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      enableBlinkFeatures: '',
      disableBlinkFeatures: ''
    },
    show: false
  })

  // 加载应用
  if (isDev) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
    // 开发环境自动打开DevTools
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  // 窗口准备就绪后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ================= 生命周期 =================
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// 安全限制：只允许加载指定来源
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)
    // 只允许本地开发服务器和本地文件
    if (!isDev || parsedUrl.origin !== VITE_DEV_SERVER_URL) {
      event.preventDefault()
    }
  })

  contents.setWindowOpenHandler(({ url }) => {
    // 禁止打开新窗口
    return { action: 'deny' }
  })
})
