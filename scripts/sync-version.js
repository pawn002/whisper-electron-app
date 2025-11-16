#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read root package.json version
const rootPackagePath = path.join(__dirname, '..', 'package.json');
const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));
const version = rootPackage.version;

console.log(`Syncing version ${version} to all sub-packages...`);

// Update backend package.json
const backendPackagePath = path.join(__dirname, '..', 'backend', 'package.json');
if (fs.existsSync(backendPackagePath)) {
  const backendPackage = JSON.parse(fs.readFileSync(backendPackagePath, 'utf8'));
  backendPackage.version = version;
  fs.writeFileSync(backendPackagePath, JSON.stringify(backendPackage, null, 2) + '\n');
  console.log(`✓ Updated backend/package.json to ${version}`);
}

// Update frontend package.json
const frontendPackagePath = path.join(__dirname, '..', 'frontend', 'package.json');
if (fs.existsSync(frontendPackagePath)) {
  const frontendPackage = JSON.parse(fs.readFileSync(frontendPackagePath, 'utf8'));
  frontendPackage.version = version;
  fs.writeFileSync(frontendPackagePath, JSON.stringify(frontendPackage, null, 2) + '\n');
  console.log(`✓ Updated frontend/package.json to ${version}`);
}

console.log(`\n✅ All packages synced to version ${version}`);
