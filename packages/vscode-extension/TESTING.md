# CodeQual VSCode Extension - Testing Guide

## Quick Start

### 1. Open Extension in VSCode

```bash
cd /Users/alpinro/CodePrjects/codequal/packages/vscode-extension
code .
```

### 2. Launch Extension Development Host

Press `F5` or:
- Open Run and Debug panel (`Cmd+Shift+D`)
- Select "Run Extension"
- Click the green play button

This will open a new VSCode window with the extension loaded.

### 3. Load LSP File

In the Extension Development Host window:

1. Open Command Palette (`Cmd+Shift+P`)
2. Type: `CodeQual: Load LSP File`
3. Select the LSP file:
   `/Users/alpinro/CodePrjects/codequal/packages/agents/test-outputs/codequal-lsp-actions.json`

You should see: "CodeQual: Loaded 260 actions from LSP file"

### 4. Open a Test Repository

Open the codequal repository in the Extension Development Host:
- File > Open Folder
- Select: `/Users/alpinro/CodePrjects/codequal`

### 5. View Diagnostics

Navigate to files with issues. You should see:
- 🔴 Red squiggly lines for high severity issues
- 🟡 Yellow squiggly lines for medium severity issues
- 🔵 Blue squiggly lines for low severity issues

Example files to check:
- `apps/api/src/routes/auth.ts`
- `.github/workflows/deploy-deepwiki.yml`
- `packages/agents/src/routes/monitoring.ts`

### 6. Test Quick Fix

1. Click on an issue (or place cursor on it)
2. Click the lightbulb 💡 icon or press `Cmd+.`
3. You should see the fix in the menu
4. Select it to apply

### 7. Test Batch Operations

Open Command Palette (`Cmd+Shift+P`) and try:
- `CodeQual: Apply All Fixes`
- `CodeQual: Apply High Severity Fixes`
- `CodeQual: Apply Medium Severity Fixes`

**Note**: Since all fixes are comment blocks, you'll see a message:
"No direct code replacements available. All fixes require manual review."

This is CORRECT behavior!

### 8. Verify Comment-Based Fixes

When you apply a fix, it should insert a TODO comment like:

```javascript
// TODO: CodeQual AI Fix Suggestion
// Issue: CORS misconfiguration
// ---------------------------------------------------
// AI PROMPT (Copy & Paste to Cursor/Copilot):
// Fix the CORS configuration...
// ---------------------------------------------------
```

---

## Expected Behavior

### ✅ What Should Work

1. **Load LSP File**: Should load 260 actions
2. **Show Diagnostics**: Should show issues in files (if paths match)
3. **Quick Fix Menu**: Should show fix options when clicking lightbulb
4. **Apply Comment Fixes**: Should insert TODO comments
5. **Batch Commands**: Should show "no direct replacements" message

### ⚠️ Known Limitations

1. **Path Mapping**: Only works if file paths match
   - Analysis paths: `/tmp/test-repo-*/...`
   - Local paths: `/Users/alpinro/CodePrjects/codequal/...`
   - **Solution**: Paths are mapped by relative path, so they should match

2. **No Direct Replacements**: All 256 fixes are comment blocks
   - This is CORRECT for the hybrid strategy
   - Prioritizes safety over automation

3. **File Not Found**: Some files may not exist locally
   - The analysis was run on a different clone
   - Only matching files will show diagnostics

---

## Troubleshooting

### No diagnostics showing

**Check**:
1. LSP file is loaded (check notification)
2. Files exist in workspace
3. Path mapping is working

**Debug**:
1. Open Developer Tools: `Help > Toggle Developer Tools`
2. Check Console for errors
3. Look for "CodeQual:" messages

### Fixes not applying

**Check**:
1. File exists in workspace
2. Path mapping succeeded
3. Fix has edit changes

**Debug**:
1. Check console for path mapping errors
2. Verify file paths match

### Extension not activating

**Check**:
1. Extension compiled successfully (`npm run compile`)
2. No TypeScript errors
3. Extension Development Host launched

**Debug**:
1. Check Extension Host console
2. Look for activation errors

---

## Testing Checklist

- [ ] Extension loads without errors
- [ ] LSP file loads successfully
- [ ] Diagnostics appear in files
- [ ] Lightbulb icon shows on issues
- [ ] Quick Fix menu displays
- [ ] Comment fixes insert correctly
- [ ] Batch commands show appropriate message
- [ ] Path mapping works for matching files
- [ ] Clear diagnostics command works

---

## Next Steps

Once basic functionality is verified:

1. **Test with Different Repositories**
   - Clone a test repo
   - Run V9 analysis on it
   - Load LSP file in extension
   - Verify diagnostics appear

2. **Improve Path Mapping**
   - Handle more edge cases
   - Better error messages
   - Fallback strategies

3. **Add Features**
   - Status bar integration
   - Progress indicators
   - Preview before applying
   - Undo support

4. **Package Extension**
   ```bash
   npm run package
   ```
   This creates a `.vsix` file you can install

---

## Development Workflow

### Watch Mode

```bash
npm run watch
```

This will recompile on file changes. You'll need to reload the Extension Development Host (`Cmd+R`) to see changes.

### Debugging

1. Set breakpoints in `src/extension.ts`
2. Launch Extension Development Host (`F5`)
3. Trigger the code (e.g., load LSP file)
4. Debugger will pause at breakpoints

### Console Logging

Add `console.log()` statements in your code. They'll appear in:
- Extension Development Host: `Help > Toggle Developer Tools > Console`

---

**Happy Testing!** 🚀
