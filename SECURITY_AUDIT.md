# Security Audit Report

**Date:** December 27, 2025
**Version Audited:** 1.1.2
**Auditor:** Automated Security Analysis

---

## Executive Summary

This audit identified **25 dependency vulnerabilities** (17 high, 6 moderate, 4 low) and several **code-level security considerations**. The most critical issues stem from outdated Angular packages with known XSS and XSRF vulnerabilities. The Electron security configuration follows best practices with context isolation and sandbox enabled.

---

## Dependency Vulnerabilities

### High Severity (17 total)

| Package | Vulnerability | CVE/Advisory | Impact |
|---------|--------------|--------------|--------|
| `@angular/common` < 19.2.16 | XSRF Token Leakage via Protocol-Relative URLs | [GHSA-58c5-g7wp-6w37](https://github.com/advisories/GHSA-58c5-g7wp-6w37) | Token exposure to attacker-controlled domains |
| `@angular/compiler` <= 18.2.14 | Stored XSS via SVG Animation, URL and MathML Attributes | [GHSA-v4hv-rgfq-gp49](https://github.com/advisories/GHSA-v4hv-rgfq-gp49) | Cross-site scripting attacks |
| `node-forge` <= 1.3.1 | ASN.1 Unbounded Recursion | [GHSA-554w-wpv2-vw27](https://github.com/advisories/GHSA-554w-wpv2-vw27) | Denial of service |
| `node-forge` <= 1.3.1 | ASN.1 Validator Desynchronization | [GHSA-5gfm-wpxj-wjgq](https://github.com/advisories/GHSA-5gfm-wpxj-wjgq) | Certificate validation bypass |
| `node-forge` <= 1.3.1 | ASN.1 OID Integer Truncation | [GHSA-65ch-62r8-g69g](https://github.com/advisories/GHSA-65ch-62r8-g69g) | Security bypass |
| `glob` 10.2.0 - 10.4.5 | Command Injection via -c/--cmd | [GHSA-5j98-mcp5-4vw2](https://github.com/advisories/GHSA-5j98-mcp5-4vw2) | Remote code execution |

**Affected Angular packages (all depend on vulnerable @angular/common or @angular/compiler):**
- `@angular/cdk` <= 17.3.10
- `@angular/forms` <= 19.2.15
- `@angular/material` <= 17.3.10
- `@angular/platform-browser` <= 19.2.15
- `@angular/platform-browser-dynamic` <= 19.2.15
- `@angular/router` <= 19.2.15
- `@angular/compiler-cli` <= 18.2.14
- `@ngtools/webpack` <= 18.2.21
- `@angular-devkit/build-angular` <= 19.2.14

### Moderate Severity (6 total)

| Package | Vulnerability | Advisory | Impact |
|---------|--------------|----------|--------|
| `esbuild` <= 0.24.2 | Dev server allows cross-origin requests | [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) | Source code exposure (dev only) |
| `http-proxy-middleware` 1.3.0 - 2.0.8 | fixRequestBody proceeds after bodyParser failure | [GHSA-9gqv-wp59-fq42](https://github.com/advisories/GHSA-9gqv-wp59-fq42) | Request smuggling |
| `webpack-dev-server` <= 5.2.0 | Source code theft via malicious websites | [GHSA-9jgg-88mc-972h](https://github.com/advisories/GHSA-9jgg-88mc-972h) | Source code exposure (dev only) |
| `webpack-dev-server` <= 5.2.0 | Source code theft (non-Chromium) | [GHSA-4v9v-hfq4-rm2v](https://github.com/advisories/GHSA-4v9v-hfq4-rm2v) | Source code exposure (dev only) |
| `vite` 0.11.0 - 6.1.6 | Depends on vulnerable esbuild | - | Inherited vulnerability |
| `@vitejs/plugin-basic-ssl` <= 1.1.0 | Depends on vulnerable vite | - | Inherited vulnerability |

### Low Severity (4 total)

| Package | Vulnerability | Advisory |
|---------|--------------|----------|
| `tmp` <= 0.2.3 | Arbitrary file write via symlink | [GHSA-52f5-9888-hmc6](https://github.com/advisories/GHSA-52f5-9888-hmc6) |
| `external-editor` >= 1.1.1 | Depends on vulnerable tmp | - |
| `inquirer` 3.0.0 - 9.3.7 | Depends on vulnerable external-editor | - |
| `@angular/cli` <= 18.1.0-rc.1 | Depends on vulnerable inquirer | - |

---

## Code-Level Security Analysis

### Positive Findings (Best Practices Implemented)

| Feature | Location | Status |
|---------|----------|--------|
| Context Isolation | `electron/main.ts:119` | Enabled |
| Node Integration Disabled | `electron/main.ts:118` | Disabled |
| Sandbox Mode | `electron/main.ts:120` | Enabled |
| Preload Script Isolation | `electron/preload.ts` | Context bridge used correctly |
| File Size Validation | `electron/main.ts:254-263` | 500MB limit enforced |
| Dialog API for File Access | `electron/main.ts:221-243` | Native dialog used |

### Security Considerations

#### 1. IPC Channel Listener Removal (Low Risk)
**Location:** `electron/preload.ts:50-52`
```typescript
removeAllListeners: (channel: string) => {
  ipcRenderer.removeAllListeners(channel);
}
```
**Issue:** Accepts arbitrary channel names without validation.
**Risk:** Low - renderer could remove listeners from unintended channels.
**Recommendation:** Whitelist allowed channels.

#### 2. Model Name Validation (Low Risk)
**Location:** `electron/services/whisper.service.ts:193-194`
```typescript
const modelUrl = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${modelName}.bin`;
const modelPath = path.join(this.modelsPath, `ggml-${modelName}.bin`);
```
**Issue:** Model names are not validated before URL construction.
**Risk:** Low - controlled by IPC which is already isolated.
**Recommendation:** Validate model name against allowed list.

#### 3. Audio File Path Handling (Low Risk)
**Location:** `electron/services/whisper.service.ts:487`
```typescript
const outputPath = inputPath.replace(path.extname(inputPath), '.wav');
```
**Issue:** Output path derived from input without canonicalization.
**Risk:** Low - files selected via native dialog.
**Recommendation:** Use `path.resolve()` and validate paths.

#### 4. Outdated Dependencies (Informational)
**Location:** `package.json`, `frontend/package.json`
- `inflight@1.0.6` - Deprecated, memory leak
- `glob@7.2.3` - Deprecated
- `boolean@3.2.0` - No longer supported
- `rimraf@3.0.2` - Deprecated
- `read-package-json@7.0.1` - No longer supported

---

## Remediation Plan

### Phase 1: Quick Fixes (Non-Breaking)

Run these commands to fix vulnerabilities that don't require breaking changes:

```bash
# Fix glob and node-forge in root
npm audit fix

# Fix glob and node-forge in frontend
cd frontend && npm audit fix
```

**Expected Result:** Resolves 2-4 vulnerabilities (glob, node-forge).

### Phase 2: Angular Upgrade (Breaking Change)

The Angular vulnerabilities require upgrading from v17 to v19.2.16+ or v21.x.

#### Option A: Patch Upgrade (Recommended)
Upgrade Angular to latest v19 patch with security fixes:

```bash
cd frontend

# Update all Angular packages to ^19.2.16
npm install @angular/core@^19.2.16 @angular/common@^19.2.16 @angular/compiler@^19.2.16 \
  @angular/forms@^19.2.16 @angular/platform-browser@^19.2.16 \
  @angular/platform-browser-dynamic@^19.2.16 @angular/router@^19.2.16 \
  @angular/animations@^19.2.16 @angular/cdk@^19 @angular/material@^19

# Update dev dependencies
npm install -D @angular/cli@^19 @angular/compiler-cli@^19.2.16 \
  @angular-devkit/build-angular@^19
```

#### Option B: Major Upgrade
Upgrade to Angular 21 (latest):

```bash
cd frontend
npx @angular/cli@21 update @angular/core@21 @angular/cli@21
```

**Breaking Changes to Address:**
- Review Angular 18, 19, 20, 21 migration guides
- Update deprecated APIs
- Test all components

### Phase 3: Code Hardening

#### 3.1 Whitelist IPC Channels
```typescript
// electron/preload.ts
const ALLOWED_CHANNELS = [
  'transcription-progress',
  'transcription-completed',
  'transcription-error',
  'model-download-progress',
  'menu-open-file'
];

removeAllListeners: (channel: string) => {
  if (ALLOWED_CHANNELS.includes(channel)) {
    ipcRenderer.removeAllListeners(channel);
  }
}
```

#### 3.2 Validate Model Names
```typescript
// electron/services/whisper.service.ts
private readonly VALID_MODELS = ['tiny', 'base', 'small', 'medium', 'large'];

async downloadModel(modelName: string, ...): Promise<void> {
  if (!this.VALID_MODELS.includes(modelName)) {
    throw new Error(`Invalid model name: ${modelName}`);
  }
  // ... rest of method
}
```

#### 3.3 Canonicalize File Paths
```typescript
// electron/services/whisper.service.ts
async convertAudioToWav(inputPath: string): Promise<string> {
  const resolvedInput = path.resolve(inputPath);
  const outputPath = path.join(
    path.dirname(resolvedInput),
    path.basename(resolvedInput, path.extname(resolvedInput)) + '.wav'
  );
  // ... rest of method
}
```

### Phase 4: Electron Update (Optional)

Check for Electron 28 security updates:

```bash
npm install electron@^28.3.0  # Latest v28 patch
# OR
npm install electron@^33      # Latest stable
```

---

## Priority Matrix

| Priority | Issue | Effort | Risk Reduction |
|----------|-------|--------|----------------|
| **P0** | Angular XSS/XSRF vulnerabilities | High | Critical |
| **P1** | npm audit fix (glob, node-forge) | Low | High |
| **P2** | IPC channel whitelist | Low | Low |
| **P3** | Model name validation | Low | Low |
| **P4** | Path canonicalization | Low | Low |
| **P5** | Electron update | Medium | Medium |

---

## Verification Commands

After remediation:

```bash
# Check root vulnerabilities
npm audit

# Check frontend vulnerabilities
cd frontend && npm audit

# Run tests
cd frontend && npm test

# Build and verify
npm run build
```

---

## Conclusion

The application has a solid security foundation with proper Electron security settings. The primary risks come from outdated Angular dependencies with known XSS and XSRF vulnerabilities. These should be addressed as a priority. The code-level issues are low risk due to existing security controls but should be hardened as defense-in-depth.

**Immediate Actions Required:**
1. Run `npm audit fix` in both root and frontend directories
2. Plan Angular upgrade to v19.2.16+ to resolve XSS/XSRF vulnerabilities
3. Apply code hardening recommendations
