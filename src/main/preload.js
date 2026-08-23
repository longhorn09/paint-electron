const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Dialogs
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  saveAsDialog: (options) => ipcRenderer.invoke('dialog:saveAs', options),
  showMessage: (options) => ipcRenderer.invoke('dialog:showMessage', options),

  // File I/O
  writeFile: (data) => ipcRenderer.invoke('file:write', data),
  consumeOpenFile: () => ipcRenderer.invoke('file:consumeOpen'),

  // Clipboard
  writeClipboardImage: (dataUrl) => ipcRenderer.invoke('clipboard:writeImage', dataUrl),
  readClipboardImage: () => ipcRenderer.invoke('clipboard:readImage'),

  // Window & Shell
  setTitle: (title) => ipcRenderer.invoke('window:setTitle', title),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // Event Listeners
  onFileOpened: (callback) => {
    const handler = (event, fileData) => callback(fileData);
    ipcRenderer.on('file:opened', handler);
    return () => ipcRenderer.removeListener('file:opened', handler);
  },
  onMenuCommand: (callback) => {
    const handler = (_event, command) => callback(command);
    ipcRenderer.on('menu:command', handler);
    return () => ipcRenderer.removeListener('menu:command', handler);
  }
});
