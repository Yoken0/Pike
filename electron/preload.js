const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // Future desktop-specific APIs can be added here
  // saveFile: (data) => ipcRenderer.invoke('save-file', data),
  // openFile: () => ipcRenderer.invoke('open-file'),
});