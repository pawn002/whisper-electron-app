# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-16

### Added
- Initial release of Whisper Electron App
- Offline speech-to-text transcription using Whisper.cpp
- Support for multiple Whisper models (tiny, base, small, medium, large)
- Model management tab with download functionality
- Multi-format audio support (MP3, WAV, OGG, M4A, FLAC, AAC, WEBM)
- Bundled ffmpeg for automatic audio format conversion
- Export transcriptions in multiple formats (TXT, JSON, SRT, VTT)
- Transcription history tab with metadata tracking
- Real-time transcription progress updates via WebSocket
- Material Design UI with Angular
- NestJS backend architecture
- Cross-platform support (Windows, macOS, Linux)
- Secure Electron IPC communication

### Features
- **Transcription Tab**: Upload and transcribe audio files with configurable options
- **History Tab**: View past transcriptions with audio duration and processing time
- **Models Tab**: Download and manage Whisper models
- **Native Save Dialogs**: Export transcripts with proper file type filters
- **Automatic Format Conversion**: Non-WAV files automatically converted to WAV using bundled ffmpeg
- **Progress Tracking**: Real-time progress updates during transcription
- **Metadata Tracking**: Track model used, audio duration, and transcription time

[1.0.0]: https://github.com/pawn002/whisper-electron-app/releases/tag/v1.0.0
