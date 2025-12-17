# Intel Hardware Optimization Benchmarks

This directory contains tools and results for benchmarking different Intel hardware optimizations for whisper.cpp.

## Overview

The benchmark system tests 4 different whisper.cpp variants:

1. **baseline** - CPU-optimized with `-march=native`
2. **avx512** - Intel AVX-512 SIMD optimizations
3. **sycl** - Intel GPU acceleration via SYCL (for Arc/Iris Xe GPUs)
4. **openvino** - Intel OpenVINO inference optimization

## Quick Start

### 1. Check System Capabilities

```bash
npm run system-info
```

This will display your hardware capabilities and show which optimization variants can be built.

### 2. Build Whisper Variants

Build all available variants:
```bash
npm run build:whisper-variants
```

Or build specific variants:
```bash
npm run build:whisper-baseline
npm run build:whisper-avx512      # Requires AVX-512 CPU
npm run build:whisper-sycl         # Requires Intel GPU + oneAPI
npm run build:whisper-openvino     # Requires OpenVINO toolkit
```

### 3. Run Benchmarks

```bash
npm run benchmark
```

This will:
- Test all built variants
- Use test models (tiny and base)
- Test with different thread counts (1, 4, 8)
- Run 3 iterations per configuration
- Generate JSON and CSV reports

## Prerequisites

### For All Variants
- Node.js
- CMake 3.14 or newer
- C/C++ compiler (MSVC on Windows, GCC/Clang on Linux/Mac)
- Git

### For AVX-512 Variant
- Intel CPU with AVX-512 support (Ice Lake, Skylake-X, or newer server CPUs)
- No additional software required

### For SYCL Variant (Intel GPU)
- Intel GPU (Arc, Iris Xe, or Data Center GPU)
- **Intel oneAPI Base Toolkit** (2024.0 or newer)
  - Download: https://www.intel.com/content/www/us/en/developer/tools/oneapi/base-toolkit-download.html
- Intel GPU drivers installed

#### oneAPI Setup (Windows)
After installing oneAPI, you need to source the environment:
```cmd
"C:\Program Files (x86)\Intel\oneAPI\setvars.bat"
```

Then run the build script in the same terminal session.

### For OpenVINO Variant
- **Intel OpenVINO Toolkit** (2023.0 or newer)
  - Download: https://www.intel.com/content/www/us/en/developer/tools/openvino-toolkit/download.html
- Works with Intel CPUs and integrated GPUs

#### OpenVINO Setup (Windows)
After installing OpenVINO:
```cmd
"C:\Program Files (x86)\Intel\openvino\setupvars.bat"
```

Then run the build script in the same terminal session.

## Understanding Benchmark Results

### Key Metrics

1. **Total Time (ms)** - Complete transcription time from start to finish
2. **Real-Time Factor** - Processing time divided by audio duration
   - `< 1.0` = Faster than real-time (e.g., 0.5x means 2x faster)
   - `= 1.0` = Real-time processing
   - `> 1.0` = Slower than real-time
3. **Words/Second** - Transcription throughput
4. **Latency to First Token** - Time until transcription begins (important for streaming)

### Speedup Interpretation

When comparing variants:
- **1.5x speedup** = 50% faster (2/3 of the time)
- **2.0x speedup** = 2x faster (half the time)
- **0.8x speedup** = 20% slower (negative speedup)

### Example Output

```
tiny @ 4 thread(s):
  Variant      │ Time (ms) │ RT Factor │ Words/Sec │ Speedup
  ─────────────┼───────────┼───────────┼───────────┼─────────
🏆baseline     │     2450 │     0.22 │     31.84 │ 1.00x
  avx512       │     1830 │     0.17 │     42.62 │ 1.34x
  sycl         │     1200 │     0.11 │     65.00 │ 2.04x
  openvino     │     1650 │     0.15 │     47.27 │ 1.48x
```

In this example:
- **SYCL (GPU)** is fastest with 2.04x speedup over baseline
- **AVX-512** provides 1.34x speedup
- **OpenVINO** provides 1.48x speedup
- All variants process faster than real-time (RT Factor < 1.0)

## Benchmark Configuration

Configuration file: `benchmarks/configs/benchmark-config.json`

