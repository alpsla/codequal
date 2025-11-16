# Oracle Cloud Setup - TypeScript Phase 1

**Date**: January 13, 2025
**Phase**: TypeScript/JavaScript Unified Shared Tools
**Duration**: ~30 minutes total

---

## 🎯 What We're Doing

Setting up unified shared tools on Oracle Cloud for TypeScript/JavaScript analysis:
- Extract ESLint and TypeScript from Docker image
- Install in `/opt/codequal-tools` (shared across all repos)
- Test ESLint detection (should find 3-4 issues vs current 0)
- Validate 86% performance improvement

---

## 📋 Prerequisites

- ✅ SSH key configured: `$SSH_KEY` = `/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key`
- ✅ Oracle IP: `129.213.49.128`
- ✅ Setup script created: `packages/agents/scripts/setup-shared-tools.sh`
- ✅ TypeScript parser updated with shared tools support

---

## 🚀 Step-by-Step Execution

### Step 1: Upload Setup Script to Oracle (2 min)

**From your local machine:**

```bash
# Set environment variables
export SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
export ORACLE_IP="129.213.49.128"
export ORACLE_USER="opc"

# Upload setup script
scp -i "$SSH_KEY" \
  "/Users/alpinro/Code Prjects/codequal/packages/agents/scripts/setup-shared-tools.sh" \
  "$ORACLE_USER@$ORACLE_IP:~/codequal/packages/agents/scripts/"

echo "✅ Setup script uploaded"
```

---

### Step 2: SSH to Oracle Cloud

```bash
ssh -i "$SSH_KEY" "$ORACLE_USER@$ORACLE_IP"
```

**You should now be on Oracle Cloud server.**

---

### Step 3: Navigate to Project Directory

```bash
cd ~/codequal/packages/agents
pwd  # Should show: /home/opc/codequal/packages/agents
```

---

### Step 4: Make Setup Script Executable

```bash
chmod +x scripts/setup-shared-tools.sh
ls -lh scripts/setup-shared-tools.sh  # Verify permissions
```

---

### Step 5: Run Unified Shared Tools Setup (10 min)

**This will:**
1. Create `/opt/codequal-tools` directory structure
2. Extract ESLint and TypeScript from Docker image
3. Extract node_modules
4. Configure environment variables
5. Verify installation

```bash
# Run setup for TypeScript (Phase 1)
./scripts/setup-shared-tools.sh typescript

# Alternative: Run with sudo if permission issues
# sudo ./scripts/setup-shared-tools.sh typescript
```

**Expected output:**
```
==========================================
CodeQual Unified Shared Tools Setup
==========================================
Phase: typescript
Tools directory: /opt/codequal-tools

📁 Creating directory structure...
✅ Directories created

==========================================
📦 Installing TypeScript/JavaScript Tools
==========================================
→ Extracting ESLint...
→ Extracting TypeScript compiler...
→ Extracting node_modules...
   Found in /usr/local/lib/node_modules
✅ TypeScript/JavaScript tools extracted

Verification:
✅ ESLint: 1.2M
✅ TSC: 890K
✅ ESLint package: 45M

==========================================
📦 Installing Universal Tools (Semgrep)
==========================================
→ Extracting Semgrep...
✅ Semgrep extracted
✅ Semgrep: 15M

==========================================
🔧 Configuring Environment
==========================================
✅ Environment configured in ~/.bashrc

==========================================
✅ Verification Summary
==========================================

TypeScript/JavaScript:
✅ ESLint: v8.57.0
✅ TSC: Version 5.3.3

Universal:
✅ Semgrep: 1.45.0

📊 Disk Usage:
500M	/opt/codequal-tools
  60M	/opt/codequal-tools/bin
 440M	/opt/codequal-tools/lib

==========================================
🎉 Setup Complete!
==========================================

📝 Next Steps:
1. Run: source ~/.bashrc
2. Test: eslint --version
3. Run CodeQual tests to verify ESLint detection
```

---

### Step 6: Reload Environment

```bash
source ~/.bashrc
```

---

### Step 7: Verify Installation

