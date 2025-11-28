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
- `main.ts` - NestJS bootstrap (port 3333, CORS enabled)
- `app.module.ts` - Root NestJS module
- `transcription/transcription.controller.ts` - REST API endpoints
- `transcription/transcription.service.ts` - Transcription job management
- `transcription/transcription.gateway.ts` - WebSocket gateway for real-time progress
- `transcription/transcription.module.ts` - Transcription feature module
- `transcription/create-transcription.dto.ts` - Request validation DTO
- `common/whisper.service.ts` - Whisper.cpp integration, FFmpeg conversion, model management

**Frontend** (`frontend/src/`):
- `app.module.ts` - Root Angular module
- `app.component.ts` - Root component with tab navigation
- `components/transcription/` - Main transcription UI component
- `components/model-selector/` - Model management component (standalone)
- `components/history/` - Transcription history component (standalone)
- `services/electron.service.ts` - Electron IPC bridge service
- `services/transcription.service.ts` - HTTP/WebSocket API service

### External Dependencies
- `whisper.cpp/` - Pre-built whisper-cli binary
- `models/` - Whisper model files (ggml-*.bin)
- `ffmpeg/` - Bundled FFmpeg for audio conversion

## IPC Channels

### Main Process Handlers (invoke-based)
| Channel | Purpose | Parameters | Returns |
|---------|---------|------------|---------|
| `select-audio-file` | Open file dialog | none | `{path: string, size: number}` or `null` |
| `transcribe-audio` | Start transcription | `audioPath: string, options: object` | `{success: boolean, data/error: any}` |
| `save-transcript` | Save transcript to file | `resultData: any` | `string` (file path) or `null` |
| `get-available-models` | List available models | none | Array of model objects |
| `download-model` | Download Whisper model | `modelName: string` | `{success: boolean, message: string}` |
| `get-system-info` | Get system information | none | System info object |
| `get-app-path` | Get app data path | none | `string` (path) |
| `get-transcription-history` | Fetch transcription history | none | Array of transcription records |

### Renderer Process Events (on-based)
| Event | Purpose | Data |
|-------|---------|------|
| `transcription-progress` | Real-time transcription progress | `{progress: number, message?: string}` |
| `transcription-completed` | Transcription completed | `result: any` |
| `transcription-error` | Transcription error occurred | `error: string` |
| `model-download-progress` | Model download progress | `data: any` |
| `menu-open-file` | Menu action: Open file | none |

## Backend API Endpoints

All endpoints are prefixed with `/api/transcription`.

| Method | Endpoint | Purpose | Request Body/Params | Response |
|--------|----------|---------|---------------------|----------|
| POST | `/process` | Process audio file | FormData with `audio` file + options | `{success: boolean, data: {id: string, ...}}` |
| GET | `/status/:jobId` | Get transcription status | `jobId` in path | Job status object |
| GET | `/history` | Get transcription history | none | Array of transcription records |
| GET | `/models` | Get available models | none | Array of model info objects |
| POST | `/download-model/:modelName` | Download a model | `modelName` in path | `{success: boolean, message: string}` |
| POST | `/cancel/:jobId` | Cancel transcription | `jobId` in path | `{success: boolean, message: string}` |

### Transcription Options (for `/process` endpoint)
- `model` - Model name (tiny, base, small, medium, large)
- `language` - Language code (optional, auto-detect if not specified)
- `outputFormat` - Output format (txt, json, srt, vtt)
- `timestamps` - Include timestamps (boolean)
- `threads` - Number of threads (number, default: 4)
- `translate` - Translate to English (boolean)
- `processors` - Number of processors (number, default: 1)

## Development Notes

- Backend must be running for transcription (auto-starts in production, manual in dev)
- Wait 7-10 seconds after launch for backend initialization in packaged app
- Context isolation is enabled - all renderer/main communication goes through preload.ts
- WebSocket (Socket.IO) used for real-time transcription progress updates
- Supported audio formats: MP3, WAV, OGG, M4A, FLAC, AAC, WEBM (auto-converted via FFmpeg)
- Use Context7 MCP server for up-to-date library documentation when generating code

## Styling Guidelines

- **NEVER use `::ng-deep`** - This selector is deprecated and will be removed in future Angular versions
- Use Angular's ViewEncapsulation strategies instead:
  - `ViewEncapsulation.None` for component-wide global styles
  - Component host element selectors (`:host ::ng-deep` replacement)
  - CSS custom properties (CSS variables) for theming
  - Direct element selectors within component templates

## Version Sync

The project maintains synchronized versions across `package.json`, `backend/package.json`, and `frontend/package.json`. Use `npm run version:*` commands which auto-sync via `scripts/sync-version.js`.

## Documentation Maintenance

When asked to audit the project and update documentation, you MUST:

1. **Audit All Documentation Files:**
   - Main `README.md` - Project overview, quick start, features
   - `CLAUDE.md` - This file (developer guidance for Claude Code)
   - `docs/README.md` - Documentation index
   - `docs/installation.md` - Setup and installation instructions
   - `docs/usage.md` - User guide and features
   - `docs/models.md` - Whisper models reference
   - `docs/troubleshooting.md` - Common issues and solutions
   - `docs/architecture.md` - Technical architecture details
   - `docs/development.md` - Developer contribution guide

2. **Verify Against Codebase:**
   - Check all IPC channels match implementation in `electron/main.ts` and `electron/preload.ts`
   - Verify backend API endpoints match `backend/src/transcription/transcription.controller.ts`
   - Confirm file paths and component locations in frontend and backend
   - Validate npm scripts in all `package.json` files
   - Check version synchronization across packages
   - Verify supported features match actual implementation
   - Confirm external dependencies (whisper.cpp, ffmpeg, models) are correctly documented

3. **Update Documentation:**
   - Fix any inaccuracies or outdated information
   - Add missing features or endpoints
   - Update version numbers if applicable
   - Ensure consistency across all documentation files
   - Update examples if APIs have changed

4. **Create Audit Report:**
   - Document all findings in `AUDIT_REPORT.md`
   - List all files reviewed
   - Note all changes made
   - Highlight any issues found
   - Provide recommendations for improvements

5. **Key Areas to Check:**
   - IPC channel names, parameters, and return types
   - Backend REST endpoints (method, path, body, response)
   - WebSocket events and data structures
   - Supported audio formats
   - Model names and sizes
   - npm script commands
   - File structure and component locations
   - Platform-specific instructions (especially Windows admin requirements)
   - Version numbers across all documentation
