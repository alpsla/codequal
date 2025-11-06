# Phase 2H: Standard Directory Cleanup Plan

**Date**: November 5, 2025
**Status**: 📋 **PLAN - AWAITING USER APPROVAL**
**Directory**: `packages/agents/src/standard/` (previous main implementation before V9/two-branch)

---

## 🎯 Objective

Clean up the `packages/agents/src/standard/` directory - the previous main implementation directory before switching to V9 and two-branch architecture. This directory contains:
- 250 files
- 3.0M total size
- 585 DeepWiki references
- Historical reports, old documentation, and legacy code
- **21 files in two-branch actively import from standard** (cannot delete these dependencies)

---

## 📊 Current Analysis

### Directory Structure
```
packages/agents/src/standard/
├── comparison/        620K (report generators, comparison logic)
├── services/          724K (AI services, model selection, monitoring)
├── monitoring/        396K (dashboards, cost tracking)
├── docs/              360K (architecture, guides, DeepWiki docs)
├── orchestrator/      236K (model config, language routing)
├── educator/          ~100K (educational agent)
├── infrastructure/    ~80K (Supabase config)
├── reports/           124K (historical test reports 2025-08-14 to 2025-08-28)
├── researcher/        ~60K (research interfaces)
├── scripts/           ~40K (model config scripts, DeepWiki setup)
└── utils/             ~200K (various utilities)
```

### Two-Branch Dependencies (CRITICAL)

**21 files in two-branch import from standard** - These files CANNOT be deleted until dependencies are migrated:

#### Infrastructure & Config (3 imports)
- `infrastructure/supabase/supabase-config-provider.ts` → Used by scheduler
- `orchestrator/model-config-resolver.ts` → Used by 6 files (v9-base-analyzer, v9-integrated-analyzer, v9-report-compiler, specialized-agents, etc.)

#### Services (6 imports)
- `services/model-selection-service.ts` → scheduler-service.ts, run-scheduler.ts
- `services/dynamic-model-selector.ts` → enhanced-scheduler-service.ts, services/dynamic-model-selector.ts
- `services/unified-location-service.ts` → v9-tool-orchestrator.ts
- `services/ai-service.ts` → researcher/web-search-researcher.ts
- `monitoring/services/unified-monitoring.service.ts` → 3 dependency-check tools

#### Educator (2 imports)
- `educator/educator-agent.ts` → v9-report-formatter.ts
- `educator/interfaces/educator.interface.ts` → v9-report-formatter.ts

#### Utils (1 import)
- `utils/index.ts` (createLogger) → researcher/reporting-service.ts

**Imported By**:
```
scheduler/run-scheduler.ts (2 imports)
scheduler/enhanced-scheduler-service.ts (1 import)
scheduler/scheduler-service.ts (1 import)
analyzers/v9-tool-orchestrator.ts (1 import)
analyzers/v9-base-analyzer.ts (1 import)
analyzers/v9-integrated-analyzer.ts (1 import)
analyzers/v9-report-formatter.ts (2 imports)
services/dynamic-model-selector.ts (2 exports)
services/v9-report-compiler.ts (1 import)
agents/specialized-agents.ts (1 import)
tools/java/dependency-check-*.ts (3 files, 1 import each)
researcher/web-search-researcher.ts (1 import)
researcher/reporting-service.ts (1 import)
utils/model-fallback-handler.ts (2 imports)
tests/_to-review/v9-iterations/* (2 test files)
```

---

## 🗑️ SAFE TO DELETE (User Approval Required)

### Category 1: Historical Test Reports (124K, 14 files)
**Reason**: Historical test outputs from August 2025, no longer needed

