import { Component, OnInit } from "@angular/core";
import { ElectronService } from "./services/electron.service";
import { ToastService } from "./services/toast.service";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
  standalone: false,
})
export class AppComponent implements OnInit {
  title = "Whisper Transcription";
  systemInfo: any = null;
  activeTab = 0;

  constructor(
    private electronService: ElectronService,
    public toastService: ToastService,
  ) {}

  async ngOnInit() {
    try {
      this.systemInfo = await this.electronService.getSystemInfo();
      console.log("System Info:", this.systemInfo);
    } catch (error) {
      console.error("Failed to get system info:", error);
    }

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
      this.toastService.show(`Selected file: ${filePath}`, "info", 3000);
    }
  }

  async saveTranscript() {
    this.toastService.show("Save transcript functionality", "info", 3000);
  }
}
