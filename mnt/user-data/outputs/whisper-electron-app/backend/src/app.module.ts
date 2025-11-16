import { Module } from '@nestjs/common';
import { TranscriptionModule } from './transcription/transcription.module';
import { HealthModule } from './health/health.module';
import { WebSocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    TranscriptionModule,
    HealthModule,
    WebSocketModule,
  ],
})
export class AppModule {}
