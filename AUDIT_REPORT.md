# Documentation Audit Report

**Date**: 2026-04-07  
**Branch**: `claude/integrate-design-tokens-UqVdV`  
**Auditor**: Claude Code

---

## Files Reviewed

| File | Status |
|------|--------|
| `README.md` | Updated |
| `CLAUDE.md` | Updated |
| `docs/README.md` | No changes needed |
| `docs/installation.md` | Updated |
| `docs/usage.md` | Updated |
| `docs/models.md` | Updated |
| `docs/troubleshooting.md` | Updated |
| `docs/architecture.md` | Updated |
| `docs/development.md` | Updated |

---

## Changes Made

### README.md

| # | Finding | Fix |
|---|---------|-----|
| 1 | "Modern UI: Material Design with Angular" — Angular Material was removed | Updated to "Candor design system with Phosphor Icons and Fontsource typography" |
| 2 | Project structure comment said "Angular frontend (Material Design)" | Updated to "Angular frontend (Candor design system)" |
| 3 | Status section showed "🚧 GPU acceleration (in progress)" | Updated to "✅ GPU acceleration (Vulkan iGPU — 1.7–4x speedup on Intel Iris Xe)" |

### docs/architecture.md

| # | Finding | Fix |
|---|---------|-----|
| 1 | Technology stack listed "Angular 17" | Updated to Angular 21 |
| 2 | Technology stack listed "Angular Material" | Updated to Candor design system + Phosphor Icons + Fontsource |
| 3 | Technology stack listed "Electron 28" | Updated to Electron 35 |
| 4 | Production structure showed single `whisper-cli.exe` at old flat path | Updated to show Vulkan backend (`build-vulkan/bin/`) with DLLs + baseline fallback (`build/bin/Release/`) |
| 5 | `extraResources` example showed old single-binary format | Updated to reflect current dual-backend electron-builder config |
| 6 | Performance section said "No GPU acceleration yet (planned)" | Updated to "Vulkan iGPU backend: 1.7–4x speedup on Intel Iris Xe (auto-selected when available)" |
| 7 | Planned improvements listed CUDA/Metal as the only GPU items | Added "✅ Vulkan iGPU — shipped" before the CUDA/Metal planned items |
| 8 | "Why Angular?" listed "Material Design components" as rationale | Replaced with "Block control flow (`@if`, `@for`) for clean templates" |

### docs/development.md

| # | Finding | Fix |
|---|---------|-----|
| 1 | Technology stack listed "Angular 17" and "Angular Material" | Updated to Angular 21 + Candor design system + Phosphor Icons + Fontsource |
| 2 | Technology stack listed "Electron 28" | Updated to Electron 35 |
| 3 | Key patterns listed "Material Design components" | Updated to "Candor design system (tokens-based CSS, no `::ng-deep`)" |
| 4 | Testing section documented `npm run test:watch` and `npm run test:coverage` — neither exists in `frontend/package.json` | Replaced with accurate `npm test` (Jest) documentation; added test count (70) and coverage description |
| 5 | Testing section implied Karma/Angular testing framework | Clarified this is Jest with jest-preset-angular |
| 6 | Code style listed "NestJS Best Practices" link — NestJS was removed in Dec 2025 | Removed |
| 7 | Angular docs link pointed to deprecated `angular.io` | Updated to `angular.dev` |
| 8 | Resources section missing Candor design system reference | Added link |

### docs/usage.md

| # | Finding | Fix |
|---|---------|-----|
| 1 | Advanced features: "GPU Acceleration — In Progress" | Updated to describe working Vulkan iGPU support (auto-selected, no config needed) |

### docs/models.md

| # | Finding | Fix |
|---|---------|-----|
| 1 | GPU Acceleration section said "Status: In development" with only CUDA/Metal listed | Updated to describe working Vulkan iGPU support; kept CUDA/Metal as "Planned" |

### docs/installation.md

| # | Finding | Fix |
|---|---------|-----|
| 1 | Verification step showed `ls whisper.cpp/whisper-cli*` — binary is no longer at that flat path | Updated to `dir whisper.cpp\build-baseline\bin\Release\whisper-cli.exe` |

### docs/troubleshooting.md

| # | Finding | Fix |
|---|---------|-----|
| 1 | "Whisper binary not found" check showed `dir whisper.cpp\whisper-cli.exe` — old flat path | Updated to show both Vulkan (`build-vulkan/bin/`) and baseline (`build-baseline/bin/Release/`) paths with explanation of fallback logic |
| 2 | "Check permissions" step referenced `chmod +x whisper.cpp/whisper-cli` — old path | Updated to `whisper.cpp/build-baseline/bin/whisper-cli` |

### CLAUDE.md

| # | Finding | Fix |
|---|---------|-----|
| 1 | Testing command comment said "Angular tests" | Updated to "Jest — 70 tests across 4 spec files (no browser required)" |

---

## No Changes Required

- `docs/README.md` — Index file is accurate; all links valid.
- IPC channel table in `docs/architecture.md` — Matches `electron/main.ts` and `electron/preload.ts`.
- Service method signatures — Match `electron/services/whisper.service.ts` and `transcription.service.ts`.
- Supported audio formats (MP3, WAV, OGG, M4A, FLAC, AAC, WEBM) — Match WhisperService implementation.
- Model names and sizes — Unchanged.
- npm script commands — All verified against root and frontend `package.json`.
- Windows admin privilege warnings — Still accurate for `dist` commands.
- User data directory paths (AppData, Library, .config) — Still accurate.

---

## Recommendations (Not Fixed — Low Priority)

1. **Binary path verification**: Consider updating `npm run setup` output to print detected binary paths on success, confirming which backend was selected.
2. **Stale inline code snippet**: `docs/architecture.md` IPC handler example shows `threads: options.threads || 4` — default is now 8. Illustrative only, low impact.
3. **Model benchmark times**: Estimated processing times in `docs/models.md` predate the Vulkan backend. On Windows with Intel Iris Xe, real times are 1.7–4x faster. Worth a footnote in a future update.
