import { Component, OnInit, OnDestroy } from "@angular/core";
import { ElectronService } from "../../services/electron.service";
import { TranscriptionService } from "../../services/transcription.service";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Subject, takeUntil } from "rxjs";

@Component({
  selector: "app-transcription",
  templateUrl: "./transcription.component.html",
  styleUrls: ["./transcription.component.scss"],
})
export class TranscriptionComponent implements OnInit, OnDestroy {
  selectedFile: File | null = null;
  selectedFilePath: string | null = null;
  selectedFileSize: number | null = null;
  isTranscribing = false;
  transcriptionProgress = 0;
  progressMessage = "";
  transcriptionResult: any = null;
  selectedModel = "base";
  selectedLanguage = "auto";
  outputFormat = "txt";

  availableModels = [
    { id: "tiny", name: "Tiny (39 MB)", installed: false },
    { id: "base", name: "Base (74 MB)", installed: true },
    { id: "small", name: "Small (244 MB)", installed: false },
    { id: "medium", name: "Medium (769 MB)", installed: false },
    { id: "large", name: "Large (1.5 GB)", installed: false },
  ];

  languages = [
    { code: "auto", name: "Auto Detect" },
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "it", name: "Italian" },
    { code: "pt", name: "Portuguese" },
    { code: "ru", name: "Russian" },
    { code: "ja", name: "Japanese" },
    { code: "ko", name: "Korean" },
    { code: "zh", name: "Chinese" },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private electronService: ElectronService,
    private transcriptionService: TranscriptionService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit() {
    this.loadAvailableModels();

    if (this.electronService.isElectron()) {
      // Set up event listeners for Electron mode
      this.electronService.onTranscriptionProgress((data) => {
        this.transcriptionProgress = data.progress || 0;
        this.progressMessage = data.message || "";
      });

      // Listen for transcription completion
      (window as any).electronAPI?.onTranscriptionCompleted?.((result: any) => {
        this.transcriptionResult = result;
        this.isTranscribing = false;
        this.transcriptionProgress = 100;
        this.snackBar.open("Transcription completed!", "Close", {
          duration: 3000,
        });
      });

      // Listen for transcription errors
      (window as any).electronAPI?.onTranscriptionError?.((error: string) => {
        this.isTranscribing = false;
        this.transcriptionProgress = 0;
        this.snackBar.open(error || "Transcription failed", "Close", {
          duration: 5000,
        });
      });

      // Refresh models periodically to catch newly downloaded models
      setInterval(() => {
        this.loadAvailableModels();
      }, 5000); // Check every 5 seconds
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadAvailableModels() {
    try {
      if (this.electronService.isElectron()) {
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
            (m) => m.id === this.selectedModel,
          );
          if (!currentModelInstalled) {
            this.selectedModel = this.availableModels[0].id;
          }
        }
      }
    } catch (error) {
      console.error("Failed to load models:", error);
    }
  }

  async selectAudioFile() {
    if (this.electronService.isElectron()) {
      try {
        const fileData = await this.electronService.selectAudioFile();
        if (fileData) {
          this.resetUI();
          // Handle both old string format and new object format for backwards compatibility
          if (typeof fileData === "string") {
            this.selectedFilePath = fileData;
            this.selectedFileSize = null;
          } else if (
            fileData &&
            typeof fileData === "object" &&
            "path" in fileData
          ) {
            this.selectedFilePath = (fileData as any).path;
            this.selectedFileSize = (fileData as any).size;
          }
          if (this.selectedFilePath) {
            const fileName = this.selectedFilePath.split(/[\\/]/).pop();
            const sizeInfo = this.selectedFileSize
              ? ` (${this.formatFileSize(this.selectedFileSize)})`
              : "";
            this.snackBar.open(`Selected: ${fileName}${sizeInfo}`, "Close", {
              duration: 3000,
            });
          }
        }
      } catch (error) {
        this.snackBar.open("Failed to select file", "Close", {
          duration: 3000,
        });
      }
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.resetUI();
      this.selectedFile = file;
      this.snackBar.open(`Selected: ${file.name}`, "Close", { duration: 3000 });
    }
  }

