#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const WHISPER_CPP_REPO = 'https://github.com/ggerganov/whisper.cpp.git';
const WHISPER_VERSION = 'v1.5.4'; // Use a specific version for stability

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function buildWhisper() {
  console.log('🔨 Building whisper.cpp for local execution...\n');

  const projectRoot = path.join(__dirname, '..');
  const nativeDir = path.join(projectRoot, 'native');
  const whisperDir = path.join(nativeDir, 'whisper.cpp');
  const platform = process.platform;
  const outputDir = path.join(nativeDir, platform);

  // Create directories
  if (!fs.existsSync(nativeDir)) {
    fs.mkdirSync(nativeDir, { recursive: true });
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Clone or update whisper.cpp
  if (!fs.existsSync(whisperDir)) {
    console.log('📥 Cloning whisper.cpp repository...');
    execSync(`git clone ${WHISPER_CPP_REPO} ${whisperDir}`, {
      stdio: 'inherit',
      cwd: nativeDir
    });
  }

  // Checkout specific version
  console.log(`📌 Checking out version ${WHISPER_VERSION}...`);
  execSync(`git checkout ${WHISPER_VERSION}`, {
    stdio: 'inherit',
    cwd: whisperDir
  });

  // Build whisper
  console.log('🔧 Building whisper binary...');
  
  if (platform === 'win32') {
    // Windows build
    console.log('Building for Windows...');
    
    // Check if cmake is available
    try {
      execSync('cmake --version', { stdio: 'ignore' });
      
      // Use CMake build
      const buildDir = path.join(whisperDir, 'build');
      if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir);
      }
      
      execSync('cmake ..', {
        stdio: 'inherit',
        cwd: buildDir
      });
      
      execSync('cmake --build . --config Release', {
        stdio: 'inherit',
        cwd: buildDir
      });
      
      // Copy the executable
      const whisperExe = path.join(buildDir, 'bin', 'Release', 'main.exe');
      const outputExe = path.join(outputDir, 'whisper.exe');
      fs.copyFileSync(whisperExe, outputExe);
      
    } catch (error) {
      console.error('CMake not found. Please install CMake and try again.');
      process.exit(1);
    }
    
  } else {
    // Unix-like systems (macOS, Linux)
    console.log(`Building for ${platform}...`);
    
    // Clean previous builds
    execSync('make clean', {
      stdio: 'inherit',
      cwd: whisperDir
    });
    
    // Build with make
    const makeCommand = platform === 'darwin' 
      ? 'make -j8 CFLAGS="-O3 -march=native"'  // macOS optimizations
      : 'make -j8 CFLAGS="-O3 -march=native -pthread"';  // Linux optimizations
    
    execSync(makeCommand, {
      stdio: 'inherit',
      cwd: whisperDir
    });
    
    // Copy the binary
    const whisperBin = path.join(whisperDir, 'main');
    const outputBin = path.join(outputDir, 'whisper');
    fs.copyFileSync(whisperBin, outputBin);
    
    // Make it executable
    fs.chmodSync(outputBin, '755');
  }

  // Also build/copy ffmpeg if needed
  console.log('\n📦 Setting up ffmpeg for audio conversion...');
  
  if (platform === 'darwin') {
    console.log('For macOS, please install ffmpeg using: brew install ffmpeg');
  } else if (platform === 'linux') {
    console.log('For Linux, please install ffmpeg using: sudo apt-get install ffmpeg');
  } else if (platform === 'win32') {
    console.log('Downloading ffmpeg for Windows...');
    // Download a static ffmpeg build for Windows
    // You would implement this based on your needs
  }

  // Download a default model (tiny)
  console.log('\n📥 Downloading default model (tiny)...');
  const modelsDir = path.join(projectRoot, 'models');
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }

  const tinyModelPath = path.join(modelsDir, 'ggml-tiny.bin');
  if (!fs.existsSync(tinyModelPath)) {
    const modelUrl = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin';
    console.log('Downloading tiny model...');
    await downloadFile(modelUrl, tinyModelPath);
    console.log('✅ Tiny model downloaded successfully!');
  } else {
    console.log('✅ Tiny model already exists.');
  }

  console.log('\n✨ Whisper.cpp build complete!');
  console.log(`Binary location: ${path.join(outputDir, platform === 'win32' ? 'whisper.exe' : 'whisper')}`);
}

// Run the build
buildWhisper().catch((error) => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});
