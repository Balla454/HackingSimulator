import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'node:path'
import { exec } from 'node:child_process'

// Disable GPU hardware acceleration to avoid Wayland/X11 coordinate bugs
app.disableHardwareAcceleration()

process.env.DIST = join(__dirname, '../dist')

const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = join(process.env.DIST, 'index.html')

let win = null

// IPC handler: execute a shell command (used for score submission curl)
ipcMain.handle('execute-command', async (_event, command) => {
  return new Promise((resolve) => {
    exec(command, { timeout: 15000 }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: error.message, stderr, stdout })
      } else {
        resolve({ success: true, stdout, stderr })
      }
    })
  })
})

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.bounds

  win = new BrowserWindow({
    width,
    height,
    minWidth: 800,
    minHeight: 600,
    x: primaryDisplay.bounds.x,
    y: primaryDisplay.bounds.y,
    title: 'Hacking Simulator',
    backgroundColor: '#000000',
    fullscreen: true,
    kiosk: true,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      zoomFactor: 1.0,
    },
  })

  win.setMenu(null)
  win.setFullScreen(true)
  win.setKiosk(true)

  // Force zoom factor to 1.0
  // This avoids the Electron/Linux 100vh bug where viewport height != window height
  win.webContents.on('did-finish-load', () => {
    win.webContents.setZoomFactor(1.0)
  })

  if (url) {
    win.loadURL(url)
  } else {
    win.loadFile(indexHtml)
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
