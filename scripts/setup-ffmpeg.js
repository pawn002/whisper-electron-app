const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { pipeline } = require("stream");
const { promisify } = require("util");

const streamPipeline = promisify(pipeline);

const FFMPEG_DIR = path.join(__dirname, "..", "ffmpeg");
const BIN_DIR = path.join(FFMPEG_DIR, "bin");

// Platform-specific FFmpeg download URLs
const FFMPEG_URLS = {
  win32: {
    url: "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip",
    fileName: "ffmpeg-win.zip",
  },
  darwin: {
    // For macOS, we'll use a static build from evermeet.cx
    url: "https://evermeet.cx/ffmpeg/getrelease/zip",
    fileName: "ffmpeg.zip",
  },
  linux: {
    // For Linux, we'll download a static build from johnvansickle.com
    url: "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz",
    fileName: "ffmpeg-static.tar.xz",
  },
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading from ${url}...`);

    const download = (downloadUrl) => {
      const protocol = downloadUrl.startsWith("https") ? https : http;

      protocol
        .get(downloadUrl, (response) => {
          // Handle redirects
          if (
            response.statusCode === 301 ||
            response.statusCode === 302 ||
            response.statusCode === 303 ||
            response.statusCode === 307 ||
            response.statusCode === 308
          ) {
            const redirectUrl = response.headers.location;
            console.log(`Following redirect to: ${redirectUrl}`);
            download(redirectUrl);
            return;
          }

          if (response.statusCode !== 200) {
            reject(
              new Error(
                `Failed to download: HTTP ${response.statusCode} ${response.statusMessage}`,
              ),
            );
            return;
          }

          const totalSize = parseInt(response.headers["content-length"] || "0");
          let downloadedSize = 0;
          let lastPercent = 0;

          response.on("data", (chunk) => {
            downloadedSize += chunk.length;
            if (totalSize > 0) {
              const percent = Math.floor((downloadedSize / totalSize) * 100);
              if (percent >= lastPercent + 10) {
                console.log(`Download progress: ${percent}%`);
                lastPercent = percent;
              }
            }
          });

          const fileStream = fs.createWriteStream(destPath);
          streamPipeline(response, fileStream)
            .then(() => {
              console.log(`Downloaded to ${destPath}`);
              resolve();
            })
            .catch(reject);
        })
        .on("error", reject);
    };

    download(url);
  });
}

async function extractArchive(archivePath, destDir) {
  console.log(`Extracting ${archivePath}...`);
  const platform = process.platform;

  try {
    if (archivePath.endsWith(".zip")) {
      // Use unzip or built-in extraction
      if (platform === "win32") {
        // Windows: Use PowerShell to extract
        const psCommand = `Expand-Archive -Path "${archivePath}" -DestinationPath "${destDir}" -Force`;
        execSync(`powershell -Command "${psCommand}"`, { stdio: "inherit" });
      } else {
        // macOS/Linux: Use unzip
        execSync(`unzip -q -o "${archivePath}" -d "${destDir}"`, {
          stdio: "inherit",
        });
      }
    } else if (archivePath.endsWith(".tar.xz")) {
      // Linux: Use tar
      execSync(`tar -xJf "${archivePath}" -C "${destDir}"`, {
        stdio: "inherit",
      });
    }
    console.log("Extraction complete");
  } catch (error) {
    throw new Error(`Failed to extract archive: ${error.message}`);
  }
}

function findAndCopyFfmpeg(extractDir, binDir) {
  console.log("Searching for ffmpeg binary...");

  // Recursively search for ffmpeg binary
  function findFfmpeg(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const result = findFfmpeg(fullPath);
        if (result) return result;
      } else if (entry.name === "ffmpeg" || entry.name === "ffmpeg.exe") {
        return fullPath;
      }
    }
    return null;
  }

  const ffmpegBinary = findFfmpeg(extractDir);
  if (!ffmpegBinary) {
    throw new Error("Could not find ffmpeg binary in extracted files");
  }

  console.log(`Found ffmpeg at: ${ffmpegBinary}`);

  // Copy to bin directory
  const destPath = path.join(
    binDir,
    process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg",
  );
  fs.copyFileSync(ffmpegBinary, destPath);

  // Make executable on Unix
  if (process.platform !== "win32") {
    fs.chmodSync(destPath, 0o755);
  }

  console.log(`Copied ffmpeg to: ${destPath}`);
  return destPath;
}

async function setupFfmpeg() {
  const platform = process.platform;

  if (!FFMPEG_URLS[platform]) {
    console.error(`Unsupported platform: ${platform}`);
    process.exit(1);
  }

  console.log(`Setting up ffmpeg for ${platform}...`);

  // Create directories
  ensureDir(FFMPEG_DIR);
  ensureDir(BIN_DIR);

  // Check if ffmpeg already exists
  const ffmpegPath = path.join(
    BIN_DIR,
    platform === "win32" ? "ffmpeg.exe" : "ffmpeg",
  );

  if (fs.existsSync(ffmpegPath)) {
    console.log("ffmpeg already exists. Skipping download.");
    console.log(`ffmpeg location: ${ffmpegPath}`);
    return;
  }

  const config = FFMPEG_URLS[platform];
  const downloadPath = path.join(FFMPEG_DIR, config.fileName);

  try {
    // Download ffmpeg
    await downloadFile(config.url, downloadPath);

    // Extract
    const extractDir = path.join(FFMPEG_DIR, "extracted");
    ensureDir(extractDir);
    await extractArchive(downloadPath, extractDir);

    // Find and copy ffmpeg binary
    findAndCopyFfmpeg(extractDir, BIN_DIR);

    // Cleanup
    console.log("Cleaning up temporary files...");
    fs.rmSync(downloadPath, { force: true });
    fs.rmSync(extractDir, { recursive: true, force: true });

    console.log("✅ ffmpeg setup complete!");
    console.log(`ffmpeg location: ${ffmpegPath}`);
  } catch (error) {
    console.error("❌ Failed to setup ffmpeg:", error.message);
    process.exit(1);
  }
}

// Run setup
setupFfmpeg().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