You can customize:
- **Models to test**: `ggml-tiny.bin`, `ggml-base.bin`, `ggml-small.bin`, etc.
- **Thread counts**: `[1, 4, 8]`
- **Number of runs**: `warmupRuns` and `benchmarkRuns`
- **Audio file**: Default is JFK speech excerpt (11 seconds)

## Output Files

After running benchmarks, results are saved to `benchmarks/results/`:

- `benchmark-{timestamp}.json` - Detailed results with full timing data
- `benchmark-{timestamp}.csv` - Spreadsheet-compatible format
- Console output - Summary comparison table

## Troubleshooting

### "No variants can be built"
- Run `npm run system-info` to see what's missing
- Ensure CMake and compiler are installed
- Check that whisper.cpp repository exists

### "SYCL build fails"
- Ensure Intel oneAPI Base Toolkit is installed
- Run `setvars.bat` (Windows) or `setvars.sh` (Linux) before building
- Check that Intel GPU drivers are up to date
- Verify GPU is detected: `npm run system-info`

### "OpenVINO build fails"
- Verify OpenVINO is installed
- Run `setupvars.bat` (Windows) or `setupvars.sh` (Linux) before building
- Check installation path in system-info output

### "AVX-512 crashes"
- Verify your CPU supports AVX-512: `npm run system-info`
- Ice Lake (10th gen mobile), Skylake-X, or newer required
- Standard desktop CPUs (non-X) typically don't have AVX-512

### "Model not found" during benchmark
- Download models first: `npm run setup`
- Or manually download models from https://huggingface.co/ggerganov/whisper.cpp
- Place in `models/` directory

### High variability in results
- Close background applications
- Ensure system is not under heavy load
- Run multiple iterations (already configured: 3 runs)
- Check thermal throttling if results degrade over time

## Expected Performance

Typical speedups compared to baseline (varies by system):

| Variant | Expected Speedup | Best Use Case |
|---------|------------------|---------------|
| Baseline | 1.0x (reference) | Broad compatibility |
| AVX-512 | 1.3-1.8x | High-end Intel CPUs |
| SYCL | 1.5-3.0x | Systems with Intel Arc/Iris Xe GPU |
| OpenVINO | 1.2-2.0x | Intel CPUs with integrated graphics |

Note: Actual performance depends on:
- CPU/GPU model and generation
- Model size (tiny vs large)
- Thread count
- System memory bandwidth
- Power/thermal constraints

## Advanced Usage

### Building Specific Variant

```bash
node scripts/build-whisper-variants.js --variant=baseline
node scripts/build-whisper-variants.js --variant=avx512 --clean --verbose
```

### Clean Build

```bash
node scripts/build-whisper-variants.js --clean
```

### Running Benchmark Manually

```bash
# Windows
whisper-bins\baseline\whisper-cli.exe -m models\ggml-tiny.bin -f benchmarks\audio-samples\test-sample.wav -t 4

# Linux/Mac
./whisper-bins/baseline/whisper-cli -m models/ggml-tiny.bin -f benchmarks/audio-samples/test-sample.wav -t 4
```

## Directory Structure

```
benchmarks/
├── configs/
│   └── benchmark-config.json     # Benchmark configuration
├── audio-samples/
│   └── test-sample.wav            # Standard test audio (JFK speech)
├── results/
│   ├── benchmark-*.json           # Detailed benchmark results
│   └── benchmark-*.csv            # CSV format results
└── README.md                      # This file

whisper-bins/
├── baseline/
│   └── whisper-cli.exe            # Baseline binary
├── avx512/
│   └── whisper-cli.exe            # AVX-512 optimized binary
├── sycl/
│   └── whisper-cli.exe            # SYCL GPU binary
└── openvino/
    └── whisper-cli.exe            # OpenVINO optimized binary
```

## Contributing Results

If you run benchmarks on interesting hardware, consider sharing:
- CPU/GPU model
- Benchmark results (JSON or CSV)
- Any special configuration used

This helps understand performance characteristics across different Intel hardware.

## References

- [whisper.cpp GitHub](https://github.com/ggerganov/whisper.cpp)
- [Intel oneAPI Documentation](https://www.intel.com/content/www/us/en/developer/tools/oneapi/overview.html)
- [OpenVINO Documentation](https://docs.openvino.ai/)
- [GGML Library](https://github.com/ggml-org/ggml)

## License

Same as the parent project - MIT License
