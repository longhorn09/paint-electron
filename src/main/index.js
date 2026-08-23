const { app, BrowserWindow, ipcMain, dialog, Menu, clipboard, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { buildAppMenu } = require('./menu');
const { applySaveExtension, normalizeSaveExt, resolveSelectedSaveExt } = require('../shared/save-path.cjs');
const { normalizeFileArg } = require('../shared/open-path.cjs');

app.name = 'Paint';

// Suppress Chromium internal GL/Mesa/GPU log noise across all platforms and operations
app.commandLine.appendSwitch('disable-logging');
app.commandLine.appendSwitch('log-level', '3');

// Linux & Wayland optimizations
if (process.platform === 'linux') {
  // Hint Ozone platform for automatic Wayland/X11 detection
  app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
  app.commandLine.appendSwitch('enable-features', 'WaylandWindowDecorations');
}

let mainWindow = null;
let currentFilePath = null;
let pendingOpenPayload = null;
let lastDeliveredOpenPath = null;

const SAVE_FILTERS = [
  { name: 'PNG Image (*.png) [Lossless]', extensions: ['png'] },
  { name: 'JPEG Image (*.jpg, *.jpeg)', extensions: ['jpg', 'jpeg'] },
  { name: 'WebP Image (*.webp)', extensions: ['webp'] },
  { name: 'GIF Image (*.gif)', extensions: ['gif'] }
];

function buildSaveFilters(preferredExt) {
  const filters = SAVE_FILTERS.map((filter) => ({ ...filter, extensions: [...filter.extensions] }));
  const preferred = String(preferredExt || 'png').toLowerCase().replace(/^\./, '');
  const idx = filters.findIndex((filter) => filter.extensions.includes(preferred));
  if (idx > 0) {
    const [selected] = filters.splice(idx, 1);
    filters.unshift(selected);
  }
  return filters;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Paint',
    icon: path.join(__dirname, '../../assets/icon.png'),
    backgroundColor: '#1e1e24',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      spellcheck: false
    },
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  buildAppMenu(mainWindow);

  mainWindow.webContents.on('did-finish-load', () => {
    deliverPendingOpen();
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    deliverPendingOpen();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function resolveExistingFile(arg) {
  const normalized = normalizeFileArg(arg);
  if (!normalized) return null;
  const resolved = path.resolve(normalized);
  try {
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) return resolved;
  } catch {
    return null;
  }
  return null;
}

function getFileFromArgs(argv = process.argv) {
  const skip = new Set();
  if (argv[0]) skip.add(path.resolve(argv[0]));
  if (!app.isPackaged && argv[1]) {
    try {
      skip.add(path.resolve(argv[1]));
    } catch {
      // ignore
    }
  }

  for (const arg of argv.slice(1)) {
    if (String(arg).startsWith('-')) continue;
    const resolved = resolveExistingFile(arg);
    if (resolved && !skip.has(resolved)) return resolved;
  }
  return null;
}

function readOpenPayload(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const validExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg'];
  if (!validExtensions.includes(ext)) {
    dialog.showErrorBox('Unsupported File', `File format ${ext} is not supported.`);
    return null;
  }

  const data = fs.readFileSync(filePath);
  const mimeTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml'
  };
  const mimeType = mimeTypes[ext] || 'image/png';
  return {
    filePath,
    fileName: path.basename(filePath),
    dataUrl: `data:${mimeType};base64,${data.toString('base64')}`,
    ext: ext.replace('.', '')
  };
}

function deliverPendingOpen() {
  if (!pendingOpenPayload || pendingOpenPayload.filePath === lastDeliveredOpenPath) return;
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.webContents.isLoading() || mainWindow.webContents.isLoadingMainFrame()) return;

  lastDeliveredOpenPath = pendingOpenPayload.filePath;
  const payload = pendingOpenPayload;
  pendingOpenPayload = null;
  mainWindow.webContents.send('file:opened', payload);
}

