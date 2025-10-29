# V9 Grouped Report Formatter Refactoring Plan

**Date**: October 27, 2025  
**Goal**: Split v9-grouped-report-formatter.ts (4,584 lines) into <500 line files  
**Constraint**: Must maintain 100% backward compatibility  
**Status**: 🔄 IN PROGRESS

---

## 📊 Current State

### Existing Files
- ✅ `report/types.ts` (132 lines) - Type definitions
- ✅ `report/score-calculator.ts` (275 lines) - Scoring logic (partially implemented)
- ✅ `report/section-generators.ts` (289 lines) - Section generation (partially implemented)
- ✅ `report/ide-integration.ts` (319 lines) - IDE files (partially implemented)

### Main File Status
- ❌ `analyzers/v9-grouped-report-formatter.ts` (4,584 lines) - Still contains ALL logic
- ❌ Service files created but NOT USED yet
- ❌ Main file needs to delegate to services

---

## 🎯 Refactoring Strategy

### Phase 1: Extract Utility Methods (~400 lines)
**New File**: `report/formatter-utils.ts`

**Methods to Extract:**
- `formatDate(dateString)` (line 770)
- `formatDuration(durationMs)` (line 817)
- `getUserFriendlyTitle(rule, tool)` (line 1685)
- `formatRuleTitle(rule)` (line 3341)
- `cleanAIContent(content)` (line 3099)
- `getCategoryFromTool(tool)` (line 3329)
- `getLanguageFromFile(file)` (line 3399)

**Estimated Time**: 30 minutes

---

### Phase 2: Extract AI Enrichment (~450 lines)
**New File**: `report/ai-enrichment.ts`

**Methods to Extract:**
- `enrichIssuesWithAI(issues, groups)` (line 273) - Main enrichment
- `getCuratedResourcesForRule(ruleId)` (line 240) - Resource lookup

**Dependencies**:
- SimpleOpenRouterClient
- Model configuration resolver
- Types from types.ts

**Estimated Time**: 45 minutes

---

### Phase 3: Extract Group Section Formatter (~500 lines)
**New File**: `report/group-section-formatter.ts`

**Methods to Extract:**
- `generateGroupSection(group, issues, showFull)` (line 2850) - Main section generator
- `detectCategory(rule, tool, message)` (line 1855)
- `calculateRiskLevel(category, severity, rule)` (line 1942)
- `getCategoryContext(category, severity)` (line 2017)
- `getPriorityGuidance(category, severity, count, risk)` (line 2118)
- `getIssueDescription(rule, tool, severity)` (line 2173)
- `getGenericFixGuidance(rule, tool, severity)` (line 2643)

**Estimated Time**: 1 hour

---

### Phase 4: Extract Snippet Extraction (~250 lines)
**New File**: `report/snippet-extractor.ts`

**Methods to Extract:**
- `extractSnippetsForLocations(issues)` (line 601)
- `findFullPath(basename)` (line 573)

**Dependencies**:
- fs/path for file operations
- repoPath for local file access

**Estimated Time**: 30 minutes

---

### Phase 5: Extract Educational Resources (~450 lines)
**New File**: `report/educational-resources.ts`

**Methods to Extract:**
- `generateEducationalResources(issues)` (line 3718)
- `generateEducationalResourcesBrave(issues)` (line 3851)

**Dependencies**:
- Brave Search API (optional)
- Issue categorization

**Estimated Time**: 45 minutes

---

### Phase 6: Extract Business Impact (~300 lines)
**New File**: `report/business-impact.ts`

**Methods to Extract:**
- `generateBusinessImpact(issues, groups)` (line 3494)
- `getExploitCostExplanation(critical, high, security)` (line 3645)
- `getRiskImpactLevel(categoryIssues)` (line 3661)
- `getImpactSummary(rule, tool, severity)` (line 3355)

**Estimated Time**: 30 minutes

---

### Phase 7: Extract Skills Tracking (~450 lines)
**New File**: `report/skills-tracking.ts`

**Methods to Extract:**
- `generateSkillsTracking(issues, metadata)` (line 4008)
- `discoverTeamFromGit(repoPath)` (line 3968)
- `calculateIssueWeightedSkillScore(issues)` (line 3696)

**Dependencies**:
- SkillScoreManager
- Git commands
- Supabase

**Estimated Time**: 45 minutes

---

### Phase 8: Complete IDE Integration (~150 lines additional)
**Enhance File**: `report/ide-integration.ts`