  async startTranscription() {
    if (!this.selectedFile && !this.selectedFilePath) {
      this.snackBar.open("Please select an audio file", "Close", {
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
          this.selectedLanguage === "auto" ? undefined : this.selectedLanguage,
        outputFormat: this.outputFormat,
        timestamps: this.outputFormat !== "txt",
        threads: 4,
      };

      if (this.electronService.isElectron() && this.selectedFilePath) {
        // Electron mode - use local file path
        const result = await this.electronService.transcribeAudio(
          this.selectedFilePath,
          options,
        );
        if (result.success && result.data) {
          // Job started successfully, now wait for WebSocket events
          // The progress and completion will be handled by the event listeners
          // set up in ngOnInit via onTranscriptionProgress
          // Don't set isTranscribing to false - let the completion event handle it
        } else {
          this.isTranscribing = false;
          throw new Error(result.error || "Failed to start transcription");
        }
      } else if (this.selectedFile) {
        // Browser mode - use file upload
        const jobId = await this.transcriptionService.uploadAndTranscribe(
          this.selectedFile,
          options,
        );

        // Subscribe to progress updates
        this.transcriptionService
          .subscribeToProgress(jobId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (update) => {
              if (update.type === "progress") {
                this.transcriptionProgress = update.progress ?? 0;
                this.progressMessage = update.message || "";
              } else if (update.type === "completed") {
                this.transcriptionResult = update.result;
                this.isTranscribing = false;
                this.snackBar.open("Transcription completed!", "Close", {
                  duration: 3000,
                });
              } else if (update.type === "error") {
                throw new Error(update.error);
              }
            },
            error: (error) => {
              this.handleError(error);
            },
          });
      }
    } catch (error: any) {
      this.handleError(error);
    }
  }

  async saveTranscript() {
    if (!this.transcriptionResult) {
      this.snackBar.open("No transcript to save", "Close", { duration: 3000 });
      return;
    }

    try {
      if (this.electronService.isElectron()) {
        // Pass the full result data to Electron - it will format based on selected extension
        const savedPath = await this.electronService.saveTranscript(
          this.transcriptionResult,
        );
        if (savedPath) {
          this.snackBar.open(`Saved to: ${savedPath}`, "Close", {
            duration: 5000,
          });
        }
      } else {
        // Browser mode - default to text download
        const content =
          typeof this.transcriptionResult === "string"
            ? this.transcriptionResult
            : this.transcriptionResult.text;
        const blob = new Blob([content], { type: "text/plain" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `transcript.txt`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.snackBar.open("Download started", "Close", { duration: 3000 });
      }
    } catch (error) {
      this.snackBar.open("Failed to save transcript", "Close", {
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
    this.progressMessage = "";
    this.isTranscribing = false;
    this.selectedFileSize = null;
  }

  private handleError(error: any) {
    this.isTranscribing = false;
    this.transcriptionProgress = 0;
    this.snackBar.open(error.message || "Transcription failed", "Close", {
      duration: 5000,
    });
    console.error("Transcription error:", error);
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  getFileName(): string {
    if (this.selectedFile) {
      return this.selectedFile.name;
    }
    if (this.selectedFilePath) {
      return this.selectedFilePath.split(/[\\/]/).pop() || "";
    }
    return "";
  }

  getTranscriptionText(): string {
    if (!this.transcriptionResult) {
      return "";
    }
    if (typeof this.transcriptionResult === "string") {
      return this.transcriptionResult;
    }
    return (
      this.transcriptionResult.text ||
      JSON.stringify(this.transcriptionResult, null, 2)
    );
  }

  setTranscriptionText(value: string): void {
    if (typeof this.transcriptionResult === "string") {
      this.transcriptionResult = value;
    } else if (
      this.transcriptionResult &&
      typeof this.transcriptionResult === "object"
    ) {
      this.transcriptionResult.text = value;
    }
  }

  copyToClipboard(): void {
    if (!this.transcriptionResult) {
      return;
    }

    const content =
      typeof this.transcriptionResult === "string"
        ? this.transcriptionResult
        : this.transcriptionResult.text;

    navigator.clipboard
      .writeText(content)
      .then(() => {
        this.snackBar.open("Copied to clipboard", "Close", { duration: 2000 });
      })
      .catch((error) => {
        this.snackBar.open("Failed to copy to clipboard", "Close", {
          duration: 3000,
        });
        console.error("Clipboard error:", error);
      });
  }

  exportTranscript(): void {
    this.saveTranscript();
  }
}
