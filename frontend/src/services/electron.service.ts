import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class ElectronService {
  private electron: any;

  constructor() {
    // Check if running in Electron
    if (this.isElectron()) {
      this.electron = (window as any).electronAPI;
    }
  }

  isElectron(): boolean {
    return !!(window && (window as any).electronAPI);
  }

  async selectAudioFile(): Promise<string | null> {
    if (!this.isElectron()) {
      throw new Error("This feature is only available in Electron");
    }
    return await this.electron.selectAudioFile();
  }

  async transcribeAudio(audioPath: string, options: any): Promise<any> {
    if (!this.isElectron()) {
      throw new Error("This feature is only available in Electron");
    }
    return await this.electron.transcribeAudio(audioPath, options);
  }

  async saveTranscript(resultData: any): Promise<string | null> {
    if (!this.isElectron()) {
      throw new Error("This feature is only available in Electron");
    }
    return await this.electron.saveTranscript(resultData);
  }

  async getAvailableModels(): Promise<any[]> {
    if (!this.isElectron()) {
      // Return mock data for browser mode
      return [
        { name: "tiny", size: "39 MB", installed: false },
        { name: "base", size: "74 MB", installed: true },
        { name: "small", size: "244 MB", installed: false },
      ];
    }
    return await this.electron.getAvailableModels();
  }

  async downloadModel(modelName: string): Promise<any> {
    if (!this.isElectron()) {
      throw new Error("This feature is only available in Electron");
    }
    return await this.electron.downloadModel(modelName);
  }

  async getSystemInfo(): Promise<any> {
    if (!this.isElectron()) {
      return null;
    }
    return await this.electron.getSystemInfo();
  }

  async getTranscriptionHistory(): Promise<any[]> {
    if (!this.isElectron()) {
      throw new Error("This feature is only available in Electron");
    }
    return await this.electron.getTranscriptionHistory();
  }

  onTranscriptionProgress(
    callback: (data: { progress: number; message?: string }) => void,
  ): void {
    if (this.isElectron()) {
      this.electron.onTranscriptionProgress(callback);
    }
  }

  onTranscriptionCompleted(callback: (result: any) => void): void {
    if (this.isElectron()) {
      this.electron.onTranscriptionCompleted(callback);
    }
  }

  onTranscriptionError(callback: (error: string) => void): void {
    if (this.isElectron()) {
      this.electron.onTranscriptionError(callback);
    }
  }

  onModelDownloadProgress(callback: (data: any) => void): void {
    if (this.isElectron()) {
      this.electron.onModelDownloadProgress(callback);
    }
  }

  onMenuAction(action: string, callback: () => void): void {
    if (this.isElectron()) {
      this.electron.onMenuAction(action, callback);
    }
  }

  removeAllListeners(channel: string): void {
    if (this.isElectron()) {
      this.electron.removeAllListeners(channel);
    }
  }
}
