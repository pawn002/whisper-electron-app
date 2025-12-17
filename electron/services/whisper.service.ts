import * as path from 'path';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';
import * as https from 'https';
import { createWriteStream } from 'fs';
import { app } from 'electron';
import { TranscriptionOptions, TranscriptionResult } from './types';

export class WhisperService {
  private whisperPath: string;
  private modelsPath: string;
  private ffmpegPath: string;
  private initialized: boolean = false;
  private ffmpegAvailable: boolean = false;
  private availableModels = [
    { name: 'tiny', size: '39 MB', description: 'Fastest, least accurate' },
    { name: 'base', size: '74 MB', description: 'Fast, good accuracy' },
    { name: 'small', size: '244 MB', description: 'Balanced speed/accuracy' },
    { name: 'medium', size: '769 MB', description: 'Slower, better accuracy' },
    { name: 'large', size: '1550 MB', description: 'Slowest, best accuracy' },
  ];

  constructor() {
    // Determine base path based on environment
    const isDev = !app.isPackaged;
    const basePath = isDev ? app.getAppPath() : process.resourcesPath;

    console.log('[WhisperService] Environment:', isDev ? 'development' : 'production');
    console.log('[WhisperService] Base path:', basePath);

    // Platform-specific binary paths (in resources/app)
    if (process.platform === 'win32') {
      this.whisperPath = path.join(
        basePath,
        'whisper.cpp',
        'build',
        'bin',
        'Release',
        'whisper-cli.exe'
      );
      this.ffmpegPath = path.join(basePath, 'ffmpeg', 'bin', 'ffmpeg.exe');
    } else {
      this.whisperPath = path.join(basePath, 'whisper.cpp', 'main');
      this.ffmpegPath = path.join(basePath, 'ffmpeg', 'bin', 'ffmpeg');
    }

    // Models stored in user data directory (writable location)
    this.modelsPath = path.join(app.getPath('userData'), 'models');

    console.log('[WhisperService] Whisper path:', this.whisperPath);
    console.log('[WhisperService] Models path:', this.modelsPath);
    console.log('[WhisperService] FFmpeg path:', this.ffmpegPath);
  }

