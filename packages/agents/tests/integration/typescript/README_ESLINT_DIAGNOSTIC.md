# ESLint Diagnostic Test

## Purpose

This diagnostic test validates that ESLint can detect issues correctly **before** running the full V9 integration test. It helps isolate whether ESLint detection issues are caused by:

1. **ESLint configuration problems** (wrong config syntax, disabled rules)
2. **ESLint installation issues** (missing packages, version conflicts)
3. **File path or ignore pattern problems**
4. **Orchestration layer issues** (how we call ESLint)

## What It Does

The diagnostic test creates a **minimal, isolated environment** and:

1. ✅ Creates a fresh temp directory
2. ✅ Installs ESLint + TypeScript from scratch
3. ✅ Creates `.eslintrc.json` with rules explicitly enabled
4. ✅ Creates a test file with 4 known ESLint issues
5. ✅ Runs ESLint **without** `--config` flag
6. ✅ Runs ESLint **with** `--config .eslintrc.json` flag
7. ✅ Compares results to identify the issue

## Expected Output

**Successful Detection:**
```
Step 6: Running ESLint WITH --config .eslintrc.json flag...
   Result: 4 issues found (ESLint exit code 1 = has issues)
   ✅ Issues detected!

   📋 Issues found:
      1. no-unused-vars (line 4): 'unusedVariable' is assigned a value but never used
      2. no-unused-vars (line 7): 'anotherUnused' is assigned a value but never used
      3. @typescript-eslint/no-unused-vars (line 10): 'unusedParam' is defined but never used
      4. no-console (line 15): Unexpected console statement
```

**Failed Detection:**
```
Step 6: Running ESLint WITH --config .eslintrc.json flag...
   Result: 0 issues found
   🚨 CRITICAL: No issues found even with --config flag!
```

## Usage

### Run Locally
```bash
cd packages/agents
npx ts-node tests/integration/typescript/test-eslint-diagnostic.ts
```

### Run on Oracle Cloud
```bash
ssh -i "$SSH_KEY" opc@129.213.49.128 << 'EOF'
cd ~/codequal/packages/agents
npx ts-node tests/integration/typescript/test-eslint-diagnostic.ts
EOF
```

## Interpreting Results

### If diagnostic finds 4 issues ✅
- ESLint is working correctly
- The problem is in the V9 orchestration layer
- Check `typescript-tool-parser.ts` ESLint command
- Check file paths being passed to ESLint

### If diagnostic finds 0 issues ❌
- ESLint configuration or installation issue
- Possible causes:
  1. **Parser incompatibility**: `@typescript-eslint/parser` version mismatch
  2. **Plugin not loaded**: `@typescript-eslint/eslint-plugin` not found
  3. **Config not applied**: `.eslintrc.json` syntax error or not being read
  4. **Rule conflict**: Some other config overriding our rules

### If diagnostic errors ❌
- Installation problem (missing npm packages)
- Permission issues (can't write to temp directory)
- Node.js version incompatibility

## Fixes Applied (Session 28)

Based on diagnostic results, we applied these fixes:

### Fix 1: Add `--config` flag
**File:** `src/two-branch/parsers/typescript-tool-parser.ts`

```typescript
// BEFORE
const command = `cd ${repoPath} && npx eslint ${fileArgs} ${ignorePatterns.join(' ')} --format json 2>&1`;

// AFTER
const command = `cd ${repoPath} && npx eslint ${fileArgs} --config .eslintrc.json ${ignorePatterns.join(' ')} --format json 2>&1`;
```

**Why:** Without `--config`, ESLint may use cached config or parent directory config instead of our updated `.eslintrc.json`.

### Fix 2: Add debug logging
**File:** `src/two-branch/parsers/typescript-tool-parser.ts`

```typescript
console.log(`[ESLint Debug] Executing: npx eslint with config .eslintrc.json`);
console.log(`[ESLint Debug] Files to scan: ${fileArgs}`);
console.log(`[ESLint Debug] stdout length: ${stdout.length} bytes`);
```

**Why:** Helps diagnose what ESLint is actually doing.

### Fix 3: Add direct ESLint test
**File:** `tests/integration/test-v9-lite-e2e.ts`

Runs ESLint directly on the production file before starting the full V9 analysis. Catches config issues immediately.

## Next Steps

1. ✅ Run diagnostic test to validate ESLint works in isolation
2. ✅ If diagnostic passes, run full V9 test to validate orchestration
3. ✅ Check debug logs in V9 test for ESLint execution details
4. ❌ If still 0 issues, compare diagnostic vs V9 ESLint commands

## Test Directory

The diagnostic test leaves the temp directory intact for manual inspection:
```
/tmp/eslint-diagnostic-XXXXXX/
├── package.json
├── .eslintrc.json
├── test.ts (with 4 intentional issues)
└── node_modules/
```

You can manually run ESLint in this directory to experiment with different flags and configs.

## Related Files

- **Main test**: `tests/integration/test-v9-lite-e2e.ts`
- **ESLint parser**: `src/two-branch/parsers/typescript-tool-parser.ts`
- **TypeScript orchestrator**: `src/two-branch/tools/typescript/typescript-tool-orchestrator.ts`
- **Test file filter**: `src/two-branch/utils/test-file-filter.ts`

## Troubleshooting

### "Cannot find module 'eslint'"
```bash
cd /tmp/eslint-diagnostic-XXXXXX
npm install
```

### "Parsing error: Cannot find module '@typescript-eslint/parser'"
Update package.json versions:
```json
"@typescript-eslint/parser": "^7.0.0",
"@typescript-eslint/eslint-plugin": "^7.0.0"
```

### Still 0 issues after all fixes
Try `.eslintrc.js` instead of `.json`:
```javascript
module.exports = {
  rules: {
    'no-unused-vars': 'error',
    '@typescript-eslint/no-unused-vars': 'error'
  }
};
```
