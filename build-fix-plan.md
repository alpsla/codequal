# Build Fix Plan

## Current Status

### Build Errors (144 total across all packages)
- **Core package**: 13 errors remaining
- **Agents package**: ~5 errors
- **Test-integration package**: ~23 errors
- **Apps/API**: Various async/await and type errors

### ESLint Warnings (78 in apps/api)
- 23 forbidden non-null assertions
- 31 unexpected `any` types
- 14 unused variables
- 4 console statements

## Immediate Fixes Completed
1. ✅ Removed CANONICAL_MODEL_VERSIONS export (didn't exist)
2. ✅ Fixed deepwiki-tools import paths
3. ✅ Fixed several async/await issues in core package
4. ✅ Made standardizeModelConfig async

## Remaining Critical Fixes

### 1. Async/Await Issues (Priority: HIGH)
**Pattern**: Missing `await` on async methods like `findOptimalModel`, `getCanonicalVersion`, etc.

**Files to fix**:
- `/packages/core/src/services/agent-configuration-service.ts` (6 errors)
- `/packages/core/src/services/model-selection/ModelConfigurationFactory.ts` (7 errors)
- `/packages/core/src/services/model-selection/ModelVersionSync.ts` (1 error)
- All test files in `/packages/test-integration/src/e2e/`

**Solution**: Add `await` and handle array return types:
```typescript
// Before
const model = modelSync.findOptimalModel(context);
if (model.provider) { // Error

// After
const model = await modelSync.findOptimalModel(context);
const actualModel = Array.isArray(model) ? model[0] : model;
if (actualModel?.provider) {
```

### 2. Missing Module Exports (Priority: HIGH)
**Issue**: Several agent services not properly exported

**Files to create/export**:
- Export reporter services from `@codequal/agents`
- Export recommendation service from `@codequal/agents`
- Export educational compilation service from `@codequal/agents`

**Solution**: Check `/packages/agents/src/services/index.ts` and add missing exports

### 3. Import Path Issues (Priority: MEDIUM)
**Issue**: ECMAScript imports need explicit file extensions

**Solution**: 
```typescript
// Before
import { something } from './module';

// After
import { something } from './module.js';
```

### 4. ESLint Warnings (Priority: LOW)
**Non-null assertions**: Replace with proper null checks
```typescript
// Before
const value = obj!.property;

// After
const value = obj?.property ?? defaultValue;
```

**Any types**: Add proper types
```typescript
// Before
function process(data: any) {

// After
function process(data: ProcessedData) {
```

## Report Improvements (Per User Feedback)

### 1. DeepWiki Integration (Priority: HIGH)
- Include DeepWiki analysis results in final report
- Show repository-wide context, not just PR changes

### 2. Scoring System (Priority: HIGH)
- Add scores per category (Security: 7/10, Performance: 8/10, etc.)
- Add overall repository health score
- Include trend indicators (improving/declining)

### 3. Pending Issues Tracking (Priority: HIGH)
- Show all repository issues, not just PR-specific
- Separate sections: "New Issues", "Existing Issues", "Resolved Issues"
- Track issue history across analyses

### 4. Remove Inaccurate Elements (Priority: MEDIUM)
- Remove time estimations (Week 1, Week 2) - too speculative
- Remove cost analysis from user reports - internal metric only
- Update coverage analysis to reflect DeepWiki's full repo analysis

### 5. Report Structure Updates
```markdown
## Repository Health Score: 7.5/10 (↑ 0.3)

### Category Scores
- Security: 6/10 (2 critical issues)
- Code Quality: 8/10 (well-structured)
- Performance: 7/10 (some optimizations needed)
- Architecture: 8/10 (good separation of concerns)

### PR Impact Analysis
**New Issues Introduced**: 2
**Existing Issues Affected**: 1
**Issues Resolved**: 0

### Repository-Wide Issues (from DeepWiki)
**Total Open Issues**: 47
- Critical: 3
- High: 12
- Medium: 20
- Low: 12

### This PR's Findings
[Current format without time estimates]
```

## Execution Order

1. **First**: Fix remaining async/await errors in core package (30 min)
2. **Second**: Fix missing exports in agents package (20 min)
3. **Third**: Update Reporter format per feedback (45 min)
4. **Fourth**: Fix remaining TypeScript errors (1 hour)
5. **Fifth**: Address ESLint warnings if time permits (30 min)

## Quick Win Commands

```bash
# Fix all missing await in a package
cd packages/core && npx tsc --noEmit 2>&1 | grep "Promise<" | cut -d: -f1-3 | sort -u

# Find all non-null assertions
npx eslint . --ext .ts,.tsx | grep "Forbidden non-null assertion"

# Check what's exported from agents
grep "export" packages/agents/src/services/index.ts
```

## Testing After Fixes

1. Run build: `npm run build`
2. Run lint: `npm run lint`
3. Run a real E2E test with OpenRouter to verify credits usage
4. Generate a sample report to verify new format