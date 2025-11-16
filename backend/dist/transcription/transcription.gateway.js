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
exports.TranscriptionGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
let TranscriptionGateway = class TranscriptionGateway {
    handleSubscribeToJob(jobId, client) {
        client.join(`job-${jobId}`);
        client.emit('subscribed', { jobId });
    }
    handleUnsubscribeFromJob(jobId, client) {
        client.leave(`job-${jobId}`);
        client.emit('unsubscribed', { jobId });
    }
    sendProgressUpdate(jobId, progress, message) {
        this.server.to(`job-${jobId}`).emit('progress', {
            jobId,
            progress,
            message,
        });
    }
    sendCompletionUpdate(jobId, result) {
        this.server.to(`job-${jobId}`).emit('completed', {
            jobId,
            result,
        });
    }
    sendErrorUpdate(jobId, error) {
        this.server.to(`job-${jobId}`).emit('error', {
            jobId,
            error,
        });
    }
};
exports.TranscriptionGateway = TranscriptionGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], TranscriptionGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribeToJob'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], TranscriptionGateway.prototype, "handleSubscribeToJob", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('unsubscribeFromJob'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], TranscriptionGateway.prototype, "handleUnsubscribeFromJob", null);
exports.TranscriptionGateway = TranscriptionGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: ['http://localhost:4200', 'file://*'],
            credentials: true,
        },
    })
], TranscriptionGateway);
//# sourceMappingURL=transcription.gateway.js.map