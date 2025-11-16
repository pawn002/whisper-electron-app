import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import * as path from 'path';
import * as url from 'url';
import isDev from 'electron-is-dev';
import { WhisperService } from './services/whisper.service';
import { FileService } from './services/file.service';

let mainWindow: BrowserWindow | null = null;
let whisperService: WhisperService;
let fileService: FileService;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    icon: path.join(__dirname, '../../assets/icon.png')
  });

  // Create application menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Audio File',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow?.webContents.send('menu:open-file');
          }
        },
        {
          label: 'Save Transcript',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow?.webContents.send('menu:save-transcript');
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template as any);
  Menu.setApplicationMenu(menu);

  if (isDev) {
    mainWindow.loadURL('http://localhost:4200');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, '../../frontend/dist/index.html'),
        protocol: 'file:',
        slashes: true
      })
    );
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize services
function initializeServices() {
  whisperService = new WhisperService();
  fileService = new FileService();
  
  // Initialize whisper with default model
  whisperService.initialize().catch(console.error);
}

// IPC Handlers
ipcMain.handle('select-audio-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('transcribe-audio', async (event, audioPath: string, options: any) => {
  try {
    // Send progress updates
    const progressCallback = (progress: number) => {
      event.sender.send('transcription-progress', progress);
    };

    const result = await whisperService.transcribe(audioPath, options, progressCallback);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-transcript', async (event, content: string, format: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    filters: [
      { name: 'Text Files', extensions: [format] },
      { name: 'All Files', extensions: ['*'] }
    ],
    defaultPath: `transcript.${format}`
  });

  if (!result.canceled && result.filePath) {
    await fileService.saveFile(result.filePath, content);
    return result.filePath;
  }
  return null;
});

ipcMain.handle('get-available-models', async () => {
  return whisperService.getAvailableModels();
});

ipcMain.handle('download-model', async (event, modelName: string) => {
  try {
    const progressCallback = (progress: number) => {
      event.sender.send('model-download-progress', { model: modelName, progress });
    };

    await whisperService.downloadModel(modelName, progressCallback);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-system-info', async () => {
  return {
    platform: process.platform,
    arch: process.arch,
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node
  };
});

// App event handlers
app.whenReady().then(() => {
  initializeServices();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle protocol for deep linking
app.setAsDefaultProtocolClient('whisper-electron');

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});
