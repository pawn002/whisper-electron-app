"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptionController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const transcription_service_1 = require("./transcription.service");
const create_transcription_dto_1 = require("./create-transcription.dto");
const multer_1 = require("multer");
const path_1 = require("path");
let TranscriptionController = class TranscriptionController {
    constructor(transcriptionService) {
        this.transcriptionService = transcriptionService;
    }
    async processAudio(file, dto, req) {
        if (!file) {
            throw new common_1.HttpException("No audio file provided", common_1.HttpStatus.BAD_REQUEST);
        }
        const options = {
            model: req.body.model || dto.model,
            language: req.body.language || dto.language,
            outputFormat: req.body.outputFormat || dto.outputFormat,
            timestamps: req.body.timestamps === "true" ||
                req.body.timestamps === true ||
                dto.timestamps,
            threads: req.body.threads ? parseInt(req.body.threads) : dto.threads,
            translate: req.body.translate === "true" ||
                req.body.translate === true ||
                dto.translate,
            processors: req.body.processors
                ? parseInt(req.body.processors)
                : dto.processors,
        };
        console.log("Received transcription request with options:", options);
        try {
            const result = await this.transcriptionService.processAudio(file, options);
            return {
                success: true,
                data: result,
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || "Failed to process audio", common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getTranscriptionStatus(jobId) {
        const status = await this.transcriptionService.getJobStatus(jobId);
        if (!status) {
            throw new common_1.HttpException("Job not found", common_1.HttpStatus.NOT_FOUND);
        }
        return status;
    }
    async getTranscriptionHistory() {
        return this.transcriptionService.getTranscriptionHistory();
    }
    async getAvailableModels() {
        return this.transcriptionService.getAvailableModels();
    }
    async downloadModel(modelName) {
        try {
            await this.transcriptionService.downloadModel(modelName);
            return {
                success: true,
                message: `Model ${modelName} downloaded successfully`,
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || "Failed to download model", common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async cancelTranscription(jobId) {
        const result = await this.transcriptionService.cancelJob(jobId);
        if (!result) {
            throw new common_1.HttpException("Job not found or already completed", common_1.HttpStatus.NOT_FOUND);
        }
        return { success: true, message: "Job cancelled successfully" };
    }
};
exports.TranscriptionController = TranscriptionController;
__decorate([
    (0, common_1.Post)("process"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("audio", {
        storage: (0, multer_1.diskStorage)({
            destination: "./uploads",
            filename: (req, file, callback) => {
                const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
                callback(null, `${uniqueSuffix}${(0, path_1.extname)(file.originalname)}`);
            },
        }),
        fileFilter: (req, file, callback) => {
            const allowedExtensions = /\.(mp3|wav|ogg|m4a|flac|aac)$/;
            if (!allowedExtensions.test(file.originalname.toLowerCase())) {
                return callback(new common_1.HttpException("Only audio files are allowed", common_1.HttpStatus.BAD_REQUEST), false);
            }
            callback(null, true);
        },
        limits: {
            fileSize: 500 * 1024 * 1024,
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_transcription_dto_1.CreateTranscriptionDto, Object]),
    __metadata("design:returntype", Promise)
], TranscriptionController.prototype, "processAudio", null);
__decorate([
    (0, common_1.Get)("status/:jobId"),
    __param(0, (0, common_1.Param)("jobId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TranscriptionController.prototype, "getTranscriptionStatus", null);
__decorate([
    (0, common_1.Get)("history"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TranscriptionController.prototype, "getTranscriptionHistory", null);
__decorate([
    (0, common_1.Get)("models"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TranscriptionController.prototype, "getAvailableModels", null);
__decorate([
    (0, common_1.Post)("download-model/:modelName"),
    __param(0, (0, common_1.Param)("modelName")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TranscriptionController.prototype, "downloadModel", null);
__decorate([
    (0, common_1.Post)("cancel/:jobId"),
    __param(0, (0, common_1.Param)("jobId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TranscriptionController.prototype, "cancelTranscription", null);
exports.TranscriptionController = TranscriptionController = __decorate([
    (0, common_1.Controller)("api/transcription"),
    __metadata("design:paramtypes", [transcription_service_1.TranscriptionService])
], TranscriptionController);
//# sourceMappingURL=transcription.controller.js.map