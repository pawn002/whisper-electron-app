import { CreateTranscriptionDto } from "./create-transcription.dto";
import { TranscriptionGateway } from "./transcription.gateway";
export interface TranscriptionJob {
    id: string;
    status: "pending" | "processing" | "completed" | "failed" | "cancelled";
    progress: number;
    result?: any;
    error?: string;
    startedAt: Date;
    completedAt?: Date;
    filePath: string;
    options: CreateTranscriptionDto;
}
export declare class TranscriptionService {
    private readonly gateway;
    private jobs;
    private transcriptionHistory;
    private whisperService;
    constructor(gateway: TranscriptionGateway);
    processAudio(file: Express.Multer.File, options: CreateTranscriptionDto): Promise<TranscriptionJob>;
    private processTranscriptionJob;
    private cleanupFile;
    getJobStatus(jobId: string): Promise<TranscriptionJob | undefined>;
    cancelJob(jobId: string): Promise<boolean>;
    getTranscriptionHistory(): TranscriptionJob[];
    getAvailableModels(): Promise<any[]>;
}