**Methods to Move:**
- `extractFixPattern(group, representative)` (line 3276)
- `calculatePriority(severity, category, fileCount)` (line 3366)
- `determineConfidence(group)` (line 3390)
- `isSafeToAutoApply(group)` (line 3428)
- `extractRequiredImports(representative)` (line 3440)

**Estimated Time**: 20 minutes

---

### Phase 9: Complete Score Calculator (~200 lines additional)
**Enhance File**: `report/score-calculator.ts`

**Methods to Move:**
- `calculateImpact(issues)` (line 839)
- `calculateFullV9Score(issues, metadata)` (line 998)
- `checkCachedScoresForCommit(metadata)` (line 904)
- `calculateCategoryScore(categoryIssues)` (line 1143)
- `calculateSimplifiedScore(issues)` (line 1170)
- `getScoreInterpretation(score)` (line 1265)

**Estimated Time**: 30 minutes

---

### Phase 10: Complete Section Generators (~400 lines additional)
**Enhance File**: `report/section-generators.ts`

**Methods to Move:**
- `generateHeader(metadata)` (line 670)
- `generateExecutiveSummary(issues, groups, metadata)` (line 1302)
- `generateKeyFindings(issues, groups, blockingIssues)` (line 1443)
- `generateCriticalBlockers(groups, blockingIssues)` (line 1492)
- `generateQuickWins(groups, autoFixableGroups)` (line 1568)
- `generateTrendsAndRecommendations(issues, metadata)` (line 1600)
- `generateCheckStyleAutoFixGuide(issueCount)` (line 3135)

**Estimated Time**: 45 minutes

---

### Phase 11: Refactor Main Formatter (~350 lines remaining)
**Final State**: `analyzers/v9-grouped-report-formatter.ts`

**What Stays:**
- V9GroupedReportFormatter class definition
- Constructor with Supabase/AppScoreManager/SkillScoreManager initialization
- Main `generateGroupedReport()` orchestration method
- `generateMapping()` method (line 3455)
- Private configuration flags (SHOW_PERF_SUBMETRICS, etc.)

**What Gets Imported:**
- All service classes from report/ directory
- Delegation to services for all extracted methods

**Estimated Time**: 1 hour

---

## 📋 Execution Plan

### Step-by-Step Process (Safe Refactoring):
1. Create new service file with extracted methods
2. Add unit tests for new service
3. Update main formatter to import and USE new service
4. Run integration tests to verify no regression
5. Commit changes
6. Repeat for next service

### Order of Execution:
1. Phase 1 (Utils) - Foundation for others
2. Phase 4 (Snippets) - Independent, low risk
3. Phase 2 (AI Enrichment) - Critical but isolated
4. Phase 3 (Group Section) - Core formatting logic
5. Phase 6 (Business Impact) - Report content
6. Phase 5 (Educational) - Report content
7. Phase 7 (Skills Tracking) - Report content
8. Phase 8 (IDE Integration) - Enhancement
9. Phase 9 (Score Calculator) - Enhancement
10. Phase 10 (Section Generators) - Enhancement
11. Phase 11 (Main Refactor) - Final consolidation

---

## ✅ Success Criteria

### Per Phase:
- [ ] New service file < 500 lines
- [ ] All extracted methods have proper TypeScript types
- [ ] No linting errors
- [ ] Existing tests still pass
- [ ] Main formatter successfully uses new service

### Final:
- [ ] All 6 large files split (<500 lines each)
- [ ] 100% test coverage maintained
- [ ] No breaking changes to public API
- [ ] Documentation updated
- [ ] ESLint rule added to prevent future violations

---

## ⏱️ Total Estimated Time

**Total**: ~7 hours 15 minutes  
**Split Across**: 2-3 sessions  
**Current Progress**: 0% (services created but not integrated)

---

## 🚧 Risks & Mitigation

### Risk 1: Breaking Existing Functionality
**Mitigation**: 
- Test after each phase
- Keep git commits small
- Easy rollback per phase

### Risk 2: Circular Dependencies
**Mitigation**:
- Extract in dependency order (utils first)
- Use interfaces for type dependencies
- Careful import management

### Risk 3: Supabase/Redis Dependencies
**Mitigation**:
- Pass dependencies through constructors
- Use dependency injection pattern
- Mock external services in tests

---

## 📝 Notes

- Oracle Cloud Redis is currently down (blocking multi-framework test)
- Must maintain backward compatibility with existing V9 API
- All refactoring must preserve exact same report output
- Cannot break existing consumers of V9GroupedReportFormatter

---

**Next Action**: Start Phase 1 - Extract Utility Methods

