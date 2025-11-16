import { contextBridge, ipcRenderer } from "electron";

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  selectAudioFile: () => ipcRenderer.invoke("select-audio-file"),

  transcribeAudio: (audioPath: string, options: any) =>
    ipcRenderer.invoke("transcribe-audio", audioPath, options),

  saveTranscript: (content: string, format: string) =>
    ipcRenderer.invoke("save-transcript", content, format),

  getAvailableModels: () => ipcRenderer.invoke("get-available-models"),

  downloadModel: (modelName: string) =>
    ipcRenderer.invoke("download-model", modelName),

  getSystemInfo: () => ipcRenderer.invoke("get-system-info"),

  // Event listeners
  onTranscriptionProgress: (callback: (progress: number) => void) => {
    ipcRenderer.on("transcription-progress", (event, progress) =>
      callback(progress),
    );
  },

  onTranscriptionCompleted: (callback: (result: any) => void) => {
    ipcRenderer.on("transcription-completed", (event, result) =>
      callback(result),
    );
  },

  onTranscriptionError: (callback: (error: string) => void) => {
    ipcRenderer.on("transcription-error", (event, error) => callback(error));
  },

  onModelDownloadProgress: (callback: (data: any) => void) => {
    ipcRenderer.on("model-download-progress", (event, data) => callback(data));
  },

  onMenuAction: (action: string, callback: () => void) => {
    ipcRenderer.on(`menu:${action}`, () => callback());
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Type definitions for TypeScript
declare global {
  interface Window {
    electronAPI: {
      selectAudioFile: () => Promise<string | null>;
      transcribeAudio: (audioPath: string, options: any) => Promise<any>;
      saveTranscript: (
        content: string,
        format: string,
      ) => Promise<string | null>;
      getAvailableModels: () => Promise<any[]>;
      downloadModel: (modelName: string) => Promise<any>;
      getSystemInfo: () => Promise<any>;
      onTranscriptionProgress: (callback: (progress: number) => void) => void;
      onTranscriptionCompleted: (callback: (result: any) => void) => void;
      onTranscriptionError: (callback: (error: string) => void) => void;
      onModelDownloadProgress: (callback: (data: any) => void) => void;
      onMenuAction: (action: string, callback: () => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}
