# Development Workflow & Code Quality Verification Guide

## 🔄 Development Workflow

### 1. **Before Starting Work**
```bash
# Always start from latest main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/[task-id]-brief-description
# Example: feature/error-boundaries-implementation
```

### 2. **During Development**

#### After Each File Change:
```bash
# Check TypeScript compilation
npm run typecheck

# Check linting for specific workspace
npm run lint --workspace=@codequal/api
npm run lint --workspace=@codequal/web

# Run affected tests
npm test -- --onlyChanged
```

#### Before Committing:
```bash
# Full verification script
npm run verify:all

# Or run individually:
npm run build        # Build all packages
npm run lint         # Lint all packages
npm run typecheck    # TypeScript check
npm test            # Run all tests
```

### 3. **Commit Strategy**

#### Commit Frequency:
- **After completing each subtask** (not entire feature)
- **When tests pass** for that component
- **Before switching context** or taking breaks

#### Commit Message Format:
```bash
# Format: type(scope): description

git commit -m "feat(api): add rate limiting middleware"
git commit -m "fix(web): implement error boundaries for dashboard"
git commit -m "docs(api): add swagger annotations for auth endpoints"
git commit -m "perf(web): optimize bundle size with code splitting"
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `perf`: Performance improvement
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

### 4. **Quality Gates Script**

Create this verification script:

```bash
#!/bin/bash
# save as: scripts/verify-quality.sh

echo "🔍 Running Quality Checks..."

# 1. TypeScript Check
echo "📘 Checking TypeScript..."
if ! npm run typecheck; then
    echo "❌ TypeScript errors found!"
    exit 1
fi

# 2. Linting
echo "🧹 Running ESLint..."
if ! npm run lint; then
    echo "❌ Linting errors found!"
    exit 1
fi

# 3. Tests
echo "🧪 Running Tests..."
if ! npm test; then
    echo "❌ Tests failed!"
    exit 1
fi

# 4. Build
echo "🔨 Building packages..."
if ! npm run build; then
    echo "❌ Build failed!"
    exit 1
fi

# 5. Bundle Size Check (optional)
echo "📦 Checking bundle size..."
npm run analyze:bundle || true

echo "✅ All quality checks passed!"
```

### 5. **Pre-Push Checklist**

```bash
# Run full quality check
./scripts/verify-quality.sh

# Check for console.logs or debugger statements
grep -r "console.log\|debugger" --include="*.ts" --include="*.tsx" apps/ packages/

# Check for exposed secrets
grep -r "sk-\|key.*=.*['\"]" --include="*.ts" --include="*.js" .

# Verify no large files
find . -type f -size +1M -not -path "./node_modules/*" -not -path "./.git/*"
```

### 6. **When to Push to Main**

#### Option A: Direct to Main (Small Team)
**Push directly when:**
- ✅ All quality checks pass
- ✅ Feature is complete and tested
- ✅ No breaking changes
- ✅ Documentation updated

```bash
# After all checks pass
git push origin main
```

#### Option B: Pull Request Flow (Recommended)
```bash
# Push feature branch
git push origin feature/[branch-name]

# Create PR for review
# Merge after approval and CI passes
```

### 7. **Continuous Verification**

Set up pre-commit hooks:

```bash
# Install husky
npm install --save-dev husky lint-staged

# Add to package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run verify:all"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

## 📋 Task-Specific Workflows

### For Each Priority Task:

#### 1. Error Boundaries
```bash
git checkout -b feature/error-boundaries
# ... implement changes ...
npm run lint --workspace=@codequal/web
npm test -- apps/web
git commit -m "feat(web): add error boundaries to main components"
./scripts/verify-quality.sh
git push origin feature/error-boundaries
```

#### 2. Rate Limiting
```bash
git checkout -b feature/rate-limiting
# ... implement changes ...
npm run lint --workspace=@codequal/api
npm test -- apps/api/src/middleware
git commit -m "feat(api): implement rate limiting middleware"
./scripts/verify-quality.sh
git push origin feature/rate-limiting
```

## 🚨 Critical Checks Before Production

### Before Any Production Deploy:
1. **Security Scan**
   ```bash
   npm audit
   npm run security:check
   ```

2. **Performance Check**
   ```bash
   npm run lighthouse
   npm run analyze:bundle
   ```

3. **Database Migrations**
   ```bash
   npm run db:migrate:dry-run
   ```

4. **Environment Variables**
   ```bash
   # Verify all required env vars
   npm run env:check
   ```

## 📊 Quality Metrics to Monitor

- **TypeScript Coverage**: 100% (no `any` types)
- **Test Coverage**: >80%
- **Bundle Size**: <500KB
- **Lint Errors**: 0
- **Build Time**: <2 minutes
- **Test Time**: <5 minutes

## 🔄 Daily Workflow Summary

```bash
# Morning
git pull origin main
npm install  # In case dependencies changed

# During development
npm run dev  # Keep running
# Make changes
npm run verify:all  # After significant changes

# Before break/end of day
git add .
git commit -m "feat: work in progress"
npm run verify:all

# When feature complete
./scripts/verify-quality.sh
git push origin feature/branch
# Create PR or merge to main
```

## 🚀 Quick Commands Reference

```bash
# Most used commands
npm run dev           # Start development
npm run verify:all    # Run all checks
npm run fix          # Auto-fix lint issues
npm test -- --watch  # Test in watch mode
npm run build        # Production build
```

This workflow ensures code quality at every step while maintaining development velocity.