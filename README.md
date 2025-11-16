# Whisper Electron App - Offline Speech-to-Text

A robust, production-ready Electron application that provides offline speech-to-text transcription using OpenAI's Whisper model via whisper.cpp. Built with Angular for the frontend and NestJS for the backend architecture.

## 🌟 Features

- **100% Offline Operation**: No internet connection required after initial setup
- **Multiple Model Support**: Choose from tiny, base, small, medium, and large models
- **Multi-format Support**: MP3, WAV, OGG, M4A, FLAC, AAC, WEBM audio formats (automatic conversion via bundled ffmpeg)
- **Export Options**: Save transcripts as TXT, SRT, VTT, or JSON
- **Transcription History**: View past transcriptions with metadata (model used, duration, processing time)
- **Model Management**: Download and manage Whisper models directly from the app
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Modern UI**: Material Design with Angular
- **Secure IPC**: Context-isolated Electron with secure IPC communication

## 📋 Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher
- **Git**: For cloning whisper.cpp
- **Build Tools**:
  - **macOS**: Xcode Command Line Tools
  - **Windows**: Visual Studio 2019+ with C++ build tools, CMake
  - **Linux**: build-essential, cmake

### Platform-Specific Requirements

#### macOS
```bash
# Install Xcode Command Line Tools
xcode-select --install
```

#### Ubuntu/Debian
```bash
# Install build tools
sudo apt-get update
sudo apt-get install build-essential cmake git
```

#### Windows
- Install Visual Studio 2019 or later with C++ development tools
- Install CMake from https://cmake.org/download/
- Install Git from https://git-scm.com/download/win

## 🚀 Quick Start

### 1. Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd whisper-electron-app

# Complete setup (installs dependencies, builds Whisper.cpp, downloads models)
npm run setup
```

The `setup` script will:
- Install root dependencies
- Install backend and frontend dependencies
- Clone and build whisper.cpp
- Download and bundle ffmpeg for audio conversion
- Download tiny and base models (~113 MB total)

### 2. Development Mode

Run the application in development mode:

```bash
npm run dev
```

This single command starts:
- NestJS backend server on http://localhost:3333
- Angular dev server on http://localhost:4200
- Electron app in development mode with live reload

**Individual Services** (if needed):
```bash
npm run dev:backend    # Run only backend
npm run dev:frontend   # Run only frontend
npm run dev:electron   # Run only Electron app
```

### 3. Production Build

```bash
# Build all components
npm run build

# Create distributable packages
npm run dist

# Platform-specific builds
npm run dist:mac    # macOS
npm run dist:win    # Windows
npm run dist:linux  # Linux
```

## 📁 Project Structure

```
whisper-electron-app/
├── electron/               # Electron main process
│   ├── main.ts            # Main process entry
│   ├── preload.ts         # Preload script for IPC
│   └── tsconfig.json      # TypeScript config
├── backend/               # NestJS backend
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── transcription/ # Transcription module
│       │   ├── transcription.controller.ts
│       │   ├── transcription.service.ts
│       │   └── transcription.gateway.ts
│       └── common/        # Shared services
│           ├── whisper.service.ts
│           └── file.service.ts
├── frontend/              # Angular frontend
│   └── src/
│       ├── app/
│       │   ├── app.component.ts
│       │   └── app.module.ts
│       ├── components/
│       │   └── transcription/
│       └── services/
│           ├── electron.service.ts
│           └── transcription.service.ts
├── whisper.cpp/           # Whisper.cpp repository
│   ├── main.exe          # Windows binary (or 'main' on Unix)
│   └── models/           # (symlinked or referenced)
├── models/               # Whisper model files
│   ├── ggml-tiny.bin
│   ├── ggml-base.bin
│   └── ggml-*.bin       # Other downloaded models
├── dist/                 # Build output
│   ├── electron/        # Compiled Electron code
│   ├── backend/         # Compiled backend code
│   └── frontend/        # Built Angular app
├── scripts/              # Build and setup scripts
│   ├── setup-whisper.js # Whisper.cpp setup script
│   └── build-whisper.js # Legacy build script
└── package.json         # Main package configuration
```

## 🎯 Usage

### In Electron Mode

1. **Select Audio File**: 
   - Click "Select Audio" or use Cmd/Ctrl+O
   - Choose an audio file (MP3, WAV, etc.)

2. **Choose Model**:
   - Go to Models tab
   - Download additional models if needed
   - Select desired model for transcription

3. **Configure Options**:
   - Language detection or specific language
   - Enable translation to English
   - Choose output format

4. **Start Transcription**:
   - Click "Transcribe"
   - Wait for processing to complete
   - View results in the editor

5. **Export Results**:
   - Edit transcript if needed
   - Save as TXT, SRT, VTT, or JSON
   - Use Cmd/Ctrl+S for quick save

### In Browser Mode (Development)

The app can run in browser mode for development, with limited features:
- File upload via web interface
- Server-side processing
- No local file system access

## 🔧 Configuration

### Whisper Models

Models are stored in `models/` directory:

| Model  | Size    | Speed   | Accuracy |
|--------|---------|---------|----------|
| tiny   | 39 MB   | Fastest | Lower    |
| base   | 74 MB   | Fast    | Good     |
| small  | 244 MB  | Medium  | Better   |
| medium | 769 MB  | Slow    | Great    |
| large  | 1550 MB | Slowest | Best     |

### Environment Variables

Create `.env` files for configuration:

```bash
# backend/.env
PORT=3333
MAX_FILE_SIZE=500MB
UPLOAD_DIR=./uploads

