import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { TranscriptionService } from "./transcription.service";
import { CreateTranscriptionDto } from "./create-transcription.dto";
import { diskStorage } from "multer";
import { extname } from "path";

@Controller("api/transcription")
export class TranscriptionController {
  constructor(private readonly transcriptionService: TranscriptionService) {}

  @Post("process")
  @UseInterceptors(
    FileInterceptor("audio", {
      storage: diskStorage({
        destination: "./uploads",
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        const allowedExtensions = /\.(mp3|wav|ogg|m4a|flac|aac)$/;
        if (!allowedExtensions.test(file.originalname.toLowerCase())) {
          return callback(
            new HttpException(
              "Only audio files are allowed",
              HttpStatus.BAD_REQUEST,
            ),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB max file size
      },
    }),
  )
  async processAudio(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateTranscriptionDto,
  ) {
    if (!file) {
      throw new HttpException("No audio file provided", HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.transcriptionService.processAudio(file, dto);
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || "Failed to process audio",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("status/:jobId")
  async getTranscriptionStatus(@Param("jobId") jobId: string) {
    const status = await this.transcriptionService.getJobStatus(jobId);
    if (!status) {
      throw new HttpException("Job not found", HttpStatus.NOT_FOUND);
    }
    return status;
  }

  @Get("history")
  async getTranscriptionHistory() {
    return this.transcriptionService.getTranscriptionHistory();
  }

  @Get("models")
  async getAvailableModels() {
    return this.transcriptionService.getAvailableModels();
  }

  @Post("download-model/:modelName")
  async downloadModel(@Param("modelName") modelName: string) {
    try {
      await this.transcriptionService.downloadModel(modelName);
      return {
        success: true,
        message: `Model ${modelName} downloaded successfully`,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || "Failed to download model",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("cancel/:jobId")
  async cancelTranscription(@Param("jobId") jobId: string) {
    const result = await this.transcriptionService.cancelJob(jobId);
    if (!result) {
      throw new HttpException(
        "Job not found or already completed",
        HttpStatus.NOT_FOUND,
      );
    }
    return { success: true, message: "Job cancelled successfully" };
  }
}
