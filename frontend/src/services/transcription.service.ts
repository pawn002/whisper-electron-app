import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, Subject, firstValueFrom } from "rxjs";
import { io, Socket } from "socket.io-client";

export interface TranscriptionOptions {
  model?: string;
  language?: string;
  outputFormat?: string;
  timestamps?: boolean;
  threads?: number;
}

export interface ProgressUpdate {
  type: "progress" | "completed" | "error";
  progress?: number;
  result?: any;
  error?: string;
  message?: string;
}

@Injectable({
  providedIn: "root",
})
export class TranscriptionService {
  private apiUrl = "http://localhost:3333/api/transcription";
  private socket: Socket | null = null;
  private progressSubjects: Map<string, Subject<ProgressUpdate>> = new Map();

  constructor(private http: HttpClient) {
    this.initializeSocket();
  }

  private initializeSocket() {
    this.socket = io("http://localhost:3333");

    this.socket.on("progress", (data: any) => {
      const subject = this.progressSubjects.get(data.jobId);
      if (subject) {
        subject.next({
          type: "progress",
          progress: data.progress,
          message: data.message,
        });
      }
    });

    this.socket.on("completed", (data: any) => {
      const subject = this.progressSubjects.get(data.jobId);
      if (subject) {
        subject.next({
          type: "completed",
          result: data.result,
        });
        subject.complete();
        this.progressSubjects.delete(data.jobId);
      }
    });

    this.socket.on("error", (data: any) => {
      const subject = this.progressSubjects.get(data.jobId);
      if (subject) {
        subject.next({
          type: "error",
          error: data.error,
        });
        subject.error(new Error(data.error));
        this.progressSubjects.delete(data.jobId);
      }
    });
  }

  async uploadAndTranscribe(
    file: File,
    options: TranscriptionOptions,
  ): Promise<string> {
    const formData = new FormData();
    formData.append("audio", file);

    if (options.model) formData.append("model", options.model);
    if (options.language) formData.append("language", options.language);
    if (options.outputFormat)
      formData.append("outputFormat", options.outputFormat);
    if (options.timestamps !== undefined)
      formData.append("timestamps", String(options.timestamps));
    if (options.threads) formData.append("threads", String(options.threads));

    const response: any = await firstValueFrom(
      this.http.post(`${this.apiUrl}/process`, formData),
    );
    return response.data.id;
  }

  subscribeToProgress(jobId: string): Observable<ProgressUpdate> {
    const subject = new Subject<ProgressUpdate>();
    this.progressSubjects.set(jobId, subject);

    if (this.socket) {
      this.socket.emit("subscribeToJob", jobId);
    }

    return subject.asObservable();
  }

  async getTranscriptionStatus(jobId: string): Promise<any> {
    return firstValueFrom(this.http.get(`${this.apiUrl}/status/${jobId}`));
  }

  async getHistory(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(`${this.apiUrl}/history`));
  }

  async getAvailableModels(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(`${this.apiUrl}/models`));
  }

  async cancelTranscription(jobId: string): Promise<any> {
    return firstValueFrom(this.http.post(`${this.apiUrl}/cancel/${jobId}`, {}));
  }

  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
