# 🚀 Quick Start Guide for New CodeQual Session

## ⚡ Quick Reference (Copy & Paste Commands)

### 1. Start Your Session (3 minutes)
```bash
# Navigate to project
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents

# Check environment
cat ../../.env | grep -E "(DEEPWIKI|OPENROUTER|SUPABASE|REDIS)" | head -5

# Build project (if needed)
npm run build

# Quick test to verify everything works
# DeepWiki API is now always used directly without mocks timeout 30 npx ts-node test-v8-final.ts
```

### 2. Primary Test Command (USE THIS!)
```bash
# The ONLY verified working test for V8 reports:
# DeepWiki API is now always used directly without mocks npx ts-node test-v8-final.ts

# For testing with real PR (still use mock - DeepWiki is broken):
# DeepWiki API is now always used directly without mocks npx ts-node src/standard/tests/regression/manual-pr-validator.ts https://github.com/sindresorhus/ky/pull/700
```

## 🔥 Critical Information - READ FIRST!

### What's Working ✅
- **V8 Report Generator** - Use ONLY V8, V7 is deprecated
- **Mock DeepWiki Mode** - Always use `# DeepWiki API is now always used directly without mocks`
- **Code Snippet Extraction** - Working from cloned repos
- **Location Detection** - 90% accuracy (reduced unknowns from 35 to 4)
- **Enhanced Location Finder** - Multiple search strategies implemented

### What's Broken ❌
- **Real DeepWiki Integration** - Returns "Unknown location" for everything
- **Test Coverage Detection** - Always shows "Not measured"
- **Educational Insights** - Generic instead of issue-specific
- **Breaking Changes Detection** - Incorrect categorization

### Current Blockers 🚧
1. **BUG-092**: DeepWiki analyzes entire repo, ignores PR parameters
2. **Test Coverage**: Not detecting actual coverage
3. **Educational Content**: Too generic, needs issue-specific training
4. **Architectural Insights**: Missing code snippets

## 📊 Test Data & Reports

### Test Output Locations
```bash
# Reports are saved here:
/Users/alpinro/Code Prjects/codequal/packages/agents/test-outputs/manual-validation/

# Check latest report:
ls -lt test-outputs/manual-validation/*.md | head -1
```

### Verify Report Quality
```bash
# Check for "Unknown location" issues (should be ≤4):
grep -c "Unknown location" test-outputs/manual-validation/[latest-report].md

# Check for code snippets:
grep -c "```" test-outputs/manual-validation/[latest-report].md

# Check for mock data (should be 0):
grep -c "This is a sample issue" test-outputs/manual-validation/[latest-report].md
```

## 🐛 Known Issues & Fixes

### Issue 1: Test Coverage Shows "Not measured"
**Status**: Open (BUG-026)
**Next Steps**: 
1. Check if test coverage is being extracted from package.json
2. Implement coverage detection from jest/nyc reports
3. Look for coverage badges in README

### Issue 2: Architectural Issues Missing Code Snippets
**Status**: Open
**Location**: Report section "Architectural Health"
**Fix Needed**: Extract code snippets for architectural issues

### Issue 3: Breaking Changes Miscategorized
**Status**: Open
**Examples**: "Potential Denial of Service" and "Missing Timeout" are not breaking changes
**Fix Needed**: Improve categorization logic

### Issue 4: Educational Insights Too Generic
**Status**: Open (BUG-049)
**Current**: Shows generic "Clean Code Principles" guide
**Needed**: Issue-specific training content
**Solutions**:
1. Query DeepWiki with specific educational prompts
2. Use Educator Agent with issue descriptions

## 🔧 Development Workflow

### Step 1: Check What You're Working On
```bash
# View current bugs list
cat src/standard/tests/production-ready-state-test.ts | grep "BUG-" | grep -v "FIXED"

# Or use the bug tracker agent
claude --agent bug-tracker --instructions "List top 5 priority bugs"
```

### Step 2: Make Changes
```bash
# Always search with ripgrep (not grep):
rg "test coverage" --type ts

# Edit files
code src/standard/comparison/report-generator-v8-final.ts

# Build after changes
npm run build
```

### Step 3: Test Your Changes
```bash
# Quick test (30 seconds)
# DeepWiki API is now always used directly without mocks timeout 30 npx ts-node test-v8-final.ts

# Full test with PR (2 minutes)
# DeepWiki API is now always used directly without mocks npx ts-node src/standard/tests/regression/manual-pr-validator.ts https://github.com/sindresorhus/ky/pull/700

