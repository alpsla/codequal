# Core & Database Package Cleanup Analysis

**Date**: 2025-11-06
**Scope**: packages/core and packages/database
**Focus**: Files containing "index" and "analyze", plus database structure review

---

## 📊 Executive Summary

### packages/core
- **scripts/calibration**: 100+ files, many analyze-* scripts (experimental calibration code)
- **src/**: Multiple index.ts files (normal module exports)
- **Recommendation**: Archive old calibration scripts, keep src/ structure

### packages/database
- **debug-scripts/**: 21 auth-related SQL debug files (July 7)
- **migrations/**: 24 migration files (organized chronologically)
- **Recommendation**: Archive debug-scripts (auth issues resolved)

---

## 🔍 Detailed Analysis

### packages/core/scripts Structure

#### scripts/calibration/ (100+ files)
**Purpose**: Historical model calibration experiments
**Key Files with "analyze"**:
```
analyze-deepseek-coder.js (9.4K)
analyze-model-data.js (8.9K)
analyze-repo-light.js (7.1K)
analyze-repo.py (4.9K)
analyze-repo.sh (1.1K)
analyze-scoring-variants.js (5.5K)
analyze-with-deepwiki.sh (1.7K)
repo-analyzer-simple.js (4.3K)
repo-analyzer.js (6.0K)
standalone-analyzer.sh (5.4K)
```

**Assessment**: ⚠️ **ARCHIVE CANDIDATE**
- All from June 9, 2025 (5 months old)
- Experimental calibration code
- Not actively used in production
- Duplicates similar analysis logic

**Subdirectories**:
```
calibration/calibration-reports/
calibration/reports/
```

**Recommendation**:
- Move to `packages/core/scripts/archive/calibration/`
- Keep any scripts currently referenced in package.json
- Document which scripts are still active

#### scripts/deepwiki-chatbot-poc/
**Files**: Contains index.js
**Assessment**: ✅ **KEEP (POC directory)**
- Proof of concept code
- May be useful for reference

#### scripts/modules/
**Structure**:
```
modules/
└── enhanced-calibration/
```
**Assessment**: ✅ **KEEP**
- Organized module structure

---

### packages/core/src Structure

#### Index Files (Normal Module Exports)
```typescript
src/index.ts                         // Main package export
src/types/index.ts                   // Type definitions export
src/config/index.ts                  // Config exports
src/config/models/index.ts           // Model config exports
src/config/mcp-tools/index.ts        // MCP tools exports
src/config/maintenance/index.ts      // Maintenance exports
src/utils/index.ts                   // Utility exports
src/services/index.ts                // Services export
src/services/cache/index.ts          // Cache service export
src/services/scheduling/index.ts     // Scheduling export
src/services/rag/index.ts            // RAG service export
src/services/deepwiki-tools/index.ts // DeepWiki tools export
src/services/model-selection/index.ts
src/services/model-selection/providers/index.ts
```

**Assessment**: ✅ **KEEP ALL**
- Standard TypeScript module export pattern
- Essential for package functionality
- Proper code organization

#### Analyzer Files
```typescript
src/services/deepwiki-tools/git-diff-analyzer.service.ts
src/services/rag/query-analyzer.ts
src/services/rag/__tests__/query-analyzer.test.ts
```

**Assessment**: ✅ **KEEP ALL**
- Active service implementations
- Production code
- Includes tests

---

### packages/database Structure

#### debug-scripts/ (21 files - ALL from July 7, 2025)

**Auth Debug Scripts** (13 files):
```sql
check-auth-setup-fixed.sql (1.3K)
check-auth-setup.sql (1.3K)
diagnose-auth-issue.sql (4.5K)
diagnose-sql-injection.sql (2.4K)
fix-auth-compatible.sql (8.2K)
fix-auth-comprehensive.sql (6.6K)
fix-auth-critical.sql (7.6K)
fix-auth-granting-issue.sql (6.6K)
fix-auth-grants.sql (864B)
fix-auth-minimal.sql (4.1K)
fix-auth-simple-v2.sql (2.0K)
fix-auth-simple.sql (3.6K)
fix-auth-type-mismatch.sql (5.4K)
fix-auth-type-safe.sql (5.0K)
fix-auth-uuid.sql (4.2K)
fix-sql-injection-auth-v2.sql (5.4K)
fix-sql-injection-auth.sql (4.0K)
```

**Test Scripts** (3 files):
```javascript
debug-auth-issue.js (8.6K)
test-auth-deep.js (5.9K)
test-auth-flow.js (5.7K)
```

**Other**:
```sql
generate-access-token.sql (1.0K)
```

**Assessment**: ❌ **ARCHIVE CANDIDATE**
- All files from July 7, 2025 (4 months old)
- Auth issues likely resolved (see migrations from July 6)
- Debug/diagnostic scripts for temporary issues
- Multiple variations of same fix (fix-auth-*)

**Recommendation**:
- Move to `packages/database/archive/debug-scripts-2025-07/`
- Add README explaining the auth issue that was being debugged

---

#### migrations/ (24 files)

**Chronological Organization** (GOOD):
```sql
20241228_api_key_management.sql (8.4K)
20250106_fix_auth_profile_sync.sql (6.3K)
20250106_fix_profile_creation.sql (4.8K)
20250106_fix_profile_creation_safe.sql (4.9K)
20250106_organization_settings.sql (4.8K)
20250108_billing_tables.sql (2.8K)
20250108_error_logging.sql (1.4K)
20250108_trial_tracking.sql (3.1K)
20250118_add_api_tier.sql (274B)
20250118_create_user_billing_trigger.sql (908B)
20250513_deepwiki_schema.sql (13K)
20250527_vector_database_setup.sql (12K)
20250530_rag_schema_integration.sql (16K)
20250530_rag_schema_integration_fixed.sql (16K)
20250615_analysis_reports.sql (7.8K)
20250615_repository_scheduling.sql (4.6K)
20250627_skill_tracking.sql (6.2K)
20250630_issue_resolution_tracking.sql (8.3K)
20250703_add_auth_method.sql (2.8K)
20250703_flexible_providers.sql (2.4K)
20250703_oauth_setup.sql (11K)
20250703_vector_db_auth_integration.sql (19K)
combined-billing-migrations.sql (7.7K)
vector_database_simple.sql (2.5K)
```

**Issues Found**:
1. ⚠️ **Duplicate migrations**: `20250530_rag_schema_integration.sql` and `_fixed.sql` version
2. ⚠️ **Combined migration**: `combined-billing-migrations.sql` duplicates individual billing migrations
3. ⚠️ **Non-timestamped**: `vector_database_simple.sql` doesn't follow naming convention

**Assessment**: 🔧 **NEEDS CLEANUP**

**Recommendation**:
1. Delete `20250530_rag_schema_integration.sql` (keep _fixed.sql version)
2. Delete `combined-billing-migrations.sql` (redundant with individual migrations)
3. Rename or delete `vector_database_simple.sql` (if still needed, add timestamp)

---

#### src/ Structure

**Well Organized** ✅:
```
src/
├── index.ts (main export)
├── migrations/ (migration scripts)
├── models/ (27 model files)
├── optimizations/ (database optimizations)
├── services/ (database services)
├── shims/ (type shims)
└── supabase/ (Supabase client & types)
```

**Assessment**: ✅ **KEEP STRUCTURE**
- Professional organization
- Clear separation of concerns
- No cleanup needed

---

#### Root Files

**Files in database/ root**:
```javascript
apply-billing-migrations.js (2.9K)  // Script to apply billing migrations
README.md (5.3K)                    // Package documentation
package.json                        // Package config
tsconfig.json                       // TypeScript config
```

**Assessment**: ✅ **KEEP ALL**
- Essential package files
- apply-billing-migrations.js is actively used

---

## 📋 Cleanup Recommendations

### Phase 1: packages/core/scripts/calibration ⚠️

**Action**: Archive old calibration scripts
**Files**: 100+ experimental analyze-* and repo-analyzer-* scripts

**Execution**:
```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/core/scripts

# Create archive directory
mkdir -p archive/calibration-2025-06

# Move calibration scripts
mv calibration archive/calibration-2025-06/
mv calibration-results archive/calibration-2025-06/

# Create README explaining archive
cat > archive/calibration-2025-06/README.md << 'EOF'
# Archived Calibration Scripts (June 2025)

This directory contains historical model calibration experiments from June 2025.

**Reason for Archive**: Experimental code, not actively used in production.

**Contents**:
- analyze-* scripts: Various model analysis experiments
- repo-analyzer scripts: Repository analysis prototypes
- calibration-reports/: Generated calibration reports
- reports/: Additional calibration reports

If you need to reference this code, it's preserved here for historical purposes.
EOF
```

**Impact**: Clean up 100+ experimental files from scripts/

---

### Phase 2: packages/database/debug-scripts ❌

**Action**: Archive auth debug scripts from July 7
**Files**: 21 auth-related debug/fix scripts

**Execution**:
```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/database

# Create archive directory
mkdir -p archive/auth-debug-2025-07

# Move debug scripts
mv debug-scripts archive/auth-debug-2025-07/

# Create README explaining what was debugged
cat > archive/auth-debug-2025-07/README.md << 'EOF'
# Auth Debug Scripts Archive (July 2025)

This directory contains debug and fix scripts from July 7, 2025 when we were troubleshooting authentication and profile sync issues.

**Issue**: Auth profile synchronization and SQL injection vulnerabilities
**Resolution Date**: July 7, 2025
**Migration**: 20250106_fix_auth_profile_sync.sql

**Contents**:
- check-auth-*.sql: Auth setup verification scripts
- diagnose-*.sql: Issue diagnosis queries
- fix-auth-*.sql: Various fix attempts (17 variations)
- test-auth-*.js: Auth flow testing scripts

**Status**: Issues resolved, scripts archived for reference.
EOF
```

**Impact**: Clean up 21 temporary debug files

---

### Phase 3: packages/database/migrations 🔧

**Action**: Remove duplicate and non-standard migrations

**Execution**:
```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/database/migrations

# Delete old version (keep _fixed.sql)
rm 20250530_rag_schema_integration.sql

# Delete redundant combined migration
rm combined-billing-migrations.sql

# Check if vector_database_simple.sql is still needed
# If yes, rename to follow convention (add timestamp)
# If no, delete it
git log --all -- vector_database_simple.sql  # Check usage history

# Rename if still needed:
mv vector_database_simple.sql 20250527_vector_database_simple.sql

# OR delete if superseded:
# rm vector_database_simple.sql
```

**Impact**: Remove 2-3 redundant migration files

---

### Phase 4: packages/core/src ✅

**Action**: NO CLEANUP NEEDED

**Reason**:
- All index.ts files are standard module exports
- Analyzer services are production code
- Structure is clean and professional

---

## 📊 Summary

### Files to Archive/Delete

| Package | Directory | Files | Action | Reason |
|---------|-----------|-------|--------|--------|
| core | scripts/calibration | 100+ | Archive | Experimental code (June 2025) |
| database | debug-scripts | 21 | Archive | Auth debug (July 2025, resolved) |
| database | migrations | 2-3 | Delete | Duplicates, non-standard naming |

### Files to Keep

| Package | Directory | Files | Reason |
|---------|-----------|-------|--------|
| core | src/ | All index.ts | Standard module exports |
| core | src/services | Analyzers | Production code |
| database | src/ | All | Clean structure |
| database | migrations | 21 | Active migrations |

---

## 📈 Expected Impact

### packages/core
**Before**: 100+ calibration scripts scattered
**After**: Clean scripts/ directory, archived calibration code
**Reduction**: ~90% of scripts/ files archived

### packages/database
**Before**: 21 debug scripts + 24 migrations (3 duplicates)
**After**: 0 debug scripts + 21 clean migrations
**Reduction**: 24 files archived/deleted (21 debug + 3 migration duplicates)

---

## ⚠️ Important Checks Before Execution

### Check 1: Verify calibration scripts not in use
```bash
# Search for imports of calibration scripts
rg "calibration/" packages/*/src --type ts
rg "analyze-repo" packages/*/package.json
```

### Check 2: Verify auth issues resolved
```bash
# Check recent auth-related migrations
ls -lt packages/database/migrations/*auth* | head -5

# Verify no recent references to debug scripts
rg "debug-scripts" packages/ --type ts --type js
```

### Check 3: Check migration dependencies
```bash
# Verify combined-billing-migrations.sql is truly redundant
diff packages/database/migrations/combined-billing-migrations.sql \
     <(cat packages/database/migrations/20250108_billing_tables.sql \
          packages/database/migrations/20250108_trial_tracking.sql)
```

---

## 🎯 Execution Order

1. ✅ **Phase 1**: Archive core/scripts/calibration (low risk)
2. ✅ **Phase 2**: Archive database/debug-scripts (low risk)
3. ⚠️ **Phase 3**: Clean database/migrations (verify first)
4. ✅ **Phase 4**: No action needed for src/ directories

---

**Status**: Ready for review and execution
**Risk Level**: Low (mostly archiving old debug/experimental code)
**Recommendation**: Execute Phase 1 & 2, verify Phase 3 dependencies before deletion
