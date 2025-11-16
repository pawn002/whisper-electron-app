import * as path from "path";
import * as fs from "fs/promises";
import { spawn } from "child_process";
import * as https from "https";
import { createWriteStream } from "fs";

export interface TranscriptionOptions {
  model: string;
  language?: string;
  translate?: boolean;
  threads?: number;
  processors?: number;
  outputFormat?: "txt" | "srt" | "vtt" | "json";
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

export class WhisperService {
  private whisperPath: string;
  private modelsPath: string;
  private initialized: boolean = false;
  private availableModels = [
    { name: "tiny", size: "39 MB", description: "Fastest, least accurate" },
    { name: "base", size: "74 MB", description: "Fast, good accuracy" },
    { name: "small", size: "244 MB", description: "Balanced speed/accuracy" },
    { name: "medium", size: "769 MB", description: "Slower, better accuracy" },
    { name: "large", size: "1550 MB", description: "Slowest, best accuracy" },
  ];

  constructor() {
    // Use project root directory
    const basePath = path.join(__dirname, "../../../");

    // Platform-specific binary name and path
    if (process.platform === "win32") {
      // On Windows, use the CMake build output
      this.whisperPath = path.join(
        basePath,
        "whisper.cpp",
        "build",
        "bin",
        "Release",
        "whisper-cli.exe",
      );
    } else {
      // On Unix, the binary is in the root whisper.cpp directory
      this.whisperPath = path.join(basePath, "whisper.cpp", "main");
    }

    this.modelsPath = path.join(basePath, "models");
  }

