"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  executeCommand: (command) => electron.ipcRenderer.invoke("execute-command", command)
});