  async initialize(): Promise<void> {
    // Ensure directories exist
    await this.ensureDirectories();

    // Migrate models from old location if needed
    await this.migrateModelsIfNeeded();

    // Check if whisper binary exists
    const binaryExists = await this.checkBinary();
    if (!binaryExists) {
      throw new Error(
        'Whisper binary not found. Please rebuild the application.'
      );
    }

    // Check if ffmpeg is available
    this.ffmpegAvailable = await this.checkFfmpeg();
    if (this.ffmpegAvailable) {
      console.log('[WhisperService] ffmpeg detected - multi-format audio support enabled');
    } else {
      console.warn(
        '[WhisperService] ffmpeg not found - only WAV files will be supported. Install ffmpeg for multi-format support.'
      );
    }

    // Check for at least one model
    const models = await this.getInstalledModels();
    if (models.length === 0) {
      console.log('[WhisperService] No models found, downloading tiny model...');
      await this.downloadModel('tiny');
    }

    this.initialized = true;
    console.log('[WhisperService] Initialization complete');
  }

  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.modelsPath, { recursive: true });
    await fs.mkdir(path.dirname(this.whisperPath), { recursive: true });
  }

  private async migrateModelsIfNeeded(): Promise<void> {
    try {
      const migrationFlag = path.join(app.getPath('userData'), '.models-migrated');

      // Check if already migrated
      try {
        await fs.access(migrationFlag);
        return; // Already migrated
      } catch {
        // Migration flag doesn't exist, proceed with migration
      }

      // Check if old models directory exists
      const oldModelsPath = path.join(app.getAppPath(), 'models');
      try {
        await fs.access(oldModelsPath);
        console.log('[WhisperService] Migrating models from old location...');

        const files = await fs.readdir(oldModelsPath);
        const binFiles = files.filter(f => f.endsWith('.bin'));

        if (binFiles.length > 0) {
          await fs.mkdir(this.modelsPath, { recursive: true });

          for (const file of binFiles) {
            const srcPath = path.join(oldModelsPath, file);
            const destPath = path.join(this.modelsPath, file);

            // Only copy if destination doesn't exist
            try {
              await fs.access(destPath);
              console.log(`[WhisperService] Model ${file} already exists, skipping`);
            } catch {
              await fs.copyFile(srcPath, destPath);
              console.log(`[WhisperService] Migrated model: ${file}`);
            }
          }
        }

        // Create migration flag
        await fs.writeFile(migrationFlag, new Date().toISOString());
        console.log('[WhisperService] Model migration complete');
      } catch {
        // Old models directory doesn't exist, nothing to migrate
        await fs.writeFile(migrationFlag, new Date().toISOString());
      }
    } catch (error) {
      console.error('[WhisperService] Model migration error:', error);
      // Don't fail initialization if migration fails
    }
  }

  private async checkBinary(): Promise<boolean> {
    try {
      await fs.access(this.whisperPath);
      return true;
    } catch {
      return false;
    }
  }

  private async checkFfmpeg(): Promise<boolean> {
    try {
      await fs.access(this.ffmpegPath);
      console.log(`[WhisperService] Found bundled ffmpeg at: ${this.ffmpegPath}`);
      return true;
    } catch {
      console.warn(`[WhisperService] Bundled ffmpeg not found at: ${this.ffmpegPath}`);
      return false;
    }
  }

  async getAvailableModels(): Promise<any[]> {
    const installed = await this.getInstalledModels();

    return this.availableModels.map((model) => ({
      ...model,
      installed: installed.includes(model.name),
      path: path.join(this.modelsPath, `ggml-${model.name}.bin`),
    }));
  }

  private async getInstalledModels(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.modelsPath);
      return files
        .filter((file) => file.startsWith('ggml-') && file.endsWith('.bin'))
        .map((file) => file.replace('ggml-', '').replace('.bin', ''));
    } catch {
      return [];
    }
  }

  async downloadModel(
    modelName: string,
    progressCallback?: (progress: number) => void
  ): Promise<void> {
    const modelUrl = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${modelName}.bin`;
    const modelPath = path.join(this.modelsPath, `ggml-${modelName}.bin`);

    // Ensure models directory exists
    await fs.mkdir(this.modelsPath, { recursive: true });

    return new Promise((resolve, reject) => {
      const file = createWriteStream(modelPath);

      const downloadFile = (url: string) => {
        https
          .get(url, (response) => {
            // Follow redirects
            if (response.statusCode === 301 || response.statusCode === 302) {
              const redirectUrl = response.headers.location;
              if (redirectUrl) {
                console.log(`[WhisperService] Following redirect to: ${redirectUrl}`);
                downloadFile(redirectUrl);
                return;
              }
            }

            const totalSize = parseInt(
              response.headers['content-length'] || '0',
              10
            );
            let downloadedSize = 0;

            console.log(
              `[WhisperService] Downloading ${modelName} model (${(totalSize / 1024 / 1024).toFixed(2)} MB)...`
            );

            response.on('data', (chunk) => {
              downloadedSize += chunk.length;
              if (progressCallback && totalSize > 0) {
                const progress = (downloadedSize / totalSize) * 100;
                progressCallback(progress);
              }
            });

            response.pipe(file);

            file.on('finish', () => {
              file.close();
              console.log(`[WhisperService] Model ${modelName} downloaded successfully`);
              resolve();
            });
          })
          .on('error', async (err) => {
            file.close();
            try {
              await fs.unlink(modelPath);
            } catch {}
            reject(err);
          });
      };

      downloadFile(modelUrl);
    });
  }

  async transcribe(
    audioPath: string,
    options: TranscriptionOptions,
    progressCallback?: (progress: number) => void
  ): Promise<TranscriptionResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const modelPath = path.join(this.modelsPath, `ggml-${options.model}.bin`);

    // Check if model exists
    try {
      await fs.access(modelPath);
    } catch {
      throw new Error(
        `Model ${options.model} not found. Please download it first.`
      );
    }

    // Check if audio needs conversion
    const ext = path.extname(audioPath).toLowerCase();
    let processedAudioPath = audioPath;
    let needsCleanup = false;

    // Convert non-WAV files to WAV format
    if (ext !== '.wav') {
      console.log(`[WhisperService] Non-WAV file detected (${ext}), converting to WAV...`);
      try {
        processedAudioPath = await this.convertAudioToWav(audioPath);
        needsCleanup = true;
      } catch (error: any) {
        throw new Error(
          `Audio conversion failed: ${error.message}. Only WAV files are supported without ffmpeg.`
        );
      }
    }

    // Prepare whisper command arguments
    const args = [
      '-m',
      modelPath,
      '-f',
      processedAudioPath,
      '-t',
      (options.threads || 4).toString(),
      '-p',
      (options.processors || 1).toString(),
    ];

    if (options.language) {
      args.push('-l', options.language);
    }

    if (options.translate) {
      args.push('--translate');
    }

    if (options.outputFormat === 'json') {
      args.push('-oj');
    } else if (options.outputFormat === 'srt') {
      args.push('-osrt');
    } else if (options.outputFormat === 'vtt') {
      args.push('-ovtt');
    }

    if (!options.timestamps) {
      args.push('-nt');
    }

    // Log the command being executed
    console.log('[WhisperService] Executing whisper command:', this.whisperPath);
    console.log('[WhisperService] Arguments:', args);

    return new Promise((resolve, reject) => {
      let whisperProcess;

      try {
        whisperProcess = spawn(this.whisperPath, args);
      } catch (spawnError: any) {
        console.error('[WhisperService] Failed to spawn whisper process:', spawnError);
        reject(new Error(`Failed to start whisper: ${spawnError.message}`));
        return;
      }

      let output = '';
      let error = '';
      let lastProgress = 0;

      whisperProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log('[WhisperService] Whisper stdout:', text);

        // Parse progress from output if possible
        const progressMatch = text.match(/(\d+)%/);
        if (progressMatch && progressCallback) {
          const progress = parseInt(progressMatch[1], 10);
          if (progress > lastProgress) {
            lastProgress = progress;
            progressCallback(progress);
          }
        }
      });

      whisperProcess.stderr.on('data', (data) => {
        const message = data.toString();
        console.log('[WhisperService] Whisper stderr:', message);

        // Some progress info might come through stderr
        if (message.includes('%') && progressCallback) {
          const progressMatch = message.match(/(\d+)%/);
          if (progressMatch) {
            const progress = parseInt(progressMatch[1], 10);
            if (progress > lastProgress) {
              lastProgress = progress;
              progressCallback(progress);
            }
          }
        }

        error += message;
      });

      whisperProcess.on('close', async (code) => {
        console.log(`[WhisperService] Whisper process closed with code: ${code}`);

        // Clean up converted WAV file if we created one
        if (needsCleanup) {
          try {
            await fs.unlink(processedAudioPath);
            console.log(`[WhisperService] Cleaned up converted file: ${processedAudioPath}`);
          } catch (cleanupError) {
            console.error('[WhisperService] Failed to cleanup converted file:', cleanupError);
          }
        }

        if (code === 0) {
          // Parse the output based on format
          if (options.outputFormat === 'json') {
            try {
              const jsonResult = JSON.parse(output);
              resolve({
                text: jsonResult.text || '',
                segments: jsonResult.segments || [],
                language: jsonResult.language,
                duration: jsonResult.duration,
              });
            } catch (e) {
              console.error('[WhisperService] Failed to parse JSON output:', e);
              resolve({ text: output });
            }
          } else {
            resolve({ text: output });
          }
        } else {
          const errorMsg = `Whisper process exited with code ${code}. Error: ${error || 'No error output'}. Output: ${output || 'No output'}`;
          console.error(`[WhisperService] ${errorMsg}`);
          reject(new Error(errorMsg));
        }
      });

      whisperProcess.on('error', async (err) => {
        console.error('[WhisperService] Whisper process error event:', err);

        // Clean up converted WAV file if we created one
        if (needsCleanup) {
          try {
            await fs.unlink(processedAudioPath);
          } catch (cleanupError) {
            console.error('[WhisperService] Failed to cleanup converted file:', cleanupError);
          }
        }

        reject(new Error(`Whisper process error: ${err.message}`));
      });
    });
  }

  async getAudioDuration(audioPath: string): Promise<number | undefined> {
    if (!this.ffmpegAvailable) {
      console.warn('[WhisperService] ffmpeg not available, cannot get audio duration');
      return undefined;
    }

    return new Promise((resolve) => {
      // Use ffmpeg to get duration by analyzing the file
      const ffmpegProcess = spawn(this.ffmpegPath, [
        '-i',
        audioPath,
        '-f',
        'null',
        '-',
      ]);

      let errorOutput = '';

      ffmpegProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ffmpegProcess.on('close', () => {
        // Parse duration from ffmpeg output: "Duration: HH:MM:SS.mmm"
        const durationMatch = errorOutput.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}\.\d{2})/);

        if (durationMatch) {
          const hours = parseInt(durationMatch[1], 10);
          const minutes = parseInt(durationMatch[2], 10);
          const seconds = parseFloat(durationMatch[3]);

          const totalSeconds = hours * 3600 + minutes * 60 + seconds;
          console.log(`[WhisperService] Audio duration: ${totalSeconds.toFixed(2)}s`);
          resolve(totalSeconds);
        } else {
          console.warn('[WhisperService] Failed to extract duration from ffmpeg output');
          resolve(undefined);
        }
      });

      ffmpegProcess.on('error', (err) => {
        console.warn('[WhisperService] ffmpeg error:', err);
        resolve(undefined);
      });
    });
  }

  async convertAudioToWav(inputPath: string): Promise<string> {
    if (!this.ffmpegAvailable) {
      throw new Error(
        'ffmpeg is not available. Please run setup to install ffmpeg.'
      );
    }

    const outputPath = inputPath.replace(path.extname(inputPath), '.wav');

    console.log(
      `[WhisperService] Converting ${inputPath} to WAV format using bundled ffmpeg...`
    );

    return new Promise((resolve, reject) => {
      const ffmpegProcess = spawn(this.ffmpegPath, [
        '-i',
        inputPath,
        '-ar',
        '16000', // 16kHz sample rate
        '-ac',
        '1', // Mono
        '-c:a',
        'pcm_s16le', // 16-bit PCM
        outputPath,
        '-y', // Overwrite output
      ]);

      let errorOutput = '';

      ffmpegProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`[WhisperService] Audio converted successfully to: ${outputPath}`);
          resolve(outputPath);
        } else {
          console.error('[WhisperService] ffmpeg conversion failed:', errorOutput);
          reject(
            new Error(
              `Failed to convert audio file. ffmpeg exit code: ${code}`
            )
          );
        }
      });

      ffmpegProcess.on('error', (err) => {
        console.error('[WhisperService] ffmpeg process error:', err);
        reject(
          new Error(
            `Failed to start ffmpeg: ${err.message}. ffmpeg binary may be missing or corrupted.`
          )
        );
      });
    });
  }
}