  async initialize(): Promise<void> {
    // Ensure directories exist
    await this.ensureDirectories();

    // Check if whisper binary exists
    const binaryExists = await this.checkBinary();
    if (!binaryExists) {
      throw new Error(
        "Whisper binary not found. Please rebuild the application.",
      );
    }

    // Check for at least one model
    const models = await this.getInstalledModels();
    if (models.length === 0) {
      // Download the tiny model by default
      await this.downloadModel("tiny");
    }

    this.initialized = true;
  }

  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.modelsPath, { recursive: true });
    await fs.mkdir(path.dirname(this.whisperPath), { recursive: true });
  }

  private async checkBinary(): Promise<boolean> {
    try {
      await fs.access(this.whisperPath);
      return true;
    } catch {
      return false;
    }
  }

  async getAvailableModels(): Promise<any[]> {
    const installed = await this.getInstalledModels();

    return this.availableModels.map((model) => ({
      ...model,
      installed: installed.includes(model.name),
      path: path.join(this.modelsPath, `ggml-${model.name}.bin`),
    }));
  }

  private async getInstalledModels(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.modelsPath);
      return files
        .filter((file) => file.startsWith("ggml-") && file.endsWith(".bin"))
        .map((file) => file.replace("ggml-", "").replace(".bin", ""));
    } catch {
      return [];
    }
  }

  async downloadModel(
    modelName: string,
    progressCallback?: (progress: number) => void,
  ): Promise<void> {
    const modelUrl = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${modelName}.bin`;
    const modelPath = path.join(this.modelsPath, `ggml-${modelName}.bin`);

    return new Promise((resolve, reject) => {
      const file = createWriteStream(modelPath);

      https
        .get(modelUrl, (response) => {
          const totalSize = parseInt(
            response.headers["content-length"] || "0",
            10,
          );
          let downloadedSize = 0;

          response.on("data", (chunk) => {
            downloadedSize += chunk.length;
            if (progressCallback && totalSize > 0) {
              progressCallback((downloadedSize / totalSize) * 100);
            }
          });

          response.pipe(file);

          file.on("finish", () => {
            file.close();
            resolve();
          });
        })
        .on("error", (err) => {
          fs.unlink(modelPath).catch(() => {});
          reject(err);
        });
    });
  }

  async transcribe(
    audioPath: string,
    options: TranscriptionOptions,
    progressCallback?: (progress: number) => void,
  ): Promise<TranscriptionResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const modelPath = path.join(this.modelsPath, `ggml-${options.model}.bin`);

    // Check if model exists
    try {
      await fs.access(modelPath);
    } catch {
      throw new Error(
        `Model ${options.model} not found. Please download it first.`,
      );
    }

    // Prepare whisper command arguments
    const args = [
      "-m",
      modelPath,
      "-f",
      audioPath,
      "-t",
      (options.threads || 4).toString(),
      "-p",
      (options.processors || 1).toString(),
    ];

    if (options.language) {
      args.push("-l", options.language);
    }

    if (options.translate) {
      args.push("--translate");
    }

    if (options.outputFormat === "json") {
      args.push("-oj"); // Output JSON
    } else if (options.outputFormat === "srt") {
      args.push("-osrt");
    } else if (options.outputFormat === "vtt") {
      args.push("-ovtt");
    }

    if (!options.timestamps) {
      args.push("-nt"); // No timestamps
    }

    // Log the command being executed
    console.log("Executing whisper command:", this.whisperPath);
    console.log("Arguments:", args);

    return new Promise((resolve, reject) => {
      let whisperProcess;

      try {
        whisperProcess = spawn(this.whisperPath, args);
      } catch (spawnError: any) {
        console.error("Failed to spawn whisper process:", spawnError);
        reject(new Error(`Failed to start whisper: ${spawnError.message}`));
        return;
      }

      let output = "";
      let error = "";
      let lastProgress = 0;

      whisperProcess.stdout.on("data", (data) => {
        const text = data.toString();
        output += text;
        console.log("Whisper stdout:", text);

        // Parse progress from output if possible
        const progressMatch = text.match(/(\d+)%/);
        if (progressMatch && progressCallback) {
          const progress = parseInt(progressMatch[1], 10);
          if (progress > lastProgress) {
            lastProgress = progress;
            progressCallback(progress);
          }
        }
      });

      whisperProcess.stderr.on("data", (data) => {
        const message = data.toString();
        console.log("Whisper stderr:", message);

        // Some progress info might come through stderr
        if (message.includes("%") && progressCallback) {
          const progressMatch = message.match(/(\d+)%/);
          if (progressMatch) {
            const progress = parseInt(progressMatch[1], 10);
            if (progress > lastProgress) {
              lastProgress = progress;
              progressCallback(progress);
            }
          }
        }

        error += message;
      });

      whisperProcess.on("close", (code) => {
        console.log(`Whisper process closed with code: ${code}`);
        console.log("Output:", output);
        console.log("Error:", error);

        if (code === 0) {
          // Parse the output based on format
          if (options.outputFormat === "json") {
            try {
              const jsonResult = JSON.parse(output);
              resolve({
                text: jsonResult.text || "",
                segments: jsonResult.segments || [],
                language: jsonResult.language,
                duration: jsonResult.duration,
              });
            } catch (e) {
              console.error("Failed to parse JSON output:", e);
              resolve({ text: output });
            }
          } else {
            resolve({ text: output });
          }
        } else {
          const errorMsg = `Whisper process exited with code ${code}. Error: ${error || "No error output"}. Output: ${output || "No output"}`;
          console.error(errorMsg);
          reject(new Error(errorMsg));
        }
      });

      whisperProcess.on("error", (err) => {
        console.error("Whisper process error event:", err);
        reject(new Error(`Whisper process error: ${err.message}`));
      });
    });
  }

  async convertAudioToWav(inputPath: string): Promise<string> {
    // Use ffmpeg to convert audio to WAV format that whisper.cpp expects
    // This would require bundling ffmpeg with the app
    const outputPath = inputPath.replace(path.extname(inputPath), ".wav");

    return new Promise((resolve, reject) => {
      const ffmpegPath = path.join(
        path.dirname(this.whisperPath),
        process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg",
      );

      const ffmpegProcess = spawn(ffmpegPath, [
        "-i",
        inputPath,
        "-ar",
        "16000", // 16kHz sample rate
        "-ac",
        "1", // Mono
        "-c:a",
        "pcm_s16le", // 16-bit PCM
        outputPath,
        "-y", // Overwrite output
      ]);

      ffmpegProcess.on("close", (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error("Failed to convert audio file"));
        }
      });

      ffmpegProcess.on("error", (err) => {
        reject(err);
      });
    });
  }
}