function loadFileFromPath(filePath) {
  try {
    const payload = readOpenPayload(filePath);
    if (!payload) return;
    currentFilePath = filePath;
    pendingOpenPayload = payload;
    deliverPendingOpen();
  } catch (err) {
    dialog.showErrorBox('Error Opening File', err.message);
  }
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    const fileArg = getFileFromArgs(argv);
    if (fileArg) loadFileFromPath(fileArg);
  });

  app.whenReady().then(() => {
    const startupFile = getFileFromArgs(process.argv);
    if (startupFile) {
      try {
        pendingOpenPayload = readOpenPayload(startupFile);
        currentFilePath = startupFile;
      } catch (err) {
        dialog.showErrorBox('Error Opening File', err.message);
      }
    }

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers

ipcMain.handle('file:consumeOpen', () => {
  if (!pendingOpenPayload) return null;
  const payload = pendingOpenPayload;
  lastDeliveredOpenPath = payload.filePath;
  pendingOpenPayload = null;
  return payload;
});

// 1. Open File Dialog
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Image',
    properties: ['openFile'],
    filters: [
      { name: 'All Supported Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] },
      { name: 'PNG Image (*.png)', extensions: ['png'] },
      { name: 'JPEG Image (*.jpg, *.jpeg)', extensions: ['jpg', 'jpeg'] },
      { name: 'WebP Image (*.webp)', extensions: ['webp'] },
      { name: 'GIF Image (*.gif)', extensions: ['gif'] },
      { name: 'All Files (*.*)', extensions: ['*'] }
    ]
  });

  if (canceled || filePaths.length === 0) return null;

  const targetPath = filePaths[0];
  loadFileFromPath(targetPath);
  return targetPath;
});

// 2. Save As Dialog
ipcMain.handle('dialog:saveAs', async (event, options = {}) => {
  try {
    const defaultExt = normalizeSaveExt(options.defaultExt || 'png');
    const defaultName = applySaveExtension(options.defaultName || `untitled.${defaultExt}`, defaultExt);
    const defaultPath = options.defaultPath
      ? applySaveExtension(options.defaultPath, defaultExt)
      : defaultName;
    const filters = buildSaveFilters(defaultExt);

    const saveDialogOptions = {
      title: 'Save Image As',
      defaultPath,
      filters
    };
    if (process.platform === 'linux') {
      saveDialogOptions.properties = ['showOverwriteConfirmation'];
    }

    const result = await dialog.showSaveDialog(mainWindow, saveDialogOptions);

    if (result.canceled || !result.filePath) return null;

    const selectedExt = resolveSelectedSaveExt(result, filters, defaultExt);
    const finalPath = applySaveExtension(result.filePath, selectedExt);

    if (finalPath !== result.filePath && fs.existsSync(finalPath)) {
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        buttons: ['Replace', 'Cancel'],
        defaultId: 1,
        cancelId: 1,
        title: 'Replace file?',
        message: `"${path.basename(finalPath)}" already exists. Do you want to replace it?`
      });
      if (response !== 0) return null;
    }

    return finalPath;
  } catch (err) {
    console.error('Save As dialog failed:', err);
    if (mainWindow) {
      await dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Save As failed',
        message: err.message || String(err)
      });
    }
    return null;
  }
});

// 3. Write Image to File
ipcMain.handle('file:write', async (event, { filePath, dataUrl, buffer }) => {
  try {
    let fileBuffer;
    if (buffer) {
      fileBuffer = Buffer.from(buffer);
    } else if (dataUrl) {
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');
    } else {
      throw new Error('No image data provided for saving');
    }

    fs.writeFileSync(filePath, fileBuffer);
    currentFilePath = filePath;
    return {
      success: true,
      filePath,
      fileName: path.basename(filePath)
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 4. Update Window Title
ipcMain.handle('window:setTitle', (event, title) => {
  if (mainWindow) {
    mainWindow.setTitle(title);
  }
});

// 5. Native Clipboard Image Copy
ipcMain.handle('clipboard:writeImage', (event, dataUrl) => {
  try {
    const img = nativeImage.createFromDataURL(dataUrl);
    clipboard.writeImage(img);
    return true;
  } catch (err) {
    console.error('Failed to copy image to clipboard:', err);
    return false;
  }
});

// 6. Native Clipboard Image Paste
ipcMain.handle('clipboard:readImage', () => {
  try {
    const img = clipboard.readImage();
    if (img && !img.isEmpty()) {
      return img.toDataURL();
    }
    return null;
  } catch (err) {
    console.error('Failed to read image from clipboard:', err);
    return null;
  }
});

// 7. Show message box
ipcMain.handle('dialog:showMessage', async (event, options) => {
  return await dialog.showMessageBox(mainWindow, options);
});

// 8. Open External URL in default browser
ipcMain.handle('shell:openExternal', async (event, url) => {
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});
