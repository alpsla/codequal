# Cursor IDE Testing Guide - LSP/SARIF Auto-Fix

## 📋 What We're Testing

The new LSP/SARIF integration that enables Cursor IDE to:
1. Display "Apply All Fixes" batch action
2. Show severity-grouped batch actions (High, Medium)
3. Apply fixes with one click via Cmd+.

## ✅ Generated Files

**Location**: `/Users/alpinro/Code Prjects/codequal/packages/agents/tests/integration/test-outputs/lsp-sarif-output/`

1. **codequal-lsp-actions.json** (5.8 KB)
   - 5 code actions total
   - 1 batch action: "Apply All Fixes (2 issues)"
   - 2 severity batches: High (1 issue), Medium (1 issue)
   - 2 individual fixes

2. **codequal-sarif-report.json** (4.2 KB)
   - SARIF 2.1.0 format
   - 2 results with fixes
   - Industry-standard format for VSCode, IntelliJ, etc.

## 🎯 Test Scenarios

### Test 1: Verify LSP File Loads in Cursor

**Repository**: Spring PetClinic (spring-projects/spring-petclinic)

**Affected Files**:
1. `src/main/resources/application.properties` (line 17)
2. `.mvn/wrapper/MavenWrapperDownloader.java` (line 92)

**Steps**:
1. Clone Spring PetClinic (if not already):
   ```bash
   git clone https://github.com/spring-projects/spring-petclinic.git
   cd spring-petclinic
   ```

2. Open in Cursor IDE:
   ```bash
   cursor .
   ```

3. Load LSP actions file:
   - **Option A (Command Palette)**:
     - Press `Cmd+Shift+P`
     - Search for "Load Code Actions"
     - Select the `codequal-lsp-actions.json` file

   - **Option B (Extension Method)**:
     - If Cursor has a CodeQual extension, use that to load the file

   - **Option C (Manual Configuration)**:
     - Place LSP file in `.vscode/` directory
     - Cursor should auto-detect it

### Test 2: Verify Quick Fix Menu

**Steps**:
1. Open `src/main/resources/application.properties`
2. Go to line 17 (the management.endpoints line)
3. Press `Cmd+.` (or right-click → "Quick Fix")

**Expected Results**:
✅ Quick Fix menu appears with:
1. **"Apply All Fixes (2 issues)"** ← At the top (batch action)
2. **"Apply High Severity Fixes (1 issues)"**
3. **"Apply Medium Severity Fixes (1 issues)"**
4. **"Fix: Spring Actuator Fully Enabled"** (individual fix)

**If menu shows**:
❌ No actions → LSP file not loaded correctly
❌ Only individual fixes → Batch actions not working
❌ Grayed out actions → LSP format issue

### Test 3: Apply "Apply All Fixes" Batch Action

**Steps**:
1. Open `src/main/resources/application.properties`
2. Go to line 17
3. Press `Cmd+.`
4. Select **"Apply All Fixes (2 issues)"**

**Expected Results**:
✅ Both files modified simultaneously:
- `application.properties` updated (Spring Actuator fix)
- `MavenWrapperDownloader.java` updated (debug print removal)

**Verification**:
```bash
git diff
```
Should show changes in both files

### Test 4: Test Severity-Grouped Batch Actions

**Steps**:
1. Undo previous changes: `git checkout .`
2. Open `application.properties`, line 17
3. Press `Cmd+.`
4. Select **"Apply High Severity Fixes (1 issues)"**

**Expected Results**:
✅ Only `application.properties` modified (high severity fix)
❌ `MavenWrapperDownloader.java` NOT modified (medium severity)

### Test 5: Test Individual Fix Actions

**Steps**:
1. Undo: `git checkout .`
2. Open `MavenWrapperDownloader.java`, line 92
3. Press `Cmd+.`
4. Select **"Fix: Active Debug Code Printstacktrace"**

**Expected Results**:
✅ Only this file modified
✅ printStackTrace() line replaced with proper logging

## 🔍 What to Look For

### ✅ Success Indicators
- [ ] Quick Fix menu appears (Cmd+.)
- [ ] "Apply All Fixes" appears at top
- [ ] Severity batches appear (High, Medium)
- [ ] Batch actions apply multiple fixes at once
- [ ] Individual fixes work correctly
- [ ] Code changes match fix suggestions

### ❌ Failure Indicators
- [ ] Quick Fix menu empty
- [ ] Only individual fixes shown (no batches)
- [ ] Batch actions grayed out
- [ ] Wrong files modified
- [ ] Code changes incorrect

## 🐛 Troubleshooting

### Issue: Quick Fix menu is empty

**Solution**:
1. Check LSP file is loaded:
   - Look for CodeQual diagnostics in Problems panel
   - Check `.vscode/settings.json` for LSP configuration

2. Verify file paths match:
   - LSP uses absolute paths
   - Check workspace root is correct

### Issue: Batch actions don't appear

**Cause**: Cursor may not support batch LSP Code Actions yet

**Workaround**:
1. Try VSCode instead (has better LSP support)
2. Or test SARIF import instead

### Issue: Fixes don't apply correctly

**Check**:
1. Line numbers match (file may have changed)
2. Workspace root is correct
3. Files are not read-only

## 📊 Test Results Template

```markdown
## LSP/SARIF Testing Results

**Date**: [date]
**Cursor Version**: [version]
**LSP File**: codequal-lsp-actions.json

### Test 1: LSP File Load
- [ ] File loaded successfully
- [ ] Diagnostics appear in Problems panel

### Test 2: Quick Fix Menu
- [ ] Menu appears on Cmd+.
- [ ] "Apply All Fixes" visible
- [ ] Severity batches visible
- [ ] Individual fixes visible

### Test 3: Batch Action - Apply All
- [ ] Applied successfully
- [ ] Both files modified
- [ ] Changes correct

### Test 4: Severity Batch - High Only
- [ ] Applied successfully
- [ ] Only high severity file modified
- [ ] Medium severity file NOT modified

### Test 5: Individual Fix
- [ ] Applied successfully
- [ ] Single file modified
- [ ] Fix correct

### Issues Found
[List any issues encountered]

### Screenshots
[Attach screenshots of Quick Fix menu]
```

## 🎯 Next Steps After Testing

1. **If successful**:
   - Update V9 formatter to always generate LSP/SARIF files
   - Add to production pipeline
   - Document in user guide

2. **If issues found**:
   - Create bug report with screenshots
   - Test in VSCode as comparison
   - Check Cursor LSP compatibility

## 📝 Notes

- **LSP vs SARIF**: LSP is for Code Actions (Quick Fix), SARIF is for diagnostics/reporting
- **Cursor Compatibility**: Cursor is built on VSCode, so LSP should work, but batch actions are newer
- **Fallback**: If Cursor doesn't support batch actions, individual fixes should still work

---

**Testing Started**: [fill in]
**Testing Completed**: [fill in]
**Result**: [PASS / FAIL / PARTIAL]
