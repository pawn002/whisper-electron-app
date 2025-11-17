# Usage Guide

Complete guide to using the Whisper Electron App for audio transcription.

## Table of Contents

- [Quick Start](#quick-start)
- [Transcription Workflow](#transcription-workflow)
- [Model Management](#model-management)
- [History Management](#history-management)
- [Export Options](#export-options)
- [Tips and Best Practices](#tips-and-best-practices)

## Quick Start

### Launching the Application

**Development Mode** (for contributors):
```bash
npm run dev
```

**Production Mode** (end users):
- **Windows**: Double-click `Whisper Transcription.exe`
- **macOS**: Open `Whisper Transcription.app`
- **Linux**: Run `./whisper-transcription`

The application automatically starts the backend server - no manual setup required.

## Transcription Workflow

### Step 1: Select Audio File

1. Navigate to the **Transcription** tab (default)
2. Click **"Select Audio File"** button
3. Browse and select your audio file

**Supported Formats:**
- MP3
- WAV
- OGG
- M4A
- FLAC
- AAC
- WEBM

**Note**: Non-WAV files are automatically converted to WAV using the bundled FFmpeg.

### Step 2: Configure Settings

After selecting a file, configure these options:

#### Model Selection

Choose the Whisper model based on your needs:

| Model  | When to Use |
|--------|-------------|
| **tiny** | Quick drafts, low-quality audio, speed priority |
| **base** | General use, good balance (recommended) |
| **small** | Better accuracy, longer processing time |
| **medium** | High accuracy needs, professional transcription |
| **large** | Best quality, subtitles, archival transcription |

**Default**: base

#### Language Selection

- **Auto Detect** (recommended) - Automatically detects the spoken language
- **Specific Language** - Choose if you know the audio language:
  - English
  - Spanish
  - French
  - German
  - Many more supported via auto-detect

**Tip**: Auto-detect works well for most cases. Select a specific language only if auto-detect fails.

### Step 3: Start Transcription

1. Click **"Start Transcription"** button
2. Progress spinner indicates processing is active
3. Wait for completion

**Processing Time Factors:**
- **Audio length** - Longer files take more time
- **Model size** - Larger models are slower but more accurate
- **Hardware** - CPU speed and available RAM affect performance

**Estimated Times** (for 1 hour of audio on mid-range PC):
- tiny: ~5-10 minutes
- base: ~10-20 minutes
- small: ~20-40 minutes
- medium: ~40-80 minutes
- large: ~80-120 minutes

### Step 4: Review Results

Once complete:

1. Transcript appears in the text editor
2. Review for accuracy
3. Edit directly in the editor if needed
4. All text is fully editable

### Step 5: Save or Copy

#### Copy to Clipboard

1. Click **"Copy"** button
2. Transcript is copied to clipboard
3. Paste anywhere you need it

#### Export to File

1. Click **"Export"** button
2. Choose file format:
   - **TXT** - Plain text, maximum compatibility
   - **JSON** - Structured data with metadata
   - **SRT** - SubRip subtitle format (includes timestamps)
   - **VTT** - WebVTT subtitle format (includes timestamps)
3. Select save location
4. Click Save

**Format Recommendations:**
- **TXT** - For general use, documents, notes
- **JSON** - For programmatic access, data analysis
- **SRT/VTT** - For video subtitles

## Model Management

### Viewing Available Models

1. Navigate to the **Models** tab
2. See all Whisper models with:
   - Model name and size
   - Download status (green checkmark = installed)
   - Download button for uninstalled models

### Downloading Models

1. Click **"Download"** button next to the desired model
2. Progress bar shows download status
3. Model is immediately available after download

**Initial Models**: The setup process downloads `tiny` and `base` models by default.

**Storage Locations:**
- Models are stored in the `models/` directory
- Downloaded from Hugging Face

**Disk Space Requirements:**
- tiny: 39 MB
- base: 74 MB
- small: 244 MB
- medium: 769 MB
- large: 1.5 GB

**Tip**: Download models while connected to Wi-Fi to avoid using mobile data.

### System Information

View platform and app version in the footer (visible from any tab).

## History Management

### Viewing Past Transcriptions

1. Navigate to the **History** tab
2. Browse all completed transcriptions
3. View metadata for each:
   - Original filename
   - Model used
   - Language detected
   - Date and time
   - Processing duration
   - Audio file length

### Copying from History

1. Find the transcription you want
2. Click **"Copy Transcript"** button
3. Toast notification confirms successful copy
4. Paste the transcript wherever needed

**Use Cases:**
- Re-use previous transcriptions
- Compare results from different models
- Access transcripts from deleted audio files

## Export Options

### Text (.txt)

**Best for:**
- General purpose use
- Copy/paste into documents
- Maximum compatibility

**Contains:**
- Plain text transcript
- No metadata or formatting

### JSON (.json)

**Best for:**
- Programmatic access
- Data analysis
- Archival with metadata

**Contains:**
```json
{
  "text": "Transcript text here...",
  "metadata": {
    "model": "base",
    "language": "en",
    "duration": "123.45"
  }
}
```

### SRT (.srt)

**Best for:**
- Video subtitles
- Most video players
- YouTube, Vimeo uploads

**Format:**
```
1
00:00:00,000 --> 00:00:05,840
First subtitle text here

2
00:00:05,840 --> 00:00:10,120
Second subtitle text here
```

**Requirements**: Transcription must include timestamps (Whisper includes them by default)

### VTT (.vtt)

**Best for:**
- Web video players
- HTML5 video
- Modern subtitle format

**Format:**
```
WEBVTT

00:00:00.000 --> 00:00:05.840
First subtitle text here

00:00:05.840 --> 00:00:10.120
Second subtitle text here
```

## Tips and Best Practices

### For Best Transcription Quality

1. **Audio Quality Matters**
   - Use high-quality recordings when possible
   - Minimize background noise
   - Ensure clear speech

2. **Choose the Right Model**
   - Start with `base` for most uses
   - Use `small` or `medium` for professional work
   - Use `tiny` only for quick drafts

3. **Language Selection**
   - Use auto-detect unless it fails
   - Specify language for heavy accents or dialects

### For Faster Processing

1. **Model Selection**
   - Use `tiny` for quick drafts
   - Use `base` for everyday work

2. **Hardware Optimization**
   - Close unnecessary applications
   - Ensure sufficient free RAM
   - Larger models benefit from more CPU cores

### For Subtitle Creation

1. **Use SRT or VTT format** for export
2. **Review timestamps** - Whisper includes them automatically
3. **Edit if needed** - Adjust timing in subtitle editing software

### File Organization

1. **Use descriptive filenames** when saving
2. **Create folders** for different projects
3. **Check History tab** before re-transcribing the same file

### Troubleshooting

If you encounter issues during use, see the [Troubleshooting Guide](troubleshooting.md).

## Advanced Features

### Keyboard Shortcuts

Currently, the app uses standard system shortcuts:
- `Ctrl+C` / `Cmd+C` - Copy selected text
- `Ctrl+V` / `Cmd+V` - Paste text
- `Ctrl+A` / `Cmd+A` - Select all text

### Batch Processing

**Not yet available** - See [project status](../README.md#-status) for planned features.

### GPU Acceleration

**In Progress** - GPU support for faster transcription is being developed.
