// Electron preload 脚本 - 安全桥接层
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getPlatform: () => process.platform,
  getVersion: () => process.versions.electron,
  isPackaged: () => process.type === 'renderer'
});
