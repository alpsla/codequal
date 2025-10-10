# Local CI Testing Guide

## 🎯 Two Options for Local CI Testing

### Option 1: Custom Script (Fastest)
**File**: `run-ci-locally.sh`

Replicates the exact steps from `.github/workflows/ci.yml`

**Usage**:
```bash
./run-ci-locally.sh
```

**Pros**:
- ✅ Fast (uses existing node_modules)
- ✅ No additional tools needed
- ✅ Exact CI workflow replication

**Cons**:
- ⚠️  Doesn't use Docker (like real CI)
- ⚠️  Uses your local environment

---

### Option 2: Act (Most Accurate)
**Tool**: [nektos/act](https://github.com/nektos/act)

Runs GitHub Actions workflows locally in Docker containers.

**Installation**:
```bash
# macOS
brew install act

# Verify installation
act --version
```

**Usage**:
```bash
# Run the CI workflow
act -j build-and-test

# Run with secrets (if needed)
act -j build-and-test --secret-file .env

# Dry run (see what would happen)
act -j build-and-test --dryrun
```

**Pros**:
- ✅ Exact GitHub Actions environment
- ✅ Uses Docker (like real CI)
- ✅ Tests with actual workflow syntax

**Cons**:
- ⚠️  Slower (pulls Docker images)
- ⚠️  Requires Docker installed

---

## 🔄 Workflow Comparison

| Step | Local Script | Real CI | Act |
|------|-------------|---------|-----|
| Environment | Your machine | Ubuntu 18.x | Docker Ubuntu |
| Node modules | Existing | Fresh install | Fresh install |
| Speed | Fast (2-3 min) | Medium (3-5 min) | Slow (5-10 min) |
| Accuracy | ~85% | 100% | ~95% |

---

## 📝 Recommended Workflow

1. **Development**: Use `run-ci-locally.sh` for quick validation
2. **Pre-push**: Run `act` to ensure GitHub Actions compatibility
3. **Final check**: Push to PR and let real CI run

---

## 🐛 Troubleshooting

### Script fails at "npm install"
```bash
# Clean and retry
rm -rf node_modules package-lock.json
./run-ci-locally.sh
```

### Act fails with Docker errors
```bash
# Check Docker is running
docker ps

# Pull the act base image
docker pull catthehacker/ubuntu:act-latest
```

### Differences between local and CI
Common causes:
- Environment variables missing locally
- Different Node.js versions
- Different npm cache states

---

## 🎯 Quick Commands

```bash
# Run local CI (fastest)
./run-ci-locally.sh

# Run with act (most accurate)
act -j build-and-test

# Clean before running
rm -rf node_modules package-lock.json && ./run-ci-locally.sh

# Check what act would do (no execution)
act -j build-and-test --dryrun --list
```

