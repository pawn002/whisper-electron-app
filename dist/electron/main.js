"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const electron_is_dev_1 = __importDefault(require("electron-is-dev"));
const transcription_service_1 = require("./services/transcription.service");
const whisper_service_1 = require("./services/whisper.service");
// Import package.json for app version
const packageJson = require(path.join(__dirname, '../../package.json'));
let mainWindow = null;
let transcriptionService = null;
let whisperService = null;
// Helper function to convert Whisper timestamp format to SRT
function convertToSRT(text) {
    const lines = text.split('\n').filter((line) => line.trim());
    let srtContent = '';
    let index = 1;
    for (const line of lines) {
        const match = line.match(/\[(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})\]\s*(.+)/);
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
function convertToVTT(text) {
    const lines = text.split('\n').filter((line) => line.trim());
    let vttContent = 'WEBVTT\n\n';
    for (const line of lines) {
        const match = line.match(/\[(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})\]\s*(.+)/);
        if (match) {
            const [, start, end, subtitle] = match;
            vttContent += `${start} --> ${end}\n${subtitle.trim()}\n\n`;
        }
    }
    return vttContent === 'WEBVTT\n\n' ? text : vttContent; // Fallback to original if no matches
}
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
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
    transcriptionService = new transcription_service_1.TranscriptionService(mainWindow);
    whisperService = new whisper_service_1.WhisperService();
    console.log('[Main] Services initialized');
    // Load the app immediately (no delay!)
    console.log('[Main] isDev:', electron_is_dev_1.default);
    console.log('[Main] __dirname:', __dirname);
    if (electron_is_dev_1.default) {
        mainWindow.loadURL('http://localhost:4200');
        mainWindow.webContents.openDevTools();
    }
    else {
        const indexPath = path.join(__dirname, '../../frontend/dist/index.html');
        mainWindow.loadFile(indexPath);
    }
    // Create application menu
    const template = [
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
                        electron_1.app.quit();
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
    const menu = electron_1.Menu.buildFromTemplate(template);
    electron_1.Menu.setApplicationMenu(menu);
    mainWindow.on('closed', () => {
        mainWindow = null;
        transcriptionService = null;
        whisperService = null;
    });
}
// App lifecycle - Simplified, no backend to start!
electron_1.app.whenReady().then(() => {
    createWindow(); // Create window immediately!
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
// IPC Handlers
electron_1.ipcMain.handle('select-audio-file', async () => {
    const result = await electron_1.dialog.showOpenDialog({
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
electron_1.ipcMain.handle('transcribe-audio', async (event, audioPath, options) => {
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
    }
    catch (error) {
        console.error('[Main] Transcription error:', error);
        return {
            success: false,
            error: error.message || 'Failed to start transcription',
        };
    }
});
electron_1.ipcMain.handle('save-transcript', async (event, resultData) => {
    const saveResult = await electron_1.dialog.showSaveDialog({
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
        let content;
        // Format content based on selected extension
        if (ext === '.json') {
            const jsonData = typeof resultData === 'string' ? { text: resultData } : resultData;
            content = JSON.stringify(jsonData, null, 2);
        }
        else if (ext === '.srt') {
            const text = typeof resultData === 'string' ? resultData : resultData.text || '';
            content = convertToSRT(text);
        }
        else if (ext === '.vtt') {
            const text = typeof resultData === 'string' ? resultData : resultData.text || '';
            content = convertToVTT(text);
        }
        else {
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
electron_1.ipcMain.handle('get-available-models', async () => {
    try {
        if (!whisperService) {
            console.error('[Main] WhisperService not initialized');
            return [];
        }
        return await whisperService.getAvailableModels();
    }
    catch (error) {
        console.error('[Main] Error fetching models:', error);
        return [];
    }
});
electron_1.ipcMain.handle('download-model', async (event, modelName) => {
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
    }
    catch (error) {
        console.error('[Main] Error downloading model:', error);
        return {
            success: false,
            message: error.message || 'Failed to download model',
        };
    }
});
electron_1.ipcMain.handle('get-system-info', async () => {
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
electron_1.ipcMain.handle('get-app-path', async () => {
    return electron_1.app.getPath('userData');
});
electron_1.ipcMain.handle('get-transcription-history', async () => {
    try {
        if (!transcriptionService) {
            console.error('[Main] TranscriptionService not initialized');
            return [];
        }
        return transcriptionService.getTranscriptionHistory();
    }
    catch (error) {
        console.error('[Main] Error fetching history:', error);
        return [];
    }
});
