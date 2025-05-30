# Local CI/CD Validation System

This document describes the local CI/CD validation system designed to catch issues before they reach the CI/CD pipeline.

## 🎯 Purpose

The validation system addresses the common problem where code works locally but fails in CI/CD due to:
- Different build environments (cached vs clean)
- Missing type imports masked by IDE type resolution
- ESLint caching hiding linting issues
- Different TypeScript configurations
- Incremental vs clean builds

## 🚀 Quick Start

### 1. Run Full Validation
```bash
# Complete validation (recommended before pushing)
npm run validate

# Or run directly
./scripts/validate-ci-local.sh
```

### 2. Setup Git Hooks (One-time Setup)
```bash
# Install git hooks for automatic validation
npm run setup:hooks
```

### 3. Different Validation Modes
```bash
# Strict mode (zero warnings, matches CI exactly)
npm run validate:strict

# Fast mode (skip tests, for quick checks)
npm run validate:fast

# Validate specific package only
npm run validate:package agents

# With custom options
./scripts/validate-ci-local.sh --help
```

## 📋 What Gets Validated

### 🧹 Environment Simulation
- **Clean Build Artifacts**: Removes all `dist/`, `*.tsbuildinfo`, caches
- **Fresh Dependencies**: Simulates `npm ci` like CI/CD
- **Clean ESLint Cache**: Prevents cached lint results
- **Clean Test Coverage**: Ensures fresh test runs

### 🔍 Code Quality Checks
- **TypeScript Compilation**: Strict mode without `skipLibCheck`
- **ESLint**: Configurable warning limits (default: 0 for strict mode)
- **Import Validation**: Catches missing type imports
- **Build Dependencies**: Ensures proper package build order

### 🧪 Comprehensive Testing
- **Unit Tests**: All package test suites
- **Integration Tests**: Cross-package functionality
- **Type Checking**: Validates TypeScript definitions

### 🔧 Configuration Validation
- **TypeScript Config**: Checks for CI/CD compatibility
- **Package Versions**: Validates dependency consistency
- **Git Setup**: Ensures proper git configuration

## 🛠️ Script Options

### Command Line Options
```bash
./scripts/validate-ci-local.sh [OPTIONS]

OPTIONS:
    -h, --help              Show help message
    -v, --verbose           Enable verbose output
    -w, --max-warnings NUM  Maximum ESLint warnings (default: 0)
    -s, --skip-tests        Skip running tests
    -b, --skip-build        Skip building packages
    -p, --package FILTER    Only validate packages matching FILTER
    --no-clean              Skip cleaning build artifacts
    --no-deps               Skip dependency installation
```

### Environment Variables
```bash
# Set via environment variables
MAX_WARNINGS=5 npm run validate
SKIP_TESTS=true npm run validate
PACKAGE_FILTER=agents npm run validate
VERBOSE=true npm run validate
```

### Usage Examples
```bash
# Quick validation of agents package only
./scripts/validate-ci-local.sh --package agents --skip-tests

# Allow 5 warnings, useful during development
./scripts/validate-ci-local.sh --max-warnings 5

# Verbose output for debugging
./scripts/validate-ci-local.sh --verbose

# Skip time-consuming steps
./scripts/validate-ci-local.sh --skip-tests --no-clean
```

## 🔄 Git Hooks Integration

### Automatic Setup
```bash
npm run setup:hooks
```

This creates two git hooks:

### Pre-Commit Hook
- **Trigger**: Before each commit
- **Validation Level**: Moderate (allows 5 warnings)
- **Purpose**: Catch obvious issues early
- **Bypass**: `git commit --no-verify`

### Pre-Push Hook
- **Trigger**: Before pushing to remote
- **Validation Level**: Strict (0 warnings)
- **Purpose**: Ensure CI/CD compatibility
- **Bypass**: `git push --no-verify`

### Manual Hook Management
```bash
# Check if hooks are installed
ls -la .git/hooks/

# Remove hooks
rm .git/hooks/pre-commit .git/hooks/pre-push

# Reinstall hooks
npm run setup:hooks
```

## 📊 Validation Levels

