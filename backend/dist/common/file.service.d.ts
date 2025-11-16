export declare class FileService {
    saveFile(filePath: string, content: string): Promise<void>;
    readFile(filePath: string): Promise<string>;
    fileExists(filePath: string): Promise<boolean>;
    getFileInfo(filePath: string): Promise<any>;
    createDirectory(dirPath: string): Promise<void>;
    deleteFile(filePath: string): Promise<void>;
    formatBytes(bytes: number, decimals?: number): string;
    getFileExtension(filePath: string): string;
    isAudioFile(filePath: string): boolean;
    exportTranscript(transcript: string, format: 'txt' | 'srt' | 'vtt' | 'json', metadata?: any): Promise<string>;
    private formatAsSRT;
    private formatAsVTT;
    private formatTime;
    private pad;
}
