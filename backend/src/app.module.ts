import { Module } from "@nestjs/common";
import { TranscriptionModule } from "./transcription/transcription.module";

@Module({
  imports: [TranscriptionModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
