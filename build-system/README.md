# CodeQual Build System

This directory contains the organized build, test, and deployment scripts for the CodeQual project.

## Directory Structure

```
build-system/
├── README.md              # This file
├── active/                # Current, actively used scripts
│   ├── build/            # Core build scripts
│   ├── test/             # Testing scripts
│   ├── deploy/           # Deployment scripts
│   └── utils/            # Utility scripts
├── archived/             # Historical scripts (moved from root and /archive)
├── core/                 # Essential system scripts
├── testing/              # Test-specific tooling
├── deployment/           # Production deployment
├── utilities/            # Helper and maintenance scripts
└── maintenance/          # Cleanup and maintenance scripts
```

## Quick Start

### Essential Commands

```bash
# Build the entire project
./active/build/build-all.sh

# Run all tests
./active/test/test-all.sh

# Run integration tests only
./active/test/test-integration.sh

# Deploy to staging
./active/deploy/deploy-staging.sh

# Deploy to production
./active/deploy/deploy-production.sh
```

### Development Workflow

```bash
# 1. Clean build
./active/build/clean-build.sh

# 2. Install dependencies
./active/utils/install-deps.sh

# 3. Build packages
./active/build/build-packages.sh

# 4. Run tests
./active/test/test-core.sh

# 5. Run integration tests
./active/test/test-integration.sh
```

## Script Categories

### Core Build Scripts (`active/build/`)
- `build-all.sh` - Complete project build
- `build-packages.sh` - Build all packages
- `clean-build.sh` - Clean build with dependency refresh
- `build-core.sh` - Build core packages only

### Testing Scripts (`active/test/`)
- `test-all.sh` - Run all test suites
- `test-core.sh` - Core package tests
- `test-integration.sh` - Integration tests
- `test-phase3.sh` - Phase 3 agent tests

### Deployment Scripts (`active/deploy/`)
- `deploy-staging.sh` - Deploy to staging environment
- `deploy-production.sh` - Deploy to production
- `deploy-check.sh` - Pre-deployment checks

### Utility Scripts (`active/utils/`)
- `install-deps.sh` - Install/update dependencies
- `check-lint.sh` - Run linting checks
- `fix-permissions.sh` - Fix script permissions
- `env-check.sh` - Validate environment setup

## Environment Requirements

- Node.js 18+
- npm 8+
- TypeScript 5+
- Jest for testing
- Docker (for deployment)

## Configuration Files

- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `jest.config.js` - Jest testing configuration
- `turbo.json` - Turborepo build configuration

## Common Issues and Solutions

### Build Failures
```bash
# Clean and rebuild
./active/build/clean-build.sh

# Fix TypeScript errors
./active/utils/check-lint.sh
```

### Test Failures
```bash
# Run diagnostics
./active/test/diagnose-tests.sh

# Fix Jest issues
./active/utils/fix-jest.sh
```

### Permission Issues
```bash
# Fix script permissions
./active/utils/fix-permissions.sh
```

## Archive Information

Scripts in the `archived/` directory are historical and may be outdated. They are organized by:
- Date archived
- Original functionality
- Reason for archival

## Migration from Root Directory

Many scripts were previously scattered in the root directory. This reorganization:
1. Consolidates all build-related scripts
2. Provides clear categorization
3. Removes outdated/duplicate scripts
4. Establishes naming conventions

## Contributing

When adding new scripts:
1. Place in appropriate `active/` subdirectory
2. Follow naming convention: `action-target.sh`
3. Add executable permissions: `chmod +x script.sh`
4. Update this README if adding new categories
5. Test thoroughly before committing

## Last Updated
- Date: June 10, 2025
- By: CodeQual Build System Reorganization
- Reason: Consolidated scattered build scripts and removed outdated files