# Agents Root Directory Cleanup Analysis

**Date**: 2025-11-06
**Scope**: /packages/agents/ root directory
**Current State**: 52 files (WAY too many!)
**Goal**: Organize into proper subdirectories

---

## 🚨 Problem

**Current**: 52 files scattered in `/packages/agents/` root
**Ideal**: ≤10 files (only essential configs + critical docs)
**Reduction Needed**: ~80%

---

## 📊 Current File Breakdown

### Test Files (24 files) → Move to tests/
```
check-all-languages.ts
check-educator-orchestrator-models.ts
check-java-code-quality.ts
check-java-configs-local.ts
check-meta-roles.ts
check-supabase-models.ts
check-supabase-security.ts
check-supabase-tables.ts
debug-pmd.ts
debug-security-score.ts
debug-v5-tools.ts
oracle-e2e-v9-complete.ts
process-research-requests.ts
quick-pmd-test.ts
test-openrouter-auth.js
test-real-openrouter.js
test-v9-e2e-complete.ts
test-v9-lite-e2e.ts
test-v9-multi-framework.ts
verify-app-migration.ts
```

### Fix/Update Scripts (10 files) → Move to scripts/
```
clean-duplicate-models.ts
fix-duplicate-educator-configs.ts
fix-security-model.ts
recalculate-security-score.ts
refactor-compile-report.py
show-configs-by-role.ts
update-all-languages.ts
update-all-roles.ts
update-weights-only.ts
```

### Docker Compose Files (4 files) → Move to docker/
```
docker-compose.complete-mcp.yml
docker-compose.full.yml
docker-compose.mcp.yml
docker-compose.secure-mcp.yml
```

### SQL Files (2 files) → Move to sql/ or migrations/
```
FIX_SCORE_SCHEMA.sql
fix-supabase-schema.sql
```

### Data/Output Files (5 files) → Move or Delete
```
EXAMPLE_CURSOR_FIX.json → examples/ or delete
LATEST_ISSUE_GROUPS_MAP.json → data/ or delete
skills-baseline.json → data/
v9-skills-baseline-v9-supabase-1757500166354.json → data/ or delete
java-pr-analysis-output.txt → delete or test-outputs/
```

### Status/Checklist Files (2 files) → Move to docs/
```
END_OF_SESSION_CHECKLIST.txt → docs/development/
STATUS_ALL_COMPLETE.txt → docs/
```

### Config Files (5 files) → KEEP in root ✅
```
✅ package.json
✅ tsconfig.json
✅ tsconfig.eslint.json
✅ jest.config.js
✅ tsconfig.tsbuildinfo
```

### Critical Documentation (3 files) → KEEP in root ✅
```
✅ DEPRECATED_FLOWS_DO_NOT_USE.md (CRITICAL - prevents bad patterns)
✅ V9_CANONICAL_ARCHITECTURE.md (CRITICAL - defines proper flow)
✅ V9_PRODUCTION_ARCHITECTURE.md (production architecture)
```

---

## 🎯 Recommended Organization

### Keep in Root (8 files only)
```
✅ package.json
✅ tsconfig.json
✅ tsconfig.eslint.json
✅ jest.config.js
✅ tsconfig.tsbuildinfo
✅ DEPRECATED_FLOWS_DO_NOT_USE.md
✅ V9_CANONICAL_ARCHITECTURE.md
✅ V9_PRODUCTION_ARCHITECTURE.md
```

### Create/Use: tests/ directory
```
tests/
├── integration/
│   ├── test-v9-e2e-complete.ts
│   ├── test-v9-lite-e2e.ts
│   ├── test-v9-multi-framework.ts
│   └── oracle-e2e-v9-complete.ts
├── validation/
│   ├── check-all-languages.ts
│   ├── check-educator-orchestrator-models.ts
│   ├── check-java-code-quality.ts
│   ├── check-java-configs-local.ts
│   ├── check-meta-roles.ts
│   ├── check-supabase-models.ts
│   ├── check-supabase-security.ts
│   ├── check-supabase-tables.ts
│   └── verify-app-migration.ts
├── debug/
│   ├── debug-pmd.ts
│   ├── debug-security-score.ts
│   └── debug-v5-tools.ts
└── quick-tests/
    ├── quick-pmd-test.ts
    ├── test-openrouter-auth.js
    └── test-real-openrouter.js
```

