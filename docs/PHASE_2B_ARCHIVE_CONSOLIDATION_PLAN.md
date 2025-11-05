# Phase 2B: Archive Consolidation Plan

**Date**: November 4, 2025
**Status**: READY FOR EXECUTION
**Estimated Cleanup**: 15-20 MB + improved organization

---

## 📊 Current Archive Landscape

### Total Archives Found: 44+ locations
### Total Archive Size: ~20 MB

| Directory | Size | Date Range | Status |
|-----------|------|------------|--------|
| `build-system/archived/` | 15 MB | May-June 2025 | ✅ Ready to consolidate |
| `docs/archive/` | 4.1 MB | June-August 2025 | ✅ Ready to consolidate |
| `docs/_archive/` | 536 KB | Various | ✅ Ready to consolidate |
| `backup/` | 348 KB | Various | ✅ Ready to consolidate |
| `packages/agents/_cleanup_backup/` | 268 KB | September 2025 | ✅ Ready to consolidate |
| `packages/agents/src/two-branch/tests/archive` | 480 KB | Various | ✅ Ready to consolidate |
| Other scattered archives | ~500 KB | Various | ✅ Ready to consolidate |

---

## 🎯 Consolidation Strategy

### New Structure:
```
/historical-archives/
├── 2025-05/                    # May 2025 archives
│   ├── build-system-cleanup/   # From build-system/archived/cleanup_*
│   └── MANIFEST.md
├── 2025-06/                    # June 2025 archives
│   ├── build-system/           # From build-system/archived/2025-06-10-root-cleanup
│   ├── deepwiki-experiments/   # All deepwiki_* folders
│   ├── docs/                   # From docs/archive files
│   └── MANIFEST.md
├── 2025-07/                    # July 2025 archives
│   ├── pre-clean-architecture/ # From docs/archive/2025-07-pre-clean-architecture
│   └── MANIFEST.md
├── 2025-08/                    # August 2025 archives
│   ├── deepwiki-legacy/        # From docs/archive/deepwiki-legacy-20250809
│   └── MANIFEST.md
├── 2025-09/                    # September 2025 archives
│   ├── cleanup-backup/         # From packages/agents/_cleanup_backup
│   └── MANIFEST.md
├── 2025-10/                    # October 2025 archives
│   ├── test-archives/          # From packages/agents/src/two-branch/tests/archive
│   └── MANIFEST.md
├── misc/                       # Undated archives
│   ├── backup-root/            # From /backup
│   ├── docs-misc/              # From /docs/_archive
│   └── MANIFEST.md
└── README.md                   # Overview of all historical archives
```

---

## 📋 Consolidation Steps

### Step 1: Create Structure
```bash
mkdir -p historical-archives/{2025-05,2025-06,2025-07,2025-08,2025-09,2025-10,misc}
```

### Step 2: Move Build System Archives (15 MB)
```bash
# May 2025 cleanups
mv build-system/archived/historical-archive/cleanup_2025051* historical-archives/2025-05/build-system-cleanup/

# June 2025
mv build-system/archived/2025-06-10-root-cleanup historical-archives/2025-06/build-system/
mv build-system/archived/historical-archive/deepwiki_* historical-archives/2025-06/deepwiki-experiments/
mv build-system/archived/historical-archive/development-examples historical-archives/2025-06/
```

### Step 3: Move Documentation Archives (4.6 MB)
```bash
# July 2025
mv docs/archive/2025-07-pre-clean-architecture historical-archives/2025-07/

# August 2025
mv docs/archive/deepwiki-legacy-20250809 historical-archives/2025-08/

# Misc doc files
mv docs/archive/*.md docs/archive/*.txt historical-archives/misc/docs-misc/
```

### Step 4: Move Package Archives
```bash
# September 2025
mv packages/agents/_cleanup_backup historical-archives/2025-09/cleanup-backup/

# October 2025 (if dated, otherwise misc)
mv packages/agents/src/two-branch/tests/archive historical-archives/2025-10/test-archives/
mv packages/agents/src/two-branch/scripts/_archived* historical-archives/2025-10/scripts/
```

### Step 5: Move Root Backup
```bash
mv backup historical-archives/misc/backup-root/
```

### Step 6: Clean Up Empty Directories
```bash
# Remove empty archive directories
rmdir build-system/archived/historical-archive/cleanup_*
rmdir build-system/archived/historical-archive
rmdir build-system/archived
rmdir docs/archive
rmdir docs/_archive
```

---

## 🔍 Verification Checklist

### Before Moving:
- [ ] Verify no active imports from archived code
- [ ] Check for references in current documentation
- [ ] Confirm all archives are dated correctly

### After Moving:
- [ ] Verify total size matches expectations (~20 MB)
- [ ] Create MANIFEST.md in each month folder
- [ ] Create README.md in historical-archives/
- [ ] Update any references in documentation
- [ ] Add `.gitkeep` or commit structure

---

## 🛡️ Safety Measures

### No-Delete List (Keep These):
- ✅ `/packages/agents/src/two-branch/backups/model-configs-backup-*.json` (active backups)
- ✅ All `_archive` directories in `/dist` (generated files)
- ✅ `.codequal/state-backups/` (active state)

### Verification Commands:
```bash
# Check for imports from archives
rg "from.*archive" --type ts --type tsx
rg "require.*archive" --type js

# Check for references in docs
rg "archive/" docs/ --type md

# Verify sizes
du -sh historical-archives/*
```

---

## 📊 Expected Results

### Space Consolidation:
| Current Location | Current Size | New Location | Status |
|-----------------|--------------|--------------|--------|
| 44+ scattered dirs | ~20 MB | 7 dated + 1 misc | ✅ Organized |

### Benefits:
1. ✅ **Organization**: Chronological structure
2. ✅ **Discoverability**: Easy to find archives by date
3. ✅ **Cleanup**: Remove 40+ scattered directories
4. ✅ **Documentation**: MANIFEST.md in each folder
5. ✅ **Git cleanliness**: Single `/historical-archives/` to ignore

---

## 🎯 Manifest Template

Each month folder will get a `MANIFEST.md`:
```markdown
# Historical Archives - YYYY-MM

**Month**: [Month Name] 2025
**Archived Date**: November 4, 2025
**Total Size**: [X] MB

## Contents

### Subdirectory 1
- **Original Location**: path/to/original
- **Purpose**: [Brief description]
- **Date Created**: YYYY-MM-DD
- **Safe to Delete**: [Yes/No] - [Reason]

### Subdirectory 2
...
```

---

## ⚠️ Rollback Plan

If needed, restore from git:
```bash
# Undo consolidation
git reset --hard HEAD~1

# Or restore specific directory
git checkout HEAD~1 -- build-system/archived
```

---

## 🚀 Execution Order

1. ✅ Create historical-archives structure
2. ✅ Verify no active imports
3. ✅ Move build-system archives (largest first)
4. ✅ Move docs archives
5. ✅ Move package archives
6. ✅ Move root backup
7. ✅ Create MANIFEST.md files
8. ✅ Remove empty directories
9. ✅ Verify sizes
10. ✅ Commit changes

---

**Status**: ✅ PLAN READY FOR EXECUTION
**Risk Level**: LOW (all git-tracked, easy rollback)
**Estimated Time**: 15-20 minutes
**Estimated Cleanup**: 15-20 MB + 40+ fewer directories

---

_Created by Claude Code - Phase 2B Archive Consolidation_
_November 4, 2025_
