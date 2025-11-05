# Phase 2B: Archive Deletion Plan (AGGRESSIVE CLEANUP)

**Date**: November 4, 2025
**Strategy**: DELETE all archives, keep only active documentation
**Estimated Cleanup**: ~20 MB + 40+ directories removed

---

## 🎯 User Requirement

**Keep**: Only current, active documentation for RAG chatbot (onboarding & user support)
**Delete**: ALL archive directories and historical content

---

## ✅ Safe to DELETE (Verified No Active Imports)

### Build System Archives (15 MB) - DELETE ALL
```bash
rm -rf build-system/archived/
```
**Contents**:
- Historical cleanup attempts (May 2025)
- DeepWiki experiments
- Old build scripts
- Development examples

**Status**: ✅ No active imports, safe to delete

### Documentation Archives (4.6 MB) - DELETE ARCHIVE FOLDERS
```bash
rm -rf docs/archive/
rm -rf docs/_archive/
```
**Keep**: All docs in `/docs/*.md` (root level docs)
**Delete**: Only `/docs/archive/` and `/docs/_archive/` folders

**Status**: ✅ No references from active code

### Package Archives - DELETE ALL
```bash
rm -rf packages/agents/.archive/
rm -rf packages/agents/_cleanup_backup/
rm -rf packages/agents/src/two-branch/tests/archive/
rm -rf packages/agents/src/two-branch/scripts/_archived/
rm -rf packages/agents/src/two-branch/scripts/_archived_supabase_cve/
rm -rf packages/agents/src/two-branch/docs/dependency_check/_archived_2025_10_01/
rm -rf packages/core/src/services/_archive/
rm -rf packages/core/src/services/deepwiki-tools/_archive/
rm -rf packages/core/scripts/deepwiki_integration/archive/
rm -rf packages/testing/src/_archive/
rm -rf apps/api/src/_archive/
```
**Status**: ✅ No active imports

### Root Backup - DELETE
```bash
rm -rf backup/
```
**Status**: ✅ No references

### Kubernetes Backups - DELETE
```bash
rm -rf kubernetes/archive/
rm -f kubernetes/backup-images-simple.yaml
rm -f kubernetes/backup-images-to-k8s.yaml
```
**Status**: ✅ Old deployment files, not needed

### Keys Archive - DELETE
```bash
rm -rf keys/oracle/.archive/
```
**Status**: ✅ Old SSH keys, not needed

### Compiled Archives (in /dist) - DELETE
```bash
rm -rf packages/agents/dist/two-branch/analyzers/_archive_deprecated/
rm -rf packages/agents/dist/two-branch/scripts/_archived/
rm -rf packages/agents/dist/two-branch/scripts/_archived_supabase_cve/
```
**Status**: ✅ Regenerated on build

---

## 🛡️ PROTECTED - DO NOT DELETE

### Active Documentation for RAG Chatbot
```
/docs/*.md                              ← KEEP (all root-level docs)
/docs/api/                              ← KEEP (API documentation)
/docs/architecture/                     ← KEEP (system architecture)
/docs/auth/                             ← KEEP (authentication docs)
/docs/caching/                          ← KEEP (caching docs)
/docs/database/                         ← KEEP (database docs)
/docs/deployment-guides/                ← KEEP (deployment docs)
/docs/development/                      ← KEEP (development guides)
/docs/hardware/                         ← KEEP (infrastructure docs)
/docs/implementation-guides/            ← KEEP (implementation docs)
/docs/integrations/                     ← KEEP (integration docs)
/docs/maintenance/                      ← KEEP (maintenance docs)
/docs/marketing/                        ← KEEP (product docs)
/docs/migration/                        ← KEEP (migration guides)
/docs/monitoring/                       ← KEEP (monitoring docs)
/docs/next/                             ← KEEP (future plans)
/docs/Planning/                         ← KEEP (planning docs)
/docs/security/                         ← KEEP (security docs)
/V9-SYSTEM-OVERVIEW.md                  ← KEEP (critical V9 docs)
/packages/agents/V9_*.md                ← KEEP (V9 documentation)
/packages/agents/src/two-branch/docs/   ← KEEP (technical docs)
```

### Active Backups
```
/packages/agents/src/two-branch/backups/model-configs-backup-*.json  ← KEEP (active backups)
/.codequal/state-backups/                                             ← KEEP (state backups)
```

---

## 📋 Deletion Execution Plan

### Step 1: Delete Build System Archives (15 MB)
```bash
cd /Users/alpinro/Code\ Prjects/codequal
rm -rf build-system/archived/
```

### Step 2: Delete Documentation Archives (4.6 MB)
```bash
rm -rf docs/archive/
rm -rf docs/_archive/
rm -rf docs/hardware/archive/   # If exists
```

