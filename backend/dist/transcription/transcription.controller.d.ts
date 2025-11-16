import { TranscriptionService } from "./transcription.service";
import { CreateTranscriptionDto } from "./create-transcription.dto";
export declare class TranscriptionController {
    private readonly transcriptionService;
    constructor(transcriptionService: TranscriptionService);
    processAudio(file: Express.Multer.File, dto: CreateTranscriptionDto): Promise<{
        success: boolean;
        data: import("./transcription.service").TranscriptionJob;
    }>;
    getTranscriptionStatus(jobId: string): Promise<import("./transcription.service").TranscriptionJob>;
    getTranscriptionHistory(): Promise<import("./transcription.service").TranscriptionJob[]>;
    getAvailableModels(): Promise<{
        id: string;
        name: string;
        size: string;
        speed: string;
    }[]>;
    cancelTranscription(jobId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
