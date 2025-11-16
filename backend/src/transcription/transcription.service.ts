import { Injectable } from "@nestjs/common";
import { CreateTranscriptionDto } from "./create-transcription.dto";
import { TranscriptionGateway } from "./transcription.gateway";
import { WhisperService } from "../common/whisper.service";
import * as fs from "fs/promises";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

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

@Injectable()
export class TranscriptionService {
  private jobs: Map<string, TranscriptionJob> = new Map();
  private transcriptionHistory: TranscriptionJob[] = [];
  private whisperService: WhisperService;

  constructor(private readonly gateway: TranscriptionGateway) {
    this.whisperService = new WhisperService();
    this.whisperService.initialize().catch((error) => {
      console.error("Failed to initialize WhisperService:", error);
    });
  }

  async processAudio(
    file: Express.Multer.File,
    options: CreateTranscriptionDto,
  ): Promise<TranscriptionJob> {
    const jobId = uuidv4();

    const job: TranscriptionJob = {
      id: jobId,
      status: "pending",
      progress: 0,
      startedAt: new Date(),
      filePath: file.path,
      options,
    };

    this.jobs.set(jobId, job);

    // Start processing in the background
    this.processTranscriptionJob(job);

    return job;
  }

  private async processTranscriptionJob(job: TranscriptionJob): Promise<void> {
    try {
      job.status = "processing";
      this.gateway.sendProgressUpdate(job.id, 5, "Starting transcription");

      // Prepare whisper options
      const whisperOptions = {
        model: job.options.model || "base",
        language: job.options.language,
        threads: job.options.threads || 4,
        processors: 1,
        outputFormat: job.options.outputFormat || "txt",
        timestamps: job.options.timestamps !== false,
      };

      this.gateway.sendProgressUpdate(job.id, 10, "Loading model");

      // Transcribe using WhisperService
      const result = await this.whisperService.transcribe(
        job.filePath,
        whisperOptions,
        (progress) => {
          // Map whisper progress (0-100) to our progress (10-90)
          const mappedProgress = 10 + progress * 0.8;
          job.progress = Math.round(mappedProgress);
          this.gateway.sendProgressUpdate(
            job.id,
            job.progress,
            "Transcribing audio",
          );
        },
      );

      job.result = result;
      job.status = "completed";
      job.completedAt = new Date();
      job.progress = 100;

      // Add to history
      this.transcriptionHistory.unshift(job);
      if (this.transcriptionHistory.length > 50) {
        this.transcriptionHistory = this.transcriptionHistory.slice(0, 50);
      }

      this.gateway.sendProgressUpdate(job.id, 100, "Completed");
      this.gateway.sendCompletionUpdate(job.id, job.result);

      // Clean up uploaded file after processing
      await this.cleanupFile(job.filePath);
    } catch (error: any) {
      job.status = "failed";
      job.error = error.message;
      job.completedAt = new Date();

      this.gateway.sendErrorUpdate(job.id, error.message);

      // Clean up file even on error
      await this.cleanupFile(job.filePath).catch(() => {});
    }
  }

  private async cleanupFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error("Failed to cleanup file:", error);
    }
  }

  async getJobStatus(jobId: string): Promise<TranscriptionJob | undefined> {
    return this.jobs.get(jobId);
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || job.status === "completed" || job.status === "failed") {
      return false;
    }

    job.status = "cancelled";
    job.completedAt = new Date();
    this.gateway.sendErrorUpdate(jobId, "Job cancelled by user");

    // Cleanup file if exists
    await this.cleanupFile(job.filePath);

    return true;
  }

  getTranscriptionHistory(): TranscriptionJob[] {
    return this.transcriptionHistory;
  }

  async getAvailableModels() {
    return await this.whisperService.getAvailableModels();
  }
}
