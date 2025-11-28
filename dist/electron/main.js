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
const fs = __importStar(require("fs"));
const socket_io_client_1 = require("socket.io-client");
const child_process_1 = require("child_process");
// Import package.json for app version
const packageJson = require(path.join(__dirname, "../../package.json"));
const BACKEND_URL = "http://localhost:3333";
let mainWindow = null;
let socket = null;
let backendProcess = null;
// Helper function to convert Whisper timestamp format to SRT
function convertToSRT(text) {
    // Whisper format: [00:00:00.000 --> 00:00:05.840]   Text here
    const lines = text.split("\n").filter((line) => line.trim());
    let srtContent = "";
    let index = 1;
    for (const line of lines) {
        const match = line.match(/\[(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})\]\s*(.+)/);
        if (match) {
            const [, start, end, subtitle] = match;
            // Convert milliseconds format from . to ,
            const srtStart = start.replace(".", ",");
            const srtEnd = end.replace(".", ",");
            srtContent += `${index}\n${srtStart} --> ${srtEnd}\n${subtitle.trim()}\n\n`;
            index++;
        }
    }
    return srtContent || text; // Fallback to original if no matches
}
// Helper function to convert Whisper timestamp format to VTT
function convertToVTT(text) {
    const lines = text.split("\n").filter((line) => line.trim());
    let vttContent = "WEBVTT\n\n";
    for (const line of lines) {
        const match = line.match(/\[(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})\]\s*(.+)/);
        if (match) {
            const [, start, end, subtitle] = match;
            vttContent += `${start} --> ${end}\n${subtitle.trim()}\n\n`;
        }
    }
    return vttContent === "WEBVTT\n\n" ? text : vttContent; // Fallback to original if no matches
}
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
    console.log("isDev:", electron_is_dev_1.default);
    console.log("__dirname:", __dirname);
    if (electron_is_dev_1.default) {
        mainWindow.loadURL("http://localhost:4200");
        mainWindow.webContents.openDevTools();
    }
    else {
        // In production, files are in app.asar
        const indexPath = path.join(__dirname, "../../frontend/dist/index.html");
        mainWindow.loadFile(indexPath);
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
// Initialize WebSocket connection for progress tracking
function initializeSocket() {
    socket = (0, socket_io_client_1.io)(BACKEND_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
    });
    socket.on("connect", () => {
        console.log("Connected to backend WebSocket");
    });
    socket.on("connect_error", (error) => {
        console.log("WebSocket connection error (will retry):", error.message);
    });
    socket.on("progress", (data) => {
        console.log("Received progress event:", data);
        if (mainWindow) {
            mainWindow.webContents.send("transcription-progress", {
                progress: data.progress,
                message: data.message,
            });
        }
    });
    socket.on("completed", (data) => {
        if (mainWindow) {
            mainWindow.webContents.send("transcription-completed", data.result);
        }
    });
    socket.on("error", (data) => {
        if (mainWindow) {
            mainWindow.webContents.send("transcription-error", data.error);
        }
    });
    socket.on("disconnect", () => {
        console.log("Disconnected from backend WebSocket");
    });
}
// App lifecycle
// Start the NestJS backend server
function startBackend() {
    if (electron_is_dev_1.default) {
        console.log("Development mode: Backend should be started manually with 'npm run dev:backend'");
        return;
    }
    const backendMainPath = path.join(process.resourcesPath, "backend", "dist", "main.js");
    const backendDir = path.join(process.resourcesPath, "backend");
    // Log to a file for debugging
    const logPath = path.join(electron_1.app.getPath("userData"), "backend-startup.log");
    const logMessage = `
Starting backend...
Backend path: ${backendMainPath}
Backend directory: ${backendDir}
Backend exists: ${fs.existsSync(backendMainPath)}
process.resourcesPath: ${process.resourcesPath}
process.execPath: ${process.execPath}
__dirname: ${__dirname}
`;
    fs.writeFileSync(logPath, logMessage);
    console.log("Backend startup log written to:", logPath);
    console.log("Starting backend...");
    console.log("Backend path:", backendMainPath);
    console.log("Backend directory:", backendDir);
    console.log("Backend exists:", fs.existsSync(backendMainPath));
    console.log("process.resourcesPath:", process.resourcesPath);
    if (!fs.existsSync(backendMainPath)) {
        console.error("Backend main.js not found at:", backendMainPath);
        return;
    }
    // Use Electron's bundled Node.js
    const backendLogPath = path.join(electron_1.app.getPath("userData"), "backend-output.log");
    const backendErrorPath = path.join(electron_1.app.getPath("userData"), "backend-error.log");
    backendProcess = (0, child_process_1.spawn)(process.execPath, [backendMainPath], {
        cwd: backendDir,
        env: {
            ...process.env,
            PORT: "3333",
            NODE_ENV: "production",
            ELECTRON_RUN_AS_NODE: "1", // Run as Node.js instead of Electron
        },
        stdio: ["ignore", "pipe", "pipe"],
    });
    backendProcess.stdout?.on("data", (data) => {
        const output = data.toString();
        console.log(`Backend: ${output}`);
        fs.appendFileSync(backendLogPath, output);
    });
    backendProcess.stderr?.on("data", (data) => {
        const output = data.toString();
        console.error(`Backend Error: ${output}`);
        fs.appendFileSync(backendErrorPath, output);
    });
    backendProcess.on("error", (error) => {
        const errorMsg = `Failed to start backend: ${error}\n`;
        console.error(errorMsg);
        fs.appendFileSync(backendErrorPath, errorMsg);
    });
    backendProcess.on("exit", (code, signal) => {
        const exitMsg = `Backend process exited with code ${code}, signal ${signal}\n`;
        console.log(exitMsg);
        fs.appendFileSync(backendLogPath, exitMsg);
        backendProcess = null;
    });
}
electron_1.app.whenReady().then(() => {
    startBackend();
    // Wait for backend to start before creating window
    setTimeout(() => {
        createWindow();
        initializeSocket();
    }, electron_is_dev_1.default ? 0 : 7000);
});
electron_1.app.on("window-all-closed", () => {
    // Kill backend process
    if (backendProcess) {
        backendProcess.kill();
        backendProcess = null;
    }
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
electron_1.app.on("activate", () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
electron_1.app.on("before-quit", () => {
    // Ensure backend is killed on app quit
    if (backendProcess) {
        backendProcess.kill();
        backendProcess = null;
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
        const filePath = result.filePaths[0];
        const stats = fs.statSync(filePath);
        return {
            path: filePath,
            size: stats.size,
        };
    }
    return null;
});
electron_1.ipcMain.handle("transcribe-audio", async (event, audioPath, options) => {
    return new Promise((resolve, reject) => {
        try {
            const FormData = require("form-data");
            const formData = new FormData();
            // Create a read stream for the file
            const fileStream = fs.createReadStream(audioPath);
            const fileName = path.basename(audioPath);
            formData.append("audio", fileStream, {
                filename: fileName,
                contentType: "audio/*",
            });
            // Add options to form data
            if (options.model)
                formData.append("model", options.model);
            if (options.language)
                formData.append("language", options.language);
            if (options.outputFormat)
                formData.append("outputFormat", options.outputFormat);
            if (options.timestamps !== undefined)
                formData.append("timestamps", String(options.timestamps));
            if (options.threads)
                formData.append("threads", String(options.threads));
            // Use http/https module for the request
            const https = require("http"); // Use http for localhost
            const url = require("url");
            const parsedUrl = url.parse(`${BACKEND_URL}/api/transcription/process`);
            const request = https.request({
                method: "POST",
                hostname: parsedUrl.hostname,
                port: parsedUrl.port,
                path: parsedUrl.path,
                headers: formData.getHeaders(),
            }, (response) => {
                let data = "";
                response.on("data", (chunk) => {
                    data += chunk;
                });
                response.on("end", () => {
                    try {
                        const result = JSON.parse(data);
                        // Subscribe to job progress updates via WebSocket
                        if (result.success && result.data && result.data.id && socket) {
                            console.log("Subscribing to job:", result.data.id);
                            socket.emit("subscribeToJob", result.data.id);
                        }
                        else {
                            console.log("Cannot subscribe to job. Result:", result);
                        }
                        resolve(result);
                    }
                    catch (error) {
                        reject(new Error(`Failed to parse response: ${data}`));
                    }
                });
            });
            request.on("error", (error) => {
                console.error("Request error:", error);
                resolve({
                    success: false,
                    error: error.message || "Failed to transcribe audio",
                });
            });
            // Pipe the form data to the request
            formData.pipe(request);
        }
        catch (error) {
            console.error("Transcription error:", error);
            resolve({
                success: false,
                error: error.message || "Failed to transcribe audio",
            });
        }
    });
});
electron_1.ipcMain.handle("save-transcript", async (event, resultData) => {
    const { dialog } = require("electron");
    const saveResult = await dialog.showSaveDialog({
        defaultPath: `transcript.txt`,
        filters: [
            { name: "Text Files", extensions: ["txt"] },
            { name: "JSON", extensions: ["json"] },
            { name: "SRT Subtitles", extensions: ["srt"] },
            { name: "VTT Subtitles", extensions: ["vtt"] },
            { name: "All Files", extensions: ["*"] },
        ],
    });
    if (!saveResult.canceled && saveResult.filePath) {
        const fs = require("fs");
        const selectedPath = saveResult.filePath;
        const ext = path.extname(selectedPath).toLowerCase();
        let content;
        // Format content based on selected extension
        if (ext === ".json") {
            const jsonData = typeof resultData === "string" ? { text: resultData } : resultData;
            content = JSON.stringify(jsonData, null, 2);
        }
        else if (ext === ".srt") {
            // For SRT, convert Whisper timestamp format to SRT format
            const text = typeof resultData === "string" ? resultData : resultData.text || "";
            content = convertToSRT(text);
        }
        else if (ext === ".vtt") {
            // For VTT (WebVTT), convert Whisper timestamp format
            const text = typeof resultData === "string" ? resultData : resultData.text || "";
            content = convertToVTT(text);
        }
        else {
            // For txt - use text content
            content =
                typeof resultData === "string"
                    ? resultData
                    : resultData.text || JSON.stringify(resultData);
        }
        fs.writeFileSync(selectedPath, content, "utf-8");
        return selectedPath;
    }
    return null;
});
electron_1.ipcMain.handle("get-available-models", async () => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/transcription/models`);
        if (!response.ok) {
            throw new Error("Failed to fetch models from backend");
        }
        return await response.json();
    }
    catch (error) {
        console.error("Error fetching models:", error);
        // Return fallback data if backend is not available
        return [
            { name: "tiny", size: "39 MB", installed: false },
            { name: "base", size: "74 MB", installed: true },
            { name: "small", size: "244 MB", installed: false },
            { name: "medium", size: "769 MB", installed: false },
            { name: "large", size: "1.5 GB", installed: false },
        ];
    }
});
electron_1.ipcMain.handle("download-model", async (event, modelName) => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/transcription/download-model/${modelName}`, {
            method: "POST",
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to download model");
        }
        const result = await response.json();
        return {
            success: true,
            message: result.message || `Model ${modelName} downloaded successfully`,
        };
    }
    catch (error) {
        console.error("Error downloading model:", error);
        return {
            success: false,
            message: error.message || "Failed to download model",
        };
    }
});
electron_1.ipcMain.handle("get-system-info", async () => {
    const os = require("os");
    return {
        platform: os.platform(),
        arch: os.arch(),
        version: packageJson.version,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpus: os.cpus().length,
    };
});
electron_1.ipcMain.handle("get-app-path", async () => {
    return electron_1.app.getPath("userData");
});
electron_1.ipcMain.handle("get-transcription-history", async () => {
    // Retry logic for initial backend startup
    const maxRetries = 5;
    const retryDelay = 1500;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(`${BACKEND_URL}/api/transcription/history`);
            if (!response.ok) {
                throw new Error("Failed to fetch history from backend");
            }
            return await response.json();
        }
        catch (error) {
            if (i === maxRetries - 1) {
                // Last attempt failed, return empty history instead of throwing
                console.error("Error fetching history after retries:", error);
                return [];
            }
            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
    }
    return [];
});
