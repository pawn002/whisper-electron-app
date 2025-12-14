import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { ElectronService } from '../../services/electron.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-transcription',
  templateUrl: './transcription.component.html',
  styleUrls: ['./transcription.component.scss'],
})
export class TranscriptionComponent implements OnInit, OnDestroy {
  selectedFilePath: string | null = null;
  selectedFileSize: number | null = null;
  isTranscribing = false;
  transcriptionProgress = 0;
  progressMessage = '';
  transcriptionResult: any = null;
  selectedModel = 'base';
  selectedLanguage = 'auto';

  availableModels = [
    { id: 'tiny', name: 'Tiny (39 MB)', installed: false },
    { id: 'base', name: 'Base (74 MB)', installed: true },
    { id: 'small', name: 'Small (244 MB)', installed: false },
    { id: 'medium', name: 'Medium (769 MB)', installed: false },
    { id: 'large', name: 'Large (1.5 GB)', installed: false },
  ];

  languages = [
    { code: 'auto', name: 'Auto Detect' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private electronService: ElectronService,
    private snackBar: MatSnackBar,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.loadAvailableModels();

    // Set up event listeners
    this.electronService.onTranscriptionProgress((data) => {
      this.transcriptionProgress = data.progress || 0;
      this.progressMessage = data.message || '';
    });

    // Listen for transcription completion
    (window as any).electronAPI?.onTranscriptionCompleted?.((result: any) => {
      this.ngZone.run(() => {
        this.transcriptionResult = result;
        this.isTranscribing = false;
        this.transcriptionProgress = 100;
        this.snackBar.open('Transcription completed!', 'Close', {
          duration: 3000,
        });
      });
    });

    // Listen for transcription errors
    (window as any).electronAPI?.onTranscriptionError?.((error: string) => {
      this.ngZone.run(() => {
        this.isTranscribing = false;
        this.transcriptionProgress = 0;
        this.snackBar.open(error || 'Transcription failed', 'Close', {
          duration: 5000,
        });
      });
    });

    // Refresh models periodically to catch newly downloaded models
    setInterval(() => {
      this.loadAvailableModels();
    }, 5000); // Check every 5 seconds
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadAvailableModels() {
    try {
      const models = await this.electronService.getAvailableModels();
      this.availableModels = models
        .filter((m: any) => m.installed) // Only show installed models
        .map((m: any) => ({
          id: m.name,
          name: `${m.name.charAt(0).toUpperCase() + m.name.slice(1)} (${m.size})`,
          installed: m.installed,
        }));

      // Set default to first installed model if current selection not installed
      if (this.availableModels.length > 0) {
        const currentModelInstalled = this.availableModels.some(
          (m) => m.id === this.selectedModel
        );
        if (!currentModelInstalled) {
          this.selectedModel = this.availableModels[0].id;
        }
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  }

  async selectAudioFile() {
    try {
      const fileData = await this.electronService.selectAudioFile();
      if (fileData) {
        this.resetUI();
        // Handle both old string format and new object format for backwards compatibility
        if (typeof fileData === 'string') {
          this.selectedFilePath = fileData;
          this.selectedFileSize = null;
        } else if (
          fileData &&
          typeof fileData === 'object' &&
          'path' in fileData
        ) {
          this.selectedFilePath = (fileData as any).path;
          this.selectedFileSize = (fileData as any).size;
        }
        if (this.selectedFilePath) {
          const fileName = this.selectedFilePath.split(/[\\/]/).pop();
          const sizeInfo = this.selectedFileSize
            ? ` (${this.formatFileSize(this.selectedFileSize)})`
            : '';
          this.snackBar.open(`Selected: ${fileName}${sizeInfo}`, 'Close', {
            duration: 3000,
          });
        }
      }
    } catch (error) {
      this.snackBar.open('Failed to select file', 'Close', {
        duration: 3000,
      });
    }
  }

  async startTranscription() {
    if (!this.selectedFilePath) {
      this.snackBar.open('Please select an audio file', 'Close', {
        duration: 3000,
      });
      return;
    }

    this.isTranscribing = true;
    this.transcriptionProgress = 0;
    this.transcriptionResult = null;

    try {
      const options = {
        model: this.selectedModel,
        language:
          this.selectedLanguage === 'auto' ? undefined : this.selectedLanguage,
        timestamps: true,
        threads: 4,
      };

      const result = await this.electronService.transcribeAudio(
        this.selectedFilePath,
        options
      );

      if (result.success && result.data) {
        // Job started successfully, progress and completion handled by event listeners
      } else {
        this.isTranscribing = false;
        throw new Error(result.error || 'Failed to start transcription');
      }
    } catch (error: any) {
      this.handleError(error);
    }
  }

  async saveTranscript() {
    if (!this.transcriptionResult) {
      this.snackBar.open('No transcript to save', 'Close', { duration: 3000 });
      return;
    }

    try {
      const savedPath = await this.electronService.saveTranscript(
        this.transcriptionResult
      );
      if (savedPath) {
        this.snackBar.open(`Saved to: ${savedPath}`, 'Close', {
          duration: 5000,
        });
      }
    } catch (error) {
      this.snackBar.open('Failed to save transcript', 'Close', {
        duration: 3000,
      });
    }
  }

  cancelTranscription() {
    this.isTranscribing = false;
    this.transcriptionProgress = 0;
    // Implement cancellation logic
  }

  private resetUI() {
    this.transcriptionResult = null;
    this.transcriptionProgress = 0;
    this.progressMessage = '';
    this.isTranscribing = false;
    this.selectedFileSize = null;
  }

  private handleError(error: any) {
    this.isTranscribing = false;
    this.transcriptionProgress = 0;
    this.snackBar.open(error.message || 'Transcription failed', 'Close', {
      duration: 5000,
    });
    console.error('Transcription error:', error);
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  getFileName(): string {
    if (this.selectedFilePath) {
      return this.selectedFilePath.split(/[\\/]/).pop() || '';
    }
    return '';
  }

  getTranscriptionText(): string {
    if (!this.transcriptionResult) {
      return '';
    }

    // If result is a string, return as-is (backward compatibility)
    if (typeof this.transcriptionResult === 'string') {
      return this.transcriptionResult;
    }

    // If result has segments, format as timestamped text for display
    if (this.transcriptionResult.segments && Array.isArray(this.transcriptionResult.segments)) {
      return this.formatSegmentsAsTimestampedText(this.transcriptionResult.segments);
    }

    // Fallback to text property or JSON stringified
    return (
      this.transcriptionResult.text ||
      JSON.stringify(this.transcriptionResult, null, 2)
    );
  }

  private formatSegmentsAsTimestampedText(segments: any[]): string {
    return segments.map(segment => {
      const start = this.formatTimestamp(segment.start);
      const end = this.formatTimestamp(segment.end);
      return `[${start} --> ${end}] ${segment.text}`;
    }).join('\n');
  }

  private formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const hh = hours.toString().padStart(2, '0');
    const mm = minutes.toString().padStart(2, '0');
    const ss = secs.toFixed(3).padStart(6, '0');

    return `${hh}:${mm}:${ss}`;
  }

  setTranscriptionText(value: string): void {
    if (typeof this.transcriptionResult === 'string') {
      this.transcriptionResult = value;
    } else if (
      this.transcriptionResult &&
      typeof this.transcriptionResult === 'object'
    ) {
      this.transcriptionResult.text = value;
    }
  }

  copyToClipboard(): void {
    if (!this.transcriptionResult) {
      return;
    }

    const content =
      typeof this.transcriptionResult === 'string'
        ? this.transcriptionResult
        : this.transcriptionResult.text;

    navigator.clipboard
      .writeText(content)
      .then(() => {
        this.snackBar.open('Copied to clipboard', 'Close', { duration: 2000 });
      })
      .catch((error) => {
        this.snackBar.open('Failed to copy to clipboard', 'Close', {
          duration: 3000,
        });
        console.error('Clipboard error:', error);
      });
  }

  exportTranscript(): void {
    this.saveTranscript();
  }
}
