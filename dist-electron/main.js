"use strict";
const electron = require("electron");
const node_path = require("node:path");
const node_child_process = require("node:child_process");
electron.app.disableHardwareAcceleration();
process.env.DIST = node_path.join(__dirname, "../dist");
const url = process.env.VITE_DEV_SERVER_URL;
const indexHtml = node_path.join(process.env.DIST, "index.html");
let win = null;
electron.ipcMain.handle("execute-command", async (_event, command) => {
  return new Promise((resolve) => {
    node_child_process.exec(command, { timeout: 15e3 }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: error.message, stderr, stdout });
      } else {
        resolve({ success: true, stdout, stderr });
      }
    });
  });
});
function createWindow() {
  const primaryDisplay = electron.screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.bounds;
  win = new electron.BrowserWindow({
    width,
    height,
    minWidth: 800,
    minHeight: 600,
    x: primaryDisplay.bounds.x,
    y: primaryDisplay.bounds.y,
    title: "Hacking Simulator",
    backgroundColor: "#000000",
    fullscreen: true,
    kiosk: true,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: node_path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      zoomFactor: 1
    }
  });
  win.setMenu(null);
  win.setFullScreen(true);
  win.setKiosk(true);
  win.webContents.on("did-finish-load", () => {
    win.webContents.setZoomFactor(1);
  });
  if (url) {
    win.loadURL(url);
  } else {
    win.loadFile(indexHtml);
  }
}
electron.app.whenReady().then(createWindow);
electron.app.on("window-all-closed", () => {
  electron.app.quit();
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
