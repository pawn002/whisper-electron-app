# Whisper Electron App - Offline Speech-to-Text

A robust, production-ready Electron application that provides offline speech-to-text transcription using OpenAI's Whisper model via whisper.cpp. Built with Angular for the frontend and native Electron services for business logic.

## 📚 Documentation

**New users**: See the [docs/](docs/) folder for comprehensive guides:
- **[Installation Guide](docs/installation.md)** - Complete setup instructions for all platforms
- **[Usage Guide](docs/usage.md)** - Detailed walkthrough of all features
- **[Model Guide](docs/models.md)** - Whisper model comparison and recommendations
- **[Troubleshooting](docs/troubleshooting.md)** - Solutions to common issues

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

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18.0.0 or higher
- **npm** v8.0.0 or higher
- **Git**
- **Build Tools**: Visual Studio 2019+ (Windows), Xcode Command Line Tools (macOS), or build-essential (Linux)

See [Installation Guide](docs/installation.md) for detailed requirements.

### Installation

```bash
# Clone the repository
git clone https://github.com/pawn002/whisper-electron-app.git
cd whisper-electron-app

# Run setup (installs dependencies, builds Whisper.cpp, downloads models)
npm run setup
```

### Development

```bash
# Start frontend and electron in development mode
npm run dev
```

### Production Build

> **⚠️ Windows Users**: Building distribution packages (`npm run dist`, `npm run dist:win`, etc.) requires **administrator privileges**. Run your terminal as administrator before executing these commands.

```bash
# Build and package the app
npm run dist            # Run with admin privileges on Windows
```

## 🎯 Usage

1. **Launch** the application
2. **Select** an audio file (MP3, WAV, OGG, M4A, FLAC, AAC, WEBM)
3. **Choose** a Whisper model (tiny, base, small, medium, large)
4. **Configure** language settings (auto-detect or specific language)
5. **Start** transcription and wait for completion
6. **Export** results as TXT, JSON, SRT, or VTT

See [Usage Guide](docs/usage.md) for detailed instructions.

## 📁 Project Structure

```
whisper-electron-app/
├── electron/          # Electron main process
│   └── services/      # Business logic services (Whisper, Transcription)
├── frontend/          # Angular frontend (Material Design)
├── whisper.cpp/       # Whisper.cpp binaries
├── models/            # Whisper model files (.bin)
├── ffmpeg/            # Bundled FFmpeg for audio conversion
├── docs/              # Documentation
└── scripts/           # Build and setup scripts
```

## 🔧 Whisper Models

| Model  | Size    | Speed   | Accuracy | Best For |
|--------|---------|---------|----------|----------|
| tiny   | 39 MB   | Fastest | Lower    | Quick drafts, testing |
| base   | 74 MB   | Fast    | Good     | General use (recommended) |
| small  | 244 MB  | Medium  | Better   | Professional work |
| medium | 769 MB  | Slow    | Great    | High accuracy needs |
| large  | 1.5 GB  | Slowest | Best     | Maximum quality |

See [Model Guide](docs/models.md) for detailed comparison and recommendations.

## 🐛 Troubleshooting

**Common Issues:**

- **Setup fails**: Ensure Git, Node.js, and build tools are installed
- **Model not found**: Download models from the Models tab in the app
- **Slow transcription**: Use smaller models (tiny/base) or upgrade hardware

See [Troubleshooting Guide](docs/troubleshooting.md) for detailed solutions.

## 🔖 Release Management

This project follows [Semantic Versioning](https://semver.org/).

### Quick Release

```bash
npm run release:interactive
```

This interactive script guides you through the entire release process:
- Version selection (patch/minor/major)
- CHANGELOG generation
- Git commit and tag
- Build and distribution
- GitHub release creation

### Manual Release

> **⚠️ Windows Users**: Distribution commands require **administrator privileges**.

```bash
# Update version
npm run version:patch    # Bug fixes (1.0.0 → 1.0.1)
npm run version:minor    # New features (1.0.0 → 1.1.0)
npm run version:major    # Breaking changes (1.0.0 → 2.0.0)

# Build and distribute (requires admin on Windows)
npm run build
npm run dist

# Push to remote
npm run release
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) - C++ implementation of Whisper
- [OpenAI Whisper](https://github.com/openai/whisper) - Original Whisper model
- Angular and Electron communities

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/pawn002/whisper-electron-app/issues)
- **Documentation**: [docs/](docs/) folder

## 🚦 Status

- ✅ Core transcription functionality
- ✅ Multi-platform support (Windows, macOS, Linux)
- ✅ Model management
- ✅ Transcription history
- 🚧 GPU acceleration (in progress)
- 🚧 Batch processing (planned)
- 🚧 Speaker diarization (planned)

---

Built with ❤️ for offline, privacy-focused speech transcription
