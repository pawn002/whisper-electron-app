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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptionService = void 0;
const common_1 = require("@nestjs/common");
const transcription_gateway_1 = require("./transcription.gateway");
const whisper_service_1 = require("../common/whisper.service");
const fs = __importStar(require("fs/promises"));
const uuid_1 = require("uuid");
let TranscriptionService = class TranscriptionService {
    constructor(gateway) {
        this.gateway = gateway;
        this.jobs = new Map();
        this.transcriptionHistory = [];
        this.whisperService = new whisper_service_1.WhisperService();
        this.whisperService.initialize().catch((error) => {
            console.error("Failed to initialize WhisperService:", error);
        });
    }
    async processAudio(file, options) {
        const jobId = (0, uuid_1.v4)();
        const job = {
            id: jobId,
            status: "pending",
            progress: 0,
            startedAt: new Date(),
            filePath: file.path,
            fileName: file.originalname,
            options,
        };
        this.jobs.set(jobId, job);
        this.processTranscriptionJob(job);
        return job;
    }
    async processTranscriptionJob(job) {
        try {
            job.status = "processing";
            const processingStartTime = Date.now();
            await new Promise((resolve) => setTimeout(resolve, 100));
            this.gateway.sendProgressUpdate(job.id, 5, "Starting transcription");
            const whisperOptions = {
                model: job.options.model || "base",
                language: job.options.language,
                threads: job.options.threads || 4,
                processors: 1,
                outputFormat: job.options.outputFormat || "txt",
                timestamps: job.options.timestamps !== false,
            };
            this.gateway.sendProgressUpdate(job.id, 10, "Loading model");
            const result = await this.whisperService.transcribe(job.filePath, whisperOptions, (progress) => {
                const mappedProgress = 10 + progress * 0.8;
                job.progress = Math.round(mappedProgress);
                this.gateway.sendProgressUpdate(job.id, job.progress, "Transcribing audio");
            });
            job.result = result;
            job.status = "completed";
            job.completedAt = new Date();
            job.progress = 100;
            job.transcriptionTime = Date.now() - processingStartTime;
            const resultText = typeof result === "string" ? result : result?.text;
            if (resultText) {
                job.audioDuration = this.extractDurationFromTranscript(resultText);
            }
            this.transcriptionHistory.unshift(job);
            if (this.transcriptionHistory.length > 50) {
                this.transcriptionHistory = this.transcriptionHistory.slice(0, 50);
            }
            this.gateway.sendProgressUpdate(job.id, 100, "Completed");
            this.gateway.sendCompletionUpdate(job.id, job.result);
            await this.cleanupFile(job.filePath);
        }
        catch (error) {
            job.status = "failed";
            job.error = error.message;
            job.completedAt = new Date();
            this.gateway.sendErrorUpdate(job.id, error.message);
            await this.cleanupFile(job.filePath).catch(() => { });
        }
    }
    extractDurationFromTranscript(text) {
        try {
            const timestampRegex = /\[(\d{2}):(\d{2}):(\d{2}\.\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}\.\d{3})\]/g;
            const matches = Array.from(text.matchAll(timestampRegex));
            if (matches.length === 0)
                return undefined;
            const lastMatch = matches[matches.length - 1];
            const hours = parseInt(lastMatch[4], 10);
            const minutes = parseInt(lastMatch[5], 10);
            const seconds = parseFloat(lastMatch[6]);
            const totalSeconds = hours * 3600 + minutes * 60 + seconds;
            return totalSeconds;
        }
        catch (error) {
            console.error("Failed to extract duration from transcript:", error);
            return undefined;
        }
    }
    async cleanupFile(filePath) {
        try {
            await fs.unlink(filePath);
        }
        catch (error) {
            console.error("Failed to cleanup file:", error);
        }
    }
    async getJobStatus(jobId) {
        return this.jobs.get(jobId);
    }
    async cancelJob(jobId) {
        const job = this.jobs.get(jobId);
        if (!job || job.status === "completed" || job.status === "failed") {
            return false;
        }
        job.status = "cancelled";
        job.completedAt = new Date();
        this.gateway.sendErrorUpdate(jobId, "Job cancelled by user");
        await this.cleanupFile(job.filePath);
        return true;
    }
    getTranscriptionHistory() {
        return this.transcriptionHistory;
    }
    async getAvailableModels() {
        return await this.whisperService.getAvailableModels();
    }
    async downloadModel(modelName) {
        return await this.whisperService.downloadModel(modelName);
    }
};
exports.TranscriptionService = TranscriptionService;
exports.TranscriptionService = TranscriptionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transcription_gateway_1.TranscriptionGateway])
], TranscriptionService);
//# sourceMappingURL=transcription.service.js.map