import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:4200', 'file://*'],
    credentials: true,
  },
})
export class TranscriptionGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('subscribeToJob')
  handleSubscribeToJob(
    @MessageBody() jobId: string,
    @ConnectedSocket() client: Socket,
  ): void {
    client.join(`job-${jobId}`);
    client.emit('subscribed', { jobId });
  }

  @SubscribeMessage('unsubscribeFromJob')
  handleUnsubscribeFromJob(
    @MessageBody() jobId: string,
    @ConnectedSocket() client: Socket,
  ): void {
    client.leave(`job-${jobId}`);
    client.emit('unsubscribed', { jobId });
  }

  sendProgressUpdate(jobId: string, progress: number, message?: string): void {
    this.server.to(`job-${jobId}`).emit('progress', {
      jobId,
      progress,
      message,
    });
  }

  sendCompletionUpdate(jobId: string, result: any): void {
    this.server.to(`job-${jobId}`).emit('completed', {
      jobId,
      result,
    });
  }

  sendErrorUpdate(jobId: string, error: string): void {
    this.server.to(`job-${jobId}`).emit('error', {
      jobId,
      error,
    });
  }
}
