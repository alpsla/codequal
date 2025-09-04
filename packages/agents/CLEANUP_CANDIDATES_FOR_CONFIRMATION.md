# 🗑️ Cleanup Candidates for Confirmation

**Date:** 2025-09-03  
**Purpose:** List all files that can be deleted or archived to clean up the project

## ⚠️ PLEASE REVIEW BEFORE DELETION

### 📚 1. Outdated Documentation (Can Delete - Replaced by UNIFIED)
```bash
# These are superseded by UNIFIED_TOOL_COVERAGE_MATRIX.md
MCP_TOOLS_COVERAGE_MATRIX.md          # Old V1
MCP_TOOLS_COVERAGE_MATRIX_V2.md       # Old V2  
MCP_TOOLS_COVERAGE_MATRIX_V3.md       # Old V3 (claimed 100% incorrectly)

# Keep these (current and accurate):
✅ UNIFIED_TOOL_COVERAGE_MATRIX.md    # Current consolidated version
✅ FINAL_TOOL_COVERAGE_REPORT_2025_09_03.md  # Today's summary
✅ ACTUAL_TOOL_COVERAGE_2025_09_03.md  # Actual status
```

### 🧪 2. Test Files in Root (Can Move to tests/ or Delete)
```bash
# Old test files cluttering root directory (62 files!)
test-*.ts files in root:
- test-agents-simple.ts
- test-agents-tool-matrix.ts  
- test-all-agents-complete.ts
- test-all-agents-validation.ts
- test-all-languages-comprehensive.ts
- test-bundlephobia-api.ts
- test-comprehensive-detailed-pr.ts
- test-comprehensive-final.ts
- test-direct-agent-validation.ts
- test-enhanced-js-only.ts
- test-enhanced-reporting.ts
- test-extended-timeout.ts
- test-final-configuration.ts
- test-final-validated.ts
- test-github-api.ts
- test-javascript-comprehensive.ts
- test-javascript-pr.ts
- test-javascript-typescript-prs.ts
- test-js-pr-simple.ts
- test-orchestrator-comprehensive.ts
- test-orchestrator-monitoring.ts
- test-own-repo.ts
- test-platform-agents.ts
- test-platform-integration.ts
- test-pr-metadata.ts
- test-python-prod.ts
- test-real-prs-by-language.ts
- test-real-prs.ts
- test-real-repos-simple.ts
- test-remaining-languages.ts
- test-rust-agent-mock.ts
- test-rust-agent.ts
- test-rust-complete.ts
- test-rust-detailed-validation.ts
- test-rust-final.ts
- test-rust-fixes-complete.ts
- test-rust-optimized.ts
- test-rust-pr-fixed.ts
- test-rust-pr-simple.ts
- test-rust-pr-with-override.ts
- test-single-pr-comprehensive-fixed.ts
- test-single-pr-comprehensive.ts
- test-static-analysis-detailed.ts
- test-static-analysis.ts
- test-tools-execution-matrix.ts
- test-with-deduplication.ts
# ... and more

RECOMMENDATION: Move to src/tests/manual/ or delete if obsolete
```

### 📊 3. Generated Reports & JSON Files (Can Archive)
```bash
# Old analysis results
complete-analysis-2025-09-02T00-42-55-051Z.json
execution-matrix-2025-09-02T00-46-19-287Z.json
monitoring-report-2025-09-02T00-33-07-014Z.json
orchestrator-report.json
real-pr-analysis-report.json
test-results-comprehensive.json

# SQL files (check if needed)
add-rust-models.sql
model-configurations.sql
model-configurations-184.sql

RECOMMENDATION: Move to archive/ directory
```

### 📜 4. Duplicate Scripts (Can Delete)
```bash
scripts/:
- install-all-tools.sh         # Superseded by install-all-missing-tools.sh
- install-analysis-tools.sh    # Partial, integrated into comprehensive
- install-rust-tools.sh        # Integrated into comprehensive

# Keep these:
✅ install-all-missing-tools.sh  # Current comprehensive installer
✅ install-java-tools.sh         # Java-specific installer
✅ validate-all-tools.sh         # Validation script
✅ validate-tool-coverage.sh     # Coverage calculator
```

### 📝 5. Miscellaneous Files (Check Purpose)
```bash
# TypeScript files that look like one-off scripts
agent-model-mapping.ts
correct-weight-configuration.ts
demo-comprehensive-pr-analysis.ts
execute-model-research.ts
fix-model-selection.ts
orchestrator-comprehensive.ts
parametrized-model-researcher.ts
proper-model-research-example.ts
researcher-agent-supabase.ts
run-model-researcher.ts
validate-issue-fields.ts
validate-system-test.ts
verify-timeout-config.ts

RECOMMENDATION: Review and move to examples/ or delete
```

### 📁 6. Directories to Review
```bash
comprehensive-analysis-reports/  # Old reports, can archive
src/two-branch/agents/platform/  # Check if implemented
src/two-branch/agents/tools/     # Check if implemented  
src/two-branch/guards/           # Check if used
src/two-branch/orchestrator/     # Check vs orchestrators/
```

