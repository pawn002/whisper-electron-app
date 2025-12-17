#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper to execute commands and show output
function exec(command, options = {}) {
  try {
    return execSync(command, {
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf-8',
      ...options
    });
  } catch (error) {
    if (!options.ignoreError) {
      console.error(`\n❌ Command failed: ${command}`);
      console.error(error.message);
      process.exit(1);
    }
    return error.stdout || '';
  }
}

// Helper for prompts
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Helper to pause and wait for user
function pause(message = '\n📋 Press Enter to continue...') {
  return question(message);
}

// Get current version
function getCurrentVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
  return pkg.version;
}

// Parse version
function parseVersion(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return { major, minor, patch };
}

// Get next versions
function getNextVersions(current) {
  const { major, minor, patch } = parseVersion(current);
  return {
    patch: `${major}.${minor}.${patch + 1}`,
    minor: `${major}.${minor + 1}.0`,
    major: `${major + 1}.0.0`
  };
}

// Check git status
function checkGitStatus() {
  const status = exec('git status --porcelain', { silent: true });
  if (status.trim()) {
    console.log('\n⚠️  You have uncommitted changes:');
    console.log(status);
    return false;
  }
  return true;
}

// Get git commits since last tag
function getCommitsSinceLastTag() {
  try {
    const lastTag = exec('git describe --tags --abbrev=0', { silent: true, ignoreError: true }).trim();
    if (lastTag) {
      return exec(`git log ${lastTag}..HEAD --oneline`, { silent: true }).trim();
    }
    return exec('git log --oneline', { silent: true }).trim();
  } catch {
    return exec('git log --oneline', { silent: true }).trim();
  }
}

// Generate CHANGELOG template
function generateChangelogTemplate(version, commits) {
  const date = new Date().toISOString().split('T')[0];
  const commitLines = commits.split('\n');

  let added = [];
  let changed = [];
  let fixed = [];
  let removed = [];
  let other = [];

  commitLines.forEach(line => {
    const lower = line.toLowerCase();
    if (lower.includes('feat:') || lower.includes('add')) {
      added.push(line.replace(/^\w+\s+/, '- '));
    } else if (lower.includes('fix:')) {
      fixed.push(line.replace(/^\w+\s+/, '- '));
    } else if (lower.includes('remove') || lower.includes('delete')) {
      removed.push(line.replace(/^\w+\s+/, '- '));
    } else if (lower.includes('refactor:') || lower.includes('update') || lower.includes('change')) {
      changed.push(line.replace(/^\w+\s+/, '- '));
    } else {
      other.push(line.replace(/^\w+\s+/, '- '));
    }
  });

  let template = `## [${version}] - ${date}\n\n`;

  if (added.length > 0) {
    template += `### Added\n${added.join('\n')}\n\n`;
  }

  if (changed.length > 0) {
    template += `### Changed\n${changed.join('\n')}\n\n`;
  }

  if (fixed.length > 0) {
    template += `### Fixed\n${fixed.join('\n')}\n\n`;
  }

  if (removed.length > 0) {
    template += `### Removed\n${removed.join('\n')}\n\n`;
  }

  if (other.length > 0) {
    template += `### Other\n${other.join('\n')}\n\n`;
  }

  return template;
}

