import { contextBridge, ipcRenderer } from 'electron'

// Expose a secure API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  executeCommand: (command) => ipcRenderer.invoke('execute-command', command)
})
