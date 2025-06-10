# Scripts Archive Summary

**Archived on:** Tue Jun  3 10:46:26 EDT 2025
**Total scripts archived:**       44

## Archive Categories

### Build Scripts
- Redundant or replaced by unified build system

### Database One-off Scripts
- One-time migration and fix scripts that have been applied

### Deployment Scripts
- Complex deployment scripts replaced by simpler alternatives

### Test Scripts
- Old test runners and utilities (use npm test instead)

### Python Scripts
- Various Python test and exploration scripts

### Kubernetes Scripts
- Kubernetes-specific utilities (DeepWiki related)

### Setup Scripts
- One-time setup scripts that have been completed

### Utility Scripts
- Various utility and helper scripts

## Scripts Kept in Production

The following scripts remain in the scripts/ directory as they are still actively used:

- build-packages.sh - Core build script
- clean-build.sh - Clean rebuild utility
- install-deps.sh - Dependencies installation
- migrate-database.sh - Database migration
- setup-environment.sh - Environment configuration
- setup-git-hooks.sh - Git hooks setup
- setup-local-ci.sh - Local CI/CD setup
- setup-supabase-schema.sh - Supabase schema setup
- validate-ci-local.sh - CI validation
- run-researcher.js - Researcher functionality
- archive_outdated_scripts.sh - Archive utility
- README.md - Scripts documentation

## Restoration

To restore any archived script:
```bash
cp "archive/scripts_archive_20250603_104625/<category>/<script-name>" scripts/
```
