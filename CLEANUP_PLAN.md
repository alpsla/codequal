# 🧹 CodeQual Project Cleanup Plan
**Generated:** 2025-10-30
**Current Branch:** feat/java-light-test-sequence
**Status:** All bug fixes committed ✅

---

## 📋 Table of Contents
1. [Safe to Delete Immediately](#safe-to-delete-immediately)
2. [Archive (Preserve for History)](#archive-preserve-for-history)
3. [Documentation to Preserve for RAG](#documentation-to-preserve-for-rag)
4. [Questionable - Needs Review](#questionable---needs-review)
5. [Keep (Auth, Billing, Active Code)](#keep-auth-billing-active-code)
6. [Execution Plan](#execution-plan)

---

## ✅ Safe to Delete Immediately

### 1. Test Outputs (~2000 files, ~500MB)
**Location:** `packages/agents/test-outputs/`
**Action:** Delete all except last 5 reports for verification
```bash
# Keep only the 5 most recent reports
find packages/agents/test-outputs/ -name "*.md" -type f | \
  sort -r | tail -n +6 | xargs rm -f
find packages/agents/test-outputs/ -name "*.json" -type f | \
  sort -r | tail -n +6 | xargs rm -f
```

### 2. Cache Directories
**Locations:**
- `packages/agents/.deepwiki-cache/`
- `packages/agents/.mypy_cache/`
- `packages/agents/.ruff_cache/`
- `.turbo/cache/`
- `.serena/cache/`

**Action:** Delete all (rebuild on next run)
```bash
rm -rf packages/agents/.deepwiki-cache
rm -rf packages/agents/.mypy_cache
rm -rf packages/agents/.ruff_cache
rm -rf .turbo/cache
rm -rf .serena/cache
```

### 3. Backup & Duplicate Files
**Files:**
- `packages/agents/.env.backup-1760384712`
- `packages/agents/.env.bak`
- `packages/agents/.env.production` (if not used)

**Action:** Delete backups
```bash
rm -f packages/agents/.env.backup-*
rm -f packages/agents/.env.bak
```

### 4. System Files
**Files:**
- All `.DS_Store` files (macOS metadata)
- `.last-pr-index` (test artifact)

**Action:** Delete
```bash
find . -name ".DS_Store" -type f -delete
rm -f packages/agents/.last-pr-index
```

### 5. Old Build Artifacts
**Locations:**
- `packages/ui/test-results/` (Playwright artifacts)
- Old `dist/` directories not in use

**Action:** Clean test artifacts
```bash
rm -rf packages/ui/test-results
```

---

## 📦 Archive (Preserve for History)

### 1. Session Summary Documents (MOVE to docs/archive/session-summaries/)
**Files in packages/agents/:**
- `ALL_12_FIXES_COMPLETE.md`
- `ALL-BUGS-COMPLETE-2025-10-08.md`
- `AGENT_WEIGHTS_ANALYSIS.md`
- `ACTUAL_COST_ANALYSIS_0.01.md`
- All other `*.md` files in root

**Action:** Move to archive
```bash
mkdir -p docs/archive/session-summaries/2025-10
mv packages/agents/ALL*.md docs/archive/session-summaries/2025-10/
mv packages/agents/AGENT*.md docs/archive/session-summaries/2025-10/
mv packages/agents/ACTUAL*.md docs/archive/session-summaries/2025-10/
```

### 2. Legacy Archive Directories
**Already Archived:**
- `docs/archive/2025-07-pre-clean-architecture/`
- `docs/archive/deepwiki-legacy-20250809/`
- `docs/_archive/Deepwiki/`
- `docs/_archive/old-deployment-docs/`
- `docs/_archive/old-implementation-plans/`
- `packages/agents/.archive/`

**Action:** Keep as-is (already archived)

### 3. Old Test Scripts (if obsolete)
**Location:** `packages/agents/`
**Files:** Look for `test-*.ts` files older than 30 days

**Action:** Review and move obsolete ones to `.archive/test-scripts/`

---

## 📚 Documentation to Preserve for RAG

### Critical Documentation (KEEP & Index for RAG Chatbot)

#### 1. Architecture & System Design
- `/docs/architecture/` - ALL files
- `/V9-SYSTEM-OVERVIEW.md`
- `/V9_CANONICAL_ARCHITECTURE.md`
- `/DEPRECATED_FLOWS_DO_NOT_USE.md`
- `/packages/agents/V9_CRITICAL_KNOWLEDGE_BASE.md`

#### 2. Auth & Billing Documentation (CRITICAL - DO NOT DELETE)
- `/docs/auth/` - ALL files
- `/docs/security/` - ALL files
- Any files related to Supabase auth, billing integration

#### 3. API Documentation
- `/docs/api/` - ALL files
- `/docs/api/examples/` - ALL files
- `/api-examples/` - ALL files

#### 4. Deployment & Operations
- `/docs/deployment-guides/` - ALL files
- `/docs/deployment-summaries/` - Review and keep recent ones
- `/docs/monitoring/` - ALL files
- `/k8s/` - ALL Kubernetes configs

#### 5. Database Documentation
- `/docs/database/` - ALL files
- `/docs/database-optimizations/` - ALL files
- `/database/migrations/` - ALL migration files
- `/supabase/migrations/` - ALL migration files

#### 6. Development Guides
- `/docs/development/` - ALL files
- `/docs/implementation-guides/` - ALL files
- `/docs/testing/` - ALL files
- `/docs/troubleshooting/` - ALL files

#### 7. User & Integration Guides
- `/docs/user-guide/` - ALL files
- `/docs/integrations/` - ALL files
- `/CLAUDE.md` - Project context for Claude
- `/README.md` - If exists

---

## ❓ Questionable - Needs Review

### 1. Old Configuration Files
**Files to Review:**
- `packages/agents/.codequal-config.yaml` - Still used?
- `packages/agents/.codequal-manifest.json` - Still used?
- `packages/agents/.env.production.example` - Keep as template?

**Decision:** User to verify if these are active

### 2. Multiple .env Files
**Files:**
- `.env` (active)
- `.env.local.example` (template)
- `.env.production` (production config?)
- `.env.production.example` (template?)

**Decision:** User to clarify which are needed

### 3. Old Branch Artifacts
**Branches:**
- `backup-before-cleanup`
- `backup-billing-integration-attempt`
- `clean-main`
- `clean-mcp-integration`
- `fix-failing-tests`
- `educational_flow`

**Decision:** User to review if these branches can be deleted

### 4. Scripts Directories
**Location:** `/scripts/`
**Subdirectories:**
- `deepwiki/` - Still relevant?
- `calibration/` - Still in use?
- `security/` - Review content

**Decision:** User to review each script directory

### 5. Design Assets
**Location:** `/design/`
**Contents:**
- `brand/` - Logo, branding assets
- `docs/session-summaries/` - Design session notes

**Decision:** Keep branding, archive session summaries?

### 6. Legacy Package Directories
**Locations:**
- `packages/cli/` - Still in development?
- `packages/config/` - Still in use?
- `packages/monitoring/` - Implemented?

**Decision:** User to verify status of each package

---

## 🔒 Keep (Auth, Billing, Active Code)

### Auth & Billing (CRITICAL - NEVER DELETE)
- `packages/database/` - Database schemas, auth tables
- Any files in `docs/auth/`
- Any files in `docs/security/`
- Supabase configuration files
- Auth-related migrations

### Active Packages
- `packages/agents/` - Core analysis engine
- `packages/core/` - Shared utilities
- `packages/database/` - Database layer
- `packages/mcp-hybrid/` - MCP integration
- `packages/testing/` - Test utilities
- `packages/ui/` - Frontend application

### Active Code Directories
- `docker/` - Container configurations
- `k8s/` - Kubernetes deployment
- `config/` - Active configurations

---

## 🎯 Execution Plan

### Phase 1: Safe Cleanup (No Risk)
**Duration:** 5 minutes
**Size Impact:** ~500MB

```bash
# 1. Delete safe files
find . -name ".DS_Store" -type f -delete
rm -rf packages/agents/.deepwiki-cache
rm -rf packages/agents/.mypy_cache
rm -rf packages/agents/.ruff_cache
rm -rf .turbo/cache
rm -rf .serena/cache/typescript
rm -f packages/agents/.env.backup-*
rm -f packages/agents/.env.bak
rm -f packages/agents/.last-pr-index

# 2. Clean old test outputs (keep last 5)
cd packages/agents/test-outputs
ls -t *.md | tail -n +6 | xargs rm -f
ls -t *.json | tail -n +6 | xargs rm -f
cd ../../..

# 3. Commit cleanup
git add -A
git commit -m "chore(cleanup): Remove cache files, temp files, and old test outputs

- Deleted .DS_Store files (macOS metadata)
- Removed cache directories (.deepwiki-cache, .mypy_cache, .ruff_cache, .turbo)
- Cleaned backup .env files
- Kept only 5 most recent test reports
- Removed test artifacts
- Size reduction: ~500MB"
```

### Phase 2: Archive Session Documents (Low Risk)
**Duration:** 2 minutes

```bash
# Move session summaries to archive
mkdir -p docs/archive/session-summaries/2025-10
mv packages/agents/ALL*.md docs/archive/session-summaries/2025-10/ 2>/dev/null
mv packages/agents/AGENT*.md docs/archive/session-summaries/2025-10/ 2>/dev/null
mv packages/agents/ACTUAL*.md docs/archive/session-summaries/2025-10/ 2>/dev/null

git add -A
git commit -m "chore(archive): Move session summary documents to archive

- Moved session summaries from packages/agents/ to docs/archive/session-summaries/2025-10/
- Organized by date for future reference"
```

### Phase 3: Review & Cleanup Questionable Items
**Duration:** User-dependent
**Requires:** User review of questionable items list

1. Review `.env` files - determine which are needed
2. Review old branches - delete unused ones
3. Review scripts directories - archive or delete unused scripts
4. Review package directories - determine status

### Phase 4: Push to Remote
**Duration:** 2 minutes

```bash
# After all cleanups and commits
git push origin feat/java-light-test-sequence
```

---

## 📊 Expected Impact

### Storage Savings
- **Immediate (Phase 1):** ~500MB
- **Phase 2:** ~10MB
- **Phase 3:** TBD (depends on user decisions)
- **Total Expected:** ~500-700MB

### File Count Reduction
- **Test Outputs:** ~1,995 files removed (keep 5)
- **Cache Files:** ~500+ files
- **System Files:** ~50+ .DS_Store files
- **Total:** ~2,500+ files removed

### Benefits
1. ✅ Faster git operations
2. ✅ Cleaner repository structure
3. ✅ Easier navigation for new developers
4. ✅ Better documentation organization for RAG
5. ✅ Preserved critical auth/billing code
6. ✅ Archived historical context

---

## ⚠️ Critical Reminders

1. **NEVER DELETE:**
   - Auth-related code
   - Billing integration code
   - Active package directories
   - Migration files
   - Production .env files (after verification)

2. **ALWAYS KEEP for RAG:**
   - Architecture documentation
   - API documentation
   - User guides
   - Troubleshooting guides
   - Implementation guides

3. **COMMIT BEFORE CLEANUP:**
   - ✅ All bug fixes already committed
   - ✅ Create new commit for each cleanup phase
   - ✅ Push regularly to remote

---

## 🚀 Ready to Execute?

**Current Status:**
- ✅ All bug fixes committed (7 commits)
- ✅ On feature branch: `feat/java-light-test-sequence`
- ✅ Ready for Phase 1 cleanup
- ⏳ Waiting for user review of questionable items

**Next Steps:**
1. User reviews "Questionable" section
2. Execute Phase 1 (safe cleanup)
3. Execute Phase 2 (archive documents)
4. User approves Phase 3 items
5. Execute Phase 3
6. Final push to remote
