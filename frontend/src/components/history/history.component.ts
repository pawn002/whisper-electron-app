import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatTableModule } from "@angular/material/table";
import { MatChipsModule } from "@angular/material/chips";
import { MatTooltipModule } from "@angular/material/tooltip";
import { ElectronService } from "../../services/electron.service";

interface TranscriptionHistoryItem {
  id: string;
  status: string;
  fileName?: string;
  startedAt: string;
  completedAt?: string;
  audioDuration?: number;
  transcriptionTime?: number;
  result?: any;
  error?: string;
  options?: any;
}

@Component({
  selector: "app-history",
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatChipsModule,
    MatTooltipModule,
  ],
  templateUrl: "./history.component.html",
  styleUrls: ["./history.component.scss"],
})
export class HistoryComponent implements OnInit, OnDestroy {
  history: TranscriptionHistoryItem[] = [];
  displayedColumns: string[] = [
    "fileName",
    "model",
    "status",
    "duration",
    "transcriptionTime",
    "timestamp",
    "actions",
  ];
  isLoading = true;

  constructor(private electronService: ElectronService) {}

  ngOnInit(): void {
    this.loadHistory();

    // Listen for transcription completion events to auto-refresh
    this.electronService.onTranscriptionCompleted(() => {
      console.log("Transcription completed, refreshing history...");
      this.loadHistory();
    });

    this.electronService.onTranscriptionError(() => {
      console.log("Transcription failed, refreshing history...");
      this.loadHistory();
    });
  }

  ngOnDestroy(): void {
    // Clean up event listeners
    this.electronService.removeAllListeners("transcription-completed");
    this.electronService.removeAllListeners("transcription-error");
  }

  async loadHistory(): Promise<void> {
    this.isLoading = true;
    try {
      console.log("Loading transcription history...");
      const result = await this.electronService.getTranscriptionHistory();
      console.log("History received:", result);
      this.history = result;
    } catch (error) {
      console.error("Failed to load history:", error);
      this.history = [];
    } finally {
      this.isLoading = false;
    }
  }

  formatDuration(seconds?: number): string {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  formatTime(ms?: number): string {
    if (!ms) return "N/A";
    if (ms < 1000) return `${ms}ms`;
    const seconds = (ms / 1000).toFixed(1);
    return `${seconds}s`;
  }

  formatTimestamp(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  getStatusColor(status: string): "primary" | "accent" | "warn" | undefined {
    switch (status) {
      case "completed":
        return "primary";
      case "failed":
        return "warn";
      case "processing":
        return "accent";
      default:
        return undefined;
    }
  }

  async viewTranscript(item: TranscriptionHistoryItem): Promise<void> {
    if (item.result) {
      console.log("Transcript:", item.result);
    }
  }

  async copyTranscript(item: TranscriptionHistoryItem): Promise<void> {
    if (item.result) {
      const text =
        typeof item.result === "string" ? item.result : item.result.text;
      await navigator.clipboard.writeText(text);
    }
  }
}