# Check specific functionality
# DeepWiki API is now always used directly without mocks npx ts-node test-education-insights.ts
```

## 🎯 Priority Tasks for Next Session

### 1. Fix Test Coverage Detection (HIGH)
```typescript
// File: src/standard/comparison/report-generator-v8-final.ts
// Look for: generateTestingSection()
// Issue: Always returns "Not measured"
// Solution: Extract from package.json scripts or coverage reports
```

### 2. Add Code Snippets to Architectural Issues (MEDIUM)
```typescript
// File: src/standard/comparison/report-generator-v8-final.ts
// Look for: generateArchitecturalSection()
// Issue: Missing codeSnippet field
// Solution: Use same extraction as other issues
```

### 3. Fix Breaking Changes Categorization (MEDIUM)
```typescript
// File: src/standard/comparison/report-generator-v8-final.ts
// Look for: categorizeBreakingChanges()
// Issue: DoS and Timeout issues not breaking changes
// Solution: Improve categorization logic
```

### 4. Implement Issue-Specific Education (HIGH)
```typescript
// File: src/standard/educator/educator-agent.ts
// Current: Generic guides
// Needed: Query with specific issue descriptions
// Solution: Pass issue context to educator
```

## 📝 Important Files Reference

### Core Files to Edit
```
src/standard/comparison/report-generator-v8-final.ts - Main report generator
src/standard/educator/educator-agent.ts - Educational content
src/standard/services/deepwiki-api-wrapper.ts - Mock data (KEEP MOCKS COMMENTED!)
src/standard/tests/regression/manual-pr-validator.ts - Main test runner
```

### Test Files
```
test-v8-final.ts - Primary working test
test-education-insights.ts - Test educational content
test-coverage-detection.ts - Test coverage extraction
```

## ⚠️ Critical Warnings

### NEVER DO THIS:
```bash
# DON'T use real DeepWiki (it's broken):
# DeepWiki API is now always used directly without mocks npx ts-node ...  # ❌ WRONG

# DON'T use V7 generators:
--generator v7  # ❌ DEPRECATED

# DON'T uncomment mock generation code:
// generateMockCodeSnippet()  # ❌ KEEP COMMENTED

# DON'T use grep/find for searching:
grep -r "pattern"  # ❌ Use 'rg' instead
find . -name "*.ts"  # ❌ Use 'rg --files -g "*.ts"'
```

### ALWAYS DO THIS:
```bash
# ALWAYS use mock mode:
# DeepWiki API is now always used directly without mocks  # ✅ CORRECT

# ALWAYS use V8 generator:
report-generator-v8-final.ts  # ✅ CORRECT

# ALWAYS keep mocks commented:
// COMMENTED OUT - Better to show error than fake data  # ✅ CORRECT

# ALWAYS use ripgrep:
rg "pattern"  # ✅ CORRECT
```

## 🚦 Quick Status Check

Run this to verify your environment:
```bash
echo "=== CodeQual Session Status ==="
echo "Directory: $(pwd)"
echo "Git branch: $(git branch --show-current)"
echo "Last build: $(stat -f "%Sm" dist/index.js 2>/dev/null || echo "Not built")"
echo "DeepWiki: $(kubectl get pods -n codequal-dev -l app=deepwiki --no-headers 2>/dev/null | wc -l) pods"
echo "Redis: $(redis-cli ping 2>/dev/null || echo "Not running")"
echo "Reports: $(ls test-outputs/manual-validation/*.md 2>/dev/null | wc -l) files"
echo "================================"
```

## 📚 Session History Context

### What We Fixed Recently:
1. ✅ Removed all mock code generation that was masking real issues
2. ✅ Fixed DeepWiki response format transformation
3. ✅ Implemented enhanced location finder (reduced unknowns from 35 to 4)
4. ✅ Added code snippet extraction from cloned repos
5. ✅ Fixed main branch showing 0 findings

### What We Discovered:
1. DeepWiki doesn't actually analyze PR diffs - it analyzes entire repos
2. Mock mode is more reliable than real DeepWiki currently
3. Location clarification works but some issues genuinely have no location
4. Educational content needs to be issue-specific, not generic

## 💡 Pro Tips

1. **Start with test-v8-final.ts** - It's the only fully verified working test
2. **Keep console open to kubectl logs** - Watch DeepWiki pod logs if debugging
3. **Check generated reports immediately** - Look for "Unknown location" and mock data
4. **Use TodoWrite agent** - Track your progress through the session
5. **Comment suspicious code immediately** - Better to have errors than fake results

## 🆘 If Things Break

### Build Errors
```bash
npm run clean && npm run build
```

### TypeScript Errors
```bash
npx tsc --noEmit --skipLibCheck
```

### Port Forwarding Lost
```bash
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001
```

### Redis Connection Failed
```bash
redis-server --daemonize yes
```

---

**Last Updated**: 2025-08-22
**Session Type**: Bug Fixing & Testing
**Focus**: Test Coverage, Educational Insights, Breaking Changes
**Remember**: Always use MOCK mode, never trust real DeepWiki results!