# Phase 3: Configuration Organization Plan

**Date**: November 4, 2025
**Status**: 📋 **PLAN - AWAITING USER APPROVAL**

---

## 🎯 Objective

Organize root directory by:
1. Moving deployment scripts to dedicated directories
2. Organizing Docker configuration files
3. Creating clear separation between essential configs and operational scripts
4. Achieving a clean, professional root directory

---

## 📊 Current State Analysis

### Root Directory Files (28 total)

**Essential Configuration** (11 files - KEEP IN ROOT):
```bash
.env, .env.example                    # Environment variables
.gitignore, .gitattributes           # Git configuration
.eslintrc.json, .eslintignore        # Linting
.prettierrc                          # Formatting
.npmrc                               # npm configuration
.mcp.json                            # MCP server config
.codequal-config.yaml                # CodeQual config
package.json, package-lock.json      # Dependencies
tsconfig.json, tsconfig.base.json    # TypeScript config
turbo.json                           # Monorepo config
jest.config.js                       # Testing config
```

**Documentation** (2 files - KEEP IN ROOT):
```bash
CLAUDE.md (28K)                      # AI assistant instructions
V9-SYSTEM-OVERVIEW.md (6.6K)         # System architecture
```

**IDE Configuration** (1 file - KEEP IN ROOT):
```bash
.cursorrules (18K)                   # Cursor IDE rules
```

**Deployment Scripts** (6 files, ~28 KB - MOVE):
```bash
deploy-enhanced-hybrid.sh (3.2K)
deploy.sh (915B)
pull-all-analyzers-corrected.sh (2.0K)
pull-analyzer-images.sh (3.4K)
setup-codequal-docker.sh (7.0K)
setup-docker-analyzers.sh (11K)
```

**Docker Configuration** (2 files, ~7.5 KB - MOVE):
```bash
docker-compose-v9-language-based.yml (6.0K)
Dockerfile.production (1.5K)
```

**Infrastructure Scripts** (2 files, ~700B - MOVE):
```bash
prometheus.yml (184B)
connect-oracle.sh (510B)
```

**CI/Testing Scripts** (1 file - KEEP OR MOVE):
```bash
run-ci-locally.sh (3.5K)             # CI validation script
```

---

## 🎨 Proposed Organization

### Option 1: Minimal Change (Conservative)

Move only deployment and docker files:

```
codequal/
├── .env, .gitignore, package.json, etc. (15 essential config files)
├── CLAUDE.md, V9-SYSTEM-OVERVIEW.md (2 docs)
├── run-ci-locally.sh (keep in root for easy access)
├── connect-oracle.sh (keep in root for easy access)
│
├── docker/
│   ├── Dockerfile.production (moved from root)
│   ├── docker-compose-v9-language-based.yml (moved from root)
│   ├── Dockerfile.local (existing)
│   ├── agents/ (existing)
│   ├── api/ (existing)
│   └── languages/ (existing)
│
└── scripts/
    ├── deployment/
    │   ├── deploy-enhanced-hybrid.sh
    │   ├── deploy.sh
    │   ├── pull-all-analyzers-corrected.sh
    │   ├── pull-analyzer-images.sh
    │   ├── setup-codequal-docker.sh
    │   └── setup-docker-analyzers.sh
    │
    ├── infrastructure/
    │   └── prometheus.yml
    │
    └── (existing scripts structure)
```

**Impact**: Root reduced from 28 → 19 files (32% reduction)

---

### Option 2: Maximum Organization (Recommended)

Move all operational files to organized directories:

```
codequal/
├── .env, .env.example
├── .gitignore, .gitattributes
├── .eslintrc.json, .eslintignore, .prettierrc
├── .npmrc, .mcp.json, .codequal-config.yaml, .cursorrules
├── package.json, package-lock.json
├── tsconfig.json, tsconfig.base.json
├── turbo.json, jest.config.js
├── CLAUDE.md, V9-SYSTEM-OVERVIEW.md
│
├── docker/
│   ├── Dockerfile.production
│   ├── docker-compose-v9-language-based.yml
│   ├── Dockerfile.local
│   ├── agents/, api/, languages/ (existing)
│
└── scripts/
    ├── deployment/
    │   ├── deploy-enhanced-hybrid.sh
    │   ├── deploy.sh
    │   ├── pull-all-analyzers-corrected.sh
    │   ├── pull-analyzer-images.sh
    │   ├── setup-codequal-docker.sh
    │   └── setup-docker-analyzers.sh
    │
    ├── infrastructure/
    │   ├── prometheus.yml
    │   └── connect-oracle.sh
    │
    ├── ci/
    │   └── run-ci-locally.sh
    │
    └── (existing: calibration/, deployment/, migration/, etc.)
```