# frontend/.env
API_URL=http://localhost:3333
WEBSOCKET_URL=ws://localhost:3333
```

## 🛠️ Advanced Configuration

### Custom Whisper Build Options

Edit `scripts/build-whisper.js` to customize:
- Optimization flags
- Architecture-specific builds
- CUDA/Metal acceleration

### Adding Language Support

The app supports all languages that Whisper supports. To add specific language optimizations:

1. Download language-specific models
2. Update `whisper.service.ts` with language configurations
3. Add language options to the UI

## 🐛 Troubleshooting

### Setup Issues

#### "Git not found"
- Windows: Install from https://git-scm.com/download/win
- macOS: `xcode-select --install`
- Linux: `sudo apt-get install git`

#### Setup fails during Whisper.cpp build

**macOS: "xcrun: error"**
```bash
xcode-select --install
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

**Windows: "CMake not found"**
- Install CMake: https://cmake.org/download/
- Add CMake to PATH
- Or install MinGW with make: https://www.mingw-w64.org/

**Linux: "make: command not found"**
```bash
sudo apt-get install build-essential cmake
```

#### Model download fails
- Check internet connection
- Manually download from: https://huggingface.co/ggerganov/whisper.cpp/tree/main
- Place in `models/` directory as `ggml-{model-name}.bin`

### Runtime Issues

#### "Backend connection failed"
```bash
# Check if backend is running
cd backend && npm run start:dev

# Check port 3333 is not in use
netstat -an | grep 3333  # Unix
netstat -an | findstr 3333  # Windows
```

#### "Whisper binary not found"
```bash
# Re-run setup to rebuild Whisper.cpp
npm run setup

# Or manually rebuild
node scripts/setup-whisper.js
```

#### "Model not found" error during transcription
- Ensure models are in `models/` directory
- Check model file names match `ggml-{name}.bin` format
- Download additional models from the UI or run setup again

#### "Multipart: Unexpected end of form" error
- This issue has been resolved in the current version
- If you encounter this error, ensure you're running the latest version
- Re-run setup if needed: `npm run setup`

#### Audio file won't transcribe
- Check file format (supported: MP3, WAV, OGG, M4A, FLAC, AAC, WEBM)
- Ensure file is not corrupted
- Non-WAV files are automatically converted using bundled ffmpeg
- If conversion fails, check backend logs for detailed error messages
- If ffmpeg binary is missing, re-run setup:
  ```bash
  npm run setup
  ```

## 📦 Distribution

### Code Signing (macOS)

```bash
# Set up code signing
export CSC_NAME="Developer ID Application: Your Name"

# Build signed app
npm run dist:mac
```

### Windows Installer

The app uses NSIS for Windows installer creation. Customize in `package.json`:

```json
"win": {
  "target": ["nsis", "portable"],
  "icon": "assets/icon.ico"
}
```

## 🔖 Release Management

