# Whisper Models Guide

Comprehensive guide to understanding, choosing, and managing Whisper models for optimal transcription results.

## Table of Contents

- [Model Overview](#model-overview)
- [Model Comparison](#model-comparison)
- [Choosing the Right Model](#choosing-the-right-model)
- [Model Management](#model-management)
- [Performance Benchmarks](#performance-benchmarks)
- [Advanced Topics](#advanced-topics)

## Model Overview

Whisper models are neural networks trained by OpenAI on 680,000 hours of multilingual audio data. The models come in five sizes, each offering different trade-offs between speed, accuracy, and resource requirements.

### Available Models

| Model | Parameters | Size | Relative Speed | English-only | Multilingual |
|-------|-----------|------|----------------|--------------|--------------|
| tiny | 39 M | 39 MB | ~32x | ✅ | ✅ |
| base | 74 M | 74 MB | ~16x | ✅ | ✅ |
| small | 244 M | 244 MB | ~6x | ✅ | ✅ |
| medium | 769 M | 769 MB | ~2x | ✅ | ✅ |
| large | 1550 M | 1550 MB (1.55 GB) | 1x | ❌ | ✅ |

**Note**: Relative speed is compared to the large model. Actual speed depends on your hardware.

## Model Comparison

### Accuracy vs. Speed

```
tiny     ████░░░░░░ 40% accuracy  ██████████ fastest
base     ██████░░░░ 60% accuracy  ████████░░ very fast
small    ████████░░ 80% accuracy  ██████░░░░ moderate
medium   █████████░ 90% accuracy  ████░░░░░░ slow
large    ██████████ 95% accuracy  ██░░░░░░░░ slowest
```

### Detailed Comparison

#### tiny
**Best For:**
- Quick drafts and previews
- Low-priority transcriptions
- Testing and development
- Resource-constrained devices

**Characteristics:**
- ⚡ Fastest processing
- 💾 Smallest disk space (39 MB)
- 🧠 Lowest RAM usage (~200 MB)
- ❌ Lower accuracy, especially with accents
- ❌ May miss words in noisy audio

**Example Use Cases:**
- Quick meeting notes
- Personal voice memos
- Testing audio quality before using larger model

#### base
**Best For:**
- General-purpose transcription
- Everyday use
- Good balance of speed and accuracy

**Characteristics:**
- ⚡ Very fast processing
- 💾 Small disk space (74 MB)
- 🧠 Low RAM usage (~300 MB)
- ✅ Good accuracy for clear audio
- ✅ Handles most accents reasonably well

**Example Use Cases:**
- Podcast transcription
- Interview transcription
- YouTube video captions
- Voice notes and dictation

**Recommended**: This is the default model and best for most users.

#### small
**Best For:**
- Professional transcription
- Academic research
- Content creation

**Characteristics:**
- ⏱️ Moderate processing speed
- 💾 Medium disk space (244 MB)
- 🧠 Moderate RAM usage (~1 GB)
- ✅ High accuracy
- ✅ Better with accents and dialects
- ✅ More reliable with background noise

**Example Use Cases:**
- Academic lectures
- Professional interviews
- Documentary transcription
- Archival work

#### medium
**Best For:**
- High-quality transcription
- Multi-speaker audio
- Difficult audio conditions

**Characteristics:**
- 🐌 Slower processing
- 💾 Large disk space (769 MB)
- 🧠 High RAM usage (~2-3 GB)
- ✅ Very high accuracy
- ✅ Excellent with accents
- ✅ Good multi-speaker separation

**Example Use Cases:**
- Legal depositions
- Medical transcription
- Film/TV subtitle creation
- Multi-speaker meetings

#### large
**Best For:**
- Maximum accuracy requirements
- Complex audio scenarios
- Professional subtitle creation

**Characteristics:**
- 🐌 Slowest processing
- 💾 Very large disk space (1550 MB / 1.55 GB)
- 🧠 Very high RAM usage (~4-8 GB)
- ✅ Best possible accuracy
- ✅ Excellent language support
- ✅ Best for technical/specialized vocabulary

**Example Use Cases:**
- Professional film subtitles
- Broadcast transcription
- Historical audio restoration
- Critical archival work

## Choosing the Right Model

### Decision Tree

```
Start here
│
├─ Need it fast? → tiny or base
│  ├─ Just a quick draft? → tiny
│  └─ Need decent quality? → base ⭐
│
├─ Professional use? → small, medium, or large
│  ├─ Clear audio, single speaker? → small
│  ├─ Multiple speakers or accents? → medium
│  └─ Critical accuracy needed? → large
│
└─ Not sure? → base ⭐
```

### By Use Case

| Use Case | Recommended Model | Alternative |
|----------|------------------|-------------|
| Personal voice memos | base | tiny |
| Meeting notes | base | small |
| Podcast transcription | base | small |
| YouTube captions | base | small |
| Interview transcription | small | medium |
| Academic lectures | small | medium |
| Legal/medical | medium | large |
| Film/TV subtitles | large | medium |
| Historical archives | large | - |

### By Hardware

| Your System | Recommended Model | Maximum Model |
|-------------|------------------|---------------|
| 4 GB RAM, dual-core | tiny | base |
| 8 GB RAM, quad-core | base | small |
| 16 GB RAM, modern CPU | small | medium |
| 32+ GB RAM, high-end CPU | medium | large |

### By Audio Quality

| Audio Condition | Recommended Model |
|----------------|------------------|
| Clear studio recording | base |
| Phone call recording | small |
| Noisy environment | medium |
| Multiple speakers | medium |
| Heavy accent | small or medium |
| Very old recording | medium or large |

## Model Management

### Downloading Models

#### From the Application

1. Open Whisper Transcription app
2. Navigate to **Models** tab
3. Click **"Download"** button next to desired model
4. Wait for download to complete
5. Model is immediately available

#### Manual Download

If automatic download fails:

1. Visit: https://huggingface.co/ggerganov/whisper.cpp/tree/main
2. Download the desired `.bin` file:
   - `ggml-tiny.bin`
   - `ggml-base.bin`
   - `ggml-small.bin`
   - `ggml-medium.bin`
   - `ggml-large-v3.bin` (rename to `ggml-large.bin`)
3. Place in the `models/` directory of the project
4. Restart the application

### Storage Locations

**Development**:
```
whisper-electron-app/
└── models/
    ├── ggml-tiny.bin
    ├── ggml-base.bin
    ├── ggml-small.bin
    ├── ggml-medium.bin
    └── ggml-large.bin
```

**Production** (packaged app):
- **Windows**: `<app-directory>\resources\models\`
- **macOS**: `Whisper Transcription.app/Contents/Resources/models/`
- **Linux**: `<app-directory>/resources/models/`

### Deleting Models

To free up disk space:

1. Navigate to the `models/` directory
2. Delete the `.bin` file for the model you want to remove
3. Restart the application

**Note**: The app requires at least one model to function. Keep `base` if unsure.

## Performance Benchmarks

### Processing Time

Approximate times for 1 hour of audio on different hardware:

**Mid-range Desktop (Intel i5, 16GB RAM)**
- tiny: 5-8 minutes
- base: 10-15 minutes
- small: 25-35 minutes
- medium: 50-70 minutes
- large: 90-120 minutes

**High-end Desktop (Intel i9, 32GB RAM)**
- tiny: 3-5 minutes
- base: 6-10 minutes
- small: 15-25 minutes
- medium: 30-45 minutes
- large: 60-80 minutes

**Laptop (Intel i7, 16GB RAM)**
- tiny: 8-12 minutes
- base: 15-25 minutes
- small: 40-60 minutes
- medium: 80-120 minutes
- large: 150-200 minutes

**Note**: Times vary based on audio complexity, language, and system load.

### Memory Usage

Typical RAM usage during transcription:

- tiny: ~200-400 MB
- base: ~300-600 MB
- small: ~800-1500 MB
- medium: ~2-4 GB
- large: ~4-8 GB

**Recommendation**: Ensure you have at least 2x the model's RAM requirement available.

### Disk Space

Total disk space with all models:
- All models: ~2.68 GB (2682 MB)
- Recommended (tiny + base + small): ~357 MB
- Minimum (base only): 74 MB

## Advanced Topics

### Model Versions

Whisper has multiple versions. This app uses:
- **Whisper v3** for large model (latest)
- **Whisper v2** for other models

The version is handled automatically - you don't need to choose.

### English-Only vs. Multilingual

- **tiny, base, small, medium**: Available in English-only and multilingual versions
- **large**: Multilingual only

This app uses multilingual versions by default, which work well for all languages including English.

### Quantization

All models in this app use **int8 quantization** (ggml format):
- Reduced file size
- Faster processing
- Minimal accuracy loss (~1-2%)

### GPU Acceleration

**Vulkan iGPU (Windows)**: The app automatically uses the Vulkan backend on supported Intel iGPUs (e.g. Iris Xe), delivering 1.7–4x speedups. No configuration required — the app selects the best available backend at startup.

**Planned**:
- CUDA support (NVIDIA)
- Metal support (Apple Silicon)

### Custom Models

Advanced users can use custom or fine-tuned models:

1. Convert model to ggml format using whisper.cpp tools
2. Place `.bin` file in `models/` directory
3. Restart application
4. Model appears in model selector

## Frequently Asked Questions

### Can I use multiple models simultaneously?

No, only one transcription runs at a time. However, you can download multiple models and switch between them.

### Do models work offline?

Yes! Once downloaded, all models work 100% offline.

### Which languages are supported?

All models support 99 languages including:
- English, Spanish, French, German, Italian, Portuguese
- Chinese, Japanese, Korean, Arabic, Russian
- And many more

See Whisper documentation for the complete list.

### Can I delete models I don't use?

Yes, delete the `.bin` files from the `models/` directory to free space.

### Why is large model so slow?

The large model has 1.55 billion parameters and requires significant computation. It's designed for maximum accuracy, not speed.

### Should I always use the largest model?

No! For most purposes, `base` or `small` provide excellent results with much faster processing.

## Further Reading

- [OpenAI Whisper](https://github.com/openai/whisper) - Original project
- [OpenAI Whisper Paper](https://arxiv.org/abs/2212.04356) - Research paper
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) - C++ implementation
- [Model Downloads](https://huggingface.co/ggerganov/whisper.cpp) - Hugging Face
