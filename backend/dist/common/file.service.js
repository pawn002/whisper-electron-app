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
exports.FileService = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class FileService {
    async saveFile(filePath, content) {
        await fs.writeFile(filePath, content, 'utf-8');
    }
    async readFile(filePath) {
        return await fs.readFile(filePath, 'utf-8');
    }
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    async getFileInfo(filePath) {
        const stats = await fs.stat(filePath);
        return {
            name: path.basename(filePath),
            path: filePath,
            size: stats.size,
            extension: path.extname(filePath),
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime
        };
    }
    async createDirectory(dirPath) {
        await fs.mkdir(dirPath, { recursive: true });
    }
    async deleteFile(filePath) {
        await fs.unlink(filePath);
    }
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
    getFileExtension(filePath) {
        return path.extname(filePath).toLowerCase();
    }
    isAudioFile(filePath) {
        const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma', '.opus'];
        return audioExtensions.includes(this.getFileExtension(filePath));
    }
    async exportTranscript(transcript, format, metadata) {
        switch (format) {
            case 'json':
                return JSON.stringify({
                    transcript,
                    metadata,
                    exportedAt: new Date().toISOString()
                }, null, 2);
            case 'srt':
                return this.formatAsSRT(transcript, metadata?.segments);
            case 'vtt':
                return this.formatAsVTT(transcript, metadata?.segments);
            case 'txt':
            default:
                return transcript;
        }
    }
    formatAsSRT(transcript, segments) {
        if (!segments || segments.length === 0) {
            return transcript;
        }
        return segments
            .map((segment, index) => {
            const start = this.formatTime(segment.start);
            const end = this.formatTime(segment.end);
            return `${index + 1}\n${start} --> ${end}\n${segment.text.trim()}\n`;
        })
            .join('\n');
    }
    formatAsVTT(transcript, segments) {
        if (!segments || segments.length === 0) {
            return `WEBVTT\n\n${transcript}`;
        }
        const formattedSegments = segments
            .map((segment) => {
            const start = this.formatTime(segment.start);
            const end = this.formatTime(segment.end);
            return `${start} --> ${end}\n${segment.text.trim()}\n`;
        })
            .join('\n');
        return `WEBVTT\n\n${formattedSegments}`;
    }
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const millis = Math.floor((seconds % 1) * 1000);
        return `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(secs)},${this.pad(millis, 3)}`;
    }
    pad(num, size = 2) {
        return num.toString().padStart(size, '0');
    }
}
exports.FileService = FileService;
//# sourceMappingURL=file.service.js.map