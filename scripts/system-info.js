#!/usr/bin/env node

const { execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

async function detectCPUFeatures() {
  const features = {
    avx: false,
    avx2: false,
    avx512f: false,
    avx512_vnni: false,
    avx512_bf16: false,
  };

  try {
    if (process.platform === 'win32') {
      // On Windows, use WMIC to get CPU info
      const cpuInfo = execSync('wmic cpu get Name', { encoding: 'utf8' });

      // Check for Intel processor generations that support AVX-512
      // Ice Lake, Skylake-X, Cascade Lake, Cooper Lake, Tiger Lake, Rocket Lake, Alder Lake, Sapphire Rapids
      const hasAVX512Capable = /Ice Lake|Skylake-X|Cascade Lake|Cooper Lake|Tiger Lake|Rocket Lake|Alder Lake|Sapphire Rapids|Xeon.*Platinum|Xeon.*Gold/i.test(cpuInfo);

      if (hasAVX512Capable) {
        features.avx512f = true;
        features.avx512_vnni = true; // Most AVX-512 capable CPUs have VNNI
      }

      // Most modern Intel CPUs have AVX and AVX2
      if (/Intel/i.test(cpuInfo)) {
        features.avx = true;
        features.avx2 = true;
      }
    } else if (process.platform === 'linux') {
      // On Linux, read /proc/cpuinfo
      const cpuInfo = fs.readFileSync('/proc/cpuinfo', 'utf8');
      const flagsMatch = cpuInfo.match(/^flags\s*:\s*(.+)$/m);

      if (flagsMatch) {
        const flags = flagsMatch[1].toLowerCase();
        features.avx = flags.includes('avx');
        features.avx2 = flags.includes('avx2');
        features.avx512f = flags.includes('avx512f');
        features.avx512_vnni = flags.includes('avx512_vnni');
        features.avx512_bf16 = flags.includes('avx512_bf16');
      }
    } else if (process.platform === 'darwin') {
      // On macOS, use sysctl
      try {
        const cpuFeatures = execSync('sysctl -a | grep machdep.cpu.features', { encoding: 'utf8' });
        features.avx = cpuFeatures.includes('AVX');
        features.avx2 = cpuFeatures.includes('AVX2');
        // AVX-512 not common on macOS
      } catch (error) {
        // Fallback to assuming modern Intel Mac has AVX/AVX2
        features.avx = true;
        features.avx2 = true;
      }
    }
  } catch (error) {
    console.warn('Warning: Could not detect CPU features:', error.message);
  }

  return features;
}

async function detectIntelGPU() {
  try {
    if (process.platform === 'win32') {
      const output = execSync('wmic path win32_VideoController get name', { encoding: 'utf8' });
      const hasIntelGPU = /Intel.*Graphics|Intel.*Arc|Intel.*Iris|Intel.*Xe/i.test(output);

      if (hasIntelGPU) {
        // Extract GPU model
        const lines = output.split('\n').filter(line => line.trim() && !line.includes('Name'));
        const intelGPU = lines.find(line => /Intel/i.test(line));
        return {
          detected: true,
          model: intelGPU ? intelGPU.trim() : 'Unknown Intel GPU'
        };
      }
    } else if (process.platform === 'linux') {
      const output = execSync('lspci | grep VGA', { encoding: 'utf8' });
      const hasIntelGPU = /Intel/i.test(output);

      if (hasIntelGPU) {
        const match = output.match(/Intel.*$/);
        return {
          detected: true,
          model: match ? match[0] : 'Unknown Intel GPU'
        };
      }
    }
  } catch (error) {
    console.warn('Warning: Could not detect GPU:', error.message);
  }

  return { detected: false, model: null };
}

async function checkOneAPI() {
  const possiblePaths = [
    'C:\\Program Files (x86)\\Intel\\oneAPI',
    'C:\\Program Files\\Intel\\oneAPI',
    '/opt/intel/oneapi',
    path.join(os.homedir(), 'intel', 'oneapi')
  ];

  for (const basePath of possiblePaths) {
    if (fs.existsSync(basePath)) {
      // Check for compiler
      const compilerPath = path.join(basePath, 'compiler', 'latest', 'bin');
      const icxExe = process.platform === 'win32' ? 'icx.exe' : 'icx';
      const icxPath = path.join(compilerPath, icxExe);

      if (fs.existsSync(compilerPath)) {
        return {
          installed: true,
          path: basePath,
          compilerPath: compilerPath,
          setvars: path.join(basePath, process.platform === 'win32' ? 'setvars.bat' : 'setvars.sh')
        };
      }
    }
  }

  return { installed: false, path: null };
}

async function checkOpenVINO() {
  const projectRoot = path.join(__dirname, '..');
  const possiblePaths = [
    path.join(projectRoot, 'openvino_2025.4.0'),  // Project-local installation
    'C:\\Program Files (x86)\\Intel\\openvino',
    'C:\\Program Files\\Intel\\openvino',
    '/opt/intel/openvino',
    path.join(os.homedir(), 'intel', 'openvino')
  ];

  for (const basePath of possiblePaths) {
    if (fs.existsSync(basePath)) {
      const setupvars = path.join(basePath, process.platform === 'win32' ? 'setupvars.bat' : 'setupvars.sh');

      return {
        installed: true,
        path: basePath,
        setupvars: setupvars
      };
    }
  }

  return { installed: false, path: null };
}

async function gatherSystemInfo() {
  console.log('🔍 Detecting system capabilities...\n');

  const cpus = os.cpus();
  const cpuModel = cpus[0].model;
  const cpuFeatures = await detectCPUFeatures();
  const gpu = await detectIntelGPU();
  const oneAPI = await checkOneAPI();
  const openVINO = await checkOpenVINO();

  const systemInfo = {
    timestamp: new Date().toISOString(),
    platform: {
      os: process.platform,
      arch: os.arch(),
      release: os.release()
    },
    cpu: {
      model: cpuModel,
      cores: cpus.length,
      speed: cpus[0].speed,
      features: cpuFeatures
    },
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
      totalGB: (os.totalmem() / (1024 ** 3)).toFixed(2),
      freeGB: (os.freemem() / (1024 ** 3)).toFixed(2)
    },
    gpu: gpu,
    toolchains: {
      oneAPI: oneAPI,
      openVINO: openVINO
    },
    buildableVariants: []
  };

  // Determine which variants can be built
  systemInfo.buildableVariants.push({
    name: 'baseline',
    buildable: true,
    reason: 'Always available (reference implementation)'
  });

  if (cpuFeatures.avx512f) {
    systemInfo.buildableVariants.push({
      name: 'avx512',
      buildable: true,
      reason: 'CPU supports AVX-512'
    });
  } else {
    systemInfo.buildableVariants.push({
      name: 'avx512',
      buildable: false,
      reason: 'CPU does not support AVX-512'
    });
  }

  if (gpu.detected && oneAPI.installed) {
    systemInfo.buildableVariants.push({
      name: 'sycl',
      buildable: true,
      reason: 'Intel GPU detected and oneAPI installed'
    });
  } else {
    const reasons = [];
    if (!gpu.detected) reasons.push('No Intel GPU detected');
    if (!oneAPI.installed) reasons.push('oneAPI not installed');

    systemInfo.buildableVariants.push({
      name: 'sycl',
      buildable: false,
      reason: reasons.join(', ')
    });
  }

  if (openVINO.installed) {
    systemInfo.buildableVariants.push({
      name: 'openvino',
      buildable: true,
      reason: 'OpenVINO toolkit installed'
    });
  } else {
    systemInfo.buildableVariants.push({
      name: 'openvino',
      buildable: false,
      reason: 'OpenVINO toolkit not installed'
    });
  }

  return systemInfo;
}

