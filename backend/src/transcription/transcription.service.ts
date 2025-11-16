import { Injectable } from "@nestjs/common";
import { CreateTranscriptionDto } from "./create-transcription.dto";
import { TranscriptionGateway } from "./transcription.gateway";
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

  constructor(private readonly gateway: TranscriptionGateway) {}

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
      this.gateway.sendProgressUpdate(job.id, 10);

      // Simulate processing steps
      // In a real implementation, this would interface with whisper.cpp
      await this.simulateProcessing(job);

      job.status = "completed";
      job.completedAt = new Date();
      job.progress = 100;

      // Add to history
      this.transcriptionHistory.unshift(job);
      if (this.transcriptionHistory.length > 50) {
        this.transcriptionHistory = this.transcriptionHistory.slice(0, 50);
      }

      this.gateway.sendProgressUpdate(job.id, 100);
      this.gateway.sendCompletionUpdate(job.id, job.result);

      // Clean up uploaded file after processing
      await this.cleanupFile(job.filePath);
    } catch (error: any) {
      job.status = "failed";
      job.error = error.message;
      job.completedAt = new Date();

      this.gateway.sendErrorUpdate(job.id, error.message);
    }
  }

  private async simulateProcessing(job: TranscriptionJob): Promise<void> {
    // Simulate different processing stages
    const stages = [
      { progress: 20, delay: 500, action: "Loading model" },
      { progress: 40, delay: 1000, action: "Processing audio" },
      { progress: 60, delay: 1500, action: "Generating transcript" },
      { progress: 80, delay: 1000, action: "Formatting output" },
      { progress: 90, delay: 500, action: "Finalizing" },
    ];

    for (const stage of stages) {
      if (job.status === "cancelled") {
        throw new Error("Job was cancelled");
      }

      await this.delay(stage.delay);
      job.progress = stage.progress;
      this.gateway.sendProgressUpdate(job.id, stage.progress, stage.action);
    }

    // Generate mock result
    job.result = {
      text: `This is a mock transcription of the audio file. In a real implementation,
             this would contain the actual transcribed text from whisper.cpp.
             The audio was processed with model: ${job.options.model || "base"}.`,
      segments: [
        { start: 0, end: 5, text: "This is a mock transcription" },
        { start: 5, end: 10, text: "of the audio file." },
      ],
      language: job.options.language || "en",
      duration: 10.5,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

  getAvailableModels() {
    return [
      { id: "tiny", name: "Tiny", size: "39 MB", speed: "Fastest" },
      { id: "base", name: "Base", size: "74 MB", speed: "Fast" },
      { id: "small", name: "Small", size: "244 MB", speed: "Balanced" },
      { id: "medium", name: "Medium", size: "769 MB", speed: "Slow" },
      { id: "large", name: "Large", size: "1550 MB", speed: "Slowest" },
    ];
  }
}
