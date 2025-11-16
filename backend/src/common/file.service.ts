import * as fs from 'fs/promises';
import * as path from 'path';

export class FileService {
  async saveFile(filePath: string, content: string): Promise<void> {
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async readFile(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getFileInfo(filePath: string): Promise<any> {
    const stats = await fs.stat(filePath);
    return {
      name: path.basename(filePath),
      path: filePath,
      size: stats.size,
      extension: path.extname(filePath),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime
    };
  }

  async createDirectory(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  async deleteFile(filePath: string): Promise<void> {
    await fs.unlink(filePath);
  }

  formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  getFileExtension(filePath: string): string {
    return path.extname(filePath).toLowerCase();
  }

  isAudioFile(filePath: string): boolean {
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma', '.opus'];
    return audioExtensions.includes(this.getFileExtension(filePath));
  }

  async exportTranscript(
    transcript: string,
    format: 'txt' | 'srt' | 'vtt' | 'json',
    metadata?: any
  ): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify({
          transcript,
          metadata,
          exportedAt: new Date().toISOString()
        }, null, 2);
      
      case 'srt':
        return this.formatAsSRT(transcript, metadata?.segments);
      
      case 'vtt':
        return this.formatAsVTT(transcript, metadata?.segments);
      
      case 'txt':
      default:
        return transcript;
    }
  }

  private formatAsSRT(transcript: string, segments?: any[]): string {
    if (!segments || segments.length === 0) {
      return transcript;
    }

    return segments
      .map((segment, index) => {
        const start = this.formatTime(segment.start);
        const end = this.formatTime(segment.end);
        return `${index + 1}\n${start} --> ${end}\n${segment.text.trim()}\n`;
      })
      .join('\n');
  }

  private formatAsVTT(transcript: string, segments?: any[]): string {
    if (!segments || segments.length === 0) {
      return `WEBVTT\n\n${transcript}`;
    }

    const formattedSegments = segments
      .map((segment) => {
        const start = this.formatTime(segment.start);
        const end = this.formatTime(segment.end);
        return `${start} --> ${end}\n${segment.text.trim()}\n`;
      })
      .join('\n');

    return `WEBVTT\n\n${formattedSegments}`;
  }

  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);

    return `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(secs)},${this.pad(millis, 3)}`;
  }

  private pad(num: number, size = 2): string {
    return num.toString().padStart(size, '0');
  }
}