**Impact**: Root reduced from 28 → 17 files (39% reduction)

---

## 📋 Detailed Move Plan

### Phase 3A: Docker Configuration Organization

**Files to Move** (2 files):
```bash
Dockerfile.production → docker/Dockerfile.production
docker-compose-v9-language-based.yml → docker/docker-compose-v9-language-based.yml
```

**Verification**:
- Check Dockerfile references in CI/CD
- Verify docker-compose still works from new location
- Update any documentation referencing these files

**Impact**: Root: 28 → 26 files

---

### Phase 3B: Deployment Scripts Organization

**Create Directory**:
```bash
scripts/deployment/
```

**Files to Move** (6 files):
```bash
deploy-enhanced-hybrid.sh → scripts/deployment/
deploy.sh → scripts/deployment/
pull-all-analyzers-corrected.sh → scripts/deployment/
pull-analyzer-images.sh → scripts/deployment/
setup-codequal-docker.sh → scripts/deployment/
setup-docker-analyzers.sh → scripts/deployment/
```

**Verification**:
- Test deployment workflow still works
- Check for hardcoded paths in scripts
- Update deployment documentation

**Impact**: Root: 26 → 20 files

---

### Phase 3C: Infrastructure Scripts Organization

**Create Directory**:
```bash
scripts/infrastructure/
```

**Files to Move** (2 files):
```bash
prometheus.yml → scripts/infrastructure/
connect-oracle.sh → scripts/infrastructure/
```

**Optional** (user decision):
```bash
run-ci-locally.sh → scripts/ci/ OR keep in root
```

**Impact**: Root: 20 → 18 files (or 17 if moving CI script)

---

## 🔍 Impact Assessment

### Before (Current State)
```
codequal/
├── 28 files in root (mixed configs, scripts, docs)
├── 11 essential configs
├── 2 documentation files
├── 15 operational scripts/configs
└── Hard to distinguish essential from operational
```

### After (Proposed State)
```
codequal/
├── 17-19 files in root (only essential configs + docs)
├── 11 essential configs (unchanged)
├── 2 documentation files (unchanged)
├── docker/ (6 files total: 2 from root + 4 existing)
├── scripts/deployment/ (6 scripts)
├── scripts/infrastructure/ (1-2 files)
├── scripts/ci/ (optional: 1 file)
└── Clear separation of concerns
```

### Benefits

**Organization**:
- ✅ Clear separation: essential configs vs operational scripts
- ✅ Easy to find deployment-related files
- ✅ Professional, clean root directory
- ✅ Better for new developers

**Discoverability**:
- ✅ All deployment scripts in one place
- ✅ Docker files unified in /docker/
- ✅ Infrastructure configs together
- ✅ Logical grouping by purpose

**Maintainability**:
- ✅ Easier to update deployment workflows
- ✅ Clear where to add new scripts
- ✅ Reduced root directory clutter
- ✅ Better documentation structure

---

## ⚠️ Potential Issues & Mitigation

### Issue 1: CI/CD Pipeline References

**Risk**: GitHub Actions may reference root-level Dockerfile.production
**Mitigation**:
```bash
# Check GitHub Actions workflows
rg "Dockerfile.production" .github/workflows/

# Update workflow files if needed
# FROM: docker build -f Dockerfile.production
# TO:   docker build -f docker/Dockerfile.production
```

### Issue 2: Docker Compose Working Directory

**Risk**: docker-compose.yml may assume root directory context
**Mitigation**:
```bash
# Can still run from root with:
docker-compose -f docker/docker-compose-v9-language-based.yml up

# Or create symlink if needed
ln -s docker/docker-compose-v9-language-based.yml docker-compose.yml
```

