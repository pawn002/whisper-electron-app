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
  private ffmpegPath: string;
  private initialized: boolean = false;
  private ffmpegAvailable: boolean = false;
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
      this.ffmpegPath = path.join(basePath, "ffmpeg", "bin", "ffmpeg.exe");
    } else {
      // On Unix, the binary is in the root whisper.cpp directory
      this.whisperPath = path.join(basePath, "whisper.cpp", "main");
      this.ffmpegPath = path.join(basePath, "ffmpeg", "bin", "ffmpeg");
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

    // Check if ffmpeg is available
    this.ffmpegAvailable = await this.checkFfmpeg();
    if (this.ffmpegAvailable) {
      console.log("ffmpeg detected - multi-format audio support enabled");
    } else {
      console.warn(
        "ffmpeg not found - only WAV files will be supported. Install ffmpeg for multi-format support.",
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

  private async checkFfmpeg(): Promise<boolean> {
    // First check if bundled ffmpeg exists
    try {
      await fs.access(this.ffmpegPath);
      console.log(`Found bundled ffmpeg at: ${this.ffmpegPath}`);
      return true;
    } catch {
      console.warn(`Bundled ffmpeg not found at: ${this.ffmpegPath}`);
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

      const downloadFile = (url: string) => {
        https
          .get(url, (response) => {
            // Follow redirects
            if (response.statusCode === 301 || response.statusCode === 302) {
              const redirectUrl = response.headers.location;
              if (redirectUrl) {
                console.log(`Following redirect to: ${redirectUrl}`);
                downloadFile(redirectUrl);
                return;
              }
            }

            const totalSize = parseInt(
              response.headers["content-length"] || "0",
              10,
            );
            let downloadedSize = 0;

            console.log(
              `Downloading ${modelName} model (${(totalSize / 1024 / 1024).toFixed(2)} MB)...`,
            );

            response.on("data", (chunk) => {
              downloadedSize += chunk.length;
              if (progressCallback && totalSize > 0) {
                const progress = (downloadedSize / totalSize) * 100;
                progressCallback(progress);
              }
            });

            response.pipe(file);

            file.on("finish", () => {
              file.close();
              console.log(`Model ${modelName} downloaded successfully`);
              resolve();
            });
          })
          .on("error", (err) => {
            file.close();
            fs.unlink(modelPath).catch(() => {});
            reject(err);
          });
      };

      downloadFile(modelUrl);
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

    // Check if audio needs conversion
    const ext = path.extname(audioPath).toLowerCase();
    let processedAudioPath = audioPath;
    let needsCleanup = false;

    // Convert non-WAV files to WAV format
    if (ext !== ".wav") {
      console.log(`Non-WAV file detected (${ext}), converting to WAV...`);
      try {
        processedAudioPath = await this.convertAudioToWav(audioPath);
        needsCleanup = true;
      } catch (error: any) {
        throw new Error(
          `Audio conversion failed: ${error.message}. Only WAV files are supported without ffmpeg.`,
        );
      }
    }

    // Prepare whisper command arguments
    const args = [
      "-m",
      modelPath,
      "-f",
      processedAudioPath,
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

      whisperProcess.on("close", async (code) => {
        console.log(`Whisper process closed with code: ${code}`);
        console.log("Output:", output);
        console.log("Error:", error);

        // Clean up converted WAV file if we created one
        if (needsCleanup) {
          try {
            await fs.unlink(processedAudioPath);
            console.log(`Cleaned up converted file: ${processedAudioPath}`);
          } catch (cleanupError) {
            console.error("Failed to cleanup converted file:", cleanupError);
          }
        }

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

      whisperProcess.on("error", async (err) => {
        console.error("Whisper process error event:", err);

        // Clean up converted WAV file if we created one
        if (needsCleanup) {
          try {
            await fs.unlink(processedAudioPath);
          } catch (cleanupError) {
            console.error("Failed to cleanup converted file:", cleanupError);
          }
        }

        reject(new Error(`Whisper process error: ${err.message}`));
      });
    });
  }

  async convertAudioToWav(inputPath: string): Promise<string> {
    if (!this.ffmpegAvailable) {
      throw new Error(
        "ffmpeg is not available. Please run setup to install ffmpeg.",
      );
    }

    const outputPath = inputPath.replace(path.extname(inputPath), ".wav");

    console.log(
      `Converting ${inputPath} to WAV format using bundled ffmpeg...`,
    );

    return new Promise((resolve, reject) => {
      // Use bundled ffmpeg
      const ffmpegProcess = spawn(this.ffmpegPath, [
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

      let errorOutput = "";

      ffmpegProcess.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      ffmpegProcess.on("close", (code) => {
        if (code === 0) {
          console.log(`Audio converted successfully to: ${outputPath}`);
          resolve(outputPath);
        } else {
          console.error("ffmpeg conversion failed:", errorOutput);
          reject(
            new Error(
              `Failed to convert audio file. ffmpeg exit code: ${code}`,
            ),
          );
        }
      });

      ffmpegProcess.on("error", (err) => {
        console.error("ffmpeg process error:", err);
        reject(
          new Error(
            `Failed to start ffmpeg: ${err.message}. ffmpeg binary may be missing or corrupted.`,
          ),
        );
      });
    });
  }
}
