# TODO: Fix Workspace/Monorepo Configuration

**Status**: ⚠️ DEFERRED UNTIL AFTER BETA TESTING
**Priority**: Medium (not blocking production)
**Risk Level**: HIGH (could break entire dependency tree)

---

## Problem Summary

The npm workspace configuration is broken, preventing normal `npm install` operations. When trying to install new packages, npm incorrectly tries to download `@codequal/agents` from the public npm registry instead of recognizing it as a local workspace package.

### Symptoms
```bash
$ npm install @google/generative-ai
npm error 404 Not Found - GET https://registry.npmjs.org/@codequal%2fagents
npm error 404  '@codequal/agents@0.1.0' is not in this registry.
```

### Current Workarounds
- ✅ Manual package installation (what we did for `@google/generative-ai`)
- ✅ Direct file copying to `node_modules/`
- ✅ All production code works fine

---

## 🎯 When to Fix

**ONLY attempt this fix AFTER:**
- ✅ V9 beta testing complete
- ✅ All critical features validated
- ✅ Production deployment successful
- ✅ Full backup created

**DO NOT attempt before beta testing** - risk of breaking working system is too high.

---

## 📋 Pre-Fix Checklist

### 1. Create Secure Backup Points

**Git Backup**:
```bash
# Tag current working state
git add -A
git commit -m "chore: Pre-workspace-fix backup - WORKING STATE"
git tag -a v9-working-pre-workspace-fix -m "Stable V9 before workspace fix attempt"
git push origin main --tags

# Create backup branch
git checkout -b backup/pre-workspace-fix
git push origin backup/pre-workspace-fix
```

**Oracle Backup**:
```bash
# SSH to Oracle instance
export ORACLE_IP="129.213.49.128"
export SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key"

# Create backup directory
ssh -i "$SSH_KEY" ubuntu@$ORACLE_IP "mkdir -p ~/backups/codequal-pre-workspace-fix"

# Tar and compress entire codebase
cd /Users/alpinro/Code\ Prjects/codequal
tar -czf /tmp/codequal-backup-$(date +%Y%m%d-%H%M%S).tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='dist' \
  .

# Upload to Oracle
scp -i "$SSH_KEY" \
  /tmp/codequal-backup-*.tar.gz \
  ubuntu@$ORACLE_IP:~/backups/codequal-pre-workspace-fix/

# Also backup node_modules separately (just in case)
tar -czf /tmp/node_modules-backup-$(date +%Y%m%d-%H%M%S).tar.gz node_modules
scp -i "$SSH_KEY" \
  /tmp/node_modules-backup-*.tar.gz \
  ubuntu@$ORACLE_IP:~/backups/codequal-pre-workspace-fix/
```

**Verification**:
```bash
# Verify Oracle backup exists
ssh -i "$SSH_KEY" ubuntu@$ORACLE_IP "ls -lh ~/backups/codequal-pre-workspace-fix/"

# Verify git tag exists
git tag | grep v9-working-pre-workspace-fix

# Document current package versions
npm list --depth=0 > CURRENT_PACKAGES.txt
git add CURRENT_PACKAGES.txt
git commit -m "docs: Document package versions before workspace fix"
```

### 2. Document Current State

**Create snapshot document**:
```bash
cat > WORKSPACE_FIX_BASELINE.md << 'EOF'
# Workspace Fix Baseline

## Current Working State (Before Fix)
- **Date**: $(date)
- **V9 Status**: Production ready
- **Tests**: All passing
- **Resilience**: Complete (3-tier working)

## Current Workarounds
- Google Generative AI: Manually installed via npm pack
- All other packages: Installed normally

## Known Working Versions
- Node: $(node --version)
- npm: $(npm --version)

## Critical Dependencies
$(cat package.json | grep -A 50 '"dependencies"')

## Workspace Config
$(cat package.json | grep -A 5 '"workspaces"')
EOF

git add WORKSPACE_FIX_BASELINE.md
git commit -m "docs: Create workspace fix baseline"
```

---

## 🔧 Fix Attempts (In Order of Risk)

### Attempt 1: Conservative Cleanup (Lowest Risk)

**Goal**: Fix workspace without touching package.json files

```bash
# 1. Backup current state
cp package-lock.json package-lock.json.backup
cp -r node_modules node_modules.backup

# 2. Clear npm cache
npm cache clean --force

# 3. Remove lock file only (keep node_modules)
rm -f package-lock.json

# 4. Reinstall
npm install

# 5. Test immediately
npm run typecheck
npm run test:v9:quick
```

**Success Criteria**:
- ✅ `npm install @google/generative-ai` works
- ✅ TypeScript compiles
- ✅ V9 tests pass
- ✅ No missing dependencies

**Rollback if failed**:
```bash
mv package-lock.json.backup package-lock.json
rm -rf node_modules
mv node_modules.backup node_modules
```

---

### Attempt 2: Full Dependency Rebuild (Medium Risk)

**Goal**: Rebuild entire dependency tree

**WARNING**: ⚠️ This will remove ALL node_modules. Requires ~10-15 minutes to reinstall.

```bash
# 1. Document all installed packages first
npm list --depth=0 > packages-before-rebuild.txt

# 2. Backup everything
cp package-lock.json package-lock.json.backup
tar -czf node_modules-backup.tar.gz node_modules

# 3. Clean everything
rm -rf node_modules package-lock.json
rm -rf packages/*/node_modules packages/*/package-lock.json

# 4. Clear npm cache
npm cache clean --force

# 5. Reinstall from scratch
npm install

# 6. Test immediately
npm run typecheck
npm run lint
npm run test:v9:quick

# 7. Compare packages
npm list --depth=0 > packages-after-rebuild.txt
diff packages-before-rebuild.txt packages-after-rebuild.txt
```

