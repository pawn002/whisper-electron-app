import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron';
import * as path from 'path';
import isDev from 'electron-is-dev';
import * as fs from 'fs/promises';
import { TranscriptionService } from './services/transcription.service';
import { WhisperService } from './services/whisper.service';

// Import package.json for app version
const packageJson = require(path.join(__dirname, '../../package.json'));

let mainWindow: BrowserWindow | null = null;
let transcriptionService: TranscriptionService | null = null;
let whisperService: WhisperService | null = null;

// Helper function to convert Whisper timestamp format to SRT
function convertToSRT(text: string): string {
  const lines = text.split('\n').filter((line) => line.trim());
  let srtContent = '';
  let index = 1;

  for (const line of lines) {
    const match = line.match(
      /\[(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})\]\s*(.+)/
    );
    if (match) {
      const [, start, end, subtitle] = match;
      // Convert milliseconds format from . to ,
      const srtStart = start.replace('.', ',');
      const srtEnd = end.replace('.', ',');
      srtContent += `${index}\n${srtStart} --> ${srtEnd}\n${subtitle.trim()}\n\n`;
      index++;
    }
  }

  return srtContent || text; // Fallback to original if no matches
}

// Helper function to convert Whisper timestamp format to VTT
function convertToVTT(text: string): string {
  const lines = text.split('\n').filter((line) => line.trim());
  let vttContent = 'WEBVTT\n\n';

  for (const line of lines) {
    const match = line.match(
      /\[(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})\]\s*(.+)/
    );
    if (match) {
      const [, start, end, subtitle] = match;
      vttContent += `${start} --> ${end}\n${subtitle.trim()}\n\n`;
    }
  }

  return vttContent === 'WEBVTT\n\n' ? text : vttContent; // Fallback to original if no matches
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    title: 'Whisper Transcription',
    backgroundColor: '#303030',
  });

  // Initialize services immediately
  transcriptionService = new TranscriptionService(mainWindow);
  whisperService = new WhisperService();

  console.log('[Main] Services initialized');

  // Load the app immediately (no delay!)
  console.log('[Main] isDev:', isDev);
  console.log('[Main] __dirname:', __dirname);

  if (isDev) {
    mainWindow.loadURL('http://localhost:4200');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../../frontend/dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  // Create application menu
  const template: any = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Audio File',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow?.webContents.send('menu-open-file');
          },
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
      ],
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
        { role: 'togglefullscreen' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
    transcriptionService = null;
    whisperService = null;
  });
}

// App lifecycle - Simplified, no backend to start!
app.whenReady().then(() => {
  createWindow();  // Create window immediately!
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('select-audio-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      {
        name: 'Audio Files',
        extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'webm'],
      },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const fsSync = require('fs');
    const stats = fsSync.statSync(filePath);
    return {
      path: filePath,
      size: stats.size,
    };
  }
  return null;
});

ipcMain.handle(
  'transcribe-audio',
  async (event, audioPath: string, options: any) => {
    try {
      if (!transcriptionService) {
        return { success: false, error: 'Service not initialized' };
      }

      // Validate file size (500MB max)
      const fsSync = require('fs');
      const stats = fsSync.statSync(audioPath);
      const maxSize = 500 * 1024 * 1024; // 500MB

      if (stats.size > maxSize) {
        return {
          success: false,
          error: 'File size exceeds 500MB limit',
        };
      }

      const job = await transcriptionService.processAudio(audioPath, {
        model: options.model || 'base',
        language: options.language,
        outputFormat: options.outputFormat || 'txt',
        timestamps: options.timestamps !== false,
        threads: options.threads || 4,
        processors: options.processors || 1,
        translate: options.translate || false,
      });

      return {
        success: true,
        data: {
          id: job.id,
          status: job.status,
          progress: job.progress,
        },
      };
    } catch (error: any) {
      console.error('[Main] Transcription error:', error);
      return {
        success: false,
        error: error.message || 'Failed to start transcription',
      };
    }
  }
);

ipcMain.handle('save-transcript', async (event, resultData: any) => {
  const saveResult = await dialog.showSaveDialog({
    defaultPath: `transcript.txt`,
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'JSON', extensions: ['json'] },
      { name: 'SRT Subtitles', extensions: ['srt'] },
      { name: 'VTT Subtitles', extensions: ['vtt'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (!saveResult.canceled && saveResult.filePath) {
    const selectedPath = saveResult.filePath;
    const ext = path.extname(selectedPath).toLowerCase();

    let content: string;

    // Format content based on selected extension
    if (ext === '.json') {
      const jsonData =
        typeof resultData === 'string' ? { text: resultData } : resultData;
      content = JSON.stringify(jsonData, null, 2);
    } else if (ext === '.srt') {
      const text =
        typeof resultData === 'string' ? resultData : resultData.text || '';
      content = convertToSRT(text);
    } else if (ext === '.vtt') {
      const text =
        typeof resultData === 'string' ? resultData : resultData.text || '';
      content = convertToVTT(text);
    } else {
      content =
        typeof resultData === 'string'
          ? resultData
          : resultData.text || JSON.stringify(resultData);
    }

    const fsSync = require('fs');
    fsSync.writeFileSync(selectedPath, content, 'utf-8');
    return selectedPath;
  }
  return null;
});

ipcMain.handle('get-available-models', async () => {
  try {
    if (!whisperService) {
      console.error('[Main] WhisperService not initialized');
      return [];
    }
    return await whisperService.getAvailableModels();
  } catch (error: any) {
    console.error('[Main] Error fetching models:', error);
    return [];
  }
});

ipcMain.handle('download-model', async (event, modelName: string) => {
  try {
    if (!whisperService) {
      return {
        success: false,
        message: 'Service not initialized',
      };
    }

    await whisperService.downloadModel(modelName, (progress) => {
      if (mainWindow) {
        mainWindow.webContents.send('model-download-progress', {
          modelName,
          progress,
        });
      }
    });

    return {
      success: true,
      message: `Model ${modelName} downloaded successfully`,
    };
  } catch (error: any) {
    console.error('[Main] Error downloading model:', error);
    return {
      success: false,
      message: error.message || 'Failed to download model',
    };
  }
});

ipcMain.handle('get-system-info', async () => {
  const os = require('os');
  return {
    platform: os.platform(),
    arch: os.arch(),
    version: packageJson.version,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    cpus: os.cpus().length,
  };
});

ipcMain.handle('get-app-path', async () => {
  return app.getPath('userData');
});

ipcMain.handle('get-transcription-history', async () => {
  try {
    if (!transcriptionService) {
      console.error('[Main] TranscriptionService not initialized');
      return [];
    }
    return transcriptionService.getTranscriptionHistory();
  } catch (error: any) {
    console.error('[Main] Error fetching history:', error);
    return [];
  }
});
