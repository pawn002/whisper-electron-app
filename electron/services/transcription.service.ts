import { BrowserWindow } from 'electron';
import { WhisperService } from './whisper.service';
import { TranscriptionJob, TranscriptionOptions } from './types';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

export class TranscriptionService {
  private jobs: Map<string, TranscriptionJob> = new Map();
  private transcriptionHistory: TranscriptionJob[] = [];
  private whisperService: WhisperService;
  private mainWindow: BrowserWindow | null;

  constructor(mainWindow: BrowserWindow | null) {
    this.mainWindow = mainWindow;
    this.whisperService = new WhisperService();
    this.whisperService.initialize().catch((error) => {
      console.error('[TranscriptionService] Failed to initialize WhisperService:', error);
    });
  }

  async processAudio(
    audioPath: string,
    options: TranscriptionOptions
  ): Promise<TranscriptionJob> {
    const jobId = uuidv4();

    const job: TranscriptionJob = {
      id: jobId,
      status: 'pending',
      progress: 0,
      startedAt: new Date(),
      filePath: audioPath,
      fileName: path.basename(audioPath),
      options,
    };

    this.jobs.set(jobId, job);

    // Start processing in the background
    this.processTranscriptionJob(job);

    return job;
  }

  private async processTranscriptionJob(job: TranscriptionJob): Promise<void> {
    try {
      job.status = 'processing';
      const processingStartTime = Date.now();

      // Get audio duration before transcription
      job.audioDuration = await this.whisperService.getAudioDuration(job.filePath);

      // Small delay to ensure IPC event listeners are ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      this.emitProgress(job.id, 5, 'Starting transcription');

      // Prepare whisper options
      const whisperOptions: TranscriptionOptions = {
        model: job.options.model || 'base',
        language: job.options.language,
        threads: job.options.threads || 4,
        processors: 1,
        outputFormat: job.options.outputFormat || 'txt',
        timestamps: job.options.timestamps !== false,
        translate: job.options.translate,
      };

      this.emitProgress(job.id, 10, 'Loading model');

      // Transcribe using WhisperService
      const result = await this.whisperService.transcribe(
        job.filePath,
        whisperOptions,
        (progress) => {
          // Map whisper progress (0-100) to our progress (10-90)
          const mappedProgress = 10 + progress * 0.8;
          job.progress = Math.round(mappedProgress);
          this.emitProgress(
            job.id,
            job.progress,
            'Transcribing audio'
          );
        }
      );

      job.result = result;
      job.status = 'completed';
      job.completedAt = new Date();
      job.progress = 100;
      job.transcriptionTime = Date.now() - processingStartTime;

      // Add to history
      this.transcriptionHistory.unshift(job);
      if (this.transcriptionHistory.length > 50) {
        this.transcriptionHistory = this.transcriptionHistory.slice(0, 50);
      }

      this.emitProgress(job.id, 100, 'Completed');
      this.emitCompleted(job.result);
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();

      this.emitError(error.message);
    }
  }

  private emitProgress(jobId: string, progress: number, message?: string) {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('transcription-progress', {
        jobId,
        progress,
        message,
      });
    }
  }

  private emitCompleted(result: any) {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('transcription-completed', result);
    }
  }

  private emitError(error: string) {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('transcription-error', error);
    }
  }

  async getJobStatus(jobId: string): Promise<TranscriptionJob | undefined> {
    return this.jobs.get(jobId);
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'completed' || job.status === 'failed') {
      return false;
    }

    job.status = 'cancelled';
    job.completedAt = new Date();
    this.emitError('Job cancelled by user');

    return true;
  }

  getTranscriptionHistory(): TranscriptionJob[] {
    return this.transcriptionHistory;
  }

  async getAvailableModels() {
    return await this.whisperService.getAvailableModels();
  }

  async downloadModel(
    modelName: string,
    progressCallback?: (progress: number) => void
  ): Promise<void> {
    return await this.whisperService.downloadModel(modelName, progressCallback);
  }
}