```bash
packages/agents/src/standard/reports/2025-08-14/ (16K, 2 files)
├── pr-700-comment.md
└── pr-700-report.md

packages/agents/src/standard/reports/2025-08-16/ (16K, 2 files)
├── pr-31616-comment.md
└── pr-31616-report.md

packages/agents/src/standard/reports/2025-08-17/ (16K, 2 files)
├── pr-700-comment.md
└── pr-700-report.md

packages/agents/src/standard/reports/2025-08-24/ (16K, 2 files)
├── pr-700-comment.md
└── pr-700-report.md

packages/agents/src/standard/reports/2025-08-26/ (32K, 4 files)
├── pr-2950-comment.md
├── pr-2950-report.md
├── pr-700-comment.md
└── pr-700-report.md

packages/agents/src/standard/reports/2025-08-28/ (28K, 2 files)
├── pr-700-comment.md
└── pr-700-report.md
```

**Total**: 6 directories, 14 files, 124K

---

### Category 2: DeepWiki Documentation (44K, 6 files)
**Reason**: DeepWiki framework dropped, references obsolete

```bash
packages/agents/src/standard/docs/deepwiki/ (28K, 4 files)
├── TROUBLESHOOTING-REPOSITORY-CLONE-ISSUE.md
├── README.md
├── DEEPWIKI_QUICK_START.md
└── PRODUCTION_CONFIGURATION.md

packages/agents/src/standard/scripts/deepwiki/ (16K, 1 file)
└── setup-deepwiki-environment.sh

packages/agents/src/standard/docs/testing/
└── HOW_TO_RUN_REAL_DEEPWIKI_TESTS.md (part of 24K testing/)

packages/agents/src/standard/docs/implementation/
└── deepwiki-enhancement-plan.md (part of implementation/)
```

**Total**: 2 directories + 2 individual files, ~44K

---

### Category 3: Old Planning & Bug Documentation (56K, 8 files)
**Reason**: Historical planning docs and bug reports from Aug-Sep 2025

```bash
packages/agents/src/standard/docs/bugs/ (24K, 3 files)
├── BUG_082_TO_086_SESSION_DISCOVERIES.md
├── BUG_082_V8_REPORT_FORMAT_ISSUES.md
└── BUG_087_UNIVERSAL_FRAMEWORK_INTEGRATION_ISSUES.md

packages/agents/src/standard/docs/planning/ (32K, 4+ files)
├── CLEANUP_SUMMARY.md
├── README.md
├── ENHANCEMENT-SUMMARY.md
└── OPERATIONAL-PLAN.md
```

**Total**: 2 directories, ~8 files, 56K

---

### Category 4: Old Testing & Development State Docs (40K, 5 files)
**Reason**: Old testing workflows and development state snapshots

```bash
packages/agents/src/standard/docs/testing/ (24K, 3 files)
├── README.md
├── TESTING_WORKFLOW_GUIDE.md
└── HOW_TO_RUN_REAL_DEEPWIKI_TESTS.md (DeepWiki)

packages/agents/src/standard/docs/development_state/ (16K, 2 files)
├── state_2025_08_19_v7_report_enhancement.md
└── state_2025_08_19_json_format_bugs_fixed.md
```

**Total**: 2 directories, 5 files, 40K

---

### Category 5: Deprecated Architecture & Implementation Docs (100K+, 20+ files)
**Reason**: Old architecture versions (V3, V5), superseded by V9/V4

```bash
packages/agents/src/standard/docs/architecture/ (~150K, 11+ files)
├── ARCHITECTURE.md (old general architecture)
├── ARCHITECTURE_V3.md (superseded by V9/V4)
├── END_TO_END_WRAPPER.md
├── UNIFIED_ANALYSIS_WRAPPER.md
├── FAKE_DATA_FILTERING_SOLUTION.md
├── REPOSITORY_INDEXING_ARCHITECTURE.md
├── SMART_CACHE_MANAGEMENT.md
├── SCORE_PERSISTENCE.md
├── pr-decision-logic.md
├── search-decision-flow.md
└── Comprehencieve Template Library.md

packages/agents/src/standard/docs/guides/ (~40K, 3+ files)
├── DEV-CYCLE-ORCHESTRATOR-GUIDE.md
├── REPORT_GENERATION_GUIDE.md
└── README.md

packages/agents/src/standard/docs/implementation/ (~60K, 6+ files)
├── location-enhancement-implementation.md
├── implementation-guide.md
├── mcp-tool-chain-guide.md
├── skill-calculation-guide.md
├── deepwiki-enhancement-plan.md (DeepWiki)
└── README.md

packages/agents/src/standard/docs/ (root level, ~40K)
├── INDEX.md
├── QUICK_START.md
├── SESSION_CONTINUITY_PATHS.md
└── AI_DRIVEN_PARSER_IMPLEMENTATION.md
```

