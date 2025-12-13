#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { gatherSystemInfo } = require('./system-info.js');

const WHISPER_CPP_REPO = 'https://github.com/ggerganov/whisper.cpp.git';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    variant: null,
    clean: false,
    verbose: false
  };

  for (const arg of args) {
    if (arg.startsWith('--variant=')) {
      options.variant = arg.split('=')[1];
    } else if (arg === '--clean') {
      options.clean = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node build-whisper-variants.js [options]

Options:
  --variant=<name>    Build specific variant (baseline, avx512, sycl, openvino)
  --clean             Clean build directories before building
  --verbose, -v       Show detailed build output
  --help, -h          Show this help message

Examples:
  node build-whisper-variants.js                    # Build all available variants
  node build-whisper-variants.js --variant=baseline # Build only baseline
  node build-whisper-variants.js --clean --verbose  # Clean build with verbose output
`);
      process.exit(0);
    }
  }

  return options;
}

// Variant configurations
function getVariantConfig(variantName) {
  const configs = {
    baseline: {
      name: 'baseline',
      description: 'CPU-optimized baseline (-march=native)',
      cmakeArgs: [
        '-DWHISPER_BUILD_EXAMPLES=ON',
        '-DCMAKE_BUILD_TYPE=Release',
        '-DGGML_NATIVE=ON'
      ],
      requiresToolchain: null
    },
    avx512: {
      name: 'avx512',
      description: 'Intel AVX-512 SIMD optimizations',
      cmakeArgs: [
        '-DWHISPER_BUILD_EXAMPLES=ON',
        '-DCMAKE_BUILD_TYPE=Release',
        '-DGGML_AVX512=ON',
        '-DGGML_AVX512_VNNI=ON',
        '-DGGML_AVX512_VBMI=ON'
      ],
      requiresToolchain: null
    },
    sycl: {
      name: 'sycl',
      description: 'Intel GPU acceleration via SYCL',
      cmakeArgs: [
        '-DWHISPER_BUILD_EXAMPLES=ON',
        '-DCMAKE_BUILD_TYPE=Release',
        '-DGGML_SYCL=1',
        '-DCMAKE_C_COMPILER=icx',
        '-DCMAKE_CXX_COMPILER=icpx'
      ],
      requiresToolchain: 'oneAPI'
    },
    openvino: {
      name: 'openvino',
      description: 'Intel OpenVINO inference optimization',
      cmakeArgs: [
        '-DWHISPER_BUILD_EXAMPLES=ON',
        '-DCMAKE_BUILD_TYPE=Release',
        '-DWHISPER_OPENVINO=ON'
      ],
      requiresToolchain: 'openVINO'
    }
  };

  return configs[variantName];
}

// Ensure whisper.cpp repository exists
async function ensureWhisperCpp(projectRoot, verbose) {
  const whisperDir = path.join(projectRoot, 'whisper.cpp');

  if (!fs.existsSync(whisperDir)) {
    console.log('📥 Cloning whisper.cpp repository...');
    try {
      execSync(`git clone ${WHISPER_CPP_REPO} "${whisperDir}"`, {
        stdio: verbose ? 'inherit' : 'pipe'
      });
      console.log('✅ Repository cloned successfully\n');
    } catch (error) {
      throw new Error('Failed to clone whisper.cpp repository. Make sure git is installed.');
    }
  } else {
    console.log('✅ whisper.cpp directory already exists\n');
  }

  // Get current commit hash for documentation
  try {
    const commitHash = execSync('git rev-parse --short HEAD', {
      cwd: whisperDir,
      encoding: 'utf8'
    }).trim();
    console.log(`📌 Using whisper.cpp commit: ${commitHash}\n`);
    return commitHash;
  } catch (error) {
    console.warn('⚠️  Could not determine whisper.cpp commit hash\n');
    return 'unknown';
  }
}

// Capture environment variables from Windows batch file
function captureEnvironmentFromBatchFile(batchFilePath) {
  // Use PowerShell to run CMD batch file and capture environment
  // Escape the path for PowerShell: backticks for quotes and parentheses
  const escapedPath = batchFilePath.replace(/\(/g, '`(').replace(/\)/g, '`)');
  const psCommand = `cmd /c "\\"${escapedPath}\\" && set"`;

  try {
    const output = execSync(`powershell -NoProfile -Command "${psCommand}"`, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 60000 // 60 second timeout
    });

    const envVars = {};
    const lines = output.split('\n');

    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        envVars[key.trim()] = value.trimRight();
      }
    }

    return envVars;
  } catch (error) {
    throw new Error(`Failed to capture environment from ${batchFilePath}: ${error.message}`);
  }
}

// Setup environment for specific toolchains
function setupEnvironment(variantName, systemInfo, verbose) {
  const env = { ...process.env };

  if (variantName === 'sycl' && systemInfo.toolchains.oneAPI.installed) {
    console.log('  Setting up oneAPI environment...');
    const setvars = systemInfo.toolchains.oneAPI.setvars;

    if (process.platform === 'win32') {
      console.log('  🔄 Sourcing oneAPI environment variables...');

      try {
        const oneAPIEnv = captureEnvironmentFromBatchFile(setvars);
        Object.assign(env, oneAPIEnv);

        console.log('  ✅ oneAPI environment configured successfully');

        if (verbose) {
          console.log(`     Captured ${Object.keys(oneAPIEnv).length} environment variables`);
          console.log(`     Compiler: ${env.ICPX_COMPILER_DIR || 'detected'}`);
        }
      } catch (error) {
        console.error('  ❌ Failed to source oneAPI environment');
        console.error(`     ${error.message}`);
        console.log('  ⚠️  Falling back to manual setup:');
        console.log(`      Run: "${setvars}"`);
        console.log(`      Then: npm run build:whisper-sycl\n`);
        // Don't throw - let CMake fail with helpful error message
      }
    }

    // Add compiler paths to PATH (fallback for non-Windows or if capture failed)
    if (systemInfo.toolchains.oneAPI.compilerPath) {
      env.PATH = `${systemInfo.toolchains.oneAPI.compilerPath};${env.PATH}`;
    }
  }

  if (variantName === 'openvino' && systemInfo.toolchains.openVINO.installed) {
    console.log('  Setting up OpenVINO environment...');
    const setupvars = systemInfo.toolchains.openVINO.setupvars;

    if (process.platform === 'win32') {
      console.log(`  ⚠️  Before building OpenVINO variant, run:`);
      console.log(`      "${setupvars}"`);
      console.log(`      Then run this script again.\n`);
    }
  }

  return env;
}

// Build a single variant
async function buildVariant(variantName, systemInfo, options) {
  const projectRoot = path.join(__dirname, '..');
  const whisperDir = path.join(projectRoot, 'whisper.cpp');
  const config = getVariantConfig(variantName);

  if (!config) {
    throw new Error(`Unknown variant: ${variantName}`);
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Building variant: ${config.name}`);
  console.log(`Description: ${config.description}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Check if variant is buildable
  const buildableVariant = systemInfo.buildableVariants.find(v => v.name === variantName);
  if (buildableVariant && !buildableVariant.buildable) {
    console.log(`❌ Cannot build ${variantName}: ${buildableVariant.reason}\n`);
    return { success: false, variant: variantName, reason: buildableVariant.reason };
  }

  const buildDir = path.join(whisperDir, `build-${variantName}`);
  const outputDir = path.join(projectRoot, 'whisper-bins', variantName);

  // Create directories
  fs.mkdirSync(outputDir, { recursive: true });

  // Clean if requested
  if (options.clean && fs.existsSync(buildDir)) {
    console.log('🧹 Cleaning build directory...');
    fs.rmSync(buildDir, { recursive: true, force: true });
  }

  fs.mkdirSync(buildDir, { recursive: true });

  // Setup environment
  const env = setupEnvironment(variantName, systemInfo, options.verbose);

  try {
    // Configure with CMake
    const cmakeArgs = config.cmakeArgs.join(' ');
    console.log('🔧 Configuring with CMake...');
    if (options.verbose) {
      console.log(`   Command: cmake ${cmakeArgs} ..`);
    }

    execSync(`cmake ${cmakeArgs} ..`, {
      cwd: buildDir,
      stdio: options.verbose ? 'inherit' : 'pipe',
      env: env
    });

    console.log('✅ Configuration complete\n');

    // Build
    console.log('🔨 Building whisper binary...');
    console.log('   This may take several minutes...');

    const startTime = Date.now();
    execSync('cmake --build . --config Release', {
      cwd: buildDir,
      stdio: options.verbose ? 'inherit' : 'pipe',
      env: env
    });

    const buildTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Build complete (${buildTime}s)\n`);

    // Find and copy binary
    console.log('📦 Copying binary to output directory...');

    const possibleBinaryPaths = [
      path.join(buildDir, 'bin', 'Release', 'whisper-cli.exe'),  // Windows CMake
      path.join(buildDir, 'bin', 'Release', 'main.exe'),         // Windows CMake (old)
      path.join(buildDir, 'bin', 'whisper-cli.exe'),             // Windows
      path.join(buildDir, 'bin', 'main.exe'),                    // Windows
      path.join(buildDir, 'whisper-cli'),                        // Unix
      path.join(buildDir, 'main'),                               // Unix
      path.join(buildDir, 'bin', 'whisper-cli'),                 // Unix (bin dir)
      path.join(buildDir, 'bin', 'main')                         // Unix (bin dir)
    ];

    let binaryFound = false;
    for (const binaryPath of possibleBinaryPaths) {
      if (fs.existsSync(binaryPath)) {
        const binaryName = process.platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli';
        const destPath = path.join(outputDir, binaryName);
        fs.copyFileSync(binaryPath, destPath);

        // Make executable on Unix
        if (process.platform !== 'win32') {
          fs.chmodSync(destPath, '755');
        }

        console.log(`✅ Binary copied to: ${destPath}\n`);
        binaryFound = true;
        break;
      }
    }

    if (!binaryFound) {
      throw new Error('Binary not found in expected locations');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ ${variantName} variant built successfully!`);
    console.log('═══════════════════════════════════════════════════════════\n');

    return {
      success: true,
      variant: variantName,
      buildTime: buildTime,
      outputPath: outputDir
    };

  } catch (error) {
    console.error(`\n❌ Build failed for ${variantName}:`);
    console.error(`   ${error.message}\n`);

    return {
      success: false,
      variant: variantName,
      error: error.message
    };
  }
}

// Main function
async function main() {
  const options = parseArgs();

  console.log('🎙️  Whisper.cpp Multi-Variant Builder\n');

  // Gather system information
  console.log('🔍 Detecting system capabilities...\n');
  const systemInfo = await gatherSystemInfo();

  const buildableVariants = systemInfo.buildableVariants
    .filter(v => v.buildable)
    .map(v => v.name);

  console.log(`Found ${buildableVariants.length} buildable variant(s): ${buildableVariants.join(', ')}\n`);

  if (buildableVariants.length === 0) {
    console.error('❌ No variants can be built on this system.');
    console.error('   Run "node scripts/system-info.js" for details.\n');
    process.exit(1);
  }

  // Ensure whisper.cpp exists
  const projectRoot = path.join(__dirname, '..');
  const commitHash = await ensureWhisperCpp(projectRoot, options.verbose);

  // Determine which variants to build
  let variantsToBuild = buildableVariants;
  if (options.variant) {
    if (!buildableVariants.includes(options.variant)) {
      console.error(`❌ Variant "${options.variant}" is not buildable on this system.`);
      console.error(`   Buildable variants: ${buildableVariants.join(', ')}\n`);
      process.exit(1);
    }
    variantsToBuild = [options.variant];
  }

  console.log(`Building ${variantsToBuild.length} variant(s): ${variantsToBuild.join(', ')}\n`);

  // Build each variant
  const results = [];
  for (const variant of variantsToBuild) {
    const result = await buildVariant(variant, systemInfo, options);
    results.push(result);
  }

  // Generate build report
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('                      BUILD SUMMARY                        ');
  console.log('═══════════════════════════════════════════════════════════\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  if (successful.length > 0) {
    console.log('✅ Successful builds:');
    for (const result of successful) {
      console.log(`   ${result.variant.padEnd(12)} - ${result.buildTime}s`);
    }
    console.log('');
  }

  if (failed.length > 0) {
    console.log('❌ Failed builds:');
    for (const result of failed) {
      console.log(`   ${result.variant.padEnd(12)} - ${result.reason || result.error}`);
    }
    console.log('');
  }

  // Save build report
  const buildReport = {
    timestamp: new Date().toISOString(),
    whisperCommit: commitHash,
    systemInfo: {
      platform: systemInfo.platform,
      cpu: systemInfo.cpu.model,
      cores: systemInfo.cpu.cores
    },
    results: results
  };

  const reportPath = path.join(projectRoot, 'whisper-bins', 'build-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(buildReport, null, 2));
  console.log(`📄 Build report saved to: ${reportPath}\n`);

  // Exit with appropriate code
  if (failed.length > 0 && successful.length === 0) {
    console.error('❌ All builds failed\n');
    process.exit(1);
  } else if (failed.length > 0) {
    console.warn('⚠️  Some builds failed\n');
    process.exit(0); // Partial success
  } else {
    console.log('✅ All builds successful!\n');
    process.exit(0);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { buildVariant, getVariantConfig };
