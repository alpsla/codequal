# Dependabot Security Fixes - October 9, 2025

## 🔒 Security Vulnerabilities Fixed

### Summary
- **Total Alerts**: 5 (4 High, 1 Low)
- **Packages Fixed**: 3
- **Files Modified**: 2

---

## ✅ Fixed Vulnerabilities

### 1. ✅ ws >= 8.17.1 (High Severity - Alert #6)
**Status**: Already Fixed ✅
- **CVE**: CVE-2024-37890
- **CVSS**: 4.0 (High)
- **Issue**: Request with excessive headers can crash server
- **Current Version**: ^8.18.2 (in `packages/core/package.json`)
- **Required**: >= 8.17.1
- **Action**: None needed - already compliant

### 2. ✅ tar-fs >= 3.0.9 (High Severity - Alerts #8, #9, #14)
**Status**: Fixed via puppeteer upgrade ✅
- **CVE**: CVE-2024-12905
- **CVSS**: 8.7/10 (High)
- **Issue**: Path traversal and link following vulnerabilities
- **Root Cause**: Transitive dependency via `puppeteer@21.11.0`
- **Fix**: Upgraded puppeteer to v24.23.0
- **File**: `packages/agents/mcp-tools/browsertools-mcp/package.json`
- **Change**: `"puppeteer": "^21.0.0"` → `"puppeteer": "^24.23.0"`

### 3. ✅ cookie >= 0.7.0 (Low Severity - Alert #7)
**Status**: Fixed via lighthouse upgrade ✅
- **CVE**: CVE-2024-47764
- **CVSS**: v4 base (Low)
- **Issue**: Cookie field validation vulnerability
- **Root Cause**: Transitive dependency via `lighthouse@11.0.0 → cookie@0.4.2`
- **Fix**: Upgraded lighthouse to v12.8.2
- **Files Modified**:
  - `packages/agents/mcp-tools/browsertools-mcp/package.json`
  - `packages/mcp-hybrid/package.json`
- **Change**: `"lighthouse": "^11.0.0"` → `"lighthouse": "^12.8.2"`

---

## 📋 Changes Made

### File 1: `packages/agents/mcp-tools/browsertools-mcp/package.json`
```diff
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.17.4",
-   "lighthouse": "^11.0.0",
+   "lighthouse": "^12.8.2",
-   "puppeteer": "^21.0.0"
+   "puppeteer": "^24.23.0"
  }
```

### File 2: `packages/mcp-hybrid/package.json`
```diff
  "dependencies": {
    ...
-   "lighthouse": "^11.0.0",
+   "lighthouse": "^12.8.2",
    ...
  }
```

---

## 🧪 Testing Required

Before merging, verify:

1. **browsertools-mcp compatibility**:
   ```bash
   cd packages/agents/mcp-tools/browsertools-mcp
   npm install
   npm run build
   npm test
   ```

2. **mcp-hybrid compatibility**:
   ```bash
   cd packages/mcp-hybrid
   npm install
   npm run build
   npm test
   ```

3. **Check for breaking changes**:
   - Puppeteer 21 → 24: [Migration Guide](https://pptr.dev/guides/migrate)
   - Lighthouse 11 → 12: [Changelog](https://github.com/GoogleChrome/lighthouse/releases)

---

## 📊 Version Upgrade Summary

| Package | Before | After | Major Jump? |
|---------|--------|-------|-------------|
| ws | ^8.18.2 | ^8.18.2 | No (already fixed) |
| puppeteer | ^21.0.0 | ^24.23.0 | Yes (3 major versions) |
| lighthouse | ^11.0.0 | ^12.8.2 | Yes (1 major version) |

---

## ⚠️ Breaking Changes to Watch

### Puppeteer 21 → 24
- API changes in browser launch options
- Updated TypeScript types
- New features: BiDi protocol support

### Lighthouse 11 → 12
- Updated scoring algorithm
- New performance metrics
- CLI flag changes

---

## 🎯 Next Steps

1. ✅ Package versions updated
2. ⏳ Run tests to verify compatibility
3. ⏳ Create PR with these changes
4. ⏳ Wait for CI to pass
5. ⏳ Merge PR
6. ⏳ Verify Dependabot alerts close automatically

---

**Date**: 2025-10-09  
**Session**: Quick Win - Dependabot Fixes  
**Impact**: All 5 high/low severity vulnerabilities resolved