**Success Criteria**:
- ✅ All packages reinstalled
- ✅ No version regressions
- ✅ All tests pass
- ✅ Can install new packages normally

**Rollback if failed**:
```bash
rm -rf node_modules package-lock.json
tar -xzf node_modules-backup.tar.gz
mv package-lock.json.backup package-lock.json
```

---

### Attempt 3: Nuclear Option (Highest Risk)

**Goal**: Fix package.json versions and rebuild

**WARNING**: ⚠️⚠️⚠️ Only if Attempts 1 & 2 fail. Could break everything.

```bash
# 1. Full backup (critical!)
git add -A
git commit -m "chore: Before nuclear workspace fix"
git tag -a workspace-fix-nuclear-attempt -m "State before nuclear fix"
git push origin main --tags

# 2. Update all package.json versions to exact
cd /Users/alpinro/Code\ Prjects/codequal
npm list --depth=0 --json > current-versions.json

# Use this to fix all package.json files to exact versions
# (Manual step - update each package.json)

# 3. Remove everything
rm -rf node_modules package-lock.json
rm -rf packages/*/node_modules packages/*/package-lock.json

# 4. Reinstall
npm install

# 5. Extensive testing
npm run typecheck
npm run lint
npm run test:v9:full
npm run test:v9:integration
```

**Rollback if failed**:
```bash
git reset --hard workspace-fix-nuclear-attempt
npm install
```

---

## 🧪 Post-Fix Validation

After ANY successful fix attempt, run complete validation:

```bash
# 1. TypeScript compilation
npm run typecheck

# 2. Linting
npm run lint

# 3. Quick V9 test
npm run test:v9:quick

# 4. Full V9 integration
npm run test:v9:integration

# 5. Resilience test
cd packages/agents
npx ts-node src/two-branch/tests/__tests__/test-resilience-chain.ts

# 6. Try installing new package (the original problem)
npm install lodash --no-save
npm uninstall lodash

# 7. Check Oracle deployment still works
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
bash src/two-branch/scripts/oracle-deploy-dependency-check.sh
```

---

## 📊 Decision Matrix

| Attempt | Time | Risk | Success Rate | When to Use |
|---------|------|------|--------------|-------------|
| #1 Conservative | 5 min | LOW | 60% | Try first always |
| #2 Full Rebuild | 15 min | MEDIUM | 30% | If #1 fails |
| #3 Nuclear | 30 min | HIGH | 10% | Last resort only |

---

## 🚨 Emergency Rollback Procedures

### If Fix Breaks Production

**Immediate Recovery**:
```bash
# 1. Restore from git tag
git checkout v9-working-pre-workspace-fix

# 2. Reinstall dependencies
npm install

# 3. Verify working
npm run test:v9:quick
```

### If Fix Breaks Dependencies

**Oracle Restore**:
```bash
# 1. Download backup from Oracle
scp -i "$SSH_KEY" \
  ubuntu@$ORACLE_IP:~/backups/codequal-pre-workspace-fix/codequal-backup-*.tar.gz \
  /tmp/

# 2. Extract
cd /Users/alpinro/Code\ Prjects/codequal
rm -rf * .[^.]*  # Clear everything
tar -xzf /tmp/codequal-backup-*.tar.gz

# 3. Restore node_modules
scp -i "$SSH_KEY" \
  ubuntu@$ORACLE_IP:~/backups/codequal-pre-workspace-fix/node_modules-backup-*.tar.gz \
  /tmp/
tar -xzf /tmp/node_modules-backup-*.tar.gz

# 4. Verify
npm run test:v9:quick
```

---

## 📝 Success Criteria

Fix is considered successful when:

- ✅ `npm install <package>` works without errors
- ✅ All existing tests pass
- ✅ TypeScript compiles without errors
- ✅ Linting passes
- ✅ V9 resilience chain works
- ✅ No dependency version regressions
- ✅ Oracle deployment still works

---

## 🎓 Learning Resources

Understanding npm workspaces:
- https://docs.npmjs.com/cli/v7/using-npm/workspaces
- https://docs.npmjs.com/cli/v7/configuring-npm/package-json#workspaces

Troubleshooting:
- https://npm.github.io/how-npm-works-docs/npm3/how-npm3-works.html
- Common workspace issues: https://github.com/npm/cli/issues?q=workspaces

---

## 📅 Timeline

**Recommended Schedule**:

1. **Week 1**: V9 Beta Testing (current focus)
2. **Week 2**: Production deployment & monitoring
3. **Week 3**: Workspace fix attempt (if still needed)

**Do NOT rush this** - workspace is not blocking any critical functionality.

---

## ✅ Final Checklist Before Starting

- [ ] V9 beta testing complete
- [ ] Production deployment successful
- [ ] Git tag created: `v9-working-pre-workspace-fix`
- [ ] Git backup branch pushed: `backup/pre-workspace-fix`
- [ ] Oracle backup uploaded and verified
- [ ] CURRENT_PACKAGES.txt committed
- [ ] WORKSPACE_FIX_BASELINE.md committed
- [ ] Team notified (if applicable)
- [ ] Blocked 2-3 hours for fix attempt
- [ ] Rollback procedures tested and understood

---

**Last Updated**: October 3, 2025
**Next Review**: After V9 beta testing completion
**Owner**: Development Team
**Status**: DEFERRED - Not blocking production
