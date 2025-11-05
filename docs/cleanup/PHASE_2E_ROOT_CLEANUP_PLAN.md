# Phase 2E: Root Directory Cleanup Plan

**Date**: November 4, 2025
**Status**: 📋 **PLAN - AWAITING USER APPROVAL**

---

## 🎯 Objective

Clean up root directory by removing:
1. DigitalOcean scripts (provider dropped)
2. DeepWiki-related files (framework dropped)
3. One-time migration/cleanup scripts (already executed)
4. Empty or obsolete directories
5. Duplicate directory structures

---

## 📊 Cleanup Summary

| Category | Files/Dirs | Size | Status |
|----------|------------|------|--------|
| **DigitalOcean scripts** | 4 files | ~13 KB | ✅ Safe to delete |
| **DeepWiki files** | 1 file + 2 dirs | ~60 KB | ✅ Safe to delete |
| **One-time migrations** | 2 files | ~6 KB | ✅ Safe to delete |
| **One-time cleanup scripts** | 3 files | ~11 KB | ✅ Safe to delete |
| **Empty/obsolete directories** | 3 dirs | Minimal | ✅ Safe to delete |
| **Oracle scripts** | 8 files | ~55 KB | ⚠️ **NEED USER CONFIRMATION** |
| **Other scripts** | Various | ~30 KB | ⚠️ **NEED USER REVIEW** |
| **Total (confirmed)** | 10 files + 5 dirs | ~90 KB | Ready |

---

## 🗑️ Confirmed Safe to DELETE

### 1. DigitalOcean Scripts (4 files, ~13 KB)
**Reason**: User confirmed DigitalOcean provider dropped, migrated to Oracle

```bash
do-login-with-token.sh (3.6K)
do-registry-alternative-login.sh (4.6K)
do-registry-login-interactive.sh (2.2K)
docker-registry-login.sh (2.5K)
```

**Verification**: All reference DigitalOcean registry/authentication

---

### 2. DeepWiki Files & Directories (1 file + 2 dirs, ~60 KB)
**Reason**: User confirmed DeepWiki framework dropped, no future plans

**Root file**:
```bash
setup-deepwiki.sh (459B)
```

**Directories**:
```bash
k8s/ (60K total)
└── deepwiki-analyzer/ (10 files)
    ├── DEPLOY_INSTRUCTIONS.md
    ├── Dockerfile
    ├── deepwiki-analyzer-deployment.yaml
    ├── deploy-deepwiki-do.sh
    ├── deploy-deepwiki.sh
    ├── health-check.sh
    ├── mock-deepwiki.py (20K)
    ├── setup-deepwiki-binary.md
    └── ... (deployment configs)

examples/ (8K)
└── deepwiki-tools-integration.ts (only file)

services/deepwiki/ (11K)
├── client.ts
└── example.ts
```

**Action**: Delete entire k8s/, examples/, services/deepwiki/ directories

---

### 3. One-Time Migration Scripts (2 files, ~6 KB)
**Reason**: Migrations already completed

```bash
migrate-to-ocir.sh (4.2K) - DigitalOcean → Oracle migration (completed)
fix-pmd-commands.sh (2.1K) - One-time PMD fix (completed)
```

---

### 4. One-Time Cleanup Scripts (3 files, ~11 KB)
**Reason**: Cleanup tasks already completed

```bash
cleanup-dev-environment.sh (5.0K) - Environment cleanup (completed)
cleanup-duplicate-code.sh (2.8K) - Code deduplication (completed)
cleanup-researcher-migration.sh (3.6K) - Researcher migration (completed)
```

---

### 5. Empty/Obsolete Directories (3 dirs)
**Reason**: Empty or should be in .gitignore

```bash
reports/ - Empty directory
tools/ - Empty directory
logs/ - Contains "api report.md" (should move to docs/)
```

