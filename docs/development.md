# Development Guide

Guide for developers who want to contribute to the Whisper Electron App or understand the development workflow.

## Table of Contents

- [Setting Up Development Environment](#setting-up-development-environment)
- [Project Architecture](#project-architecture)
- [Development Workflow](#development-workflow)
- [Code Structure](#code-structure)
- [Testing](#testing)
- [Building and Packaging](#building-and-packaging)
- [Contributing Guidelines](#contributing-guidelines)
- [Code Style](#code-style)

## Setting Up Development Environment

### Prerequisites

Ensure you have all the prerequisites installed as described in the [Installation Guide](installation.md).

### Clone and Setup

```bash
# Clone the repository
git clone https://github.com/pawn002/whisper-electron-app.git
cd whisper-electron-app

# Run complete setup
npm run setup
```

This will:
1. Install all dependencies (root, backend, frontend)
2. Clone and build whisper.cpp
3. Download FFmpeg
4. Download base Whisper models

### IDE Setup

**Recommended IDEs:**
- Visual Studio Code
- WebStorm
- Any editor with TypeScript support

**VS Code Extensions:**
```json
{
  "recommendations": [
    "angular.ng-template",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### Environment Configuration

Create `.env` files for local development:

**backend/.env**
```env
PORT=3333
NODE_ENV=development
MAX_FILE_SIZE=500MB
UPLOAD_DIR=./uploads
```

**frontend/src/environments/environment.ts** (already configured)
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3333',
};
```

## Project Architecture

### Technology Stack

**Frontend:**
- Angular 17
- Angular Material (UI components)
- RxJS (reactive programming)
- Socket.IO client (WebSocket communication)

**Backend:**
- NestJS
- Socket.IO (WebSocket server)
- Multer (file uploads)
- TypeScript

**Electron:**
- Electron 28
- Context isolation enabled
- IPC for secure communication

**Transcription Engine:**
- whisper.cpp (C++ implementation)
- FFmpeg (audio conversion)

### Component Communication

```
User Interface (Angular)
    ↕️ (HTTP/WebSocket)
Backend Server (NestJS)
    ↕️ (Child Process)
Whisper.cpp Binary
    ↕️ (File I/O)
Audio Files & Models
```

In Electron mode:
```
Renderer Process (Angular)
    ↕️ (IPC via Preload)
Main Process (Electron)
    ↕️ (HTTP/WebSocket)
Backend Server (NestJS - auto-started)
```

## Development Workflow

### Running in Development Mode

**Start all services at once:**
```bash
npm run dev
```

This starts:
- Backend on http://localhost:3333
- Frontend on http://localhost:4200
- Electron app with hot reload

**Start services individually:**

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend

# Terminal 3 - Electron
npm run dev:electron
```

### Hot Reload

- **Frontend**: Automatic reload on file changes (Angular dev server)
- **Backend**: Automatic reload on file changes (NestJS watch mode)
- **Electron**: Manual reload (`Ctrl+R` / `Cmd+R`) or restart

### Debugging

**Backend Debugging:**
```bash
# Start backend in debug mode
cd backend
npm run start:debug
```

Attach debugger on port 9229.

**Frontend Debugging:**
- Open browser DevTools (http://localhost:4200)
- Use Angular DevTools extension

**Electron Debugging:**
- Main process: `--inspect` flag or VS Code debugger
- Renderer process: DevTools (`Ctrl+Shift+I` / `Cmd+Option+I`)

**VS Code Launch Configuration:**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"]
    },
    {
      "name": "Debug Electron Main",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev:electron"],
      "console": "integratedTerminal"
    }
  ]
}
```

## Code Structure

### Frontend (Angular)

```
frontend/src/
├── app.component.ts          # Root component
├── components/
│   ├── transcription/        # Main transcription UI
│   │   ├── transcription.component.ts
│   │   ├── transcription.component.html
│   │   └── transcription.component.scss
│   ├── model-selector/       # Model management
│   │   ├── model-selector.component.ts
│   │   ├── model-selector.component.html
│   │   └── model-selector.component.scss
│   └── history/              # Transcription history
│       ├── history.component.ts
│       ├── history.component.html
│       └── history.component.scss
└── services/
    ├── electron.service.ts   # Electron IPC wrapper
    └── transcription.service.ts  # Backend API client
```

**Key Patterns:**
- Component-based architecture
- Services for business logic
- RxJS Observables for async operations
- Material Design components

### Backend (NestJS)

```
backend/src/
├── main.ts                   # Application entry point
├── app.module.ts             # Root module
├── transcription/
│   ├── transcription.module.ts
│   ├── transcription.controller.ts   # REST endpoints
│   ├── transcription.service.ts      # Business logic
│   └── transcription.gateway.ts      # WebSocket gateway
└── common/
    └── whisper.service.ts            # Whisper.cpp integration
```

**Key Patterns:**
- Module-based architecture
- Dependency injection
- Controllers for HTTP endpoints
- Gateways for WebSocket
- Services for business logic

### Electron

```
electron/
├── main.ts        # Main process (Node.js environment)
│                  # - Window management
│                  # - Backend auto-start
│                  # - IPC handlers
└── preload.ts     # Preload script (sandboxed)
                   # - Exposes safe APIs to renderer
```

**Key Patterns:**
- Context isolation enabled
- IPC for secure communication
- Preload script as bridge

## Testing

### Running Tests

**Frontend Tests:**
```bash
cd frontend
npm test                    # Run tests once
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage
```

**Backend Tests:**
```bash
cd backend
npm test                    # Run tests once
npm run test:watch         # Watch mode
npm run test:cov           # With coverage
npm run test:e2e           # End-to-end tests
```

### Writing Tests

**Frontend (Jest + Angular Testing):**
```typescript
describe('TranscriptionComponent', () => {
  let component: TranscriptionComponent;
  let fixture: ComponentFixture<TranscriptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TranscriptionComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(TranscriptionComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

**Backend (Jest + NestJS Testing):**
```typescript
describe('TranscriptionService', () => {
  let service: TranscriptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TranscriptionService],
    }).compile();

    service = module.get<TranscriptionService>(TranscriptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

## Building and Packaging

### Development Build

```bash
npm run build
```

Builds:
- Frontend: `frontend/dist/`
- Backend: `backend/dist/`
- Electron: `dist/electron/`

### Production Package

```bash
# All platforms (based on current OS)
npm run dist

# Specific platforms
npm run dist:win      # Windows
npm run dist:mac      # macOS
npm run dist:linux    # Linux
```

Output: `release/` directory

### Build Configuration

**electron-builder** configuration in `package.json`:
- File inclusion/exclusion
- Resource bundling
- Platform-specific settings
- Signing configuration

## Contributing Guidelines

### Branching Strategy

- `main` - Production-ready code
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

### Commit Messages

Follow conventional commits:
```
feat: add new feature
fix: resolve bug
docs: update documentation
style: formatting changes
refactor: code restructuring
test: add tests
chore: maintenance tasks
```

### Pull Request Process

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Test** thoroughly
5. **Commit** with clear messages
6. **Push** to your fork
7. **Open** a pull request

**PR Checklist:**
- [ ] Code follows style guidelines
- [ ] Tests pass
- [ ] No new warnings/errors
- [ ] Documentation updated
- [ ] Commit messages follow convention

### Code Review

All PRs require:
- At least one approval
- Passing CI checks
- No merge conflicts

## Code Style

### TypeScript

**General Rules:**
- Use TypeScript strict mode
- Explicit types for public APIs
- Use interfaces over types when possible
- Avoid `any`, use `unknown` if needed

**Example:**
```typescript
// Good
interface TranscriptionOptions {
  model: string;
  language: string;
}

function transcribe(options: TranscriptionOptions): Promise<string> {
  // implementation
}

// Avoid
function transcribe(options: any): any {
  // implementation
}
```

### Angular

- Use Angular CLI for generation
- Follow Angular style guide
- Use OnPush change detection when possible
- Unsubscribe from observables

**Example:**
```typescript
@Component({
  selector: 'app-transcription',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TranscriptionComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.service.data$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        // handle data
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### NestJS

- Use dependency injection
- Follow NestJS conventions
- Use DTOs for validation
- Use pipes for transformation

**Example:**
```typescript
@Controller('transcription')
export class TranscriptionController {
  constructor(private readonly service: TranscriptionService) {}

  @Post('process')
  async process(@Body() dto: TranscriptionDto) {
    return this.service.process(dto);
  }
}
```

### Formatting

**Prettier** configuration (automated):
```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": false,
  "printWidth": 80,
  "tabWidth": 2
}
```

Run formatting:
```bash
npm run format
```

### Linting

**ESLint** configuration:
```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
```

## Development Best Practices

### Performance

- Lazy load Angular modules when possible
- Use OnPush change detection
- Debounce user input
- Cache model downloads
- Stream large files

### Security

- Never disable context isolation
- Validate all IPC messages
- Sanitize file paths
- Use TypeScript strict mode
- Keep dependencies updated

### Error Handling

- Use try-catch for async operations
- Provide meaningful error messages
- Log errors appropriately
- Show user-friendly messages in UI

### Accessibility

- Use semantic HTML
- Provide ARIA labels
- Ensure keyboard navigation
- Maintain focus states
- Test with screen readers

## Resources

### Documentation

- [Angular Docs](https://angular.io/docs)
- [NestJS Docs](https://docs.nestjs.com/)
- [Electron Docs](https://www.electronjs.org/docs)
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp)

### Community

- [GitHub Issues](https://github.com/pawn002/whisper-electron-app/issues)
- [Discussions](https://github.com/pawn002/whisper-electron-app/discussions)

## Getting Help

If you're stuck:

1. Check existing [documentation](README.md)
2. Search [issues](https://github.com/pawn002/whisper-electron-app/issues)
3. Ask in [discussions](https://github.com/pawn002/whisper-electron-app/discussions)
4. Open a new issue with details