### Issue 3: Script Cross-References

**Risk**: Scripts may reference each other with relative paths
**Mitigation**:
```bash
# Check for script cross-references
rg "\.\/deploy|\.\/pull|\.\/setup" *.sh

# Update paths if needed or use absolute paths
```

### Issue 4: Documentation References

**Risk**: Documentation may reference old file locations
**Mitigation**:
```bash
# Find documentation references
rg "deploy.*\.sh|Dockerfile\.production" docs/

# Update all documentation
```

---

## 🔒 Safety Measures

### Pre-Move Verification
```bash
# 1. Check for references to files we're moving
rg "deploy-enhanced-hybrid|deploy\.sh|Dockerfile\.production" --type yaml --type md
rg "docker-compose-v9" --type yaml --type sh

# 2. Check CI/CD workflows
cat .github/workflows/*.yml | grep -E "Dockerfile|docker-compose|deploy"

# 3. Verify no hardcoded paths
rg "^\.\./\.\./deploy|/root.*deploy" --type sh
```

### Post-Move Verification
```bash
# 1. Test deployment scripts work from new location
bash scripts/deployment/deploy.sh --dry-run

# 2. Test docker-compose from new location
docker-compose -f docker/docker-compose-v9-language-based.yml config

# 3. Test CI locally
bash scripts/ci/run-ci-locally.sh  # if moved

# 4. Verify no broken references
rg "deploy-enhanced-hybrid|deploy\.sh" --type md --type yaml
```

### Rollback Plan
```bash
# If any issues, rollback is one command:
git reset --hard HEAD~1

# Or restore specific files:
git checkout HEAD~1 -- deploy-enhanced-hybrid.sh
git checkout HEAD~1 -- Dockerfile.production
```

---

## 📝 Execution Steps

### Step 1: Pre-Move Analysis
```bash
# Check for file references
rg "Dockerfile\.production|docker-compose-v9|deploy-enhanced|deploy\.sh" \
   --type yaml --type md --type sh

# Verify CI/CD workflows
cat .github/workflows/*.yml | grep -E "docker|deploy"
```

### Step 2: Create Directories
```bash
mkdir -p scripts/deployment
mkdir -p scripts/infrastructure
mkdir -p scripts/ci  # optional
```

### Step 3: Move Docker Files
```bash
git mv Dockerfile.production docker/
git mv docker-compose-v9-language-based.yml docker/
```

### Step 4: Move Deployment Scripts
```bash
git mv deploy-enhanced-hybrid.sh scripts/deployment/
git mv deploy.sh scripts/deployment/
git mv pull-all-analyzers-corrected.sh scripts/deployment/
git mv pull-analyzer-images.sh scripts/deployment/
git mv setup-codequal-docker.sh scripts/deployment/
git mv setup-docker-analyzers.sh scripts/deployment/
```

### Step 5: Move Infrastructure Files
```bash
git mv prometheus.yml scripts/infrastructure/
git mv connect-oracle.sh scripts/infrastructure/

# Optional: Move CI script
git mv run-ci-locally.sh scripts/ci/  # user decision
```

### Step 6: Update References
```bash
# Update any CI/CD workflows
# Update documentation
# Update any scripts that reference moved files
```

### Step 7: Test & Verify
```bash
# Run CI validation
bash scripts/ci/run-ci-locally.sh  # if moved

# Test docker-compose
docker-compose -f docker/docker-compose-v9-language-based.yml config

# Verify no broken references
rg "deploy-enhanced|Dockerfile\.production" docs/
```

### Step 8: Commit
```bash
git add .
git commit -m "chore(cleanup): Phase 3 - Configuration organization

Organized root directory by moving operational files to dedicated directories:

Docker Configuration:
- Moved Dockerfile.production → docker/
- Moved docker-compose-v9-language-based.yml → docker/

Deployment Scripts:
- Created scripts/deployment/ directory
- Moved 6 deployment scripts from root

Infrastructure:
- Created scripts/infrastructure/ directory
- Moved prometheus.yml, connect-oracle.sh

Results:
- Root directory reduced from 28 → 17 files (39% reduction)
- Clear separation: essential configs vs operational scripts
- Improved discoverability and maintainability

Updated:
- CI/CD workflow references (if any)
- Documentation references
- Script cross-references
"
```