### Expand: scripts/ directory
```
scripts/
├── supabase/
│   ├── clean-duplicate-models.ts
│   ├── fix-duplicate-educator-configs.ts
│   ├── fix-security-model.ts
│   ├── recalculate-security-score.ts
│   └── show-configs-by-role.ts
├── updates/
│   ├── update-all-languages.ts
│   ├── update-all-roles.ts
│   └── update-weights-only.ts
└── refactoring/
    ├── refactor-compile-report.py
    └── process-research-requests.ts
```

### Move docker-compose files to docker/
```
docker/
├── docker-compose.complete-mcp.yml
├── docker-compose.full.yml
├── docker-compose.mcp.yml
└── docker-compose.secure-mcp.yml
```

### Create: sql/ or database/migrations/
```
sql/
├── FIX_SCORE_SCHEMA.sql
└── fix-supabase-schema.sql
```

Or:
```
database/
└── migrations/
    ├── FIX_SCORE_SCHEMA.sql
    └── fix-supabase-schema.sql
```

### Create: data/ directory (or delete these files)
```
data/
├── skills-baseline.json
└── examples/
    └── EXAMPLE_CURSOR_FIX.json

# Likely DELETE:
- LATEST_ISSUE_GROUPS_MAP.json (probably outdated)
- v9-skills-baseline-v9-supabase-1757500166354.json (timestamped - likely old)
- java-pr-analysis-output.txt (test output)
```

### Move to docs/
```
docs/development/
├── END_OF_SESSION_CHECKLIST.txt
└── STATUS_ALL_COMPLETE.txt
```

---

## 📋 Execution Plan

### Phase 1: Create Directory Structure
```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents

# Create test subdirectories
mkdir -p tests/integration
mkdir -p tests/validation
mkdir -p tests/debug
mkdir -p tests/quick-tests

# Create script subdirectories
mkdir -p scripts/supabase
mkdir -p scripts/updates
mkdir -p scripts/refactoring

# Create data directory
mkdir -p data/examples

# Create SQL directory (choose one approach)
mkdir -p sql  # OR: mkdir -p database/migrations
```

### Phase 2: Move Test Files
```bash
# Integration tests
mv test-v9-e2e-complete.ts tests/integration/
mv test-v9-lite-e2e.ts tests/integration/
mv test-v9-multi-framework.ts tests/integration/
mv oracle-e2e-v9-complete.ts tests/integration/

# Validation tests
mv check-*.ts tests/validation/
mv verify-app-migration.ts tests/validation/

# Debug tests
mv debug-*.ts tests/debug/

# Quick tests
mv quick-pmd-test.ts tests/quick-tests/
mv test-openrouter-auth.js tests/quick-tests/
mv test-real-openrouter.js tests/quick-tests/
mv process-research-requests.ts tests/quick-tests/
```

### Phase 3: Move Scripts
```bash
# Supabase scripts
mv clean-duplicate-models.ts scripts/supabase/
mv fix-duplicate-educator-configs.ts scripts/supabase/
mv fix-security-model.ts scripts/supabase/
mv recalculate-security-score.ts scripts/supabase/
mv show-configs-by-role.ts scripts/supabase/

# Update scripts
mv update-all-languages.ts scripts/updates/
mv update-all-roles.ts scripts/updates/
mv update-weights-only.ts scripts/updates/

# Refactoring scripts
mv refactor-compile-report.py scripts/refactoring/
```

### Phase 4: Move Docker Compose Files
```bash
mv docker-compose*.yml docker/
```

### Phase 5: Move SQL Files
```bash
mv *.sql sql/
# OR: mv *.sql database/migrations/
```

