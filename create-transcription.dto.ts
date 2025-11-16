export class CreateTranscriptionDto {
  model?: string;
  language?: string;
  translate?: boolean;
  threads?: number;
  processors?: number;
  outputFormat?: 'txt' | 'srt' | 'vtt' | 'json';
  timestamps?: boolean;
}
