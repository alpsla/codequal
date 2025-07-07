# CodeQual Cleanup Plan - July 7, 2025

## 1. Configuration Consolidation

### Current State:
- Configs scattered across packages
- Multiple .env files
- No central pricing/feature configuration
- Exposed sensitive keys in git

### Proposed Central Config Structure:
```
/config
  ├── default.json          # Default values for all environments
  ├── development.json       # Dev overrides
  ├── production.json        # Prod overrides
  ├── pricing.json          # Pricing tiers (changeable without code changes)
  ├── features.json         # Feature flags
  └── schema.ts             # TypeScript interfaces for type safety
```

### Config Categories:
```typescript
// config/schema.ts
export interface AppConfig {
  app: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
  };
  
  api: {
    port: number;
    baseUrl: string;
    corsOrigins: string[];
  };
  
  auth: {
    providers: {
      magic: boolean;
      github: boolean;
      google: boolean;
    };
    sessionDuration: number;
  };
  
  pricing: {
    tiers: {
      [key: string]: {
        name: string;
        price: number;
        currency: string;
        features: string[];
        limits: {
          apiCalls: number;
          repositories: number;
          teamMembers: number;
        };
      };
    };
  };
  
  stripe: {
    publicKey: string;
    webhookSecret: string;
    // secretKey in env only
  };
}
```

## 2. Files to Clean Up

### API Directory Cleanup:
```bash
# Move debug scripts to archive
mkdir -p apps/api/scripts/debug-archive
mv apps/api/*.js apps/api/scripts/debug-archive/
mv apps/api/*.sql apps/api/scripts/debug-archive/

# Keep only essential SQL
mkdir -p apps/api/migrations
# Keep: fix-database-schema.sql (rename to 001_initial_schema.sql)
```

### Remove/Archive:
- [ ] All test user creation scripts
- [ ] Debug scripts (debug-*.js)
- [ ] Temporary SQL fixes (except the final working version)
- [ ] Old auth test files
- [ ] Duplicate .env files

### Security Fixes:
- [ ] Remove all exposed API keys from .env files
- [ ] Add .env to .gitignore (if not already)
- [ ] Rotate all exposed keys:
  - GitHub tokens
  - Supabase service keys
  - OAuth secrets

## 3. Code Quality Fixes

### Build Issues:
```bash
# Run and fix
npm run build
npm run lint
npm run test
```

### Test Cleanup:
- [ ] Remove or fix failing tests
- [ ] Remove test artifacts
- [ ] Update test configs

### Documentation:
- [ ] Remove outdated docs
- [ ] Update README with current setup
- [ ] Document the auth workaround

## 4. Git Cleanup

### Before Push:
```bash
# Create backup branch
git checkout -b pre-cleanup-backup
git push origin pre-cleanup-backup

# Return to main
git checkout main

# Clean up
git rm --cached apps/api/.env
git rm --cached .env

# Add to .gitignore
echo "# Environment files" >> .gitignore
echo ".env" >> .gitignore
echo "*.env.local" >> .gitignore
echo "apps/*/.env" >> .gitignore
```

## 5. Post-Supabase Fix Migration Plan

### Add to implementation-plans/:
```markdown
# Supabase Bug Resolution Plan

When Supabase fixes the "Database error granting user" bug:

1. **Testing Phase** (1 week)
   - Test fix in development
   - Verify all auth flows work
   - Run parallel with workaround

2. **Migration Steps**:
   - [ ] Update Supabase client to latest version
   - [ ] Create feature flag: `USE_AUTH_WORKAROUND`
   - [ ] Implement switch in auth middleware
   - [ ] Test both paths thoroughly

3. **Rollout**:
   - Week 1: 10% of users on new auth
   - Week 2: 50% of users
   - Week 3: 100% migration
   - Week 4: Remove workaround code

4. **Rollback Plan**:
   - Keep workaround code for 1 month
   - Monitor error rates
   - Quick switch back if issues

5. **Code Cleanup**:
   - Remove auth-middleware-workaround.ts
   - Remove manual JWT decoding
   - Update documentation
   - Celebrate! 🎉
```

## Execution Order:

1. **Immediate** (Today):
   - [ ] Backup current state
   - [ ] Remove sensitive keys from tracked files
   - [ ] Fix critical security issues

2. **Phase 1** (2-3 hours):
   - [ ] Archive debug scripts
   - [ ] Clean up SQL files
   - [ ] Fix .gitignore

3. **Phase 2** (2-3 hours):
   - [ ] Create central config structure
   - [ ] Consolidate configurations
   - [ ] Add pricing config file

4. **Phase 3** (1-2 hours):
   - [ ] Fix build/lint issues
   - [ ] Update tests
   - [ ] Update documentation

5. **Final**:
   - [ ] Commit with clear message
   - [ ] Push to origin
   - [ ] Tag as "pre-stripe-integration"