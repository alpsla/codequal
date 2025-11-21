# How to Test Auto-Fix in Cursor IDE

**Created**: January 13, 2025  
**Status**: Ready for Testing  
**Goal**: Step-by-step guide to test LSP/SARIF auto-fix in Cursor

---

## 📋 Prerequisites

1. **Cursor IDE** installed (latest version)
2. **CodeQual report** with LSP/SARIF files generated
3. **Access to Supabase** to download LSP/SARIF files

---

## 🚀 Method 1: LSP Code Actions (Recommended for Cursor)

### Step 1: Download LSP File

1. Open your CodeQual report (markdown file)
2. Find the **"IDE Integration"** section
3. Look for **"Method 1: LSP Batch Actions"**
4. Click the download link for `codequal-lsp-actions.json`
5. Save it to your project root (same directory as `package.json`)

### Step 2: Load LSP File in Cursor

**Option A: Via Command Palette**
1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: `Code Actions: Load from File`
3. Select your `codequal-lsp-actions.json` file

**Option B: Via Settings**
1. Open Cursor Settings (`Cmd+,`)
2. Search for "Code Actions"
3. Add path to `codequal-lsp-actions.json` in "Code Actions: Include Paths"

**Option C: Manual Integration (if above don't work)**
1. Open `codequal-lsp-actions.json`
2. Copy the code actions array
3. Create `.cursor/code-actions.json` in your project root
4. Paste the code actions

### Step 3: Apply Fixes

1. **Open any file** that has issues (check the report for file paths)
2. Press `Cmd+.` (Mac) or `Ctrl+.` (Windows/Linux) to open Quick Fix menu
3. You should see:
   - **"Apply All Fixes (X issues)"** at the top
   - **"Apply Critical Fixes (X issues)"**
   - **"Apply High Severity Fixes (X issues)"**
   - **"Apply Medium Severity Fixes (X issues)"**
   - **"Apply Low Severity Fixes (X issues)"**
   - Individual per-issue fixes below

4. **Click "Apply All Fixes"** to fix all issues at once
   - OR click a severity-specific batch action
   - OR click individual fixes one by one

### Step 4: Verify Fixes

1. Check that files were modified
2. Review the changes in Git diff
3. Run your tests to ensure nothing broke
4. Commit the fixes

---

## 🔍 Method 2: SARIF Report (Alternative)

### Step 1: Install SARIF Viewer Extension

1. Open Cursor Extensions (`Cmd+Shift+X`)
2. Search for "SARIF Viewer" or "SARIF"
3. Install the extension (by Microsoft or similar)

### Step 2: Download SARIF File

1. From your CodeQual report, find **"Method 2: SARIF Report"**
2. Download `codequal-sarif-report.json`
3. Save to your project root

### Step 3: Load SARIF Report

1. Press `Cmd+Shift+P`
2. Type: `SARIF: Load Results`
3. Select `codequal-sarif-report.json`

### Step 4: View Issues

1. Issues will appear in the **Problems** panel (`Cmd+Shift+M`)
2. Click on any issue to navigate to the file
3. Use Quick Fix (`Cmd+.`) to apply fixes

---

## 🐛 Troubleshooting

### Issue: Quick Fix menu doesn't show CodeQual fixes

**Solution 1**: Ensure LSP file is in project root
```bash
ls -la codequal-lsp-actions.json  # Should exist
```

**Solution 2**: Reload Cursor window
- Press `Cmd+Shift+P` → "Developer: Reload Window"

**Solution 3**: Check Cursor version
- Update to latest version (LSP support improved in recent versions)

### Issue: Fixes don't apply correctly

**Check**:
1. File paths in LSP match your workspace structure
2. Line numbers are correct (0-based in LSP, 1-based in reports)
3. File encoding is UTF-8

**Solution**: Manually verify one fix first, then try batch actions

### Issue: "No code actions available"

**Possible causes**:
1. LSP file not loaded
2. File doesn't have issues
3. Cursor doesn't support LSP code actions yet

**Solution**: Try Method 2 (SARIF) instead, or use manifest file with AI assistant

---

## 📊 Expected Results

After applying fixes, you should see:

1. **Files Modified**: Check Git status
   ```bash
   git status  # Should show modified files
   ```

2. **Issues Fixed**: Count should match report
   - Report says "118 auto-fixable issues"
   - After applying, ~118 issues should be resolved

3. **No Breaking Changes**: Tests should still pass
   ```bash
   npm test  # or your test command
   ```

---

## 🎯 Best Practices

1. **Test on a branch**: Create a test branch before applying fixes
   ```bash
   git checkout -b test-autofix
   ```

2. **Review before committing**: Check the diff
   ```bash
   git diff  # Review all changes
   ```

3. **Start with severity batches**: Apply Critical first, then High, etc.
   - This lets you review incrementally

4. **Keep LSP file**: Save it for future reference
   - You can re-apply fixes if needed

---

## 📝 Example Workflow

```bash
# 1. Create test branch
git checkout -b test-codequal-autofix

# 2. Download LSP file from report
# (Copy URL from report, download via browser or curl)

# 3. Load in Cursor (via Command Palette)

# 4. Apply fixes (Cmd+. on any file with issues)

# 5. Review changes
git diff

# 6. Run tests
npm test

# 7. If all good, commit
git add .
git commit -m "fix: Apply CodeQual auto-fixes (118 issues)"

# 8. Push and create PR
git push origin test-codequal-autofix
```

---

## 🔗 Related Documentation

- [LSP/SARIF Implementation](./LSP_HYBRID_APPROACH.md)
- [V9 Report Format](./V9_CANONICAL_ARCHITECTURE.md)
- [Auto-Fix Architecture](./docs/next/V9_CRITICAL_KNOWLEDGE_BASE.md)

---

## ❓ Questions?

If you encounter issues:
1. Check the report's "IDE Integration" section for troubleshooting
2. Verify LSP/SARIF file URLs are accessible (HTTP 200)
3. Check Cursor version and extensions
4. Review the LSP file structure (should be valid JSON)


