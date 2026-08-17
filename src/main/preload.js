const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Dialogs
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  saveAsDialog: (options) => ipcRenderer.invoke('dialog:saveAs', options),
  showMessage: (options) => ipcRenderer.invoke('dialog:showMessage', options),

  // File I/O
  writeFile: (data) => ipcRenderer.invoke('file:write', data),

  // Clipboard
  writeClipboardImage: (dataUrl) => ipcRenderer.invoke('clipboard:writeImage', dataUrl),
  readClipboardImage: () => ipcRenderer.invoke('clipboard:readImage'),

  // Window
  setTitle: (title) => ipcRenderer.invoke('window:setTitle', title),

  // Event Listeners
  onFileOpened: (callback) => {
    const handler = (event, fileData) => callback(fileData);
    ipcRenderer.on('file:opened', handler);
    return () => ipcRenderer.removeListener('file:opened', handler);
  }
});