**Need Review**: Verify these are superseded by V9/two-branch docs
**Total**: ~250K+ of old architecture/implementation documentation

---

### Category 6: Deprecated Code Files (Need Verification)
**Reason**: May be superseded by two-branch implementations

#### Comparison (620K)
```bash
comparison/report-generator-v8-fixes.ts (likely superseded)
comparison/report-generator-v8-comprehensive-fix.ts (likely superseded)
comparison/report-generator-v8-final-enhanced.ts (possibly superseded)
comparison/report-generator-html-beautiful.ts (HTML version)
comparison/comparison-agent-production.ts
comparison/report-fixes.ts
comparison/DEPRECATED_V7_WARNING.md (V7 is deprecated)
```

**Note**: Need to verify which report generators are still used vs superseded by two-branch

#### Services (724K)
```bash
services/fix-suggestion-agent.ts
services/fix-suggestion-agent-v2.ts
services/fix-suggestion-agent-v3.ts (multiple versions)
services/template-library.ts
services/template-library-v2.ts
services/security-template-library.ts
services/issue-matcher-enhanced.ts
services/enhanced-location-finder.ts
services/code-snippet-locator.ts
services/code-snippet-bidirectional-locator.ts
services/repository-indexer.ts
services/dual-branch-indexing-strategy.ts
services/pr-analysis-categorizer.ts
services/enhanced-pr-categorizer.ts
... (many more service files)
```

**Note**: CANNOT delete services actively imported by two-branch (see dependencies above)

#### Scripts (40K, 18 files)
```bash
scripts/deepwiki/setup-deepwiki-environment.sh (DeepWiki - DELETE)
scripts/update-configs-with-openrouter.ts
scripts/show-discovered-models.ts
scripts/check-latest-models.ts
scripts/discover-openrouter-models.ts
scripts/verify-stored-configs.ts
scripts/monitoring-dashboard.ts
scripts/clear-and-regenerate-configs.ts
scripts/apply-model-configs-migration.ts
scripts/check-table-schema.ts
scripts/retrieve-actual-configs.ts
scripts/generate-model-configs.ts
scripts/show-sample-configs.ts
scripts/update-with-real-models.ts
scripts/update-with-latest-models.ts
scripts/update-with-fresh-models.ts
scripts/codequal-session-starter.ts
```

**Note**: Model config scripts may still be useful - need verification

---

## 🛡️ MUST KEEP (Active Dependencies)

### Files Actively Imported by Two-Branch

These files CANNOT be deleted until dependencies are migrated to two-branch:

```bash
infrastructure/supabase/supabase-config-provider.ts
orchestrator/model-config-resolver.ts
services/model-selection-service.ts
services/dynamic-model-selector.ts
services/unified-location-service.ts
services/ai-service.ts
monitoring/services/unified-monitoring.service.ts
educator/educator-agent.ts
educator/interfaces/educator.interface.ts
utils/index.ts (exports createLogger)
```

Plus any dependencies these files have (types, interfaces, etc.)

---

## 📋 Proposed Deletion Plan

### Phase 2H-A: Safe Deletions (No Dependencies)

**Immediate deletion (low risk)**:

1. ✅ Delete historical reports (124K, 6 directories)
2. ✅ Delete DeepWiki docs & scripts (44K, 2 directories + 2 files)
3. ✅ Delete old planning & bug docs (56K, 2 directories)
4. ✅ Delete old testing & development state docs (40K, 2 directories)

**Total**: 264K, 12 directories, ~32 files

---

### Phase 2H-B: Documentation Review (Requires Verification)

