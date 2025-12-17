# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2] - 2025-12-17

### Added
- feat: implement format-specific export with JSON-based transcription
- feat: add OpenVINO variant support and benchmarking
- feat: enhance build infrastructure and establish baseline performance metrics
- docs: add continuation guide for Intel optimization testing session
- feat: add Intel hardware optimization testing infrastructure

### Changed
- refactor: migrate to Electron-native architecture
- docs: document comprehensive SYCL build investigation and whisper.cpp update

### Fixed
- fix: remove backend references from release script
- fix: prevent Windows reserved device names in build output
- fix: enable timestamps in transcription results by default
- fix: display actual audio duration in History tab
- fix: downgrade uuid to v9.0.1 for CommonJS compatibility

### Removed
- chore: remove build artifacts from version control
- docs: remove redundant build step from distribution instructions

### Other
- Merge pull request #13 from pawn002/task-10-electron-native-backend
- chore: finalize post-migration cleanup
- docs: complete comprehensive documentation audit and corrections
- Merge branch 'main' into task-10-electron-native-backend


## [1.1.1] - 2025-11-28

### Added
- feat: display file size alongside filename in transcription UI
- docs: add Windows admin privilege warnings for dist commands
- docs: add Context7 MCP guidance to CLAUDE.md
- docs: add CLAUDE.md for Claude Code guidance

### Changed
- docs: comprehensive documentation audit and updates

### Fixed
- fix: wrap Electron IPC callbacks in NgZone for proper change detection
- fix: ensure toast notifications always appear at bottom-center
- fix: reset UI state when selecting a new audio file
- fix: configure baseHref per environment to fix dev server routing
- fix: update dev:electron script to use npx and tcp port check

### Removed
- refactor: remove deprecated ::ng-deep selector from app component
- chore: remove build artifact from git tracking


## [1.1.0] - 2025-11-17

### Added
- docs: add development and architecture guides
- docs: add comprehensive documentation in docs/ folder

### Changed
- docs: update Usage section to reflect current UI implementation

### Other
- docs: streamline documentation and link to official framework docs
- docs: streamline README to 179 lines, move details to docs folder


## [1.0.1] - 2025-11-17

### Added
- refactor: remove non-functional View details button and add copy confirmation
- feat: add interactive release automation script

### Changed
- docs: update Support section to reflect accurate information
- docs: update README.md to reflect current app state

### Fixed
- fix: improve backend startup reliability with retry logic and remove dev tools from production
- fix: resolve blank UI in packaged Electron app
- fix: resolve Windows build error with rcedit
- fix: display app version instead of OS version in status bar

### Removed
- refactor: remove non-functional Electron/Browser mode button
- refactor: remove unused code and styles

### Other
- a11y: improve keyboard navigation and focus states
- style: improve tab contrast against dark background
- Document release management process in README


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