```bash
# Check if tools are in PATH
which eslint
# Expected: /opt/codequal-tools/bin/eslint

which tsc
# Expected: /opt/codequal-tools/bin/tsc

which semgrep
# Expected: /opt/codequal-tools/bin/semgrep

# Check versions
eslint --version
# Expected: v8.x.x or v9.x.x

tsc --version
# Expected: Version 5.x.x

semgrep --version
# Expected: 1.x.x

# Check disk usage
du -sh /opt/codequal-tools
# Expected: ~500M
```

**If any tool is missing, check the setup script output for errors.**

---

### Step 8: Verify Environment Variables

```bash
echo $CODEQUAL_TOOLS_PATH
# Expected: /opt/codequal-tools

echo $PATH | grep codequal
# Expected: Should contain /opt/codequal-tools/bin

echo $NODE_PATH | grep codequal
# Expected: Should contain /opt/codequal-tools/lib/node_modules
```

---

## 🧪 Testing Phase

### Test 1: Diagnostic Test (5 min)

**Purpose**: Test ESLint in isolation (no V9 orchestration)

```bash
cd ~/codequal/packages/agents

# Run diagnostic test
npx ts-node tests/integration/typescript/test-eslint-diagnostic.ts
```

**Expected Output:**
```
==========================================
ESLint Diagnostic Test
==========================================

Step 1: Creating temporary test directory...
✅ Created: /tmp/eslint-diagnostic-test-XXXXX

Step 2: Installing ESLint and TypeScript...
[npm install output]
✅ ESLint and TypeScript installed

Step 3: Creating .eslintrc.json with rules enabled...
✅ ESLint config created

Step 4: Creating test file with 4 known issues...
✅ Test file created

Step 5: Running ESLint WITHOUT --config flag...
Result: X issues found
⚠️  Without explicit --config, ESLint may not use our config

Step 6: Running ESLint WITH --config .eslintrc.json flag...
Result: 4 issues found ✅
✅ Issues detected!

📋 Issues found:
   1. no-unused-vars (line 4): 'unusedVariable' is assigned...
   2. no-unused-vars (line 7): 'anotherUnused' is assigned...
   3. @typescript-eslint/no-unused-vars (line 10): 'unusedParam'...
   4. no-console (line 15): Unexpected console statement

==========================================
✅ Diagnostic Test PASSED
==========================================

ESLint correctly detects issues when --config flag is used.
```

**Success Criteria:**
- ✅ 4 issues detected
- ✅ `--config` flag makes a difference

**If test fails:**
- Check ESLint version
- Check config file syntax
- Check TypeScript parser version

---

### Test 2: React Local Branch Test (10 min)

**Purpose**: Test ESLint detection in full V9 orchestration

```bash
cd ~/codequal/packages/agents

# Run React test
npx ts-node tests/integration/test-v9-lite-e2e.ts
```

**Watch for these log messages:**

```
[ESLint] ✅ Using shared tools from: /opt/codequal-tools  ← Should see this!
[ESLint Debug] Command: /opt/codequal-tools/bin/eslint
[ESLint Debug] Files to scan: ...
[ESLint Debug] Config: .../react/.eslintrc.json

🔍 Running diagnostic: Testing ESLint directly on production file...
🎯 Direct ESLint test result: 3-4 issues found  ← Should see issues!
✅ Direct test passed: ESLint is detecting issues correctly

📊 Tool Results:
   - ESLint: 3-4 issues (NEW! Previously 0)  ← Success!
   - TypeScript: 49 issues
   - npm-audit: 116 issues
   - Semgrep: 2 issues
   Total: 170-171 issues (was 167)
```

**Success Criteria:**
- ✅ Logs show "Using shared tools" (not "falling back to npx")
- ✅ Direct ESLint test finds issues
- ✅ V9 orchestration detects same issues
- ✅ Total issues > 167 (ESLint contributing now)
- ✅ **NO npm install output in logs**

**If ESLint still shows 0 issues:**
- Check diagnostic test results first
- Check ESLint debug logs for command used
- Verify `.eslintrc.json` is created
- Verify production file contains violations

---

### Test 3: Oracle E2E Test (Optional - 20 min)

**Purpose**: Full end-to-end test with report generation

```bash
cd ~/codequal/packages/agents

# Run full E2E test
./scripts/testing/oracle/oracle-run-react-local-branch-test.sh
```

**This will:**
1. Clone React repository
2. Create local PR branch with ESLint issues
3. Run full V9 analysis
4. Generate markdown report
5. Upload report to Supabase

