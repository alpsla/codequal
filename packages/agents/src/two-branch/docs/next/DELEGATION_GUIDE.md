# V9 Grouped Report Formatter - Delegation Guide

**Status**: Service extraction COMPLETE ✅ | Delegation to main file PENDING 🔄  
**Created**: 2025-10-27  
**Purpose**: Guide for applying delegation pattern to `v9-grouped-report-formatter.ts`

---

## ✅ What's Complete

### 9 Service Files Created (2,681 lines)
All files are in `packages/agents/src/two-branch/report/`:

1. **`formatter-utils.ts`** (316 lines)
2. **`ai-enrichment.ts`** (142 lines)
3. **`snippet-extractor.ts`** (128 lines)
4. **`category-detector.ts`** (324 lines)
5. **`educational-resources.ts`** (275 lines)
6. **`business-impact.ts`** (266 lines)
7. **`metadata-footer.ts`** (462 lines)
8. **`header-sections.ts`** (310 lines)
9. **`score-calculator.ts`** (458 lines)

**All files:**
- ✅ Under 500 lines
- ✅ Zero linting errors
- ✅ Fully testable
- ✅ Clear separation of concerns

---

## 🎯 What Needs To Be Done

**File**: `v9-grouped-report-formatter.ts`  
**Current**: 4,589 lines  
**Target**: ~500 lines  
**Task**: Replace method implementations with calls to service functions

---

## 📋 Delegation Pattern

### Step 1: Add Service Imports (Already Done ✅)
The imports are already added at the top of the file (lines 20-35).

### Step 2: Replace Method Implementations

Replace each method's implementation with a delegating call to the service function.

**Example Pattern:**
```typescript
// BEFORE (method with full implementation)
private formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  // ... 15 lines of implementation
}

// AFTER (delegating wrapper)
private formatDate(dateString?: string): string {
  return formatDate(dateString);
}
```

---

## 🗺️ Method Mapping Guide

### Phase 1: Formatter Utils (316 lines to remove)
| Method in Formatter | Service Function | File |
|---------------------|-----------------|------|
| `formatDate()` | `formatDate()` | formatter-utils.ts |
| `formatDuration()` | `formatDuration()` | formatter-utils.ts |
| `cleanAIContent()` | `cleanAIContent()` | formatter-utils.ts |
| `getUserFriendlyTitle()` | `getUserFriendlyTitle()` | formatter-utils.ts |
| `mapRuleToUserTitle()` | `mapRuleToUserTitle()` | formatter-utils.ts |
| `mapToolToCategory()` | `mapToolToCategory()` | formatter-utils.ts |

### Phase 2: AI Enrichment (142 lines to remove)
| Method in Formatter | Service Function | File |
|---------------------|-----------------|------|
| `getCuratedResourcesForRule()` | `getCuratedResourcesForRule()` | ai-enrichment.ts |
| `enrichIssuesWithAI()` | `enrichWithAI()` | ai-enrichment.ts |

### Phase 3: Snippet Extraction (128 lines to remove)
| Method in Formatter | Service Function | File |
|---------------------|-----------------|------|
| `extractSnippetsForLocations()` | `extractSnippet()` | snippet-extractor.ts |
| `normalizeDockerPath()` | `normalizeDockerPath()` | snippet-extractor.ts |
| `findFullPath()` | (inline in snippet-extractor) | snippet-extractor.ts |

### Phase 4: Category Detection (324 lines to remove)
| Method in Formatter | Service Function | File |
|---------------------|-----------------|------|
| `detectIssueCategory()` | `detectIssueCategory()` | category-detector.ts |
| `calculateRiskLevel()` | `calculateRiskLevel()` | category-detector.ts |
| `getCategoryContext()` | `getCategoryContext()` | category-detector.ts |
| `getPriorityGuidance()` | `getPriorityGuidance()` | category-detector.ts |

