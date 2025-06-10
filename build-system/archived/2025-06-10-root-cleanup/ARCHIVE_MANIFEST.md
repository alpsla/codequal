# Archived Scripts - June 10, 2025

This directory contains scripts that were moved from the project root during the build system reorganization.

## Reason for Archival
These scripts were either:
- Superseded by new organized build scripts
- One-time fixes that are no longer relevant  
- Duplicate functionality
- Experimental or debugging scripts

## Archived Scripts

### Jest/Testing Fixes (Now superseded by build-system/active/test/)
- `comprehensive-jest-fix.sh` - Emergency Jest fix, replaced by organized test scripts
- `debug-single-test.sh` - Debug script, functionality in test-integration.sh
- `debug-test-failures.sh` - Debug script, functionality in test-all.sh  
- `diagnose-tests.sh` - Test diagnostics, replaced by organized test scripts
- `direct-jest-test.sh` - Direct Jest execution, replaced by test-core.sh
- `emergency-jest-fix.sh` - Emergency fix, no longer needed

### Build Fixes (Now superseded by build-system/active/build/)
- `fix-axios-targeted.sh` - Axios-specific fix, no longer needed
- `fix-axios.sh` - Axios fix, resolved
- `fix-build.sh` - General build fix, replaced by build-all.sh
- `fix-integration-setup.sh` - Integration setup fix, replaced by install-deps.sh
- `fix-jest-installation.sh` - Jest install fix, replaced by install-deps.sh
- `fix-remaining-builds.sh` - Build fix, replaced by clean-build.sh

### Quick Fixes (One-time solutions)
- `quick-fix-and-test.sh` - Quick fix, no longer needed
- `quick-fix-imports.sh` - Import fix, resolved
- `quick-jest-fix.sh` - Jest quick fix, no longer needed

### Utility/Cleanup Scripts (Obsolete)
- `reset-npm-complete.sh` - NPM reset, functionality in clean-build.sh
- `simple-fix.sh` - Simple fix, resolved
- `targeted-fix.sh` - Targeted fix, resolved
- `patch-axios.sh` - Axios patch, no longer needed
- `move-project.sh` - Project move script, one-time use

### Test Scripts (Now superseded by build-system/active/test/)
- `test-and-build.sh` - Combined test/build, replaced by separate scripts
- `test-basic-imports.sh` - Import test, functionality in test-core.sh
- `test-from-integration-dir.sh` - Integration test, replaced by test-integration.sh
- `test-without-jest.sh` - Alternative test method, no longer needed

## Migration Path
If you need functionality from these scripts:
1. Check `build-system/active/` for modern equivalents
2. Use `build-system/active/build/build-all.sh` for complete builds
3. Use `build-system/active/test/test-all.sh` for comprehensive testing
4. Use `build-system/active/utils/` for maintenance tasks

## Last Updated
- Date: June 10, 2025
- Reason: Build system reorganization and cleanup