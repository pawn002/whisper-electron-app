# Continuation Guide

**Last Updated**: 2026-04-06  
**Branch**: `claude/integrate-design-tokens-UqVdV`  
**Status**: Vulkan iGPU working. SYCL pending driver update (install in progress — may need reboot).

---

## 📋 Current Status

### ✅ Completed This Session

#### 1. Angular v19 → v21 Upgrade
- Updated all `@angular/*` packages to `^21.0.0`
- Updated TypeScript from `~5.5.0` → `~5.9.0` (Angular 21 requirement)
- Fixed `moduleResolution: "node"` → `"bundler"` in `frontend/tsconfig.json`
  - Required for Angular 21's subpath package exports (`@angular/common/http`, etc.)
- Ran `ng update --migrate-only` schematics for v20 and v21
- Templates migrated from `*ngIf`/`*ngFor` → Angular block control flow (`@if`, `@for`)

#### 2. whisper.cpp v1.8.2 → v1.8.4
- Updated version pin in `scripts/build-whisper.js`
- Fixed binary name: `main.exe` → `whisper-cli.exe` (renamed in v1.7+)
- Key upstream change in v1.8.3: PR #3492 — `whisper_backend_init_gpu()` now recognizes
  `GGML_BACKEND_DEVICE_TYPE_IGPU`, enabling iGPU acceleration (Intel Iris Xe, AMD iGPUs, etc.)

#### 3. Default Thread Count: 4 → 8
Changed in four places based on benchmark data (~100ms improvement):
- `frontend/src/components/transcription/transcription.component.ts:162`
- `electron/main.ts:270`
- `electron/services/transcription.service.ts:62`
- `electron/services/whisper.service.ts:328`

#### 4. SYCL Build Infrastructure Fixed
The SYCL variant (Intel GPU via oneAPI) now builds successfully. Key fixes:
- Use **Ninja generator** + `dpcpp-cl.exe` (MSVC-compatible DPC++ frontend)
  - VS generator ignores `CMAKE_C/CXX_COMPILER` overrides → must use Ninja
- Manually inject MSVC + Windows SDK env vars (setvars.bat fails in Node.js subprocess)
- Use `execFileSync` with array args to avoid shell-splitting paths with spaces/parens

**SYCL runtime status**: Binary builds and runs but **crashes with access violation (0xC0000005)**
on GPU initialization. Root cause: Intel Iris Xe driver `31.0.101.4032` (2022) is too old
for oneAPI 2025.1's Level Zero runtime. **Driver update downloading** — need reboot to install.

#### 5. Vulkan iGPU Backend — Working Now ✅
Added `vulkan` variant to the build system:
- `scripts/system-info.js`: detects Vulkan SDK via `VULKAN_SDK` env or PATH
- `scripts/build-whisper-variants.js`: Ninja + cl.exe (VS generator breaks `vulkan-shaders-gen`)
- `benchmarks/configs/benchmark-config.json`: added `vulkan` to variants list

**Vulkan SDK**: 1.4.335.0 at `C:\VulkanSDK\1.4.335.0` — detected automatically.

---

## 📊 Current Benchmark Results

Hardware: Intel i7-1260P, 16 cores, Intel Iris Xe Graphics  
Audio: 11 seconds (JFK speech excerpt, 78 words)

### Vulkan vs Baseline

| Model | Config | Baseline | Vulkan | Speedup |
|-------|--------|----------|--------|---------|
| tiny  | 1 thread  | 1786ms | 766ms  | **2.33x** |
| tiny  | 4 threads | 897ms  | 708ms  | **1.27x** |
| tiny  | 8 threads | 881ms  | 703ms  | **1.25x** |
| base  | 1 thread  | 4098ms | 1023ms | **4.01x** |
| base  | 4 threads | 1812ms | 1037ms | **1.75x** |
| base  | 8 threads | 1712ms | 998ms  | **1.71x** |

**Best overall**: Vulkan, tiny model, 8 threads — **703ms, 0.06x RT, 110.9 words/sec**

The big gains are at low thread counts (iGPU handles computation that would otherwise
serialize on a single CPU core). At 8 threads the CPU is already well-utilized; Vulkan
still wins by ~1.7x on base model.

### SYCL Results
All runs failed with exit code `3221225477` (access violation on GPU init).
Will retest after driver update.

---

## 🚀 After Reboot

### Step 1: Verify driver updated
```bash
node scripts/system-info.js
```
Check that the Intel GPU is still detected. The Vulkan variant should still work.

### Step 2: Rebuild SYCL variant (clean)
```bash
node scripts/build-whisper-variants.js --variant=sycl --clean
```

### Step 3: Run full benchmark
```bash
node scripts/benchmark-variants.js
```

This will compare baseline vs vulkan vs sycl (if SYCL works after driver update).