// Update CHANGELOG.md
function updateChangelog(newEntry) {
  const changelogPath = path.join(__dirname, '../CHANGELOG.md');
  let changelog = '';

  if (fs.existsSync(changelogPath)) {
    changelog = fs.readFileSync(changelogPath, 'utf-8');
    // Insert new entry after the header
    const lines = changelog.split('\n');
    const headerEnd = lines.findIndex(line => line.startsWith('## ['));
    if (headerEnd !== -1) {
      lines.splice(headerEnd, 0, newEntry);
      changelog = lines.join('\n');
    } else {
      changelog = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n${newEntry}\n${changelog}`;
    }
  } else {
    changelog = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),\nand this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n\n${newEntry}`;
  }

  fs.writeFileSync(changelogPath, changelog);
  return changelogPath;
}

// Extract release notes from CHANGELOG
function extractReleaseNotes(version) {
  const changelogPath = path.join(__dirname, '../CHANGELOG.md');
  if (!fs.existsSync(changelogPath)) return '';

  const changelog = fs.readFileSync(changelogPath, 'utf-8');
  const lines = changelog.split('\n');

  let inSection = false;
  let notes = [];

  for (const line of lines) {
    if (line.startsWith(`## [${version}]`)) {
      inSection = true;
      continue;
    }
    if (inSection && line.startsWith('## [')) {
      break;
    }
    if (inSection) {
      notes.push(line);
    }
  }

  return notes.join('\n').trim();
}

// Main release flow
async function main() {
  console.log('\n🚀 Whisper Electron App - Release Manager\n');
  console.log('═'.repeat(50));

  // Step 1: Check git status
  console.log('\n📋 Step 1: Checking git status...');
  if (!checkGitStatus()) {
    const answer = await question('\nDo you want to commit these changes first? (y/N): ');
    if (answer.toLowerCase() === 'y') {
      const message = await question('Commit message: ');
      exec('git add -A');
      exec(`git commit -m "${message}"`);
      console.log('✅ Changes committed');
    } else {
      console.log('\n❌ Please commit or stash your changes before releasing.');
      process.exit(1);
    }
  } else {
    console.log('✅ Working directory clean');
  }

  // Step 2: Select version
  console.log('\n📋 Step 2: Version selection');
  const currentVersion = getCurrentVersion();
  const nextVersions = getNextVersions(currentVersion);

  console.log(`\nCurrent version: ${currentVersion}`);
  console.log('\nSelect release type:');
  console.log(`  1) Patch (${nextVersions.patch}) - Bug fixes`);
  console.log(`  2) Minor (${nextVersions.minor}) - New features (backwards compatible)`);
  console.log(`  3) Major (${nextVersions.major}) - Breaking changes`);
  console.log(`  4) Custom version`);

  const choice = await question('\nYour choice (1-4): ');
  let newVersion;

  switch (choice.trim()) {
    case '1':
      newVersion = nextVersions.patch;
      break;
    case '2':
      newVersion = nextVersions.minor;
      break;
    case '3':
      newVersion = nextVersions.major;
      break;
    case '4':
      newVersion = await question('Enter version (e.g., 1.2.3): ');
      break;
    default:
      console.log('❌ Invalid choice');
      process.exit(1);
  }

  console.log(`\n✅ Selected version: ${newVersion}`);

  // Step 3: CHANGELOG
  console.log('\n📋 Step 3: Updating CHANGELOG.md');
  const commits = getCommitsSinceLastTag();

  if (commits) {
    console.log('\n📝 Recent commits:');
    console.log(commits.split('\n').slice(0, 10).join('\n'));
    if (commits.split('\n').length > 10) {
      console.log(`... and ${commits.split('\n').length - 10} more`);
    }
  }

  const changelogTemplate = generateChangelogTemplate(newVersion, commits || '');
  console.log('\n📄 Generated CHANGELOG entry:');
  console.log('─'.repeat(50));
  console.log(changelogTemplate);
  console.log('─'.repeat(50));

  const editChangelog = await question('\nDo you want to edit the CHANGELOG entry? (y/N): ');

  if (editChangelog.toLowerCase() === 'y') {
    const tempFile = path.join(__dirname, '../.changelog-temp.md');
    fs.writeFileSync(tempFile, changelogTemplate);

    console.log('\n📝 Opening editor...');
    console.log('💡 Edit the CHANGELOG entry, save, and close the editor to continue.');
    await pause();

    // Try to open in user's default editor
    const editor = process.env.EDITOR || process.env.VISUAL || 'notepad';
    try {
      exec(`${editor} "${tempFile}"`);
    } catch {
      console.log(`\n📝 Please edit this file manually: ${tempFile}`);
      await pause('Press Enter after you have edited and saved the file...');
    }

    const editedContent = fs.readFileSync(tempFile, 'utf-8');
    updateChangelog(editedContent);
    fs.unlinkSync(tempFile);
  } else {
    updateChangelog(changelogTemplate);
  }

  console.log('✅ CHANGELOG.md updated');

  // Step 4: Update version
  console.log('\n📋 Step 4: Updating version in package files...');

  // Update root package.json
  const rootPkgPath = path.join(__dirname, '../package.json');
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'));
  rootPkg.version = newVersion;
  fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n');

  // Update frontend package.json
  const frontendPkgPath = path.join(__dirname, '../frontend/package.json');
  if (fs.existsSync(frontendPkgPath)) {
    const frontendPkg = JSON.parse(fs.readFileSync(frontendPkgPath, 'utf-8'));
    frontendPkg.version = newVersion;
    fs.writeFileSync(frontendPkgPath, JSON.stringify(frontendPkg, null, 2) + '\n');
  }

  console.log('✅ Version updated in all package files');

  // Step 5: Commit version bump
  console.log('\n📋 Step 5: Committing version bump...');
  exec('git add package.json frontend/package.json CHANGELOG.md');
  exec(`git commit -m "chore: release v${newVersion}"`);
  console.log('✅ Version bump committed');

  // Step 6: Create git tag
  console.log('\n📋 Step 6: Creating git tag...');
  exec(`git tag -a v${newVersion} -m "Release v${newVersion}"`);
  console.log(`✅ Tag v${newVersion} created`);

  // Step 7: Build
  console.log('\n📋 Step 7: Building application...');
  const buildAnswer = await question('\nDo you want to build the application now? (Y/n): ');

  if (buildAnswer.toLowerCase() !== 'n') {
    console.log('\n🔨 Running build...');
    exec('npm run build');
    console.log('✅ Build completed');

    const distAnswer = await question('\nDo you want to create distribution packages? (Y/n): ');
    if (distAnswer.toLowerCase() !== 'n') {
      console.log('\n📦 Creating distribution packages...');
      console.log('⏳ This may take a while...');
      exec('npm run dist');
      console.log('✅ Distribution packages created');

      // Show created files
      const distDir = path.join(__dirname, '../release');
      if (fs.existsSync(distDir)) {
        console.log('\n📦 Distribution files:');
        const files = fs.readdirSync(distDir);
        files.forEach(file => {
          const stats = fs.statSync(path.join(distDir, file));
          const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
          console.log(`  - ${file} (${sizeMB} MB)`);
        });
      }
    }
  }

  // Step 8: Push to remote
  console.log('\n📋 Step 8: Pushing to remote...');
  const pushAnswer = await question('\nDo you want to push to remote now? (Y/n): ');

  if (pushAnswer.toLowerCase() !== 'n') {
    console.log('\n⬆️  Pushing commits and tags...');
    exec('git push origin main');
    exec('git push origin --tags');
    console.log('✅ Pushed to remote');
  }

  // Step 9: GitHub Release
  console.log('\n📋 Step 9: GitHub Release');
  const releaseNotes = extractReleaseNotes(newVersion);

  console.log('\n📄 Release notes:');
  console.log('─'.repeat(50));
  console.log(releaseNotes);
  console.log('─'.repeat(50));

  const ghAnswer = await question('\nDo you want to create a GitHub release? (Y/n): ');

  if (ghAnswer.toLowerCase() !== 'n') {
    // Check if GitHub CLI is available
    try {
      exec('gh --version', { silent: true });

      console.log('\n🌐 Creating GitHub release...');

      // Save release notes to temp file
      const notesFile = path.join(__dirname, '../.release-notes-temp.md');
      fs.writeFileSync(notesFile, releaseNotes);

      try {
        // Create release with notes
        exec(`gh release create v${newVersion} --title "Release v${newVersion}" --notes-file "${notesFile}"`);

        // Ask about uploading distribution files
        const uploadAnswer = await question('\nDo you want to upload distribution files? (Y/n): ');
        if (uploadAnswer.toLowerCase() !== 'n') {
          const distDir = path.join(__dirname, '../release');
          if (fs.existsSync(distDir)) {
            const files = fs.readdirSync(distDir).filter(f =>
              f.endsWith('.exe') ||
              f.endsWith('.dmg') ||
              f.endsWith('.AppImage') ||
              f.endsWith('.deb') ||
              f.endsWith('.zip')
            );

            if (files.length > 0) {
              console.log('\n📤 Uploading distribution files...');
              files.forEach(file => {
                console.log(`  Uploading ${file}...`);
                exec(`gh release upload v${newVersion} "${path.join(distDir, file)}"`);
              });
              console.log('✅ Distribution files uploaded');
            }
          }
        }

        fs.unlinkSync(notesFile);
        console.log('✅ GitHub release created');

        // Get release URL
        const releaseUrl = exec(`gh release view v${newVersion} --json url -q .url`, { silent: true }).trim();
        console.log(`\n🔗 Release URL: ${releaseUrl}`);

      } catch (error) {
        fs.unlinkSync(notesFile);
        throw error;
      }

    } catch {
      console.log('\n⚠️  GitHub CLI (gh) not found.');
      console.log('📝 Please create the release manually at:');
      console.log(`   https://github.com/YOUR_USERNAME/whisper-electron-app/releases/new?tag=v${newVersion}`);
      console.log('\n📋 Release notes have been copied to CHANGELOG.md');
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('🎉 Release process completed!');
  console.log('═'.repeat(50));
  console.log(`\n📦 Version: v${newVersion}`);
  console.log(`✅ Commits pushed: ${pushAnswer.toLowerCase() !== 'n' ? 'Yes' : 'No'}`);
  console.log(`✅ GitHub release: ${ghAnswer.toLowerCase() !== 'n' ? 'Yes' : 'No'}`);

  console.log('\n📝 Next steps:');
  if (pushAnswer.toLowerCase() === 'n') {
    console.log('  - Push commits: git push origin main --follow-tags');
  }
  if (ghAnswer.toLowerCase() === 'n') {
    console.log('  - Create GitHub release manually');
  }
  console.log('  - Announce the release');
  console.log('  - Update documentation if needed');

  console.log('\n✨ Happy releasing!\n');

  rl.close();
}

// Run
main().catch(error => {
  console.error('\n❌ Release failed:', error.message);
  rl.close();
  process.exit(1);
});