### 🔄 7. Duplicate Documentation
```bash
# Multiple session summaries
docs/session-4-final-summary.md
docs/SESSION_2025_09_01_CONTINUED.md
docs/QUICK_START_NEXT_SESSION.md
docs/QUICK_START_NEXT_SESSION_ADDENDUM.md

# Multiple implementation status docs
IMPLEMENTATION_COMPLETE.md
VALIDATION_REPORT.md
COMPREHENSIVE_TEST_REPORT.md
COMPREHENSIVE_TEST_RESULTS.md
FINAL_TEST_SUMMARY.md
RUST_VALIDATION_FINAL_REPORT.md

RECOMMENDATION: Archive old session docs
```

## 🎯 Recommended Cleanup Actions

### Phase 1: Quick Wins (Do Now)
```bash
# 1. Archive old test files
mkdir -p archive/old-tests
mv test-*.ts archive/old-tests/

# 2. Remove outdated matrices
rm MCP_TOOLS_COVERAGE_MATRIX.md
rm MCP_TOOLS_COVERAGE_MATRIX_V2.md
rm MCP_TOOLS_COVERAGE_MATRIX_V3.md

# 3. Archive old reports
mkdir -p archive/old-reports
mv complete-analysis-*.json archive/old-reports/
mv monitoring-report-*.json archive/old-reports/
mv execution-matrix-*.json archive/old-reports/
```

### Phase 2: Organize (After Confirmation)
```bash
# 1. Move one-off scripts
mkdir -p examples/research-scripts
mv *-researcher*.ts examples/research-scripts/
mv parametrized-*.ts examples/research-scripts/

# 2. Consolidate documentation
mkdir -p docs/archive/old-sessions
mv docs/*SESSION*.md docs/archive/old-sessions/

# 3. Clean scripts directory
cd scripts
rm install-all-tools.sh  # Duplicate
rm install-analysis-tools.sh  # Partial
rm install-rust-tools.sh  # Integrated
```

### Phase 3: Deep Clean (Optional)
```bash
# 1. Remove empty directories
find . -type d -empty -delete

# 2. Remove .DS_Store files (Mac)
find . -name ".DS_Store" -delete

# 3. Clean node_modules and rebuild
rm -rf node_modules
npm install
npm run build
```

## 📊 Space Savings Estimate

| Category | Files | Size | Action |
|----------|-------|------|--------|
| Old test files | 62 | ~500KB | Archive |
| Outdated matrices | 3 | ~100KB | Delete |
| Old reports | 15+ | ~50MB | Archive |
| Duplicate scripts | 3 | ~20KB | Delete |
| **Total** | **80+** | **~51MB** | Clean |

## ⚠️ DO NOT DELETE (Important Files)

```bash
# Current documentation
✅ UNIFIED_TOOL_COVERAGE_MATRIX.md
✅ FINAL_TOOL_COVERAGE_REPORT_2025_09_03.md
✅ CLOUD_POD_TOOL_STATUS_AND_ACTION_PLAN.md
✅ PRE_BUILT_IMAGES_AND_MEMORY_MANAGEMENT.md

# Docker configurations
✅ docker/Dockerfile.java-enterprise
✅ docker/Dockerfile.javascript-node
✅ docker/Dockerfile.analysis-complete

# Kubernetes configs
✅ k8s/analysis-pod-complete.yaml

# Working scripts
✅ scripts/install-java-tools.sh
✅ scripts/validate-all-tools.sh
```

## 🚀 Cleanup Command (After Your Confirmation)

```bash
#!/bin/bash
# cleanup.sh - Run after confirmation

echo "🧹 Starting CodeQual cleanup..."

# Create archive directories
mkdir -p archive/{old-tests,old-reports,old-docs,old-scripts}

# Phase 1: Archive test files
echo "Archiving old test files..."
mv test-*.ts archive/old-tests/ 2>/dev/null

# Phase 2: Remove outdated matrices
echo "Removing outdated matrix files..."
rm -f MCP_TOOLS_COVERAGE_MATRIX.md
rm -f MCP_TOOLS_COVERAGE_MATRIX_V2.md
rm -f MCP_TOOLS_COVERAGE_MATRIX_V3.md

# Phase 3: Archive old reports
echo "Archiving old reports..."
mv complete-analysis-*.json archive/old-reports/ 2>/dev/null
mv monitoring-report-*.json archive/old-reports/ 2>/dev/null
mv execution-matrix-*.json archive/old-reports/ 2>/dev/null

# Phase 4: Clean scripts
echo "Cleaning duplicate scripts..."
mv scripts/install-all-tools.sh archive/old-scripts/ 2>/dev/null
mv scripts/install-analysis-tools.sh archive/old-scripts/ 2>/dev/null
mv scripts/install-rust-tools.sh archive/old-scripts/ 2>/dev/null

echo "✅ Cleanup complete!"
echo "Archived files are in: ./archive/"
echo "You can safely delete the archive/ directory after review"
```

---

**⚠️ PLEASE CONFIRM:** Which files should we delete, archive, or keep?