### 🟢 Development Mode
- **Command**: `npm run validate`
- **Warnings**: Allows some warnings
- **Speed**: Balanced
- **Use Case**: Regular development validation

### 🟡 Fast Mode
- **Command**: `npm run validate:fast`
- **Warnings**: Allows warnings
- **Speed**: Fast (skips tests)
- **Use Case**: Quick syntax/lint checks

### 🔴 Strict Mode
- **Command**: `npm run validate:strict`
- **Warnings**: Zero warnings allowed
- **Speed**: Complete validation
- **Use Case**: Pre-push, matches CI/CD exactly

## 🐛 Troubleshooting

### Common Issues

#### "Build artifacts not cleaned"
```bash
# Manual cleanup
find . -name "dist" -type d -not -path "./node_modules/*" -exec rm -rf {} +
find . -name "*.tsbuildinfo" -not -path "./node_modules/*" -delete
```

#### "TypeScript errors in CI but not locally"
```bash
# Run with clean build
./scripts/validate-ci-local.sh --no-cache
```

#### "ESLint passing locally but failing in CI"
```bash
# Clear ESLint cache
find . -name ".eslintcache" -delete
npm run validate:strict
```

#### "Tests passing locally but failing in CI"
```bash
# Clean test environment
rm -rf coverage jest.cache
npm run validate
```

### Performance Issues

#### Slow Validation
```bash
# Skip tests for faster feedback
npm run validate:fast

# Validate specific package
npm run validate:package core

# Skip dependency installation
./scripts/validate-ci-local.sh --no-deps
```

#### Memory Issues
```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" npm run validate
```

## 🔧 Integration with IDEs

### VS Code Integration
Add to `.vscode/tasks.json`:
```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "Validate CI Local",
            "type": "shell",
            "command": "./scripts/validate-ci-local.sh",
            "group": "build",
            "presentation": {
                "echo": true,
                "reveal": "always",
                "focus": false,
                "panel": "shared"
            },
            "problemMatcher": []
        }
    ]
}
```

### WebStorm Integration
1. Go to **Run/Debug Configurations**
2. Add **Shell Script** configuration
3. Set script path to `./scripts/validate-ci-local.sh`
4. Set working directory to project root

## 📈 Best Practices

### For Developers
1. **Run validation before committing**: `npm run validate`
2. **Use fast mode during development**: `npm run validate:fast`
3. **Run strict mode before pushing**: `npm run validate:strict`
4. **Install git hooks**: `npm run setup:hooks`

### For CI/CD Pipeline
1. **Mirror validation steps** in CI/CD configuration
2. **Use same Node.js version** as specified in `.nvmrc`
3. **Use same npm commands** as validation script
4. **Match ESLint configuration** exactly

### For Team
1. **Document any validation bypasses**
2. **Keep validation scripts updated**
3. **Review validation failures** in team meetings
4. **Share validation patterns** across projects

## 🔄 Maintenance

### Updating the Validation Script
1. **Test changes** with various scenarios
2. **Update documentation** when adding features
3. **Ensure backward compatibility**
4. **Coordinate with CI/CD updates**

### Regular Checks
```bash
# Check validation script health
./scripts/validate-ci-local.sh --verbose

# Verify git hooks are working
git commit --dry-run

# Test different validation modes
npm run validate:fast
npm run validate:strict
```

## 🤝 Contributing

When contributing to the validation system:

1. **Test thoroughly** with different project states
2. **Add appropriate error handling**
3. **Update documentation** for new features
4. **Ensure cross-platform compatibility** (macOS, Linux, Windows with WSL)
5. **Follow existing code style** in scripts

## 📞 Support

If you encounter issues with the validation system:

1. **Check troubleshooting section** above
2. **Run with verbose flag**: `--verbose`
3. **Check git hooks**: `ls -la .git/hooks/`
4. **Verify file permissions**: `ls -la scripts/`
5. **Review recent changes** to validation scripts

## 🏆 Success Metrics

The validation system is working well when:
- ✅ CI/CD builds pass consistently
- ✅ Fewer "works on my machine" issues
- ✅ Developers catch issues before pushing
- ✅ Reduced CI/CD pipeline failures
- ✅ Faster development iteration cycles