---

## 📊 Expected Results

### File Count Reduction
```
Before: 28 root files
After:  17 root files
Reduction: 39% (11 files moved)
```

### Root Directory Contents (After)
```bash
# Configuration (11 files)
.env, .env.example
.gitignore, .gitattributes
.eslintrc.json, .eslintignore, .prettierrc
.npmrc, .mcp.json, .codequal-config.yaml
package.json, package-lock.json

# Build Configuration (4 files)
tsconfig.json, tsconfig.base.json
turbo.json
jest.config.js

# Documentation (2 files)
CLAUDE.md
V9-SYSTEM-OVERVIEW.md

# IDE (1 file)
.cursorrules

Total: 17 files (all essential)
```

### New Directory Structure
```bash
docker/
├── Dockerfile.production (NEW from root)
├── docker-compose-v9-language-based.yml (NEW from root)
├── Dockerfile.local (existing)
├── agents/ (existing)
├── api/ (existing)
└── languages/ (existing)

scripts/
├── deployment/ (NEW directory)
│   ├── deploy-enhanced-hybrid.sh
│   ├── deploy.sh
│   ├── pull-all-analyzers-corrected.sh
│   ├── pull-analyzer-images.sh
│   ├── setup-codequal-docker.sh
│   └── setup-docker-analyzers.sh
│
├── infrastructure/ (NEW directory)
│   ├── prometheus.yml
│   └── connect-oracle.sh
│
├── ci/ (NEW directory - optional)
│   └── run-ci-locally.sh
│
└── (existing: calibration/, etc.)
```

---

## 🎯 Recommendations

### Recommended Approach

**Phase 3A**: Docker files first (low risk)
- Move Dockerfile.production
- Move docker-compose-v9-language-based.yml
- Test docker build/compose works

**Phase 3B**: Deployment scripts (moderate risk)
- Create scripts/deployment/
- Move all 6 deployment scripts
- Test deployment workflow

**Phase 3C**: Infrastructure files (low risk)
- Create scripts/infrastructure/
- Move prometheus.yml, connect-oracle.sh
- Update any references

**Decision Point**: run-ci-locally.sh
- **Option A**: Keep in root (easy access for developers)
- **Option B**: Move to scripts/ci/ (complete organization)
- **Recommendation**: Ask user preference

---

## ❓ Questions for User

1. **Deployment Scripts**: Proceed with moving all 6 to scripts/deployment/?

2. **Docker Files**: Move both to /docker/ directory?

3. **CI Script**: run-ci-locally.sh
   - **A**: Keep in root for easy developer access
   - **B**: Move to scripts/ci/ for complete organization
   - Which do you prefer?

4. **connect-oracle.sh**:
   - **A**: Keep in root for quick SSH access
   - **B**: Move to scripts/infrastructure/
   - Which do you prefer?

5. **Execution**:
   - **A**: Execute all phases at once
   - **B**: Execute phase by phase with verification
   - Which do you prefer?

---

## 🚀 Quick Start Commands

### If User Approves Full Plan:
```bash
# Create directories
mkdir -p scripts/deployment scripts/infrastructure scripts/ci

# Move Docker files
git mv Dockerfile.production docker/
git mv docker-compose-v9-language-based.yml docker/

# Move deployment scripts
git mv deploy*.sh pull*.sh setup*.sh scripts/deployment/

# Move infrastructure
git mv prometheus.yml connect-oracle.sh scripts/infrastructure/

# Optional: Move CI
git mv run-ci-locally.sh scripts/ci/

# Commit
git add .
git commit -m "chore(cleanup): Phase 3 - Configuration organization"
git push origin main
```

---

**Status**: 📋 **PLAN READY - AWAITING USER DECISIONS**
**Expected Time**: 15-20 minutes
**Risk**: LOW (all git-tracked, easy rollback)

---

_Phase 3 Configuration Organization Plan - November 4, 2025_
_Created by Claude Code for Repository Organization_
