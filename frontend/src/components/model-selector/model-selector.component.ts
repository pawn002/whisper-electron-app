import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatTableModule } from "@angular/material/table";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatChipsModule } from "@angular/material/chips";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { ElectronService } from "../../services/electron.service";

interface WhisperModel {
  name: string;
  size: string;
  sizeBytes: number;
  speed: string;
  accuracy: string;
  installed: boolean;
  downloading?: boolean;
  downloadProgress?: number;
}

@Component({
  selector: "app-model-selector",
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatProgressBarModule,
    MatChipsModule,
    MatSnackBarModule,
  ],
  templateUrl: "./model-selector.component.html",
  styleUrls: ["./model-selector.component.scss"],
})
export class ModelSelectorComponent implements OnInit {
  models: WhisperModel[] = [
    {
      name: "tiny",
      size: "39 MB",
      sizeBytes: 39,
      speed: "Fastest",
      accuracy: "Lower",
      installed: false,
    },
    {
      name: "base",
      size: "74 MB",
      sizeBytes: 74,
      speed: "Fast",
      accuracy: "Good",
      installed: false,
    },
    {
      name: "small",
      size: "244 MB",
      sizeBytes: 244,
      speed: "Medium",
      accuracy: "Better",
      installed: false,
    },
    {
      name: "medium",
      size: "769 MB",
      sizeBytes: 769,
      speed: "Slow",
      accuracy: "Great",
      installed: false,
    },
    {
      name: "large",
      size: "1550 MB",
      sizeBytes: 1550,
      speed: "Slowest",
      accuracy: "Best",
      installed: false,
    },
  ];

  displayedColumns: string[] = [
    "name",
    "size",
    "speed",
    "accuracy",
    "status",
    "actions",
  ];
  isLoading = true;

  constructor(
    private electronService: ElectronService,
    private snackBar: MatSnackBar,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadModels();
  }

  async loadModels(): Promise<void> {
    this.isLoading = true;
    try {
      const installedModels = await this.electronService.getAvailableModels();

      // Update installed status
      this.models.forEach((model) => {
        const found = installedModels.find((m: any) => m.name === model.name);
        if (found) {
          model.installed = found.installed || false;
        }
      });
    } catch (error) {
      console.error("Failed to load models:", error);
      this.snackBar.open("Failed to load models", "Close", { duration: 3000 });
    } finally {
      this.isLoading = false;
    }
  }

  async downloadModel(model: WhisperModel): Promise<void> {
    if (model.downloading) return;

    model.downloading = true;
    model.downloadProgress = 0;

    try {
      this.snackBar.open(`Downloading ${model.name} model...`, "Close", {
        duration: 3000,
      });

      const result = await this.electronService.downloadModel(model.name);

      if (result.success) {
        model.installed = true;
        model.downloading = false;
        model.downloadProgress = 100;
        this.snackBar.open(
          `${model.name} model downloaded successfully! You can now use it for transcription.`,
          "Close",
          { duration: 5000 },
        );
        await this.loadModels();
      } else {
        throw new Error(result.message || "Download failed");
      }
    } catch (error: any) {
      console.error("Download failed:", error);
      model.downloading = false;
      model.downloadProgress = 0;
      this.snackBar.open(
        `Failed to download ${model.name}: ${error.message}`,
        "Close",
        { duration: 5000 },
      );
    }
  }

  getSpeedColor(speed: string): string {
    switch (speed) {
      case "Fastest":
      case "Fast":
        return "success";
      case "Medium":
        return "primary";
      case "Slow":
      case "Slowest":
        return "warn";
      default:
        return "";
    }
  }

  getAccuracyColor(accuracy: string): string {
    switch (accuracy) {
      case "Best":
      case "Great":
        return "success";
      case "Better":
      case "Good":
        return "primary";
      case "Lower":
        return "warn";
      default:
        return "";
    }
  }
}