**Review and selectively delete**:

1. docs/architecture/ - Compare with V9 docs, delete superseded versions
2. docs/guides/ - Check if guides are still relevant
3. docs/implementation/ - Verify implementation docs are obsolete
4. docs/ (root) - Review INDEX.md, QUICK_START.md, etc.

**Estimated**: 250K+, 30+ files

---

### Phase 2H-C: Code Migration (Future Phase)

**Cannot delete immediately - need migration plan**:

1. Migrate actively-imported files from standard/ to two-branch/
2. Update import paths in 21 files
3. Delete standard/ directory entirely after migration

**This is a separate, larger effort** - not part of Phase 2H

---

## ⚠️ Risk Assessment

### Low Risk (Phase 2H-A)
- Historical reports: ✅ No imports
- DeepWiki docs: ✅ No active references
- Old planning/bugs: ✅ Historical only
- Old testing docs: ✅ Superseded

### Medium Risk (Phase 2H-B)
- Architecture docs: May have useful reference material
- Implementation guides: May document current patterns
- Need manual review before deletion

### High Risk (Phase 2H-C)
- Active code files with dependencies
- Requires careful migration planning
- Should be separate initiative

---

## 🎯 Recommended Approach

### Option 1: Conservative (Recommended)
**Execute Phase 2H-A only** (safe deletions, no dependencies)
- Delete 264K, 12 directories, ~32 files
- Leave Phase 2H-B (docs) and 2H-C (code) for future review
- Low risk, quick execution

### Option 2: Aggressive
**Execute Phase 2H-A + Phase 2H-B** (delete most documentation too)
- Delete 500K+, 20+ directories, ~60 files
- Higher risk - may lose useful reference material
- Requires manual review of each doc

### Option 3: Minimal
**Delete only historical reports and DeepWiki**
- Delete 168K, 8 directories, ~20 files
- Lowest risk
- Leaves planning/testing/architecture docs for later

---

## 📝 Execution Commands (Phase 2H-A)

If user approves Phase 2H-A:

```bash
# Historical reports
git rm -r packages/agents/src/standard/reports/2025-08-14
git rm -r packages/agents/src/standard/reports/2025-08-16
git rm -r packages/agents/src/standard/reports/2025-08-17
git rm -r packages/agents/src/standard/reports/2025-08-24
git rm -r packages/agents/src/standard/reports/2025-08-26
git rm -r packages/agents/src/standard/reports/2025-08-28

# DeepWiki
git rm -r packages/agents/src/standard/docs/deepwiki
git rm -r packages/agents/src/standard/scripts/deepwiki
git rm packages/agents/src/standard/docs/testing/HOW_TO_RUN_REAL_DEEPWIKI_TESTS.md
git rm packages/agents/src/standard/docs/implementation/deepwiki-enhancement-plan.md

# Old planning & bugs
git rm -r packages/agents/src/standard/docs/bugs
git rm -r packages/agents/src/standard/docs/planning

# Old testing & development state
git rm -r packages/agents/src/standard/docs/testing
git rm -r packages/agents/src/standard/docs/development_state

# Verify
git status
```

---

## ✅ User Approval Required

**Please confirm which approach you prefer**:

- [ ] **Option 1**: Phase 2H-A only (264K, safe deletions) - **RECOMMENDED**
- [ ] **Option 2**: Phase 2H-A + Phase 2H-B (500K+, includes docs review)
- [ ] **Option 3**: Minimal (168K, reports + DeepWiki only)
- [ ] **Custom**: Specify which categories to delete

**After approval, I will**:
1. Execute deletions
2. Create feature branch `cleanup/phase-2h-standard`
3. Commit with detailed message
4. Push for PR review

---

**Status**: ⏳ **AWAITING USER APPROVAL**
**Next**: Execute approved deletions, create PR
**Future**: Plan Phase 2H-C (code migration from standard to two-branch)

---

_Phase 2H Standard Directory Cleanup Plan - November 5, 2025_
_Created by Claude Code for Repository Organization_
