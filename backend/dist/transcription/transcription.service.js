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
const fs = __importStar(require("fs/promises"));
const uuid_1 = require("uuid");
let TranscriptionService = class TranscriptionService {
    constructor(gateway) {
        this.gateway = gateway;
        this.jobs = new Map();
        this.transcriptionHistory = [];
    }
    async processAudio(file, options) {
        const jobId = (0, uuid_1.v4)();
        const job = {
            id: jobId,
            status: "pending",
            progress: 0,
            startedAt: new Date(),
            filePath: file.path,
            options,
        };
        this.jobs.set(jobId, job);
        this.processTranscriptionJob(job);
        return job;
    }
    async processTranscriptionJob(job) {
        try {
            job.status = "processing";
            this.gateway.sendProgressUpdate(job.id, 10);
            await this.simulateProcessing(job);
            job.status = "completed";
            job.completedAt = new Date();
            job.progress = 100;
            this.transcriptionHistory.unshift(job);
            if (this.transcriptionHistory.length > 50) {
                this.transcriptionHistory = this.transcriptionHistory.slice(0, 50);
            }
            this.gateway.sendProgressUpdate(job.id, 100);
            this.gateway.sendCompletionUpdate(job.id, job.result);
            await this.cleanupFile(job.filePath);
        }
        catch (error) {
            job.status = "failed";
            job.error = error.message;
            job.completedAt = new Date();
            this.gateway.sendErrorUpdate(job.id, error.message);
        }
    }
    async simulateProcessing(job) {
        const stages = [
            { progress: 20, delay: 500, action: "Loading model" },
            { progress: 40, delay: 1000, action: "Processing audio" },
            { progress: 60, delay: 1500, action: "Generating transcript" },
            { progress: 80, delay: 1000, action: "Formatting output" },
            { progress: 90, delay: 500, action: "Finalizing" },
        ];
        for (const stage of stages) {
            if (job.status === "cancelled") {
                throw new Error("Job was cancelled");
            }
            await this.delay(stage.delay);
            job.progress = stage.progress;
            this.gateway.sendProgressUpdate(job.id, stage.progress, stage.action);
        }
        job.result = {
            text: `This is a mock transcription of the audio file. In a real implementation,
             this would contain the actual transcribed text from whisper.cpp.
             The audio was processed with model: ${job.options.model || "base"}.`,
            segments: [
                { start: 0, end: 5, text: "This is a mock transcription" },
                { start: 5, end: 10, text: "of the audio file." },
            ],
            language: job.options.language || "en",
            duration: 10.5,
        };
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
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
    getAvailableModels() {
        return [
            { id: "tiny", name: "Tiny", size: "39 MB", speed: "Fastest" },
            { id: "base", name: "Base", size: "74 MB", speed: "Fast" },
            { id: "small", name: "Small", size: "244 MB", speed: "Balanced" },
            { id: "medium", name: "Medium", size: "769 MB", speed: "Slow" },
            { id: "large", name: "Large", size: "1550 MB", speed: "Slowest" },
        ];
    }
};
exports.TranscriptionService = TranscriptionService;
exports.TranscriptionService = TranscriptionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transcription_gateway_1.TranscriptionGateway])
], TranscriptionService);
//# sourceMappingURL=transcription.service.js.map