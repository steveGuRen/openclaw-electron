const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true
    }
  });

  mainWindow.loadFile('index.html');
}

function startOpenClaw() {
  const openClawProcess = spawn('powershell.exe', ['-Command', 'openclaw gateway --port 18789 --verbose'], {
    stdio: 'inherit'
  });

  openClawProcess.on('error', (err) => {
    console.error('Failed to start OpenClaw:', err);
  });

  openClawProcess.on('close', (code) => {
    console.log(`OpenClaw process exited with code ${code}`);
  });

  return openClawProcess;
}

app.whenReady().then(() => {
  createWindow();
  startOpenClaw();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});