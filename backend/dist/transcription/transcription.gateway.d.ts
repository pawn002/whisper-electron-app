import { Server, Socket } from 'socket.io';
export declare class TranscriptionGateway {
    server: Server;
    handleSubscribeToJob(jobId: string, client: Socket): void;
    handleUnsubscribeFromJob(jobId: string, client: Socket): void;
    sendProgressUpdate(jobId: string, progress: number, message?: string): void;
    sendCompletionUpdate(jobId: string, result: any): void;
    sendErrorUpdate(jobId: string, error: string): void;
}
