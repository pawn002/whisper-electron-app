import { Component, OnInit } from "@angular/core";
import { ElectronService } from "./services/electron.service";
import { MatSnackBar } from "@angular/material/snack-bar";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent implements OnInit {
  title = "Whisper Transcription";
  systemInfo: any = null;

  constructor(
    private electronService: ElectronService,
    private snackBar: MatSnackBar
  ) {}

  async ngOnInit() {
    try {
      this.systemInfo = await this.electronService.getSystemInfo();
      console.log("System Info:", this.systemInfo);
    } catch (error) {
      console.error("Failed to get system info:", error);
    }

    // Set up menu action listeners
    this.electronService.onMenuAction("open-file", () => {
      this.openFile();
    });

    this.electronService.onMenuAction("save-transcript", () => {
      this.saveTranscript();
    });
  }

  async openFile() {
    const filePath = await this.electronService.selectAudioFile();
    if (filePath) {
      this.snackBar.open(`Selected file: ${filePath}`, "Close", {
        duration: 3000,
      });
      // Emit event to handle file selection
    }
  }

  async saveTranscript() {
    // This will be implemented to save the current transcript
    this.snackBar.open("Save transcript functionality", "Close", {
      duration: 3000,
    });
  }
}
