# Whisper Electron App - Offline Speech-to-Text

A robust, production-ready Electron application that provides offline speech-to-text transcription using OpenAI's Whisper model via whisper.cpp. Built with Angular for the frontend and NestJS for the backend architecture.

## 🌟 Features

- **100% Offline Operation**: No internet connection required after initial setup
- **Multiple Model Support**: Choose from tiny, base, small, medium, and large models
- **Real-time Progress Updates**: WebSocket-based progress tracking
- **Multi-format Support**: MP3, WAV, OGG, M4A, FLAC, AAC audio formats
- **Export Options**: Save transcripts as TXT, SRT, VTT, or JSON
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

# Install ffmpeg (for audio conversion)
brew install ffmpeg
```

#### Ubuntu/Debian
```bash
# Install build tools
sudo apt-get update
sudo apt-get install build-essential cmake git

# Install ffmpeg
sudo apt-get install ffmpeg
```

#### Windows
- Install Visual Studio 2019 or later with C++ development tools
- Install CMake from https://cmake.org/download/
- Install Git from https://git-scm.com/download/win

## 🚀 Quick Start

### 1. Clone and Setup

```bash
# Clone the repository (or create the project structure)
cd whisper-electron-app

# Install dependencies
npm install

# This will also:
# - Install backend and frontend dependencies
# - Build whisper.cpp
# - Download the tiny model
```

### 2. Development Mode

Run all services concurrently:

```bash
npm run dev
```

This starts:
- NestJS backend on http://localhost:3333
- Angular frontend on http://localhost:4200
- Electron app in development mode

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
│   └── services/          # Electron services
│       ├── whisper.service.ts
│       └── file.service.ts
├── backend/               # NestJS backend
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       └── transcription/ # Transcription module
├── frontend/              # Angular frontend
│   └── src/
│       ├── app/
│       │   ├── components/
│       │   └── services/
│       └── index.html
├── native/                # Native binaries
│   ├── darwin/           # macOS binaries
│   ├── linux/            # Linux binaries
│   └── win32/            # Windows binaries
├── models/               # Whisper models
│   └── ggml-*.bin       # Model files
├── scripts/              # Build scripts
│   └── build-whisper.js # Whisper.cpp build script
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
   - Monitor real-time progress
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

### Build Issues

#### macOS: "xcrun: error"
```bash
xcode-select --install
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

#### Windows: "CMake not found"
- Install CMake: https://cmake.org/download/
- Add to PATH

#### Linux: "make: command not found"
```bash
sudo apt-get install build-essential
```

### Runtime Issues

#### "Whisper binary not found"
```bash
# Rebuild whisper
node scripts/build-whisper.js
```

#### "Model not found"
- Download models from Models tab
- Or manually download to `models/` directory

#### Audio format not supported
- Ensure ffmpeg is installed
- Check audio file integrity

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

- GitHub Issues: Report bugs or request features
- Documentation: Check the wiki for detailed guides
- Community: Join discussions in the forum

## 🚦 Status

- ✅ Core transcription functionality
- ✅ Multi-platform support
- ✅ Real-time progress updates
- ✅ Model management
- 🚧 GPU acceleration (in progress)
- 🚧 Batch processing (planned)
- 🚧 Speaker diarization (planned)

---

Built with ❤️ for offline, privacy-focused speech transcription
