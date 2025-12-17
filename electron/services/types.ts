export interface TranscriptionOptions {
  model: string;
  language?: string;
  translate?: boolean;
  threads?: number;
  processors?: number;
  outputFormat?: 'txt' | 'srt' | 'vtt' | 'json';
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

export interface TranscriptionJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  result?: any;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  filePath: string;
  fileName?: string;
  audioDuration?: number;
  transcriptionTime?: number;
  options: TranscriptionOptions;
}