This project follows [Semantic Versioning](https://semver.org/). Version numbers follow the format `MAJOR.MINOR.PATCH`:

- **MAJOR**: Incompatible API changes
- **MINOR**: New functionality in a backwards-compatible manner
- **PATCH**: Backwards-compatible bug fixes

### Interactive Release Process (Recommended)

The easiest way to create a release is using the interactive release script:

```bash
npm run release:interactive
```

This single command will guide you through the entire release process:

**What it does:**

1. **Git Status Check** - Ensures your working directory is clean
2. **Version Selection** - Choose between patch, minor, major, or custom version
3. **CHANGELOG Generation** - Automatically generates CHANGELOG entry from git commits
   - Option to edit the generated entry
   - Categorizes changes (Added, Changed, Fixed, Removed)
4. **Version Update** - Updates version in all package.json files
5. **Git Commit & Tag** - Creates commit and tag for the release
6. **Build & Distribution** - Optionally builds and packages the app
7. **Push to Remote** - Pushes commits and tags to GitHub
8. **GitHub Release** - Creates GitHub release with notes (requires GitHub CLI)
   - Optionally uploads distribution files

**Example session:**

```bash
$ npm run release:interactive

🚀 Whisper Electron App - Release Manager
══════════════════════════════════════════════════════

📋 Step 1: Checking git status...
✅ Working directory clean

📋 Step 2: Version selection

Current version: 1.0.0

Select release type:
  1) Patch (1.0.1) - Bug fixes
  2) Minor (1.1.0) - New features (backwards compatible)
  3) Major (2.0.0) - Breaking changes
  4) Custom version

Your choice (1-4): 1

✅ Selected version: 1.0.1

📋 Step 3: Updating CHANGELOG.md
...
```

**Requirements:**

- **Optional but recommended**: [GitHub CLI](https://cli.github.com/) for automatic GitHub release creation
  ```bash
  # Install GitHub CLI
  # Windows (via winget)
  winget install --id GitHub.cli
  
  # macOS
  brew install gh
  
  # Login
  gh auth login
  ```

### Manual Release Process

If you prefer manual control, follow these steps:

#### 1. Update Version

```bash
# For bug fixes (1.0.0 → 1.0.1)
npm run version:patch

# For new features (1.0.0 → 1.1.0)
npm run version:minor

# For breaking changes (1.0.0 → 2.0.0)
npm run version:major
```

These scripts automatically:
- Update version in root `package.json`
- Sync version to `backend/package.json` and `frontend/package.json`
- Create a git commit with the version bump
- Create a git tag (e.g., `v1.0.1`)

#### 2. Update CHANGELOG.md

Manually update `CHANGELOG.md` with:
- New version section
- Added features
- Changed functionality
- Deprecated features
- Removed features
- Fixed bugs
- Security updates

Example:
```markdown
## [1.0.1] - 2025-11-20

### Fixed
- Fixed audio conversion issue with large files
- Improved error handling in transcription service

### Changed
- Updated Whisper.cpp to latest version
```

#### 3. Build and Package

```bash
# Build the app
npm run build

# Create distribution packages
npm run dist

# Or platform-specific
npm run dist:win
npm run dist:mac
npm run dist:linux
```

#### 4. Push Release

```bash
npm run release
```

Or manually:
```bash
git push origin main --follow-tags
```

#### 5. Create GitHub Release

**With GitHub CLI:**
```bash
gh release create v1.0.1 --title "Release v1.0.1" --notes "See CHANGELOG.md"
gh release upload v1.0.1 release/*.exe release/*.dmg release/*.AppImage
```

**Manually:**
1. Go to your repository on GitHub
2. Click "Releases" → "Draft a new release"
3. Select the version tag (e.g., `v1.0.1`)
4. Use the CHANGELOG.md content for release notes
5. Attach distribution files from `release/` directory
6. Publish release

### Version Sync

If you need to manually sync versions across all packages:

```bash
npm run version:sync
```

This ensures `package.json` in root, backend, and frontend all have the same version number.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) - C++ implementation of Whisper
- [OpenAI Whisper](https://github.com/openai/whisper) - Original Whisper model
- Angular, NestJS, and Electron communities

## 📞 Support

- **GitHub Issues**: Report bugs or request features
- **Documentation**: Wiki with detailed guides (planned)

## 🚦 Status

- ✅ Core transcription functionality
- ✅ Multi-platform support
- ✅ Model management
- ✅ Transcription history
- 🚧 GPU acceleration (in progress)
- 🚧 Batch processing (planned)
- 🚧 Speaker diarization (planned)

---

Built with ❤️ for offline, privacy-focused speech transcription