### Phase 5: Educational Resources (275 lines to remove)
| Method in Formatter | Service Function | File |
|---------------------|-----------------|------|
| `generateEducationalResources()` | `generateEducationalResources()` | educational-resources.ts |
| `generateEducationalResourcesBrave()` | `generateEducationalResourcesBrave()` | educational-resources.ts |

### Phase 6: Business Impact (266 lines to remove)
| Method in Formatter | Service Function | File |
|---------------------|-----------------|------|
| `generateBusinessImpact()` | `generateBusinessImpact()` | business-impact.ts |
| `getRiskImpactLevel()` | `getRiskImpactLevel()` | business-impact.ts |
| `calculateIssueWeightedSkillScore()` | `calculateIssueWeightedSkillScore()` | business-impact.ts |
| `getExploitCostExplanation()` | `getExploitCostExplanation()` | business-impact.ts |

### Phase 7: Metadata & Footer (462 lines to remove)
| Method in Formatter | Service Function | File |
|---------------------|-----------------|------|
| `generateAnalysisMetadata()` | `generateAnalysisMetadata()` | metadata-footer.ts |
| `generatePRComment()` | `generatePRComment()` | metadata-footer.ts |
| `generateFooter()` | `generateFooter()` | metadata-footer.ts |
| `groupBySeverity()` | `groupBySeverity()` | metadata-footer.ts |
| `groupByCategory()` | `groupByCategory()` | metadata-footer.ts |
| `groupByTool()` | `groupByTool()` | metadata-footer.ts |

### Phase 8: Header Sections (310 lines to remove)
| Method in Formatter | Service Function | File |
|---------------------|-----------------|------|
| `generateHeader()` | `generateHeader()` | header-sections.ts |
| `generateKeyFindings()` | `generateKeyFindings()` | header-sections.ts |
| `generateCriticalBlockers()` | `generateCriticalBlockers()` | header-sections.ts |
| `generateQuickWins()` | `generateQuickWins()` | header-sections.ts |

### Phase 9: Score Calculator (458 lines to remove)
| Method in Formatter | Service Function | File |
|---------------------|-----------------|------|
| `calculateQualityScore()` | `calculateQualityScoreUtil()` | score-calculator.ts |
| `checkCachedScoresForCommit()` | `checkCachedScoresUtil()` | score-calculator.ts |
| `calculateFullV9Score()` | `calculateFullV9ScoreUtil()` | score-calculator.ts |
| `calculateCategoryScore()` | `calculateCategoryScoreUtil()` | score-calculator.ts |
| `calculateSimplifiedScore()` | `calculateSimplifiedScoreUtil()` | score-calculator.ts |
| `getScoreInterpretation()` | `getScoreInterpretationUtil()` | score-calculator.ts |

---

## 🔧 Implementation Strategy

### Recommended Approach:
1. **Use search_replace tool** for each method replacement
2. **Include sufficient context** (5-10 lines before/after) to make matches unique
3. **Test after each phase** to ensure no regressions
4. **Check line count** after each phase to track progress

### Alternative Approach (Safer):
Create a Python script to apply all replacements at once:
```python
import re

# Read file
with open('v9-grouped-report-formatter.ts', 'r') as f:
    content = f.read()

# Define all replacements
replacements = [
    # Phase 1: formatDate
    (
        r'private formatDate\(dateString\?: string\): string \{[^}]+\}',
        'private formatDate(dateString?: string): string { return formatDate(dateString); }'
    ),
    # ... (add all other replacements)
]

# Apply replacements
for pattern, replacement in replacements:
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Write back
with open('v9-grouped-report-formatter.ts', 'w') as f:
    f.write(content)
```

---

## ⚠️ Important Notes

### DO NOT Remove:
- ❌ Class definition and constructor
- ❌ Private properties (supabase, appScoreManager, etc.)
- ❌ `generateGroupedReport()` method (main orchestrator)
- ❌ Any method that calls the extracted services