function displaySystemInfo(info) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('                    SYSTEM INFORMATION                     ');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Platform:');
  console.log(`  OS: ${info.platform.os} (${info.platform.arch})`);
  console.log(`  Release: ${info.platform.release}\n`);

  console.log('CPU:');
  console.log(`  Model: ${info.cpu.model}`);
  console.log(`  Cores: ${info.cpu.cores}`);
  console.log(`  Speed: ${info.cpu.speed} MHz`);
  console.log(`  Features:`);
  console.log(`    AVX:            ${info.cpu.features.avx ? '✅' : '❌'}`);
  console.log(`    AVX2:           ${info.cpu.features.avx2 ? '✅' : '❌'}`);
  console.log(`    AVX-512F:       ${info.cpu.features.avx512f ? '✅' : '❌'}`);
  console.log(`    AVX-512 VNNI:   ${info.cpu.features.avx512_vnni ? '✅' : '❌'}`);
  console.log(`    AVX-512 BF16:   ${info.cpu.features.avx512_bf16 ? '✅' : '❌'}\n`);

  console.log('Memory:');
  console.log(`  Total: ${info.memory.totalGB} GB`);
  console.log(`  Free:  ${info.memory.freeGB} GB\n`);

  console.log('GPU:');
  if (info.gpu.detected) {
    console.log(`  ✅ ${info.gpu.model}\n`);
  } else {
    console.log(`  ❌ No Intel GPU detected\n`);
  }

  console.log('Toolchains:');
  if (info.toolchains.oneAPI.installed) {
    console.log(`  ✅ Intel oneAPI Base Toolkit`);
    console.log(`     Path: ${info.toolchains.oneAPI.path}`);
  } else {
    console.log(`  ❌ Intel oneAPI Base Toolkit`);
    console.log(`     Install: https://www.intel.com/content/www/us/en/developer/tools/oneapi/base-toolkit-download.html`);
  }

  if (info.toolchains.openVINO.installed) {
    console.log(`  ✅ Intel OpenVINO Toolkit`);
    console.log(`     Path: ${info.toolchains.openVINO.path}\n`);
  } else {
    console.log(`  ❌ Intel OpenVINO Toolkit`);
    console.log(`     Install: https://www.intel.com/content/www/us/en/developer/tools/openvino-toolkit/download.html\n`);
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('                   BUILDABLE VARIANTS                      ');
  console.log('═══════════════════════════════════════════════════════════\n');

  for (const variant of info.buildableVariants) {
    const status = variant.buildable ? '✅' : '❌';
    console.log(`${status} ${variant.name.padEnd(12)} - ${variant.reason}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');

  const buildableCount = info.buildableVariants.filter(v => v.buildable).length;
  console.log(`Summary: ${buildableCount}/${info.buildableVariants.length} variants can be built\n`);
}

async function main() {
  const systemInfo = await gatherSystemInfo();

  // Display to console
  displaySystemInfo(systemInfo);

  // Save to file
  const outputPath = path.join(__dirname, '..', 'system-info.json');
  fs.writeFileSync(outputPath, JSON.stringify(systemInfo, null, 2));
  console.log(`💾 System information saved to: ${outputPath}\n`);

  // Return info for use in other scripts
  return systemInfo;
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = { gatherSystemInfo, displaySystemInfo };
