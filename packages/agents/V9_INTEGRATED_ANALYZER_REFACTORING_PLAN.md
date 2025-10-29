# v9-integrated-analyzer.ts Refactoring Plan

**File**: `src/two-branch/analyzers/v9-integrated-analyzer.ts`  
**Current Size**: 1,460 lines  
**Target Size**: ~700 lines  
**Expected Savings**: ~760 lines (52% reduction)

---

## 📊 METHOD ANALYSIS

**Total Methods**: 36 methods

### Delegation Opportunities

| Method | Lines | Delegation Target | Savings |
|--------|-------|-------------------|---------|
| discoverTeamFromGit | ~30 | git-utils service | 30 |
| detectLanguage | ~15 | language-detector service | 15 |
| detectRepositorySize | ~25 | repository-size-calculator (exists!) | 25 |
| getToolsForLanguage | ~15 | universal-tool-config (exists!) | 15 |
| groupBySeverity | ~15 | issue-grouping (exists!) | 15 |
| groupByCategory | ~12 | issue-grouping (exists!) | 12 |
| groupByTool | ~15 | issue-grouping (exists!) | 15 |
| getIssueCategory | ~30 | category-detector (exists!) | 30 |
| generateJavaCodeSnippet | ~50 | snippet-extractor (exists!) | 50 |
| generateBasicInsights | ~40 | ai-insights service | 40 |
| prepareAIContext | ~40 | ai-context-builder service | 40 |
| parseAIResponse | ~30 | ai-response-parser service | 30 |
| mapAgentToRole | ~12 | agent-role-mapper service | 12 |
| getAgentType | ~12 | agent-type-detector service | 12 |
| **Total Delegation Savings** | **~351** | | **351 lines** |

### Extract to New Services

| Functionality | Lines | New Service | Savings |
|---------------|-------|-------------|---------|
| runStaticAnalysis | ~15 | (Keep - orchestration) | 0 |
| enhanceWithAI | ~20 | ai-enhancement service | 20 |
| generateAIInsights | ~55 | ai-insights-generator service | 55 |
| compileReport | ~600 | report-compiler service | 600 |
| storeReport | ~25 | report-storage service | 25 |
| calculateSkillScore methods | ~60 | skill-calculator service | 60 |
| generateEnhancedFixSuggestion | ~45 | fix-suggestion-generator service | 45 |
| **Total Extraction Savings** | **~820** | | **805 lines** |

**Note**: compileReport is the largest method (~600 lines) - prime candidate for extraction!

---

## 🎯 REFACTORING STRATEGY

### Phase 1: Delegate to Existing Services (Quick Wins)
1. Use `groupIssues` from `/utils/issue-grouping.ts` ✅ (already imported)
2. Use `RepositorySizeCalculator` from `/utils/repository-size-calculator.ts` ✅ (already imported)
3. Use `detectCategory` from `/report/category-detector.ts`
4. Use tool config from `UniversalToolConfigResolver`
5. Use snippet extraction from `/report/snippet-extractor.ts`

**Expected Savings**: ~150 lines

### Phase 2: Extract Large Methods to Services
1. Extract `compileReport` (~600 lines) to `report-compiler.ts`
2. Extract AI insight generation to `ai-insights-generator.ts`
3. Extract skill score calculation to `skill-calculator-service.ts`

**Expected Savings**: ~600 lines

### Phase 3: Clean Up Remaining Methods
1. Delegate small utility methods
2. Consolidate git operations
3. Simplify AI client calls

**Expected Savings**: ~10 lines

**Total Expected Savings**: ~760 lines (52% reduction)

---

## 🚀 IMPLEMENTATION PLAN

### Step 1: Add Service Imports
```typescript
// Add to imports
import { groupIssues } from '../utils/issue-grouping';
import { RepositorySizeCalculator } from '../utils/repository-size-calculator';
import { detectCategory } from '../report/category-detector';
import { createToolConfigResolver } from '../config/universal-tool-config';
import { extractCodeSnippet } from '../report/snippet-extractor';
```

### Step 2: Create New Services

#### A. report-compiler.ts (~600 lines)
Extract the massive `compileReport` method

#### B. ai-insights-generator.ts (~100 lines)
Extract AI insight generation logic

#### C. skill-calculator-service.ts (~80 lines)
Extract skill score calculation

### Step 3: Delegate Methods
Replace method implementations with service calls

---

## 📝 NEXT STEPS

1. **START**: Create `report-compiler.ts` service (extract compileReport)
2. Delegate grouping methods to existing services
3. Delegate category detection to existing services
4. Extract AI insight generation
5. Extract skill calculation
6. Clean up and verify

---

**Ready to start refactoring v9-integrated-analyzer.ts?**

