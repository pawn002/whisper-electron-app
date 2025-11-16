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
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const isDev = __importStar(require("electron-is-dev"));
let mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
        },
        title: "Whisper Transcription",
        backgroundColor: "#303030",
    });
    // Load the app
    if (isDev) {
        mainWindow.loadURL("http://localhost:4200");
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path.join(__dirname, "../frontend/dist/index.html"));
    }
    // Create application menu
    const template = [
        {
            label: "File",
            submenu: [
                {
                    label: "Open Audio File",
                    accelerator: "CmdOrCtrl+O",
                    click: () => {
                        mainWindow?.webContents.send("menu-open-file");
                    },
                },
                { type: "separator" },
                {
                    label: "Exit",
                    accelerator: "CmdOrCtrl+Q",
                    click: () => {
                        electron_1.app.quit();
                    },
                },
            ],
        },
        {
            label: "Edit",
            submenu: [
                { role: "undo" },
                { role: "redo" },
                { type: "separator" },
                { role: "cut" },
                { role: "copy" },
                { role: "paste" },
            ],
        },
        {
            label: "View",
            submenu: [
                { role: "reload" },
                { role: "forceReload" },
                { role: "toggleDevTools" },
                { type: "separator" },
                { role: "resetZoom" },
                { role: "zoomIn" },
                { role: "zoomOut" },
                { type: "separator" },
                { role: "togglefullscreen" },
            ],
        },
    ];
    const menu = electron_1.Menu.buildFromTemplate(template);
    electron_1.Menu.setApplicationMenu(menu);
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}
// App lifecycle
electron_1.app.whenReady().then(createWindow);
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
electron_1.app.on("activate", () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
// IPC Handlers
electron_1.ipcMain.handle("select-audio-file", async () => {
    const { dialog } = require("electron");
    const result = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [
            {
                name: "Audio Files",
                extensions: ["mp3", "wav", "ogg", "flac", "m4a", "aac", "webm"],
            },
            { name: "All Files", extensions: ["*"] },
        ],
    });
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});
electron_1.ipcMain.handle("transcribe-audio", async (event, audioPath, options) => {
    // This will be handled by the backend service
    // For now, return a mock response
    return {
        success: true,
        data: {
            text: "This is a mock transcription. Backend integration pending.",
        },
    };
});
electron_1.ipcMain.handle("save-transcript", async (event, content, format) => {
    const { dialog } = require("electron");
    const result = await dialog.showSaveDialog({
        defaultPath: `transcript.${format}`,
        filters: [
            { name: "Text Files", extensions: ["txt"] },
            { name: "SRT Subtitles", extensions: ["srt"] },
            { name: "VTT Subtitles", extensions: ["vtt"] },
            { name: "JSON", extensions: ["json"] },
            { name: "All Files", extensions: ["*"] },
        ],
    });
    if (!result.canceled && result.filePath) {
        const fs = require("fs");
        fs.writeFileSync(result.filePath, content);
        return result.filePath;
    }
    return null;
});
electron_1.ipcMain.handle("get-available-models", async () => {
    // Mock data - will be replaced with actual model detection
    return [
        { name: "tiny", size: "39 MB", installed: false },
        { name: "base", size: "74 MB", installed: true },
        { name: "small", size: "244 MB", installed: false },
        { name: "medium", size: "769 MB", installed: false },
        { name: "large", size: "1.5 GB", installed: false },
    ];
});
electron_1.ipcMain.handle("download-model", async (event, modelName) => {
    // Mock implementation - will be replaced with actual download logic
    return {
        success: true,
        message: `Model ${modelName} download started`,
    };
});
electron_1.ipcMain.handle("get-system-info", async () => {
    const os = require("os");
    return {
        platform: os.platform(),
        arch: os.arch(),
        version: os.release(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpus: os.cpus().length,
    };
});
electron_1.ipcMain.handle("get-app-path", async () => {
    return electron_1.app.getPath("userData");
});
