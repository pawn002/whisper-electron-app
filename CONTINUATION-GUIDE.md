# Continuation Guide

**Last Updated**: 2026-04-07  
**Branch**: `claude/integrate-design-tokens-UqVdV`  
**Status**: All work complete. Ready for PR review.

---

## ✅ Everything Completed This Branch

### 1. Design System: Angular Material → Candor

Replaced `@angular/material` entirely with `@candor-design/tokens` and a hand-rolled
component layer that follows Candor's actual component source (verified against GitHub
and Storybook at `main--69c25e2492ad056c24329876.chromatic.com`).

- CSS custom properties from `tokens/candor-tokens.css` used throughout
- Components implemented: button (6 variants + accent), card, tabs, badge, chip,
  input (with error/hint/label), alert, toast, progress (bar + spinner), navigation
- `@angular/material` and `@google-fonts` CDN fully removed
- **NEVER use `::ng-deep`** — all styling via host selectors, CSS variables, or `ViewEncapsulation.None`

### 2. Typography & Icons

- **Google Fonts CDN removed** → replaced with Fontsource (bundled):
  - `@fontsource-variable/roboto-flex` (UI sans-serif)
  - `@fontsource/roboto-mono` (monospace / timestamps)
  - `@fontsource/noto-serif` (transcript body, empty states, alert text)
- **Material Icons removed** → replaced with Phosphor Icons (light weight, `ph-*` classes)
- SVG logo mark added to app header with correct baseline alignment
- App icon: waveform + nib SVG (`build/icon.png`)
- Favicon: inline SVG in `index.html`

### 3. Angular v19 → v21 Upgrade

- All `@angular/*` packages → `^21.0.0`
- TypeScript `~5.5.0` → `~5.9.0` (Angular 21 requirement)
- `moduleResolution: "node"` → `"bundler"` in `frontend/tsconfig.json`
- Templates migrated from `*ngIf`/`*ngFor` → Angular block control flow (`@if`, `@for`)

### 4. whisper.cpp v1.8.4 + Thread Count

- Version updated from v1.8.2 → v1.8.4 in `scripts/build-whisper.js`
- Binary renamed `main.exe` → `whisper-cli.exe` (upstream rename in v1.7+)
- Default threads bumped **4 → 8** in four places (benchmarked ~100ms improvement):
  - `frontend/src/components/transcription/transcription.component.ts:162`
  - `electron/main.ts:270`
  - `electron/services/transcription.service.ts:62`
  - `electron/services/whisper.service.ts:328`
- whisper JSON output parsing fixed (segments use `offsets.from/to` in ms, not `start/end` in s)

### 5. Vulkan iGPU Backend — Working ✅

Hardware: Intel i7-1260P + Intel Iris Xe, Vulkan SDK 1.4.335.0

| Model | Config    | Baseline | Vulkan  | Speedup  |
|-------|-----------|----------|---------|----------|
| tiny  | 1 thread  | 1786ms   | 766ms   | **2.33x** |
| tiny  | 4 threads | 897ms    | 708ms   | **1.27x** |
| tiny  | 8 threads | 881ms    | 703ms   | **1.25x** |
| base  | 1 thread  | 4098ms   | 1023ms  | **4.01x** |
| base  | 4 threads | 1812ms   | 1037ms  | **1.75x** |
| base  | 8 threads | 1712ms   | 998ms   | **1.71x** |

**Best overall**: Vulkan, tiny, 8 threads — **703ms, 0.06x RT, 110.9 words/sec**

**Wired into the app**: `electron/services/whisper.service.ts` checks for
`whisper.cpp/build-vulkan/bin/whisper-cli.exe` at startup and prefers it over
the baseline binary. Falls back to `build-baseline` automatically if Vulkan is absent.

**Packaged**: `package.json` `extraResources` includes all Vulkan DLLs:
`whisper-cli.exe`, `whisper.dll`, `ggml.dll`, `ggml-base.dll`, `ggml-cpu.dll`, `ggml-vulkan.dll`

### 6. SYCL — Ruled Out ❌

Intel oneAPI SYCL variant was built and tested. Even after updating the Intel Iris Xe
driver (from 2022 vintage to 2023+), performance was unacceptably poor. SYCL is not
included in the app or benchmark config. Build scripts remain in
`scripts/build-whisper-variants.js` for reference but are not part of the release.

### 7. Test Suite — 70 Tests

Introduced Jest (replacing Karma, which requires a browser). Four spec files:

| File | Tests | Coverage focus |
|------|-------|----------------|
| `toast.service.spec.ts` | 4 | show/dismiss/auto-dismiss |
| `transcription.component.spec.ts` | 36 | formatters, IPC callbacks, state transitions |
| `history.component.spec.ts` | 18 | formatters, auto-refresh IPC callbacks |
| `model-selector.component.spec.ts` | 12 | variant mappers, download lifecycle |

IPC callback tests (`onTranscriptionCompleted`, `onTranscriptionError`,
`onTranscriptionProgress`) are the highest-value addition — they cover closures
registered in `ngOnInit` that previously had zero coverage.

Run with: `cd frontend && npm test`

---

## 📁 Build Artifacts (Windows)

```
whisper-electron-app/
├── whisper.cpp/
│   ├── build-baseline/bin/Release/whisper-cli.exe   ✅ CPU/AVX2 fallback
│   └── build-vulkan/bin/
│       ├── whisper-cli.exe                           ✅ Vulkan iGPU (preferred)
│       ├── ggml-vulkan.dll
│       ├── ggml-cpu.dll
│       ├── ggml-base.dll
│       ├── ggml.dll
│       └── whisper.dll
├── models/
│   ├── ggml-tiny.bin    (39 MB)
│   └── ggml-base.bin    (74 MB)
├── ffmpeg/              (bundled FFmpeg)
└── build/icon.png       (app icon)
```

---

## 🚀 Next Step: PR

```bash
# Verify tests still pass
cd frontend && npm test

# Package (requires admin terminal on Windows)
npm run dist:win

# Then open PR: claude/integrate-design-tokens-UqVdV → main
```

---

## 🔧 Available Commands

```bash
# Development
npm run dev              # Start app (frontend + electron)
npm run build            # Build all

# Testing
cd frontend && npm test  # Jest (70 tests)

# Building whisper variants (Windows, requires Intel oneAPI / Vulkan SDK)
node scripts/build-whisper-variants.js --variant=vulkan
node scripts/build-whisper-variants.js --variant=baseline

# Benchmarks
node scripts/benchmark-variants.js

# Release
npm run version:patch    # Bump version
npm run dist:win         # Package for Windows (requires admin terminal)
```