**Action for logs/**: Move `api report.md` to docs/, then delete logs/

---

## ⚠️ NEED USER CONFIRMATION

### Oracle Infrastructure Scripts (8 files, ~55 KB)

**Question**: Are these still actively used, or were they one-time setup?

```bash
# A1 Instance Creation/Management
create-a1-instance.sh (6.8K)
create-paid-a1-instance.sh (2.6K)
launch-a1-instance.sh (9.3K)
quick-a1-launch.sh (3.9K)

# A1 Instance Hunting (Python scripts)
oci-a1-flex-hunter.py (16K)
simple-a1-hunter.py (11K)

# Oracle Setup
setup-oracle-analyzers.sh (7.7K)
setup-oracle-ocir-auth.sh (2.2K)
```

**Recommendation**:
- If **one-time setup** (instance already created) → DELETE or move to /scripts/infrastructure/
- If **still actively used** → Keep in root OR move to /scripts/infrastructure/

---

### Deployment/Setup Scripts (6 files, ~30 KB)

**Question**: Are these still used or outdated?

```bash
deploy-enhanced-hybrid.sh (3.2K)
deploy.sh (915B)
pull-all-analyzers-corrected.sh (2.0K)
pull-analyzer-images.sh (3.4K)
setup-codequal-docker.sh (7.0K)
setup-docker-analyzers.sh (11K)
```

**Recommendation**:
- Review each for current usage
- Move active scripts to /scripts/
- Delete obsolete ones

---

### Test Scripts (3 files, ~12 KB)

**Question**: Are these still used or one-time tests?

```bash
quick-test.sh (3.2K)
run-java-frameworks-test.sh (5.7K)
run-multi-framework-oracle.sh (2.8K)
run-spring-petclinic-test.sh (4.3K)
```

**Recommendation**:
- If **active tests** → Move to /tests/ or /scripts/
- If **one-time validation** → DELETE

---

### Other Files to Review

**Configuration files**:
```bash
docker-compose-v9-language-based.yml (6.0K)
prometheus.yml (184B)
```
**Question**: Still in use?

**Script**:
```bash
connect-oracle.sh (510B) - Simple SSH connection script
```
**Recommendation**: Keep if actively used, or create alias instead

---

## 📋 Directory Consolidation Opportunities

### Duplicate Purpose Directories

**testing/ vs tests/**
```bash
testing/ (28K)
├── manual-test-guide.md
├── manual-test-results.md
├── simple-disk-monitor.html
└── test-monitoring-local.sh

tests/ (16K)
├── logs.md
└── test-pr-analysis.js
```

**Recommendation**:
- Merge into single /tests/ directory
- Move relevant content to packages/testing/

---

### API Examples

```bash
api-examples/ (16K)
├── complete-example.js
├── curl-examples.sh
└── python-example.py
```

**Question**: Still relevant?
**Options**:
1. Keep as reference
2. Move to /docs/examples/
3. Delete if outdated

---

## 🎯 Recommended Actions

### IMMEDIATE (No User Approval Needed)

**Delete (13 files + 2.5 dirs, ~90 KB)**:
1. ✅ 4 DigitalOcean scripts
2. ✅ 1 DeepWiki setup script
3. ✅ 2 migration scripts
4. ✅ 3 cleanup scripts
5. ✅ k8s/ directory (only contains DeepWiki)
6. ✅ examples/ directory (only contains DeepWiki)
7. ✅ services/deepwiki/ subdirectory
8. ✅ reports/ empty directory
9. ✅ tools/ empty directory

**Move**:
10. ✅ logs/api report.md → docs/api/
11. ✅ Delete logs/ after move

---

### REQUIRES USER DECISION

**Oracle Infrastructure Scripts (8 files)**:
- ❓ Still actively creating/managing A1 instances?
- ❓ Or was this one-time setup?

**Deploy/Setup Scripts (6 files)**:
- ❓ Which are still actively used?
- ❓ Which should be moved to /scripts/?

**Test Scripts (4 files)**:
- ❓ Active test suite or one-time validation?

**Config Files**:
- ❓ docker-compose-v9-language-based.yml still used?
- ❓ prometheus.yml still used?

**Directories**:
- ❓ Merge testing/ and tests/?
- ❓ Keep api-examples/ or move to docs?

---

## 📊 Expected Results

### Before (Root Directory)
```
codequal/
├── 52 script files in root (~150 KB)
├── k8s/ (DeepWiki only)
├── examples/ (DeepWiki only)
├── services/deepwiki/
├── reports/ (empty)
├── tools/ (empty)
├── logs/ (1 file, should be in docs)
├── testing/ vs tests/ (duplicate)
└── ... (other directories)
```

### After (Immediate Cleanup)
```
codequal/
├── ~35-40 script files in root (~60-110 KB)
├── No DeepWiki directories ✅
├── No empty directories ✅
├── No DigitalOcean scripts ✅
├── No one-time cleanup/migration scripts ✅
├── api report.md moved to docs/api/ ✅
└── Cleaner root structure ✅
```

**Space freed**: ~90 KB + directory cleanup
**Organization**: Much clearer root structure

---

## 🔒 Safety Measures

### Git Safety
- ✅ All deletions will be tracked in git
- ✅ Easy rollback via git history
- ✅ Separate commit for each category

### Verification Before Deletion
```bash
# Check for active imports/references
rg "k8s/" --type ts --type js
rg "examples/deepwiki" --type ts --type js
rg "services/deepwiki" --type ts --type js
rg "do-registry-login" --type sh
```

---

## 🚀 Execution Plan

### Step 1: Immediate Cleanup (No Approval Needed)
```bash
# Delete DigitalOcean scripts
rm do-login-with-token.sh do-registry-alternative-login.sh
rm do-registry-login-interactive.sh docker-registry-login.sh

# Delete DeepWiki
rm setup-deepwiki.sh
rm -rf k8s/
rm -rf examples/
rm -rf services/deepwiki/

# Delete migration/cleanup scripts
rm migrate-to-ocir.sh fix-pmd-commands.sh
rm cleanup-dev-environment.sh cleanup-duplicate-code.sh
rm cleanup-researcher-migration.sh

# Move and cleanup logs
mv logs/api\ report.md docs/api/
rm -rf logs/

# Delete empty directories
rm -rf reports/ tools/
```

### Step 2: User Decision Required
- Wait for user input on Oracle scripts
- Wait for user input on deploy/test scripts
- Wait for user input on directory consolidation

---

## 📝 Questions for User

1. **Oracle Scripts**: Still actively used? If yes, keep or move to /scripts/infrastructure/?

2. **Deploy Scripts**: Which are active? (deploy-enhanced-hybrid.sh, deploy.sh, pull-*.sh, setup-*.sh)

3. **Test Scripts**: Part of active test suite? Or one-time validation?

4. **Config Files**: docker-compose-v9-language-based.yml and prometheus.yml still used?

5. **Directories**:
   - Merge testing/ into tests/?
   - Keep api-examples/ or move to docs?

---

**Status**: 📋 **AWAITING USER APPROVAL TO PROCEED**
**Immediate Cleanup Ready**: 13 files + 5 directories (~90 KB)
**Additional Cleanup**: Depends on user answers (potentially 18+ more files)

---

_Phase 2E Root Directory Cleanup Plan - November 4, 2025_
_Created by Claude Code for Repository Organization_
