# Architecture Overview

Technical architecture documentation for the Whisper Electron App.

## Table of Contents

- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Component Architecture](#component-architecture)
- [Data Flow](#data-flow)
- [Security Architecture](#security-architecture)
- [File Structure](#file-structure)
- [IPC Communication](#ipc-communication)
- [State Management](#state-management)
- [Build and Packaging](#build-and-packaging)

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Electron App                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │          Renderer Process (Angular)                │ │
│  │  ┌──────────────┐  ┌──────────────┐               │ │
│  │  │ Transcription│  │    Models    │               │ │
│  │  │  Component   │  │  Component   │               │ │
│  │  └──────────────┘  └──────────────┘               │ │
│  │  ┌──────────────────────────────────┐             │ │
│  │  │       History Component          │             │ │
│  │  └──────────────────────────────────┘             │ │
│  └────────────────────────────────────────────────────┘ │
│                        ↕️ IPC                            │
│  ┌────────────────────────────────────────────────────┐ │
│  │           Main Process (Node.js)                   │ │
│  │  - Window Management                               │ │
│  │  - Backend Auto-start                              │ │
│  │  - IPC Handlers                                    │ │
│  │  - File System Access                              │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                        ↕️ HTTP/WebSocket
┌─────────────────────────────────────────────────────────┐
│              Backend Server (NestJS)                     │
│  ┌────────────────────────────────────────────────────┐ │
│  │          Transcription Module                      │ │
│  │  - REST Controller (HTTP endpoints)               │ │
│  │  - WebSocket Gateway (progress updates)           │ │
│  │  - Business Logic Service                         │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │            Whisper Service                         │ │
│  │  - Spawns whisper-cli process                     │ │
│  │  - Manages audio conversion (FFmpeg)              │ │
│  │  - Handles model management                       │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                        ↕️ Child Process
┌─────────────────────────────────────────────────────────┐
│                  whisper.cpp Binary                      │
│  - Native C++ executable                                │
│  - Processes audio files                                │
│  - Outputs transcriptions                               │
└─────────────────────────────────────────────────────────┘
```

### Architecture Layers

1. **Presentation Layer** - Angular UI components
2. **Application Layer** - Electron main process
3. **Business Logic Layer** - NestJS backend services
4. **Integration Layer** - Whisper service (FFmpeg, whisper.cpp)
5. **Infrastructure Layer** - File system, models, audio files

## Technology Stack

### Frontend
- **[Angular 17](https://angular.io/)** - Web application framework
- **[Angular Material](https://material.angular.io/)** - UI components
- **[Socket.IO Client](https://socket.io/)** - WebSocket for real-time progress updates

### Backend
- **[NestJS](https://nestjs.com/)** - Node.js framework
- **[Socket.IO](https://socket.io/)** - WebSocket server
- **Child Process** - Spawn whisper.cpp binary

### Desktop
- **[Electron 28](https://www.electronjs.org/)** - Cross-platform desktop framework
- **IPC** - Secure main/renderer communication
- **Context Isolation** - Security boundary

### Audio Processing
- **[whisper.cpp](https://github.com/ggerganov/whisper.cpp)** - C++ Whisper implementation
- **[FFmpeg](https://ffmpeg.org/)** - Audio format conversion
- **Whisper Models** - Pre-trained neural networks (.bin files)

## Component Architecture

### Frontend Components

```
App Component
├── Transcription Component
│   ├── File selector
│   ├── Model selector
│   ├── Language selector
│   ├── Progress indicator
│   └── Result editor
├── Model Selector Component
│   ├── Model list
│   ├── Download manager
│   └── System info
└── History Component
    ├── History list
    └── Copy functionality
```

**Component Responsibilities:**

| Component | Responsibility |
|-----------|---------------|
| `AppComponent` | Layout, tab navigation, system info |
| `TranscriptionComponent` | File selection, settings, transcription UI |
| `ModelSelectorComponent` | Model management, downloads |
| `HistoryComponent` | Display past transcriptions |

### Backend Modules

```
App Module
├── Transcription Module
│   ├── TranscriptionController
│   ├── TranscriptionService
│   └── TranscriptionGateway
└── Common Module
    └── WhisperService
```

**Module Responsibilities:**

| Module/Service | Responsibility |
|----------------|---------------|
| `TranscriptionController` | HTTP endpoints for transcription |
| `TranscriptionService` | Business logic, job management |
| `TranscriptionGateway` | WebSocket events, progress updates |
| `WhisperService` | Integration with whisper.cpp, FFmpeg |

## Data Flow

### Transcription Flow

```
1. User selects file
   ↓
2. Frontend → IPC → Main Process
   ↓
3. Main Process → HTTP → Backend
   ↓
4. Backend validates file
   ↓
5. Backend → FFmpeg (if needed)
   ↓
6. Backend → Spawn whisper-cli
   ↓
7. whisper-cli processes audio
   ↓
8. Backend emits progress via WebSocket
   ↓
9. Frontend receives progress updates
   ↓
10. whisper-cli completes
   ↓
11. Backend sends final result
   ↓
12. Frontend displays transcript
```

### Model Download Flow

```
1. User clicks Download
   ↓
2. Frontend → HTTP → Backend
   ↓
3. Backend → Hugging Face API
   ↓
4. Backend streams file
   ↓
5. Backend emits download progress
   ↓
6. Frontend updates progress bar
   ↓
7. Download completes
   ↓
8. Backend saves to models/
   ↓
9. Frontend updates model list
```

### History Retrieval Flow

```
1. User opens History tab
   ↓
2. Frontend → IPC → Main Process
   ↓
3. Main Process → HTTP → Backend
   ↓
4. Backend queries database/file system
   ↓
5. Backend returns history array
   ↓
6. Frontend displays history list
```

## Security Architecture

### Electron Security

**Context Isolation:**
```typescript
// Main Process
new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    nodeIntegration: false,      // ✅ Disabled
    contextIsolation: true,      // ✅ Enabled
    sandbox: true,               // ✅ Enabled
  }
});
```

**Preload Script Pattern:**
```typescript
// preload.ts - Exposes safe APIs
contextBridge.exposeInMainWorld('electronAPI', {
  selectAudioFile: () => ipcRenderer.invoke('select-audio-file'),
  transcribeAudio: (path, options) => 
    ipcRenderer.invoke('transcribe-audio', path, options),
});
```

**IPC Security:**
- All IPC uses `invoke/handle` pattern (async)
- Input validation on main process
- No direct Node.js access from renderer
- Sanitized file paths

### Backend Security

**File Upload Security:**
- File size limits (500MB default)
- Type validation
- Temporary file storage
- Cleanup after processing

**Path Traversal Prevention:**
```typescript
// Validate and sanitize paths
const safePath = path.join(uploadDir, path.basename(filename));
```

**CORS Configuration:**
```typescript
// Development: Allow localhost
// Production: Electron-specific origin
app.enableCors({
  origin: isDev ? '*' : 'file://',
});
```

## File Structure

### Development Structure

```
whisper-electron-app/
├── electron/          # Electron main & preload
├── backend/          # NestJS backend
├── frontend/         # Angular frontend
├── whisper.cpp/      # Cloned whisper.cpp repo
├── models/           # Whisper model files
├── ffmpeg/           # FFmpeg binaries
└── scripts/          # Build scripts
```

### Production Structure (Packaged)

```
Whisper Transcription.exe
app.asar              # Frontend + Electron code (compressed)
resources/
  ├── backend/        # Backend code & dependencies
  │   ├── dist/       # Compiled backend
  │   └── node_modules/
  ├── whisper.cpp/
  │   └── whisper-cli.exe
  ├── models/
  │   ├── ggml-tiny.bin
  │   └── ggml-base.bin
  └── ffmpeg/
      └── bin/
          └── ffmpeg.exe
```

## IPC Communication

### IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `select-audio-file` | Renderer → Main | Open file dialog |
| `transcribe-audio` | Renderer → Main | Start transcription |
| `save-transcript` | Renderer → Main | Save transcript to file |
| `get-available-models` | Renderer → Main | Fetch model list |
| `download-model` | Renderer → Main | Download Whisper model |
| `get-system-info` | Renderer → Main | Get system information |
| `get-transcription-history` | Renderer → Main | Fetch history |
| `transcription-progress` | Main → Renderer | Progress updates |
| `transcription-completed` | Main → Renderer | Completion event |
| `transcription-error` | Main → Renderer | Error event |

### IPC Pattern

```typescript
// Renderer (Angular Service)
async transcribe(file: File, options: Options): Promise<string> {
  const jobId = await window.electronAPI.transcribeAudio(
    filePath, 
    options
  );
  return jobId;
}

// Main Process (IPC Handler)
ipcMain.handle('transcribe-audio', async (event, path, options) => {
  // Forward to backend
  const response = await fetch(`${BACKEND_URL}/api/transcription/process`, {
    method: 'POST',
    body: formData,
  });
  return await response.json();
});
```

## State Management

### Frontend State

**Component State:**
- Local UI state in components
- Form data (file selection, options)
- UI flags (loading, error states)

**Service State:**
- Shared state via Angular services
- RxJS BehaviorSubjects for reactive state
- No global state library needed

**Example:**
```typescript
@Injectable()
export class TranscriptionService {
  private progressSubject = new BehaviorSubject<number>(0);
  progress$ = this.progressSubject.asObservable();

  updateProgress(value: number) {
    this.progressSubject.next(value);
  }
}
```

### Backend State

**In-Memory State:**
- Active transcription jobs (Map)
- WebSocket connections (Map)
- Download progress tracking

**Persistent State:**
- Transcription history (JSON file)
- Downloaded models (file system)
- User settings (future: database)

## Build and Packaging

### Build Process

```
1. Frontend Build (Angular)
   - Compiles TypeScript → JavaScript
   - Bundles with Webpack
   - Outputs to frontend/dist/
   
2. Backend Build (NestJS)
   - Compiles TypeScript → JavaScript
   - Outputs to backend/dist/
   
3. Electron Build
   - Compiles TypeScript → JavaScript
   - Outputs to dist/electron/

4. electron-builder Packaging
   - Creates app.asar (frontend + electron)
   - Copies backend to resources/
   - Bundles whisper.cpp binaries
   - Bundles models
   - Bundles FFmpeg
   - Creates platform-specific installer
```

### Packaging Configuration

**electron-builder (package.json):**
```json
{
  "files": [
    "dist/electron/**/*",
    "frontend/dist/**/*",
    "package.json"
  ],
  "extraResources": [
    { "from": "backend/dist", "to": "backend/dist" },
    { "from": "backend/node_modules", "to": "backend/node_modules" },
    { "from": "whisper.cpp/whisper-cli", "to": "whisper.cpp/" },
    { "from": "models/", "to": "models/" },
    { "from": "ffmpeg/bin/", "to": "ffmpeg/bin/" }
  ]
}
```

### Startup Sequence (Production)

```
1. User launches app
   ↓
2. Electron main process starts
   ↓
3. Main process spawns backend server
   (from resources/backend/dist/main.js)
   ↓
4. Wait 7 seconds for backend initialization
   ↓
5. Create browser window
   ↓
6. Load frontend (from app.asar)
   ↓
7. Initialize WebSocket connection
   ↓
8. App ready for user interaction
```

## Performance Considerations

### Optimization Strategies

**Frontend:**
- Lazy load Angular modules
- OnPush change detection
- Virtual scrolling for large lists
- Debounce user input

**Backend:**
- Stream file uploads
- Process transcriptions asynchronously
- Cache model metadata
- Efficient file I/O

**Electron:**
- Separate main/renderer processes
- Offload heavy work to backend
- Minimize IPC overhead

### Resource Management

**Memory:**
- Whisper models load into RAM (200MB - 8GB)
- Clean up temporary files
- Release resources after transcription

**CPU:**
- Whisper.cpp uses all available cores
- No GPU acceleration yet (planned)
- Background processing doesn't block UI

**Disk:**
- Temporary audio files cleaned up
- Model files cached permanently
- History stored as JSON (minimal space)

## Future Architecture Considerations

### Planned Improvements

1. **GPU Acceleration**
   - CUDA support (NVIDIA)
   - Metal support (Apple Silicon)
   - Significant speed improvements

2. **Database Integration**
   - SQLite for history
   - Better querying and indexing
   - Full-text search

3. **Batch Processing**
   - Queue multiple files
   - Background processing
   - Progress tracking for all jobs

4. **Plugin System**
   - Custom post-processing
   - Third-party integrations
   - Extensible architecture

## Architecture Decisions

### Why Electron?

- Cross-platform desktop app
- Web technologies (familiar stack)
- Access to native APIs
- Large ecosystem

### Why NestJS Backend?

- Separation of concerns
- Testable architecture
- WebSocket support
- TypeScript throughout

### Why Separate Backend?

- Isolate native dependencies
- Easier testing
- Can run standalone
- Clean architecture

### Why Angular?

- Material Design components
- Strong TypeScript support
- Dependency injection
- Mature ecosystem

## References

- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)
- [NestJS Architecture](https://docs.nestjs.com/fundamentals/custom-providers)
- [Angular Architecture](https://angular.io/guide/architecture)
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp)
