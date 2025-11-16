import { app, BrowserWindow, ipcMain, Menu } from "electron";
import * as path from "path";
import * as isDev from "electron-is-dev";
import * as fs from "fs";
import { io, Socket } from "socket.io-client";

const BACKEND_URL = "http://localhost:3333";

let mainWindow: BrowserWindow | null = null;
let socket: Socket | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
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
  } else {
    mainWindow.loadFile(path.join(__dirname, "../frontend/dist/index.html"));
  }

  // Create application menu
  const template: any = [
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
            app.quit();
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

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Initialize WebSocket connection for progress tracking
function initializeSocket() {
  socket = io(BACKEND_URL);

  socket.on("connect", () => {
    console.log("Connected to backend WebSocket");
  });

  socket.on("progress", (data: any) => {
    if (mainWindow) {
      mainWindow.webContents.send("transcription-progress", data.progress);
    }
  });

  socket.on("completed", (data: any) => {
    if (mainWindow) {
      mainWindow.webContents.send("transcription-completed", data.result);
    }
  });

  socket.on("error", (data: any) => {
    if (mainWindow) {
      mainWindow.webContents.send("transcription-error", data.error);
    }
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from backend WebSocket");
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  initializeSocket();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle("select-audio-file", async () => {
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

ipcMain.handle(
  "transcribe-audio",
  async (event, audioPath: string, options: any) => {
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
        if (options.model) formData.append("model", options.model);
        if (options.language) formData.append("language", options.language);
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

        const request = https.request(
          {
            method: "POST",
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.path,
            headers: formData.getHeaders(),
          },
          (response: any) => {
            let data = "";

            response.on("data", (chunk: any) => {
              data += chunk;
            });

            response.on("end", () => {
              try {
                const result = JSON.parse(data);

                // Subscribe to job progress updates via WebSocket
                if (result.success && result.data && result.data.id && socket) {
                  socket.emit("subscribeToJob", result.data.id);
                }

                resolve(result);
              } catch (error: any) {
                reject(new Error(`Failed to parse response: ${data}`));
              }
            });
          },
        );

        request.on("error", (error: any) => {
          console.error("Request error:", error);
          resolve({
            success: false,
            error: error.message || "Failed to transcribe audio",
          });
        });

        // Pipe the form data to the request
        formData.pipe(request);
      } catch (error: any) {
        console.error("Transcription error:", error);
        resolve({
          success: false,
          error: error.message || "Failed to transcribe audio",
        });
      }
    });
  },
);

ipcMain.handle(
  "save-transcript",
  async (event, content: string, format: string) => {
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
  },
);

ipcMain.handle("get-available-models", async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/transcription/models`);
    if (!response.ok) {
      throw new Error("Failed to fetch models from backend");
    }
    return await response.json();
  } catch (error: any) {
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

ipcMain.handle("download-model", async (event, modelName: string) => {
  // Mock implementation - will be replaced with actual download logic
  return {
    success: true,
    message: `Model ${modelName} download started`,
  };
});

ipcMain.handle("get-system-info", async () => {
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

ipcMain.handle("get-app-path", async () => {
  return app.getPath("userData");
});