### Step 4: Wire Vulkan into the app (optional next task)
Currently the app uses `whisper.cpp/build-baseline/` binary. The Vulkan binary is in
`whisper.cpp/build-vulkan/bin/whisper-cli.exe` with DLLs alongside it.

To use it, `electron/services/whisper.service.ts` needs to:
1. Detect the Vulkan variant is available
2. Prefer it over baseline when running on a system with a supported GPU
3. Bundle the DLLs with the binary in the packaged app

---

## 📁 Build Artifacts

```
whisper-electron-app/
├── whisper.cpp/
│   ├── build-baseline/bin/whisper-cli.exe   ✅ Working (CPU/AVX2)
│   ├── build-sycl/bin/whisper-cli.exe       ❌ Crashes (old driver)
│   └── build-vulkan/bin/
│       ├── whisper-cli.exe                  ✅ Working (Vulkan iGPU)
│       ├── ggml-vulkan.dll
│       ├── ggml-cpu.dll
│       ├── ggml.dll
│       └── whisper.dll
│
├── whisper-bins/
│   ├── baseline/whisper-cli.exe             (copy of build-baseline binary)
│   ├── sycl/whisper-cli.exe                 (copy of build-sycl binary)
│   ├── vulkan/whisper-cli.exe               (copy of build-vulkan binary)
│   └── build-report.json
│
├── models/
│   ├── ggml-tiny.bin    (39 MB)
│   └── ggml-base.bin    (74 MB)
│
└── benchmarks/
    ├── configs/benchmark-config.json
    ├── audio-samples/test-sample.wav        (11 sec JFK speech)
    └── results/                             (benchmark JSON/CSV reports)
```

---

## 🔧 Available Commands

```bash
# Hardware detection
node scripts/system-info.js

# Build variants
node scripts/build-whisper-variants.js                    # All buildable
node scripts/build-whisper-variants.js --variant=vulkan   # Just Vulkan
node scripts/build-whisper-variants.js --variant=sycl     # Just SYCL
node scripts/build-whisper-variants.js --variant=baseline # Just baseline
node scripts/build-whisper-variants.js --clean            # Clean before build

# Benchmarks
node scripts/benchmark-variants.js

# App development
npm run dev              # Start app (frontend + electron)
npm run build            # Build all

# Release
npm run version:patch    # Bump version
npm run dist:win         # Package for Windows (requires admin terminal)
```

---

## 🐛 Known Issues

### SYCL: Access violation on GPU init
- **Cause**: Intel driver `31.0.101.4032` (2022) lacks Level Zero support for oneAPI 2025.1
- **Fix**: Update to any Intel Iris Xe driver from 2023+ (31.0.101.5xxx range)
- **Driver**: Intel Arc & Iris Xe Graphics — Windows — download from intel.com
- **Status**: Download in progress at time of writing, needs reboot to install

### SYCL DLL dependencies
After the driver update, if SYCL still fails to run:
```bash
# Copy Intel runtime DLLs into the build bin directory
# DLLs live at: C:\Program Files (x86)\Intel\oneAPI\compiler\latest\bin\
# Needed: sycl8.dll, libmmd.dll, svml_dispmd.dll, dnnl.dll,
#         mkl_sycl_blas.5.dll, irc_msg.dll, mkl_core.2.dll,
#         mkl_tbb_thread.2.dll, tbb12.dll, ur_win_proxy_loader.dll
```

### OpenVINO: Not installed
- Pip version of OpenVINO doesn't include CMake integration
- Would need the full OpenVINO Toolkit SDK to build this variant
- Low priority — Vulkan already provides substantial speedup without it

---

## 📝 Branch Summary

Branch `claude/integrate-design-tokens-UqVdV` contains (newest first):

| Commit | Description |
|--------|-------------|
| `5296318` | perf: add Vulkan iGPU backend — 1.7–4x speedup on Intel Iris Xe |
| `31dab39` | perf: bump default threads 4→8, fix SYCL/Vulkan build scripts |
| `5ee14da` | chore: update whisper.cpp to v1.8.4 |
| `98519bd` | chore: upgrade Angular from v19 to v21 |
| `f83245b` | test: add IPC callback tests for ngOnInit event registrations |
| `79992b7` | Expand test suite to 57 tests across 4 files |
| `5d6bc19` | Add initial test suite (28 tests) |
| `2d1c331` | Replace Angular Material with Candor design system |
| `45ea758` | Integrate @candor-design/tokens design system |

---

## 🎯 Remaining Work

- [ ] **SYCL**: Retest after Intel driver update + reboot
- [ ] **App integration**: Wire Vulkan binary into `whisper.service.ts` as preferred backend
- [ ] **Packaging**: Include Vulkan DLLs in electron-builder output for production
- [ ] **PR**: Merge `claude/integrate-design-tokens-UqVdV` → `main` when ready
