#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

class WhisperBenchmark {
  constructor(configPath) {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }

    this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    this.results = [];
    this.systemInfo = this.gatherSystemInfo();
    this.projectRoot = path.join(__dirname, '..');
  }

  gatherSystemInfo() {
    return {
      timestamp: new Date().toISOString(),
      cpu: {
        model: os.cpus()[0].model,
        cores: os.cpus().length,
        architecture: os.arch()
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        totalGB: (os.totalmem() / (1024 ** 3)).toFixed(2),
        freeGB: (os.freemem() / (1024 ** 3)).toFixed(2)
      },
      platform: {
        os: process.platform,
        version: os.release()
      }
    };
  }

  async runBenchmark() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('     Intel Hardware Optimization Benchmark for Whisper     ');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('System Info:');
    console.log(`  CPU: ${this.systemInfo.cpu.model}`);
    console.log(`  Cores: ${this.systemInfo.cpu.cores}`);
    console.log(`  Memory: ${this.systemInfo.memory.totalGB} GB\n`);

    // Ensure test audio exists
    await this.prepareTestAudio();

    // Get available variants
    const availableVariants = this.getAvailableVariants();

    if (availableVariants.length === 0) {
      console.error('❌ No variant binaries found. Build variants first with:');
      console.error('   npm run build:whisper-variants\n');
      process.exit(1);
    }

    console.log(`Found ${availableVariants.length} variant(s): ${availableVariants.join(', ')}\n`);

    // Run benchmarks for each combination
    for (const variant of availableVariants) {
      for (const model of this.config.models) {
        for (const threads of this.config.options.threads) {
          await this.benchmarkVariant(variant, model, threads);
        }
      }
    }

    // Generate reports
    await this.generateReports();
  }

  async prepareTestAudio() {
    const testFile = path.join(this.projectRoot, this.config.audio.testFile);
    const sourceFile = path.join(this.projectRoot, 'whisper.cpp', 'samples', 'jfk.wav');

    if (fs.existsSync(testFile)) {
      console.log(`✅ Test audio file already exists: ${testFile}\n`);
      return;
    }

    if (!fs.existsSync(sourceFile)) {
      console.error(`❌ Source audio file not found: ${sourceFile}`);
      console.error(`   Please run: npm run setup\n`);
      process.exit(1);
    }

    console.log('📁 Copying test audio file...');
    const audioDir = path.dirname(testFile);
    fs.mkdirSync(audioDir, { recursive: true });
    fs.copyFileSync(sourceFile, testFile);
    console.log(`✅ Test audio copied to: ${testFile}\n`);
  }

  getAvailableVariants() {
    const available = [];

    for (const variant of this.config.variants) {
      const binaryName = process.platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli';
      // Check build directory first (has all DLL dependencies)
      const buildBinaryPath = path.join(
        this.projectRoot,
        'whisper.cpp',
        `build-${variant}`,
        'bin',
        'Release',
        binaryName
      );

      if (fs.existsSync(buildBinaryPath)) {
        available.push(variant);
      }
    }

    return available;
  }

  async benchmarkVariant(variant, model, threads) {
    console.log('─────────────────────────────────────────────────────────');
    console.log(`📊 Benchmarking: ${variant} | ${model} | ${threads} thread(s)`);
    console.log('─────────────────────────────────────────────────────────');

    const binaryName = process.platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli';
    // Use build directory path (has all DLL dependencies)
    const binaryPath = path.join(
      this.projectRoot,
      'whisper.cpp',
      `build-${variant}`,
      'bin',
      'Release',
      binaryName
    );
    const modelPath = path.join(this.projectRoot, 'models', model);
    const audioPath = path.join(this.projectRoot, this.config.audio.testFile);

    // Check model exists
    if (!fs.existsSync(modelPath)) {
      console.log(`⚠️  Model ${model} not found, skipping\n`);
      return;
    }

    // Run warmup
    console.log('  🔥 Warming up...');
    try {
      await this.runWhisper(binaryPath, modelPath, audioPath, threads);
      console.log('  ✅ Warmup complete');
    } catch (error) {
      console.error(`  ❌ Warmup failed: ${error.message}\n`);
      return;
    }

    // Run benchmark iterations
    const runs = [];
    for (let i = 0; i < this.config.options.benchmarkRuns; i++) {
      console.log(`  ⏱️  Run ${i + 1}/${this.config.options.benchmarkRuns}...`);

      try {
        const result = await this.runWhisper(binaryPath, modelPath, audioPath, threads);
        runs.push(result);
        console.log(`     Total time: ${result.totalTime.toFixed(0)}ms`);
      } catch (error) {
        console.error(`     ❌ Run failed: ${error.message}`);
        runs.push({ success: false, error: error.message });
      }
    }

    // Calculate aggregate metrics
    const metrics = this.calculateMetrics(runs);

    if (metrics && !metrics.error) {
      console.log(`  ✅ Avg Total Time: ${metrics.avgTotalTime.toFixed(0)}ms`);
      console.log(`  ✅ Real-Time Factor: ${metrics.realTimeFactor.toFixed(2)}x`);
      console.log(`  ✅ Words/Sec: ${metrics.wordsPerSecond}`);
    }

    console.log('');

    // Store result
    this.results.push({
      variant,
      model: model.replace('ggml-', '').replace('.bin', ''),
      threads,
      runs: runs.map(r => ({
        success: r.success,
        totalTime: r.totalTime,
        firstTokenTime: r.firstTokenTime,
        timings: r.timings
      })),
      metrics,
      timestamp: new Date().toISOString()
    });
  }

  async runWhisper(binaryPath, modelPath, audioPath, threads) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let firstTokenTime = null;

      const args = [
        '-m', modelPath,
        '-f', audioPath,
        '-t', threads.toString(),
        '-oj',  // JSON output
        '-nt'   // No timestamps for consistency
      ];

      if (this.config.options.language) {
        args.push('-l', this.config.options.language);
      }

      const process = spawn(binaryPath, args);

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;

        // Detect first token (simplified - when we see first output)
        if (!firstTokenTime && chunk.length > 0) {
          firstTokenTime = Date.now() - startTime;
        }
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to spawn process: ${error.message}`));
      });

      process.on('close', (code) => {
        const endTime = Date.now();
        const totalTime = endTime - startTime;

        if (code !== 0) {
          reject(new Error(`Whisper process exited with code ${code}`));
          return;
        }

        // Parse timing information from stderr
        const timings = this.parseTimings(stderr);

        resolve({
          success: true,
          totalTime,
          firstTokenTime: firstTokenTime || totalTime,
          timings,
          stdout,
          stderr
        });
      });
    });
  }

  parseTimings(stderr) {
    const timings = {};

    // Extract timings from whisper output
    // Format: "load time = 123.45 ms"
    const loadMatch = stderr.match(/load time\s*=\s*(\d+\.\d+)\s*ms/);
    if (loadMatch) timings.loadTime = parseFloat(loadMatch[1]);

    // Format: "sample time = 123.45 ms / 5 runs"
    const sampleMatch = stderr.match(/sample time\s*=\s*(\d+\.\d+)\s*ms\s*\/\s*(\d+)\s*runs/);
    if (sampleMatch) {
      timings.sampleTime = parseFloat(sampleMatch[1]);
      timings.sampleRuns = parseInt(sampleMatch[2]);
    }

    const encodeMatch = stderr.match(/encode time\s*=\s*(\d+\.\d+)\s*ms\s*\/\s*(\d+)\s*runs/);
    if (encodeMatch) {
      timings.encodeTime = parseFloat(encodeMatch[1]);
      timings.encodeRuns = parseInt(encodeMatch[2]);
    }

    const decodeMatch = stderr.match(/decode time\s*=\s*(\d+\.\d+)\s*ms\s*\/\s*(\d+)\s*runs/);
    if (decodeMatch) {
      timings.decodeTime = parseFloat(decodeMatch[1]);
      timings.decodeRuns = parseInt(decodeMatch[2]);
    }

    const totalMatch = stderr.match(/total time\s*=\s*(\d+\.\d+)\s*ms/);
    if (totalMatch) timings.totalTimeReported = parseFloat(totalMatch[1]);

    return timings;
  }

  calculateMetrics(runs) {
    const successfulRuns = runs.filter(r => r.success);

    if (successfulRuns.length === 0) {
      return { error: 'No successful runs' };
    }

    const avgTotalTime = this.average(successfulRuns.map(r => r.totalTime));
    const avgLoadTime = this.average(successfulRuns.map(r => r.timings.loadTime || 0));
    const avgEncodeTime = this.average(successfulRuns.map(r => r.timings.encodeTime || 0));
    const avgDecodeTime = this.average(successfulRuns.map(r => r.timings.decodeTime || 0));
    const avgFirstToken = this.average(successfulRuns.map(r => r.firstTokenTime || 0));

    const audioDuration = this.config.audio.duration * 1000; // Convert to ms
    const realTimeFactor = avgTotalTime / audioDuration;

    // Words per second
    const wordsPerSecond = (this.config.audio.expectedWords / (avgTotalTime / 1000)).toFixed(2);

    return {
      avgTotalTime,
      avgLoadTime,
      avgEncodeTime,
      avgDecodeTime,
      avgFirstToken,
      realTimeFactor,
      wordsPerSecond,
      minTime: Math.min(...successfulRuns.map(r => r.totalTime)),
      maxTime: Math.max(...successfulRuns.map(r => r.totalTime)),
      stdDev: this.stdDev(successfulRuns.map(r => r.totalTime)),
      successRate: (successfulRuns.length / runs.length * 100).toFixed(0)
    };
  }

  average(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  stdDev(arr) {
    if (arr.length === 0) return 0;
    const avg = this.average(arr);
    const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = this.average(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }

  async generateReports() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                   Generating Reports                      ');
    console.log('═══════════════════════════════════════════════════════════\n');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsDir = path.join(this.projectRoot, 'benchmarks', 'results');
    fs.mkdirSync(resultsDir, { recursive: true });

    // JSON report
    const jsonPath = path.join(resultsDir, `benchmark-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify({
      systemInfo: this.systemInfo,
      config: this.config,
      results: this.results
    }, null, 2));
    console.log(`✅ JSON report: ${jsonPath}`);

    // CSV report
    const csvPath = path.join(resultsDir, `benchmark-${timestamp}.csv`);
    this.generateCSV(csvPath);
    console.log(`✅ CSV report: ${csvPath}\n`);

    // Comparison summary
    this.generateComparisonSummary();
  }

  generateCSV(outputPath) {
    const headers = [
      'Variant', 'Model', 'Threads',
      'Avg Total Time (ms)', 'Avg Load Time (ms)',
      'Avg Encode Time (ms)', 'Avg Decode Time (ms)',
      'Avg First Token (ms)', 'Real-Time Factor',
      'Words/Second', 'Std Dev', 'Success Rate (%)'
    ];

    const rows = [headers.join(',')];

    for (const result of this.results) {
      if (!result.metrics.error) {
        rows.push([
          result.variant,
          result.model,
          result.threads,
          result.metrics.avgTotalTime.toFixed(2),
          result.metrics.avgLoadTime.toFixed(2),
          result.metrics.avgEncodeTime.toFixed(2),
          result.metrics.avgDecodeTime.toFixed(2),
          result.metrics.avgFirstToken.toFixed(2),
          result.metrics.realTimeFactor.toFixed(2),
          result.metrics.wordsPerSecond,
          result.metrics.stdDev.toFixed(2),
          result.metrics.successRate
        ].join(','));
      }
    }

    fs.writeFileSync(outputPath, rows.join('\n'));
  }

  generateComparisonSummary() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    BENCHMARK SUMMARY                      ');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Group by model and threads
    const groups = {};
    for (const result of this.results) {
      if (result.metrics.error) continue;

      const key = `${result.model} @ ${result.threads} thread(s)`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(result);
    }

    for (const [key, results] of Object.entries(groups)) {
      console.log(`${key}:`);

      // Sort by total time (fastest first)
      results.sort((a, b) => a.metrics.avgTotalTime - b.metrics.avgTotalTime);

      const baseline = results.find(r => r.variant === 'baseline') || results[0];

      console.log('  Variant      │ Time (ms) │ RT Factor │ Words/Sec │ Speedup');
      console.log('  ─────────────┼───────────┼───────────┼───────────┼─────────');

      for (const result of results) {
        const speedup = baseline ?
          (baseline.metrics.avgTotalTime / result.metrics.avgTotalTime).toFixed(2) :
          '1.00';

        const isFastest = result === results[0];
        const prefix = isFastest ? '🏆' : '  ';

        console.log(
          `${prefix}${result.variant.padEnd(12)}│ ` +
          `${result.metrics.avgTotalTime.toFixed(0).padStart(8)} │ ` +
          `${result.metrics.realTimeFactor.toFixed(2).padStart(8)} │ ` +
          `${result.metrics.wordsPerSecond.padStart(8)} │ ` +
          `${speedup}x`
        );
      }

      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════');

    // Overall best performer
    const validResults = this.results.filter(r => !r.metrics.error);
    if (validResults.length > 0) {
      validResults.sort((a, b) => a.metrics.avgTotalTime - b.metrics.avgTotalTime);
      const fastest = validResults[0];

      console.log('\n🏆 FASTEST OVERALL:');
      console.log(`   ${fastest.variant} (${fastest.model}, ${fastest.threads} threads)`);
      console.log(`   ${fastest.metrics.avgTotalTime.toFixed(0)}ms | ${fastest.metrics.realTimeFactor.toFixed(2)}x RT | ${fastest.metrics.wordsPerSecond} words/sec\n`);
    }

    console.log('═══════════════════════════════════════════════════════════\n');
  }
}

// Main execution
async function main() {
  const configPath = path.join(__dirname, '..', 'benchmarks', 'configs', 'benchmark-config.json');

  if (!fs.existsSync(configPath)) {
    console.error('❌ Benchmark config not found:', configPath);
    process.exit(1);
  }

  const benchmark = new WhisperBenchmark(configPath);
  await benchmark.runBenchmark();
}

if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Benchmark failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = WhisperBenchmark;
