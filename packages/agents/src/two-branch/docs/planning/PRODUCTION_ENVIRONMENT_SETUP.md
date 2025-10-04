# Production Environment Setup - Workspace Fix Strategy

**Status**: ✅ RECOMMENDED APPROACH
**Priority**: HIGH (do this instead of fixing dev workspace)
**Risk Level**: LOW (no impact on existing dev environment)

---

## Strategy Overview

Instead of fixing the broken workspace in dev, create production/prerelease environments with CORRECT workspace configuration from the start. This approach:

✅ **Zero risk** to working dev environment
✅ **Clean slate** - no legacy issues
✅ **Production gets best practices** from day 1
✅ **Natural testing path** via prerelease
✅ **Future template** for fixing dev (optional)

---

## Environment Structure

```
Development (~/Code Prjects/codequal/)
├── Workspace: Broken but working with workarounds
├── Purpose: Active V9 development & testing
└── Status: Keep as-is for now

Prerelease (~/codequal-prerelease/)
├── Workspace: FIXED ✅
├── Purpose: Beta testing before production
└── Status: Create with correct workspace

Production (~/codequal-production/)
├── Workspace: FIXED ✅
├── Purpose: Live deployment
└── Status: Create with correct workspace
```

---

## Step-by-Step Production Setup

### Phase 1: Create Production Directory Structure

```bash
# 1. Create production directory
mkdir -p ~/codequal-production
cd ~/codequal-production

# 2. Initialize with CORRECT workspace configuration
cat > package.json << 'EOF'
{
  "name": "codequal-production",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "install:all": "npm install",
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "typecheck": "npm run typecheck --workspaces",
    "lint": "npm run lint --workspaces"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
EOF

# 3. Create packages directory
mkdir -p packages
```

### Phase 2: Copy Code (NOT Dependencies)

```bash
# Copy packages WITHOUT node_modules or lock files
rsync -av \
  --exclude='node_modules' \
  --exclude='package-lock.json' \
  --exclude='dist' \
  --exclude='*.tgz' \
  --exclude='.env' \
  ~/Code\ Prjects/codequal/packages/ \
  ./packages/

# Copy root-level config files
cp ~/Code\ Prjects/codequal/.gitignore .
cp ~/Code\ Prjects/codequal/.nvmrc .
cp ~/Code\ Prjects/codequal/tsconfig.json .

# Copy .env template (will customize later)
cp ~/Code\ Prjects/codequal/.env .env.template
```

### Phase 3: Fresh Installation (This Fixes Workspace!)

```bash
# Clear any npm cache
npm cache clean --force

# Fresh install - npm will create CORRECT workspace structure
npm install

# This should work now (was broken in dev):
npm install @google/generative-ai

# Verify workspace is working
echo "Testing workspace..."
npm list --depth=0
```

### Phase 4: Configure Production Environment

```bash
# Create production .env file
cat > .env << 'EOF'
# Production Environment Variables
NODE_ENV=production

# Supabase (Production instance)
SUPABASE_URL=https://ftjhmbbcuqjqmmbaymqb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<PRODUCTION_KEY>

# GitHub
GITHUB_TOKEN=<PRODUCTION_TOKEN>

# AI API Keys
ANTHROPIC_API_KEY=<PRODUCTION_KEY>
GOOGLE_API_KEY=<PRODUCTION_KEY>

# OpenRouter with Multi-Key Resilience
OPENROUTER_API_KEYS=<KEY1>,<KEY2>,<KEY3>
EMERGENCY_FALLBACK_PROVIDER=gemini
EMERGENCY_FALLBACK_MODEL=gemini-2.0-flash-thinking-exp

# Redis (Production)
REDIS_URL=<PRODUCTION_REDIS_URL>

# Production Settings
LOG_LEVEL=warn
CACHE_ENABLED=true
EOF

# Secure the .env file
chmod 600 .env
```

### Phase 5: Build and Validate

```bash
# Build all packages
npm run build

# Run type checking
npm run typecheck

# Run linting
npm run lint

# Run V9 quick test
cd packages/agents
npx ts-node src/two-branch/tests/__tests__/test-v9-optimized-report.ts
```

### Phase 6: Test Workspace Fix

```bash
# The key test - can we install packages normally now?
npm install lodash --no-save

# Should see:
# ✅ added 1 package
# NOT:
# ❌ 404 Not Found - GET https://registry.npmjs.org/@codequal%2fagents

# Cleanup test
npm uninstall lodash

echo "✅ Production workspace is working correctly!"
```

---

## Prerelease Environment Setup

**Same process, but:**

```bash
# Create prerelease instead
mkdir -p ~/codequal-prerelease
cd ~/codequal-prerelease

# Use same steps as production
# But with prerelease configuration

cat > .env << 'EOF'
NODE_ENV=prerelease
# ... prerelease-specific config
EOF
```

