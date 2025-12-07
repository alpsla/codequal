# CodeQual Validation & Auto-Fix Testing Plan

**Date**: November 14, 2025
**Goal**: Validate all V9 fixes in CodeQual, then test auto-fix functionality with real + fake issues

---

## Phase 1: Validate All V9 Fixes in CodeQual

### Step 1.1: Verify Your Fixes Locally

**Files to Check**:
1. ✅ `packages/agents/src/two-branch/report/business-impact.ts:258-264`
   - Should show BOTH "Blocking" and "All Issues" auto-fix coverage

2. ✅ `packages/agents/src/two-branch/report/educational-resources.ts:238,285`
   - Should use Google Search instead of YouTube

**Verification**:
```bash
cd /Users/alpinro/Code\ Prjects/codequal

# Check business-impact fix
grep -A 3 "Auto-Fix Coverage" packages/agents/src/two-branch/report/business-impact.ts

# Check educational resources fix
grep "google.com/search" packages/agents/src/two-branch/report/educational-resources.ts
```

### Step 1.2: Verify Infrastructure Fixes

**Files to Check**:
3. ✅ `packages/agents/src/two-branch/parsers/typescript-tool-parser.ts:99-110`
   - ESLint timeout fix with limited-depth patterns

4. ✅ `packages/agents/src/two-branch/utils/test-file-filter.ts`
   - Test file filtering (no `test-autofix-issues` patterns)

**Verification**:
```bash
# Check ESLint pattern fix
grep -A 8 "Baseline analysis" packages/agents/src/two-branch/parsers/typescript-tool-parser.ts

# Check test file filter
grep "TEST_FILE_NAME_PATTERNS" -A 6 packages/agents/src/two-branch/utils/test-file-filter.ts
```

### Step 1.3: Run CodeQual Self-Analysis (Local)

**Test CodeQual against itself to find real issues**:
```bash
cd /Users/alpinro/Code\ Prjects/codequal

# Create test branch
git checkout -b codequal-validation-test

# Run V9 analysis on CodeQual itself
cd packages/agents
npx ts-node tests/integration/test-v9-typescript-lite-e2e.ts

# Expected: Find real TypeScript/ESLint issues in CodeQual
# This tests if tools work on actual production code
```

### Step 1.4: Deploy All Fixes to Oracle

**Sync all local changes to Oracle**:
```bash
export SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
export ORACLE_IP="129.213.49.128"
export ORACLE_USER="opc"

# Deploy report fixes (your fixes)
scp -i "$SSH_KEY" \
  packages/agents/src/two-branch/report/business-impact.ts \
  packages/agents/src/two-branch/report/educational-resources.ts \
  "$ORACLE_USER@$ORACLE_IP:~/codequal/packages/agents/src/two-branch/report/"

# Deploy infrastructure fixes (our fixes)
scp -i "$SSH_KEY" \
  packages/agents/src/two-branch/parsers/typescript-tool-parser.ts \
  packages/agents/src/two-branch/utils/test-file-filter.ts \
  "$ORACLE_USER@$ORACLE_IP:~/codequal/packages/agents/src/two-branch/parsers/"

scp -i "$SSH_KEY" \
  packages/agents/src/two-branch/utils/test-file-filter.ts \
  "$ORACLE_USER@$ORACLE_IP:~/codequal/packages/agents/src/two-branch/utils/"

echo "✅ All fixes deployed to Oracle"
```

### Step 1.5: Verify Fixes on Oracle

**Run test on Oracle and verify all 3 fixes**:
```bash
# Run V9 test on Oracle
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  'cd ~/codequal/packages/agents && npx ts-node tests/integration/test-v9-lite-e2e.ts'

# Download latest report
LATEST=$(ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  'ls -t ~/codequal/packages/agents/tests/integration/test-outputs/*.md | head -1')

scp -i "$SSH_KEY" "$ORACLE_USER@$ORACLE_IP:$LATEST" test-outputs/validation-report.md

# Verify fixes in report
echo "Checking Auto-Fix Coverage..."
grep "Auto-Fix Coverage" test-outputs/validation-report.md

echo "Checking Educational Resources..."
grep "google.com/search" test-outputs/validation-report.md

echo "Checking ESLint Performance..."
grep "eslint.*\|" test-outputs/validation-report.md
```

### Step 1.6: Validation Checklist

- [ ] **Business Impact**: Shows both "Blocking" and "All Issues" rows
- [ ] **Educational Resources**: Uses Google Search (not YouTube)
- [ ] **ESLint Timeout**: Completes in < 5s (not 120s)
- [ ] **ESLint Detection**: Finds issues (not 0) when violations exist
- [ ] **Test File Filter**: Allows `validation-issues.ts`, blocks `*.test.ts`

---

## Phase 2: Auto-Fix Testing (Real + Fake Issues)

### Step 2.1: Create CodeQual Validation Branch

**Add intentional violations to CodeQual itself**:
```bash
cd /Users/alpinro/Code\ Prjects/codequal

# Make sure we're on validation branch
git checkout -b codequal-autofix-test

# Add validation-issues.ts to CodeQual
cp packages/agents/src/two-branch/docs/testing/validation-issues.ts \
   packages/agents/src/validation-issues.ts

# Commit
git add -A
git commit -m "test: Add validation issues for auto-fix testing

Added intentional violations for all TypeScript tools:
- ESLint: ~10 auto-fixable issues
- TypeScript: ~7 type issues
- Semgrep: ~6 security issues

Purpose: Test V9 auto-fix functionality on CodeQual project"

# Show what was added
git show --stat
```

