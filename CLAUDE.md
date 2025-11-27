# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Offline speech-to-text Electron application using OpenAI's Whisper model via whisper.cpp. Three-layer architecture: Angular frontend, NestJS backend, and Electron shell.

## Common Commands

### Development
```bash
npm run dev                 # Start all services (backend, frontend, electron)
npm run dev:backend         # Backend only (http://localhost:3333)
npm run dev:frontend        # Frontend only (http://localhost:4200)
npm run dev:electron        # Electron only (waits for frontend)
```

### Building
```bash
npm run build               # Build all (backend, frontend, electron)
npm run build:backend       # cd backend && npm run build
npm run build:frontend      # cd frontend && npm run build
npm run build:electron      # tsc -p electron
```

### Testing
```bash
cd frontend && npm test     # Angular tests
```

### Packaging
> **⚠️ Windows**: All `dist` commands require administrator privileges. Run terminal as admin.

```bash
npm run dist                # Build and package for current platform (admin on Windows)
npm run dist:win            # Windows (requires admin)
npm run dist:mac            # macOS
npm run dist:linux          # Linux
```

### Setup & Installation
```bash
npm run setup               # Full setup (deps, whisper.cpp, models)
npm run install:all         # Install backend + frontend deps
npm run build:whisper       # Rebuild whisper.cpp
```

### Release
```bash
npm run release:interactive # Interactive release wizard
npm run version:patch       # Bump patch version
npm run version:minor       # Bump minor version
npm run version:major       # Bump major version
```

## Architecture

### Communication Flow
```
Angular (Renderer) <-> IPC (preload.ts) <-> Electron Main <-> HTTP/WebSocket <-> NestJS Backend <-> whisper.cpp
```

### Key Components

**Electron Main Process** (`electron/main.ts`):
- Window management and backend auto-start
- IPC handlers for file dialogs, transcription, model management
- Spawns backend server in production

**Electron Preload** (`electron/preload.ts`):
- Context-isolated bridge exposing `window.electronAPI`
- Safe IPC wrappers for renderer process

**Backend** (`backend/src/`):
- `main.ts` - NestJS bootstrap (port 3333)
- `transcription/` - Controller, Service, Gateway for transcription jobs
- `common/whisper.service.ts` - Spawns whisper-cli, manages FFmpeg conversion

**Frontend** (`frontend/src/`):
- `app.module.ts` - Root Angular module
- `components/` - transcription, model-selector, history components
- `services/` - electron.service.ts (IPC), transcription.service.ts (API)

### External Dependencies
- `whisper.cpp/` - Pre-built whisper-cli binary
- `models/` - Whisper model files (ggml-*.bin)
- `ffmpeg/` - Bundled FFmpeg for audio conversion

## IPC Channels

| Channel | Purpose |
|---------|---------|
| `select-audio-file` | Open file dialog |
| `transcribe-audio` | Start transcription |
| `save-transcript` | Save to file |
| `get-available-models` | List models |
| `download-model` | Download Whisper model |
| `get-system-info` | System information |
| `get-transcription-history` | Fetch history |

## Development Notes

- Backend must be running for transcription (auto-starts in production, manual in dev)
- Wait 7-10 seconds after launch for backend initialization in packaged app
- Context isolation is enabled - all renderer/main communication goes through preload.ts
- WebSocket (Socket.IO) used for real-time transcription progress updates
- Supported audio formats: MP3, WAV, OGG, M4A, FLAC, AAC, WEBM (auto-converted via FFmpeg)
- Use Context7 MCP server for up-to-date library documentation when generating code

## Version Sync

The project maintains synchronized versions across `package.json`, `backend/package.json`, and `frontend/package.json`. Use `npm run version:*` commands which auto-sync via `scripts/sync-version.js`.