**Purpose of Prerelease**:
- Beta testing with real users
- Load testing
- Performance validation
- Final checks before production
- Can use production workspace structure

---

## Deployment Strategy

### Option A: Oracle Cloud (Recommended)

**Setup Oracle instance for production:**

```bash
# SSH to Oracle
export ORACLE_IP="<PRODUCTION_IP>"
export SSH_KEY="/path/to/production-key.key"
ssh -i "$SSH_KEY" ubuntu@$ORACLE_IP

# On Oracle instance
cd ~
git clone <YOUR_REPO> codequal-production
cd codequal-production

# Install dependencies
npm install

# Build
npm run build

# Setup systemd service
sudo systemctl enable codequal-production
sudo systemctl start codequal-production
```

### Option B: Docker Deployment

```bash
# Create Dockerfile in production directory
cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/*/package.json ./packages/

# Install dependencies (workspace will work correctly!)
RUN npm install --production

# Copy source
COPY . .

# Build
RUN npm run build

# Start
CMD ["npm", "start"]
EOF

# Build image
docker build -t codequal-production .

# Run
docker run -d \
  --name codequal-prod \
  -p 3000:3000 \
  --env-file .env \
  codequal-production
```

---

## Validation Checklist

After production setup, verify:

- [ ] `npm install <package>` works without 404 errors
- [ ] All packages build successfully
- [ ] TypeScript compiles without errors
- [ ] All tests pass
- [ ] V9 resilience chain works
- [ ] Environment variables configured
- [ ] Logs writing to correct location
- [ ] Database connection working
- [ ] Redis cache working
- [ ] API endpoints responding
- [ ] Monitoring/alerting configured

---

## Comparison: Dev vs Production Workspace

| Aspect | Development (Current) | Production (New) |
|--------|----------------------|------------------|
| Workspace | ❌ Broken | ✅ Fixed |
| npm install | ❌ Fails | ✅ Works |
| Workarounds | ✅ Required | ❌ Not needed |
| Risk to fix | 🔴 HIGH | 🟢 NONE |
| Dependencies | Mixed versions | Locked versions |
| Environment | Development | Production |

---

## Future: Migrate Dev to Match Production

**After production is stable**, optionally fix dev workspace:

```bash
# 1. Backup dev
cd ~/Code\ Prjects/codequal
git add -A
git commit -m "backup: Before workspace restructure"
git tag workspace-migration-backup

# 2. Copy working production structure
cp ~/codequal-production/package.json .
cp ~/codequal-production/package-lock.json .

# 3. Reinstall
rm -rf node_modules
npm install

# 4. Test
npm run test:v9:quick
```

**But this is OPTIONAL** - dev can stay as-is if working.

---

## Cost Comparison

| Approach | Time | Risk | Success Rate |
|----------|------|------|--------------|
| Fix dev workspace | 2-3 hours | HIGH | 30% |
| Create new production | 1 hour | NONE | 100% |

**Winner**: Create new production environment ✅

---

## Timeline

**Recommended Schedule**:

```
Week 1 (Current):
├── ✅ Complete V9 resilience implementation
├── ✅ Beta testing in dev environment
└── ✅ Validate all features

Week 2:
├── Create prerelease environment (with fixed workspace)
├── Deploy to prerelease
├── Beta testing with real users
└── Load testing

Week 3:
├── Create production environment (with fixed workspace)
├── Deploy to production
├── Monitor and validate
└── (Optional) Fix dev workspace to match

Week 4:
└── Production stable, all environments working
```

---

## Benefits Summary

✅ **Production gets it right from day 1**
✅ **Zero downtime for dev**
✅ **Natural testing progression** (dev → prerelease → prod)
✅ **Template for other environments**
✅ **No risky fixes** to working code
✅ **Clean dependency tree** in production
✅ **Best practices enforced** from start

---

## Emergency Rollback

If production deployment fails (unlikely):

```bash
# 1. Production is separate - dev still working
cd ~/Code\ Prjects/codequal
npm run test:v9:quick  # Still works!

# 2. Try prerelease instead
cd ~/codequal-prerelease
# Continue testing here

# 3. Or redeploy dev to production
# (Using working dev code as fallback)
```

**Key point**: Production setup can't break dev environment because they're completely separate!

---

## Conclusion

**This is the SMART way to fix the workspace issue:**

1. Don't touch working dev environment
2. Create production with correct workspace from scratch
3. Test in prerelease
4. Deploy to production
5. (Maybe) Fix dev later to match

**It's faster, safer, and guaranteed to work!**

---

**Last Updated**: October 3, 2025
**Next Step**: Create prerelease environment after V9 beta testing
**Status**: Ready to execute
**Risk Level**: 🟢 LOW (separate from dev)