### DO Remove:
- ✅ Full implementations of extracted methods
- ✅ JSDoc comments for extracted methods (keep in service files)
- ✅ Helper functions that were extracted

### Special Cases:

**Score Calculator Methods:**
These methods need access to `this.appScoreManager` and `this.skillScoreManager`:
```typescript
private async calculateQualityScore(issues: EnrichedIssue[], metadata: any) {
  return calculateQualityScoreUtil(issues, metadata, this.appScoreManager, this.skillScoreManager);
}
```

**Methods with State:**
Some methods may reference `this.repoPath`, `this.modelConfigResolver`, etc. Pass these as parameters:
```typescript
private async extractSnippets(issues: EnrichedIssue[]) {
  return extractSnippet(issues, this.repoPath);
}
```

---

## 📊 Expected Results

### Before Delegation:
- Main file: 4,589 lines
- Service files: 2,681 lines
- Total: 7,270 lines

### After Delegation:
- Main file: ~500 lines (orchestration only)
- Service files: 2,681 lines (unchanged)
- Total: ~3,181 lines
- **Reduction**: 4,089 lines removed (56% code reduction!)

### Benefits:
- ✅ All files under 500 lines (architectural compliance)
- ✅ Improved testability (services independently testable)
- ✅ Better maintainability (clear separation of concerns)
- ✅ Reusable services (can be used by other formatters)
- ✅ Easier debugging (smaller, focused files)

---

## 🧪 Verification Steps

After applying delegations:

1. **Line Count Check:**
   ```bash
   wc -l v9-grouped-report-formatter.ts
   # Expected: ~500 lines
   ```

2. **Linting:**
   ```bash
   cd packages/agents
   npx tsc --noEmit
   npm run lint
   # Expected: Zero errors
   ```

3. **Test Run:**
   ```bash
   npx ts-node test-v9-e2e-complete.ts
   # Expected: Successful analysis + report generation
   ```

4. **Verify Report Quality:**
   - Check generated report is complete
   - Verify all sections present
   - Confirm IDE fix files generated
   - Validate score calculation

---

## 📝 Commit Message Template

```
refactor(formatter): apply delegation pattern to v9-grouped-report-formatter

Replace method implementations with calls to extracted service modules.

**Reduction**: 4,589 lines → ~500 lines (89% reduction)
**Impact**: Full architectural compliance with 500-line limit

**Methods Delegated**:
- Phase 1: Formatter Utils (6 methods, 316 lines)
- Phase 2: AI Enrichment (2 methods, 142 lines)
- Phase 3: Snippet Extraction (3 methods, 128 lines)
- Phase 4: Category Detection (4 methods, 324 lines)
- Phase 5: Educational Resources (2 methods, 275 lines)
- Phase 6: Business Impact (4 methods, 266 lines)
- Phase 7: Metadata & Footer (6 methods, 462 lines)
- Phase 8: Header Sections (4 methods, 310 lines)
- Phase 9: Score Calculator (6 methods, 458 lines)

**Total Removed**: 31 methods, ~4,000 lines of implementation code

**Benefits**:
- ✅ Improved testability (services independently testable)
- ✅ Better maintainability (clear separation of concerns)
- ✅ Reusable across formatters
- ✅ Architectural compliance (all files <500 lines)

Related: #refactoring #architecture #delegation
```

---

## 🚀 Next Steps (After Delegation Complete)

1. **Commit the delegation changes**
2. **Update QUICK_START_NEXT_SESSION.md**:
   - Mark Phase 9 as COMPLETE ✅
   - Update main file line count
   - Celebrate achieving 500-line limit! 🎉
3. **Move to next file**: `v9-report-formatter.ts` (2,264 lines)
4. **Repeat extraction process** for other large files

---

**Good luck! The hard work (service extraction) is done. This is just applying the pattern systematically.** 🚀

