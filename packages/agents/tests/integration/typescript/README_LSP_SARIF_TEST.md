# LSP/SARIF Auto-Fix + Fix Validation Telemetry Test

## Overview

This test validates the complete LSP/SARIF auto-fix implementation and fix validation telemetry system on the CodeQual project (TypeScript).

## What It Tests

1. **LSP/SARIF Generation**: Verifies that LSP Code Actions and SARIF reports are generated and uploaded to Supabase
2. **Fix Validation Cache**: Tests Redis-based caching of analysis results
3. **Telemetry Storage**: Validates that fix adoption metrics are stored in Supabase
4. **File Verification**: Downloads and validates LSP/SARIF file structure

## Prerequisites

- Oracle Cloud access (129.213.49.128)
- Environment variables configured (`.env` file)
- Redis running (10.116.0.7:6379)
- Supabase credentials configured

## Running the Test

### Option 1: Run on Oracle Cloud (Recommended)

```bash
# SSH to Oracle Cloud
ssh -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key" opc@129.213.49.128

# Navigate to project
cd ~/codequal/packages/agents

# Load environment variables
set -a; [ -f .env ] && . ./.env; set +a

# Run test
npx ts-node tests/integration/typescript/test-codequal-lsp-sarif-telemetry.ts
```

### Option 2: Use Test Script

```bash
# On Oracle Cloud
cd ~/codequal/packages/agents
./tests/integration/typescript/run-codequal-test.sh
```

## Test Flow

### Step 1: First Analysis
- Clones/updates CodeQual repository
- Runs TypeScript analysis tools (ESLint, TypeScript, Semgrep, npm-audit)
- Generates LSP Code Actions and SARIF report
- Uploads files to Supabase Storage
- Stores analysis results in Redis cache

### Step 2: Second Analysis
- Retrieves previous analysis from Redis cache
- Runs new analysis (or simulates for testing)
- Compares analyses to detect:
  - Issues resolved
  - Issues remaining
  - Fix adoption (exact, modified, different, not fixed)
- Stores telemetry metrics in Supabase `fix_telemetry` table
- Updates Redis cache with new analysis

### Step 3: File Verification
- Downloads LSP file from Supabase
- Downloads SARIF file from Supabase
- Validates file structure:
  - LSP: Array of code actions with required fields
  - SARIF: Version 2.1.0 with runs, results, rules
- Checks for batch actions ("Apply All", "Apply by Severity")

## Expected Output

```
═══════════════════════════════════════════════════════════════
🧪 LSP/SARIF Auto-Fix + Fix Validation Telemetry E2E Test
═══════════════════════════════════════════════════════════════
Repository: https://github.com/alpsla/codequal.git
PR Number: 1
Output Dir: /tmp/v9-reports/codequal-test
Redis URL: redis://10.116.0.7:6379
═══════════════════════════════════════════════════════════════

📁 Setting up repository...
   ✅ Repository ready (base: main, PR: pr-1)

📊 FIRST ANALYSIS: Generate LSP/SARIF + Store in Cache
   ✅ First Analysis Complete
   • Total Issues: 150
   • Issues with Fixes: 120
   • LSP URL: https://ftjhmbbcuqjqmmbaymqb.supabase.co/storage/v1/object/public/v9-attachments/...
   • SARIF URL: https://ftjhmbbcuqjqmmbaymqb.supabase.co/storage/v1/object/public/v9-attachments/...
   ✅ Analysis stored in Redis cache

📊 SECOND ANALYSIS: Compare with Cache + Store Telemetry
   ✅ Found previous analysis: 150 issues
   📊 Comparison Results:
   • Previous Issues: 150
   • Current Issues: 140
   • Resolved: 10
   • Fix Adoption:
     - Exact: 8
     - Modified: 2
   ✅ Telemetry stored in Supabase

📥 DOWNLOAD & VERIFY: LSP/SARIF Files
   ✅ LSP file downloaded
   ✅ LSP structure valid: 125 code actions
   ✅ Batch actions found: 5
   ✅ SARIF file downloaded
   ✅ SARIF structure valid

📊 TEST SUMMARY
   ✅ ALL TESTS PASSED
```

## Downloading Files for Local Testing

After the test completes, download the generated files:

```bash
# Download LSP file
scp -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key" \
  opc@129.213.49.128:/tmp/v9-reports/codequal-test/codequal-lsp-actions.json ./

# Download SARIF file
scp -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key" \
  opc@129.213.49.128:/tmp/v9-reports/codequal-test/codequal-sarif-report.json ./
```

## Testing in Cursor IDE

1. **Open CodeQual project** in Cursor IDE
2. **Open any file** with issues (check LSP file for file paths)
3. **Press Cmd+.** (or Ctrl+.) to open Quick Fix menu
4. **Verify** that "Apply All Fixes" appears at the top
5. **Test** applying fixes via batch actions:
   - "Apply All Fixes (X issues)"
   - "Apply Critical Fixes (X issues)"
   - "Apply High Severity Fixes (X issues)"
   - etc.
6. **Verify** that fixes are applied correctly

## Fix Validation Telemetry

The test validates the fix validation telemetry system:

- **Redis Cache**: Stores last analysis (180-day TTL)
- **Comparison**: Detects resolved issues and fix adoption
- **Supabase Storage**: Stores metrics in `fix_telemetry` table:
  - `fix_adoption_rate`: % of resolved issues using our recommendations
  - `resolution_rate`: % of previous issues resolved
  - Breakdown: exact, modified, different, not_fixed

## Troubleshooting

### "Missing Supabase credentials"
- Ensure `.env` file exists with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### "Redis connection failed"
- Check Redis is running: `redis-cli ping`
- Verify `REDIS_URL` in `.env`

### "LSP/SARIF URLs not found"
- Check Supabase Storage bucket `v9-attachments` exists
- Verify upload permissions in Supabase

### "No previous analysis found"
- This is expected on first run
- Second analysis will find the cached first analysis

## Files

- `test-codequal-lsp-sarif-telemetry.ts` - Main test file
- `run-codequal-test.sh` - Test runner script
- `README_LSP_SARIF_TEST.md` - This file

## Related Documentation

- `V9_CRITICAL_KNOWLEDGE_BASE.md` - V9 architecture details
- `FIX_VALIDATION_REDIS_GUIDE.md` - Fix validation system guide
- `CURSOR_AUTOFIX_IMPLEMENTATION.md` - LSP/SARIF implementation details