**Check report for:**
- ✅ ESLint section present
- ✅ ESLint issues listed (3-4 items)
- ✅ ESLint integrated with other tools
- ✅ Total issues > 167

---

## 📊 Expected Results Summary

### Performance Comparison

| Metric | Before (npx) | After (Shared Tools) | Improvement |
|--------|--------------|---------------------|-------------|
| **First Analysis** | 35s (install + run) | **5s (run only)** | **86% faster** ✅ |
| **ESLint Issues Detected** | 0 ❌ | 3-4 ✅ | **Fixed!** |
| **Disk Usage (10 repos)** | 3GB | 500MB | **83% less** |
| **npm install per repo** | Yes ❌ | No ✅ | **Eliminated** |

---

### Tool Detection Results

**Before:**
```
React Test Results:
- ESLint: 0 issues ❌
- TypeScript: 49 issues ✅
- npm-audit: 116 issues ✅
- Semgrep: 2 issues ✅
Total: 167 issues
```

**After (Expected):**
```
React Test Results:
- ESLint: 3-4 issues ✅ (FIXED!)
- TypeScript: 49 issues ✅
- npm-audit: 116 issues ✅
- Semgrep: 2 issues ✅
Total: 170-171 issues
```

---

## 🐛 Troubleshooting

### Issue: ESLint not found in PATH

**Solution:**
```bash
# Reload environment
source ~/.bashrc

# Check PATH
echo $PATH | grep codequal

# If still not found, manually add to PATH
export PATH="/opt/codequal-tools/bin:$PATH"

# Test again
which eslint
```

---

### Issue: Permission denied creating /opt/codequal-tools

**Solution:**
```bash
# Run setup with sudo
sudo ./scripts/setup-shared-tools.sh typescript

# Then fix permissions
sudo chown -R opc:opc /opt/codequal-tools
```

---

### Issue: Docker image not found

**Solution:**
```bash
# Check Docker images
docker images | grep typescript

# Pull image if missing
docker pull iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-typescript-v4.6-arm

# Re-run setup
./scripts/setup-shared-tools.sh typescript
```

---

### Issue: ESLint still shows 0 issues

**Check these in order:**

1. **Verify shared tools are used:**
   ```bash
   # Check logs for:
   [ESLint] ✅ Using shared tools from: /opt/codequal-tools
   # NOT:
   [ESLint] ⚠️  Shared tools not found, falling back to npx
   ```

2. **Run diagnostic test first:**
   ```bash
   npx ts-node tests/integration/typescript/test-eslint-diagnostic.ts
   ```

3. **Check ESLint config:**
   ```bash
   # In test output, verify .eslintrc.json was created
   cat /tmp/react-repo/.eslintrc.json
   ```

4. **Check production file has violations:**
   ```bash
   # Verify file exists and contains unused variables
   cat /tmp/react-repo/src/codequal-validation.ts | grep "const unused"
   ```

---

## 📝 Documentation to Update After Success

1. **Mark todos complete** in todo list
2. **Update QUICK_START_NEXT_SESSION.md** - Mark TypeScript Phase 1 complete
3. **Document actual performance** (vs estimated 86%)
4. **Record actual issues detected** (vs estimated 3-4)
5. **Create success summary** for session

---

## ✅ Success Checklist

After completing all tests, verify:

- [ ] `/opt/codequal-tools` created and contains tools
- [ ] ESLint accessible via PATH
- [ ] TSC accessible via PATH
- [ ] Semgrep accessible via PATH
- [ ] Diagnostic test passes (4 issues detected)
- [ ] React test detects ESLint issues (not 0)
- [ ] Logs show "Using shared tools" (not npx fallback)
- [ ] No npm install output in test logs
- [ ] Total issues > 167 (ESLint contributing)
- [ ] Performance improved (measure actual time)

---

## 🎯 Next Steps After Success

1. **Document results** - Actual performance vs estimated
2. **Update architecture docs** - Mark TypeScript complete
3. **Prepare Phase 2** - Python setup (same script, different phase)
4. **Commit changes** - Update documentation with results
5. **Plan Python implementation** - Schedule for next week

---

**Ready to execute! Follow the steps above and track progress with todos.** 🚀
