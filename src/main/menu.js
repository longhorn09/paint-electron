const { Menu, app, shell } = require('electron');

function buildAppMenu(mainWindow) {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Image',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.executeJavaScript('window.app?.openNewImageModal()')
        },
        {
          label: 'Open Image...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.executeJavaScript('window.app?.handleOpenFile()')
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu:command', 'save')
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow?.webContents.send('menu:command', 'save-as')
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: () => mainWindow?.webContents.executeJavaScript('document.getElementById("btn-undo")?.click()')
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Y',
          click: () => mainWindow?.webContents.executeJavaScript('document.getElementById("btn-redo")?.click()')
        },
        { type: 'separator' },
        {
          label: 'Cut Selection',
          accelerator: 'CmdOrCtrl+X',
          click: () => mainWindow?.webContents.executeJavaScript('window.app?.selectionTool?.cutSelection()')
        },
        {
          label: 'Copy Selection',
          accelerator: 'CmdOrCtrl+C',
          click: () => mainWindow?.webContents.executeJavaScript('window.app?.selectionTool?.copySelection()')
        },
        {
          label: 'Clear Selection',
          accelerator: 'Delete',
          click: () => mainWindow?.webContents.executeJavaScript('window.app?.selectionTool?.clearSelection()')
        },
        { type: 'separator' },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          click: () => mainWindow?.webContents.executeJavaScript('window.app?.state?.selectAll()')
        },
        {
          label: 'Deselect',
          accelerator: 'CmdOrCtrl+D',
          click: () => mainWindow?.webContents.executeJavaScript('window.app?.state?.clearSelection()')
        }
      ]
    },
    {
      label: 'Image',
      submenu: [
        {
          label: 'Resize Image...',
          accelerator: 'CmdOrCtrl+Alt+I',
          click: () => mainWindow?.webContents.executeJavaScript('window.app?.openResizeModal()')
        },
        {
          label: 'Crop to Selection',
          accelerator: 'Enter',
          click: () => mainWindow?.webContents.executeJavaScript('window.app?.selectionTool?.cropToSelection()')
        },
        { type: 'separator' },
        {
          label: 'Rotate 90° Clockwise',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow?.webContents.executeJavaScript('window.app?.transformTool?.rotate90CW()')
        },
        {
          label: 'Rotate 90° Counter-Clockwise',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => mainWindow?.webContents.executeJavaScript('window.app?.transformTool?.rotate90CCW()')
        },
        {
          label: 'Rotate 180°',
          click: () => mainWindow?.webContents.executeJavaScript('window.app?.transformTool?.rotate180()')
        },
        { type: 'separator' },
        {
          label: 'Flip Horizontal',
          click: () => mainWindow?.webContents.executeJavaScript('window.app?.transformTool?.flipHorizontal()')
        },
        {
          label: 'Flip Vertical',
          click: () => mainWindow?.webContents.executeJavaScript('window.app?.transformTool?.flipVertical()')
        },
        { type: 'separator' },
        {
          label: 'Gaussian Blur...',
          accelerator: 'B',
          click: () => mainWindow?.webContents.executeJavaScript('window.app?.openBlurAdjustment()')
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: () => mainWindow?.webContents.executeJavaScript('document.getElementById("btn-zoom-in")?.click()')
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => mainWindow?.webContents.executeJavaScript('document.getElementById("btn-zoom-out")?.click()')
        },
        {
          label: 'Fit to Window',
          accelerator: 'CmdOrCtrl+0',
          click: () => mainWindow?.webContents.executeJavaScript('window.app?.engine?.zoomToFit()')
        },
        {
          label: 'Actual Size (100%)',
          accelerator: 'CmdOrCtrl+1',
          click: () => mainWindow?.webContents.executeJavaScript('window.app?.engine?.zoomToActual()')
        },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Paint',
          click: () => mainWindow?.webContents.executeJavaScript('window.app?.openAboutModal()')
        },
        {
          label: 'Keyboard Shortcuts',
          accelerator: 'F1',
          click: () => mainWindow?.webContents.executeJavaScript('window.app?.openAboutModal("shortcuts")')
        },
        { type: 'separator' },
        {
          label: 'GitHub Repository (Source Code)',
          click: () => shell.openExternal('https://github.com/longhorn09/paint-electron')
        },
        {
          label: 'Fork on GitHub',
          click: () => shell.openExternal('https://github.com/longhorn09/paint-electron/fork')
        },
        {
          label: 'Report an Issue / Feedback',
          click: () => shell.openExternal('https://github.com/longhorn09/paint-electron/issues')
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

module.exports = { buildAppMenu };
