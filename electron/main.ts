import { app, BrowserWindow, ipcMain, Menu } from "electron";
import * as path from "path";
import * as isDev from "electron-is-dev";

let mainWindow: BrowserWindow | null = null;

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

// App lifecycle
app.whenReady().then(createWindow);

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
    // This will be handled by the backend service
    // For now, return a mock response
    return {
      success: true,
      data: {
        text: "This is a mock transcription. Backend integration pending.",
      },
    };
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
  // Mock data - will be replaced with actual model detection
  return [
    { name: "tiny", size: "39 MB", installed: false },
    { name: "base", size: "74 MB", installed: true },
    { name: "small", size: "244 MB", installed: false },
    { name: "medium", size: "769 MB", installed: false },
    { name: "large", size: "1.5 GB", installed: false },
  ];
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