### Phase 6: Handle Data Files
```bash
# Move examples
mv EXAMPLE_CURSOR_FIX.json data/examples/

# Delete outdated data (check first!)
rm LATEST_ISSUE_GROUPS_MAP.json  # Likely outdated
rm v9-skills-baseline-v9-supabase-*.json  # Old timestamped data
rm java-pr-analysis-output.txt  # Test output

# Move baseline if still needed
mv skills-baseline.json data/
```

### Phase 7: Move Documentation
```bash
mv END_OF_SESSION_CHECKLIST.txt ../../docs/development/
mv STATUS_ALL_COMPLETE.txt ../../docs/
```

### Phase 8: Verify Root Directory
```bash
ls -la | grep -v "^d" | grep -v "^total"
# Should show only:
# - package.json
# - tsconfig.json
# - tsconfig.eslint.json
# - jest.config.js
# - tsconfig.tsbuildinfo
# - DEPRECATED_FLOWS_DO_NOT_USE.md
# - V9_CANONICAL_ARCHITECTURE.md
# - V9_PRODUCTION_ARCHITECTURE.md
# Plus: node_modules, src, dist, docs (directories)
```

---

## 📊 Expected Impact

| Category | Before | After | Location |
|----------|--------|-------|----------|
| **Test Files** | 24 in root | 0 in root | tests/ subdirs |
| **Scripts** | 10 in root | 0 in root | scripts/ subdirs |
| **Docker Compose** | 4 in root | 0 in root | docker/ |
| **SQL Files** | 2 in root | 0 in root | sql/ or database/migrations/ |
| **Data Files** | 5 in root | 0 in root | data/ or deleted |
| **Docs** | 2 in root | 0 in root | ../../docs/ |
| **Configs** | 5 in root | 5 in root | ✅ Stay |
| **Critical Docs** | 3 in root | 3 in root | ✅ Stay |
| **TOTAL** | 52 files | 8 files | 85% reduction ✅ |

---

## ⚠️ Important Considerations

### 1. Update Import Paths
After moving test files, you may need to update import paths:
```typescript
// Before (from root)
import { something } from './src/...'

// After (from tests/integration/)
import { something } from '../../src/...'
```

### 2. Update package.json Scripts
```json
{
  "scripts": {
    "test:integration": "ts-node tests/integration/test-v9-e2e-complete.ts",
    "test:validation": "ts-node tests/validation/check-all-languages.ts",
    "scripts:clean-models": "ts-node scripts/supabase/clean-duplicate-models.ts"
  }
}
```

### 3. Update Jest Configuration
```javascript
// jest.config.js
module.exports = {
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/tests/**/*.test.ts'],
  // ...
};
```

### 4. Check if Files Are Still Used
Before moving, verify files are still actively used:
```bash
# Example: Check if quick-pmd-test.ts is referenced anywhere
rg "quick-pmd-test" --type ts
```

---

## 🎯 Benefits

1. **Cleaner Root**: Only 8 essential files in root
2. **Better Organization**: Tests with tests, scripts with scripts
3. **Easier Navigation**: Clear directory structure
4. **Improved Maintainability**: Related files grouped together
5. **Professional Structure**: Follows Node.js project conventions

---

## ✅ Final Structure

```
packages/agents/
├── package.json ✅
├── tsconfig.json ✅
├── tsconfig.eslint.json ✅
├── jest.config.js ✅
├── tsconfig.tsbuildinfo ✅
├── DEPRECATED_FLOWS_DO_NOT_USE.md ✅
├── V9_CANONICAL_ARCHITECTURE.md ✅
├── V9_PRODUCTION_ARCHITECTURE.md ✅
├── src/
├── dist/
├── docs/
├── tests/
│   ├── integration/
│   ├── validation/
│   ├── debug/
│   └── quick-tests/
├── scripts/
│   ├── supabase/
│   ├── updates/
│   └── refactoring/
├── docker/
│   └── docker-compose*.yml
├── sql/
│   └── *.sql
└── data/
    └── examples/
```

---

**Status**: Ready for execution
**Estimated Time**: 30 minutes
**Risk**: Medium (need to update import paths and scripts)
**Recommendation**: Execute in phases, test after each phase
