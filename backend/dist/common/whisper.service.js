"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhisperService = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const child_process_1 = require("child_process");
const https = __importStar(require("https"));
const fs_1 = require("fs");
class WhisperService {
    constructor() {
        this.initialized = false;
        this.ffmpegAvailable = false;
        this.availableModels = [
            { name: "tiny", size: "39 MB", description: "Fastest, least accurate" },
            { name: "base", size: "74 MB", description: "Fast, good accuracy" },
            { name: "small", size: "244 MB", description: "Balanced speed/accuracy" },
            { name: "medium", size: "769 MB", description: "Slower, better accuracy" },
            { name: "large", size: "1550 MB", description: "Slowest, best accuracy" },
        ];
        const basePath = path.join(__dirname, "../../../");
        if (process.platform === "win32") {
            this.whisperPath = path.join(basePath, "whisper.cpp", "build", "bin", "Release", "whisper-cli.exe");
            this.ffmpegPath = path.join(basePath, "ffmpeg", "bin", "ffmpeg.exe");
        }
        else {
            this.whisperPath = path.join(basePath, "whisper.cpp", "main");
            this.ffmpegPath = path.join(basePath, "ffmpeg", "bin", "ffmpeg");
        }
        this.modelsPath = path.join(basePath, "models");
    }
    async initialize() {
        await this.ensureDirectories();
        const binaryExists = await this.checkBinary();
        if (!binaryExists) {
            throw new Error("Whisper binary not found. Please rebuild the application.");
        }
        this.ffmpegAvailable = await this.checkFfmpeg();
        if (this.ffmpegAvailable) {
            console.log("ffmpeg detected - multi-format audio support enabled");
        }
        else {
            console.warn("ffmpeg not found - only WAV files will be supported. Install ffmpeg for multi-format support.");
        }
        const models = await this.getInstalledModels();
        if (models.length === 0) {
            await this.downloadModel("tiny");
        }
        this.initialized = true;
    }
    async ensureDirectories() {
        await fs.mkdir(this.modelsPath, { recursive: true });
        await fs.mkdir(path.dirname(this.whisperPath), { recursive: true });
    }
    async checkBinary() {
        try {
            await fs.access(this.whisperPath);
            return true;
        }
        catch {
            return false;
        }
    }
    async checkFfmpeg() {
        try {
            await fs.access(this.ffmpegPath);
            console.log(`Found bundled ffmpeg at: ${this.ffmpegPath}`);
            return true;
        }
        catch {
            console.warn(`Bundled ffmpeg not found at: ${this.ffmpegPath}`);
            return false;
        }
    }
    async getAvailableModels() {
        const installed = await this.getInstalledModels();
        return this.availableModels.map((model) => ({
            ...model,
            installed: installed.includes(model.name),
            path: path.join(this.modelsPath, `ggml-${model.name}.bin`),
        }));
    }
    async getInstalledModels() {
        try {
            const files = await fs.readdir(this.modelsPath);
            return files
                .filter((file) => file.startsWith("ggml-") && file.endsWith(".bin"))
                .map((file) => file.replace("ggml-", "").replace(".bin", ""));
        }
        catch {
            return [];
        }
    }
    async downloadModel(modelName, progressCallback) {
        const modelUrl = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${modelName}.bin`;
        const modelPath = path.join(this.modelsPath, `ggml-${modelName}.bin`);
        return new Promise((resolve, reject) => {
            const file = (0, fs_1.createWriteStream)(modelPath);
            const downloadFile = (url) => {
                https
                    .get(url, (response) => {
                    if (response.statusCode === 301 || response.statusCode === 302) {
                        const redirectUrl = response.headers.location;
                        if (redirectUrl) {
                            console.log(`Following redirect to: ${redirectUrl}`);
                            downloadFile(redirectUrl);
                            return;
                        }
                    }
                    const totalSize = parseInt(response.headers["content-length"] || "0", 10);
                    let downloadedSize = 0;
                    console.log(`Downloading ${modelName} model (${(totalSize / 1024 / 1024).toFixed(2)} MB)...`);
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
                    fs.unlink(modelPath).catch(() => { });
                    reject(err);
                });
            };
            downloadFile(modelUrl);
        });
    }
    async transcribe(audioPath, options, progressCallback) {
        if (!this.initialized) {
            await this.initialize();
        }
        const modelPath = path.join(this.modelsPath, `ggml-${options.model}.bin`);
        try {
            await fs.access(modelPath);
        }
        catch {
            throw new Error(`Model ${options.model} not found. Please download it first.`);
        }
        const ext = path.extname(audioPath).toLowerCase();
        let processedAudioPath = audioPath;
        let needsCleanup = false;
        if (ext !== ".wav") {
            console.log(`Non-WAV file detected (${ext}), converting to WAV...`);
            try {
                processedAudioPath = await this.convertAudioToWav(audioPath);
                needsCleanup = true;
            }
            catch (error) {
                throw new Error(`Audio conversion failed: ${error.message}. Only WAV files are supported without ffmpeg.`);
            }
        }
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
            args.push("-oj");
        }
        else if (options.outputFormat === "srt") {
            args.push("-osrt");
        }
        else if (options.outputFormat === "vtt") {
            args.push("-ovtt");
        }
        if (!options.timestamps) {
            args.push("-nt");
        }
        console.log("Executing whisper command:", this.whisperPath);
        console.log("Arguments:", args);
        return new Promise((resolve, reject) => {
            let whisperProcess;
            try {
                whisperProcess = (0, child_process_1.spawn)(this.whisperPath, args);
            }
            catch (spawnError) {
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
                if (needsCleanup) {
                    try {
                        await fs.unlink(processedAudioPath);
                        console.log(`Cleaned up converted file: ${processedAudioPath}`);
                    }
                    catch (cleanupError) {
                        console.error("Failed to cleanup converted file:", cleanupError);
                    }
                }
                if (code === 0) {
                    if (options.outputFormat === "json") {
                        try {
                            const jsonResult = JSON.parse(output);
                            resolve({
                                text: jsonResult.text || "",
                                segments: jsonResult.segments || [],
                                language: jsonResult.language,
                                duration: jsonResult.duration,
                            });
                        }
                        catch (e) {
                            console.error("Failed to parse JSON output:", e);
                            resolve({ text: output });
                        }
                    }
                    else {
                        resolve({ text: output });
                    }
                }
                else {
                    const errorMsg = `Whisper process exited with code ${code}. Error: ${error || "No error output"}. Output: ${output || "No output"}`;
                    console.error(errorMsg);
                    reject(new Error(errorMsg));
                }
            });
            whisperProcess.on("error", async (err) => {
                console.error("Whisper process error event:", err);
                if (needsCleanup) {
                    try {
                        await fs.unlink(processedAudioPath);
                    }
                    catch (cleanupError) {
                        console.error("Failed to cleanup converted file:", cleanupError);
                    }
                }
                reject(new Error(`Whisper process error: ${err.message}`));
            });
        });
    }
    async convertAudioToWav(inputPath) {
        if (!this.ffmpegAvailable) {
            throw new Error("ffmpeg is not available. Please run setup to install ffmpeg.");
        }
        const outputPath = inputPath.replace(path.extname(inputPath), ".wav");
        console.log(`Converting ${inputPath} to WAV format using bundled ffmpeg...`);
        return new Promise((resolve, reject) => {
            const ffmpegProcess = (0, child_process_1.spawn)(this.ffmpegPath, [
                "-i",
                inputPath,
                "-ar",
                "16000",
                "-ac",
                "1",
                "-c:a",
                "pcm_s16le",
                outputPath,
                "-y",
            ]);
            let errorOutput = "";
            ffmpegProcess.stderr.on("data", (data) => {
                errorOutput += data.toString();
            });
            ffmpegProcess.on("close", (code) => {
                if (code === 0) {
                    console.log(`Audio converted successfully to: ${outputPath}`);
                    resolve(outputPath);
                }
                else {
                    console.error("ffmpeg conversion failed:", errorOutput);
                    reject(new Error(`Failed to convert audio file. ffmpeg exit code: ${code}`));
                }
            });
            ffmpegProcess.on("error", (err) => {
                console.error("ffmpeg process error:", err);
                reject(new Error(`Failed to start ffmpeg: ${err.message}. ffmpeg binary may be missing or corrupted.`));
            });
        });
    }
}
exports.WhisperService = WhisperService;
//# sourceMappingURL=whisper.service.js.map