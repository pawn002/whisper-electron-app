export interface TranscriptionOptions {
    model: string;
    language?: string;
    translate?: boolean;
    threads?: number;
    processors?: number;
    outputFormat?: "txt" | "srt" | "vtt" | "json";
    timestamps?: boolean;
}
export interface TranscriptionResult {
    text: string;
    segments?: Array<{
        start: number;
        end: number;
        text: string;
    }>;
    language?: string;
    duration?: number;
}
export declare class WhisperService {
    private whisperPath;
    private modelsPath;
    private ffmpegPath;
    private initialized;
    private ffmpegAvailable;
    private availableModels;
    constructor();
    initialize(): Promise<void>;
    private ensureDirectories;
    private checkBinary;
    private checkFfmpeg;
    getAvailableModels(): Promise<any[]>;
    private getInstalledModels;
    downloadModel(modelName: string, progressCallback?: (progress: number) => void): Promise<void>;
    transcribe(audioPath: string, options: TranscriptionOptions, progressCallback?: (progress: number) => void): Promise<TranscriptionResult>;
    convertAudioToWav(inputPath: string): Promise<string>;
}