### Step 2.2: Run V9 Analysis on CodeQual (With Violations)

**Test auto-fix generation on real project**:
```bash
cd packages/agents

# Run V9 TypeScript analysis
npx ts-node tests/integration/test-v9-typescript-lite-e2e.ts

# Expected Results:
# - Real CodeQual issues: TypeScript errors, ESLint warnings
# - Fake validation issues: ~23 intentional violations
# - Total: Real + Fake issues
# - Auto-fix: Generated for all fixable issues
```

### Step 2.3: Verify Auto-Fix Completeness

**Check generated auto-fix files**:
```bash
# Check LSP batch actions file
echo "LSP Batch Actions:"
ls -lh test-outputs/*lsp*.json | tail -1
cat test-outputs/*lsp*.json | jq '.[] | {file, line, kind, message}' | head -20

# Check SARIF report
echo "SARIF Report:"
ls -lh test-outputs/*sarif*.json | tail -1
cat test-outputs/*sarif*.json | jq '.runs[0].results | length'

# Check report auto-fix section
grep -A 10 "Apply ALL" test-outputs/*.md | tail -1
```

### Step 2.4: Test Auto-Fix Application

**Apply auto-fixes and verify they work**:
```bash
# Method 1: Manual fix application (verify fixes are correct)
# Review the LSP batch actions
cat test-outputs/*lsp*.json | jq '.' | less

# Method 2: Apply auto-fixes programmatically
# (This would be implemented in IDE integration)

# Verify fixes resolve issues
npm run lint
npm run typecheck
```

### Step 2.5: Testing Checklist (Auto-Fix)

- [ ] **LSP File Generated**: Contains batch actions for all fixable issues
- [ ] **SARIF File Generated**: Contains all issues with locations
- [ ] **Report Accuracy**: "Apply ALL X fixes" count matches LSP actions count
- [ ] **Fix Quality**: Auto-fixes actually resolve the issues
- [ ] **No Regressions**: Fixes don't introduce new errors
- [ ] **IDE Ready**: LSP format compatible with VS Code/IntelliJ

---

## Phase 3: Multi-Language Auto-Fix Testing

### Step 3.1: Test on External Repos (All Languages)

**TypeScript/JavaScript**:
```bash
# React
git clone https://github.com/facebook/react.git /tmp/react-test
cd /tmp/react-test
git checkout -b validation-test
cp /path/to/validation-issues.ts src/
git commit -am "Add validation issues"
# Run V9 analysis
```

**Java**:
```bash
# Spring PetClinic
git clone https://github.com/spring-projects/spring-petclinic.git /tmp/petclinic-test
cd /tmp/petclinic-test
git checkout -b validation-test
# Add Java validation issues from guide
# Run V9 analysis
```

**Python**:
```bash
# Flask
git clone https://github.com/pallets/flask.git /tmp/flask-test
cd /tmp/flask-test
git checkout -b validation-test
# Add Python validation issues from guide
# Run V9 analysis
```

### Step 3.2: Multi-Language Checklist

For EACH language, verify:
- [ ] **All tools detect issues**: ESLint/PMD/Pylint, etc.
- [ ] **Auto-fix coverage accurate**: Percentage matches reality
- [ ] **LSP/SARIF generated**: Both files created
- [ ] **Educational resources**: Google Search links work
- [ ] **Performance**: No timeouts, reasonable duration
- [ ] **Report completeness**: All 34 V9 sections present

---

## Expected Results Summary

### Phase 1: Validation (CodeQual Fixes)
- ✅ Auto-Fix Coverage: Shows both rows
- ✅ Educational Resources: Google Search
- ✅ ESLint: No timeout, fast execution
- Total Time: ~5 minutes

### Phase 2: Auto-Fix (CodeQual + Violations)
- Issues Found: Real CodeQual issues + ~23 validation issues
- Auto-Fix Generated: LSP + SARIF files
- Report Quality: Accurate counts, working links
- Total Time: ~10 minutes

### Phase 3: Multi-Language (3 Repos)
- TypeScript: ~25 issues, ~15 auto-fixable
- Java: ~30 issues, ~20 auto-fixable
- Python: ~20 issues, ~12 auto-fixable
- Total Time: ~30 minutes

---

## Quick Commands Reference

**Deploy to Oracle**:
```bash
./scripts/testing/oracle/oracle-sync-and-test.sh
```

**Run CodeQual Self-Test**:
```bash
cd packages/agents && npx ts-node tests/integration/test-v9-typescript-lite-e2e.ts
```

**Download Reports**:
```bash
./scripts/testing/oracle/oracle-sync-reports.sh
```

**Verify Fixes**:
```bash
grep -E "Auto-Fix Coverage|google.com/search|eslint.*\|" test-outputs/*.md | tail -20
```

---

**Ready to Start**: Phase 1 - Validation ✅
**Next**: Verify all fixes work, then move to auto-fix testing
**Documentation**: All guides in `src/two-branch/docs/testing/`