### Step 3: Delete Package Archives (~1 MB)
```bash
rm -rf packages/agents/.archive/
rm -rf packages/agents/_cleanup_backup/
rm -rf packages/agents/src/two-branch/tests/archive/
rm -rf packages/agents/src/two-branch/tests/__tests__/archive/
rm -rf packages/agents/src/two-branch/scripts/_archived/
rm -rf packages/agents/src/two-branch/scripts/_archived_supabase_cve/
rm -rf packages/agents/src/two-branch/docs/dependency_check/_archived_2025_10_01/
rm -rf packages/agents/src/two-branch/docs/next/_archive/
rm -rf packages/core/src/services/_archive/
rm -rf packages/core/src/services/deepwiki-tools/_archive/
rm -rf packages/core/scripts/deepwiki_integration/archive/
rm -rf packages/testing/src/_archive/
rm -rf apps/api/src/_archive/
```

### Step 4: Delete Root & Kubernetes Archives (~350 KB)
```bash
rm -rf backup/
rm -rf kubernetes/archive/
rm -f kubernetes/backup-images-simple.yaml
rm -f kubernetes/backup-images-to-k8s.yaml
rm -rf keys/oracle/.archive/
```

### Step 5: Delete Compiled Archives (regenerated on build)
```bash
rm -rf packages/agents/dist/two-branch/analyzers/_archive_deprecated/
rm -rf packages/agents/dist/two-branch/scripts/_archived/
rm -rf packages/agents/dist/two-branch/scripts/_archived_supabase_cve/
```

### Step 6: Delete State Backup File (single file)
```bash
rm -f .claude/agents/dev-cycle-orchestrator.md.backup
```

---

## ✅ Verification Before Deletion

```bash
# Verify no active imports (already done ✅)
rg "from.*archive" --type ts --type tsx --type js
rg "from.*backup" --type ts --type tsx --type js
rg "require.*archive" --type js

# List what will be deleted (dry run)
find . -type d -name "*archive*" -o -name "*_archive*" -o -name "*backup*" | grep -v node_modules | grep -v .git | grep -v model-configs-backup | grep -v state-backups

# Check current space usage
du -sh build-system/archived docs/archive docs/_archive backup packages/agents/_cleanup_backup
```

---

## 📊 Expected Results

### Before:
- 44+ scattered archive directories
- ~20 MB of old archives
- Confusing directory structure

### After:
- 0 archive directories (except active backups)
- ~20 MB freed
- Clean, focused documentation structure
- Only RAG-ready docs remain

---

## 🎯 RAG Chatbot Documentation (What Remains)

After deletion, your RAG chatbot will have access to:

### System Documentation
- ✅ V9 System Overview
- ✅ Architecture documents
- ✅ API documentation
- ✅ Deployment guides

### User Support Documentation
- ✅ Authentication guides
- ✅ Integration guides
- ✅ Maintenance procedures
- ✅ Migration guides

### Development Documentation
- ✅ Implementation guides
- ✅ Development workflows
- ✅ Testing strategies
- ✅ Monitoring setup

**Total Active Docs**: ~50-60 markdown files (all current, no archives)

---

## 🚨 Safety Measures

### Git Safety
- ✅ All deletions will be committed
- ✅ Easy rollback: `git reset --hard HEAD~1`
- ✅ All content preserved in git history

### Backup Verification
- ✅ Verified no active imports from archives
- ✅ Protected model-configs-backup files
- ✅ Protected .codequal/state-backups

### Pre-Deletion Checklist
- [x] No imports from archives
- [x] No doc references to archives
- [x] User approval to delete
- [ ] Final confirmation before execution

---

## 🚀 Ready to Execute

**Command Summary (All at Once)**:
```bash
cd /Users/alpinro/Code\ Prjects/codequal && \
rm -rf build-system/archived && \
rm -rf docs/archive && \
rm -rf docs/_archive && \
rm -rf docs/hardware/archive && \
rm -rf backup && \
rm -rf kubernetes/archive && \
rm -f kubernetes/backup-images-*.yaml && \
rm -rf keys/oracle/.archive && \
rm -rf packages/agents/.archive && \
rm -rf packages/agents/_cleanup_backup && \
rm -rf packages/agents/src/two-branch/tests/archive && \
rm -rf packages/agents/src/two-branch/tests/__tests__/archive && \
rm -rf packages/agents/src/two-branch/scripts/_archived* && \
rm -rf packages/agents/src/two-branch/docs/dependency_check/_archived_2025_10_01 && \
rm -rf packages/agents/src/two-branch/docs/next/_archive && \
rm -rf packages/core/src/services/_archive && \
rm -rf packages/core/src/services/deepwiki-tools/_archive && \
rm -rf packages/core/scripts/deepwiki_integration/archive && \
rm -rf packages/testing/src/_archive && \
rm -rf apps/api/src/_archive && \
rm -rf packages/agents/dist/two-branch/analyzers/_archive_deprecated && \
rm -rf packages/agents/dist/two-branch/scripts/_archived* && \
rm -f .claude/agents/dev-cycle-orchestrator.md.backup && \
echo "✅ Archive deletion complete!"
```

---

**Status**: ✅ READY FOR USER APPROVAL
**Risk**: LOW (git-tracked, easy rollback)
**Impact**: ~20 MB freed, 40+ directories removed
**Documentation**: Only active, RAG-ready docs remain

---

_Created by Claude Code - Phase 2B Archive Deletion_
_November 4, 2025_
