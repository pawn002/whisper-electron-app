"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld("electronAPI", {
    selectAudioFile: () => electron_1.ipcRenderer.invoke("select-audio-file"),
    transcribeAudio: (audioPath, options) => electron_1.ipcRenderer.invoke("transcribe-audio", audioPath, options),
    saveTranscript: (content, format) => electron_1.ipcRenderer.invoke("save-transcript", content, format),
    getAvailableModels: () => electron_1.ipcRenderer.invoke("get-available-models"),
    downloadModel: (modelName) => electron_1.ipcRenderer.invoke("download-model", modelName),
    getSystemInfo: () => electron_1.ipcRenderer.invoke("get-system-info"),
    getTranscriptionHistory: () => electron_1.ipcRenderer.invoke("get-transcription-history"),
    // Event listeners
    onTranscriptionProgress: (callback) => {
        electron_1.ipcRenderer.on("transcription-progress", (event, data) => callback(data));
    },
    onTranscriptionCompleted: (callback) => {
        electron_1.ipcRenderer.on("transcription-completed", (event, result) => callback(result));
    },
    onTranscriptionError: (callback) => {
        electron_1.ipcRenderer.on("transcription-error", (event, error) => callback(error));
    },
    onModelDownloadProgress: (callback) => {
        electron_1.ipcRenderer.on("model-download-progress", (event, data) => callback(data));
    },
    onMenuAction: (action, callback) => {
        electron_1.ipcRenderer.on(`menu:${action}`, () => callback());
    },
    // Remove listeners
    removeAllListeners: (channel) => {
        electron_1.ipcRenderer.removeAllListeners(channel);
    },
});
