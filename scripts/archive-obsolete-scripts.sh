#!/bin/bash

# Archive obsolete scripts based on review
# Created: $(date +%Y-%m-%d)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📦 Archiving Obsolete Scripts${NC}"
echo "==============================="

# Create archive directory with timestamp
ARCHIVE_DIR="archive/scripts_archive_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$ARCHIVE_DIR"

echo -e "${BLUE}Archive directory: $ARCHIVE_DIR${NC}"

# Function to archive a file
archive_file() {
    local file=$1
    local category=$2
    
    if [ -f "scripts/$file" ]; then
        mkdir -p "$ARCHIVE_DIR/$category"
        mv "scripts/$file" "$ARCHIVE_DIR/$category/"
        echo -e "${GREEN}✓${NC} Archived: $file → $category/"
    else
        echo -e "${YELLOW}⚠${NC}  Not found: $file"
    fi
}

# Archive build scripts
echo -e "\n${BLUE}Archiving redundant build scripts...${NC}"
archive_file "build-database.sh" "build"
archive_file "clean-install.sh" "build"

# Archive one-time database/migration scripts
echo -e "\n${BLUE}Archiving one-time database scripts...${NC}"
archive_file "apply-supabase-fixes.sh" "database-oneoff"
archive_file "migrate-existing-data.sh" "database-oneoff"
archive_file "vacuum-commands.sql" "database-oneoff"
archive_file "verify-supabase-fixes.sql" "database-oneoff"

# Archive deployment scripts
echo -e "\n${BLUE}Archiving deployment scripts...${NC}"
archive_file "deploy-performance-fixes.sh" "deployment"
archive_file "deploy-rag-production.sh" "deployment"
archive_file "deploy-rag-safe.sh" "deployment"
archive_file "deploy-rag.js" "deployment"
archive_file "deploy-auth-schema.js" "deployment"

# Archive test/debug scripts
echo -e "\n${BLUE}Archiving test and debug scripts...${NC}"
archive_file "check_config.py" "deepwiki"
archive_file "check_models.py" "deepwiki"
archive_file "test-db-connection.sh" "test"
archive_file "run-security-tests.sh" "test"
archive_file "run-security-tests-simple.js" "test"
archive_file "check-current-data.sh" "test"
archive_file "check-rag-status.sh" "test"
archive_file "check-vector-tables.js" "test"
archive_file "test-rag-integration.ts" "test"
archive_file "populate-test-data.sh" "test"
archive_file "populate-test-data-fixed.sh" "test"
archive_file "regenerate-test-data.sh" "test"

# Archive Python scripts
echo -e "\n${BLUE}Archiving Python test scripts...${NC}"
archive_file "direct_test.py" "python"
archive_file "explore_api.py" "python"
archive_file "simple_test.py" "python"
archive_file "test_port8002.py" "python"
archive_file "quick_test.sh" "python"

# Archive Kubernetes/DeepWiki scripts
echo -e "\n${BLUE}Archiving Kubernetes scripts...${NC}"
archive_file "kubectl_basic_test.sh" "kubernetes"
archive_file "kubernetes_diagnostic.sh" "kubernetes"
archive_file "manual_kubectl.sh" "kubernetes"
archive_file "simple_kubectl_check.sh" "kubernetes"

# Archive setup scripts
echo -e "\n${BLUE}Archiving one-time setup scripts...${NC}"
archive_file "setup-grafana-integration.sh" "setup"
archive_file "setup-local-grafana.sh" "setup"
archive_file "setup-supabase.sh" "setup"
archive_file "setup.sh" "setup"

# Archive utility scripts
echo -e "\n${BLUE}Archiving utility scripts...${NC}"
archive_file "code-migration-helper.sh" "utility"
archive_file "execute-all-fixes.sh" "utility"
archive_file "execute-all-fixes-direct.sh" "utility"
archive_file "execute-fixes-with-env.sh" "utility"
archive_file "fix_permissions.sh" "utility"
archive_file "typescript-fix.sh" "utility"
archive_file "run_troubleshooting.sh" "utility"
archive_file "troubleshoot_diagnostics.sh" "utility"
archive_file "psql-commands.sh" "utility"

# Move documentation to docs
echo -e "\n${BLUE}Moving documentation...${NC}"
if [ -f "scripts/validate-ci-local-improvements.md" ]; then
    mkdir -p "docs/maintenance"
    mv "scripts/validate-ci-local-improvements.md" "docs/maintenance/"
    echo -e "${GREEN}✓${NC} Moved validate-ci-local-improvements.md to docs/maintenance/"
fi

# Create archive summary
cat > "$ARCHIVE_DIR/ARCHIVE_SUMMARY.md" << EOF
# Scripts Archive Summary

**Archived on:** $(date)
**Total scripts archived:** $(find "$ARCHIVE_DIR" -type f -name "*.sh" -o -name "*.py" -o -name "*.js" -o -name "*.sql" | wc -l)

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
\`\`\`bash
cp "$ARCHIVE_DIR/<category>/<script-name>" scripts/
\`\`\`
EOF

# Count results
echo -e "\n${BLUE}📊 Archive Summary:${NC}"
echo "Total files archived: $(find "$ARCHIVE_DIR" -type f | wc -l)"
echo "Archive location: $ARCHIVE_DIR"

# List remaining scripts
echo -e "\n${BLUE}📋 Scripts remaining in production:${NC}"
ls -la scripts/ | grep -E "\.(sh|js|py|sql)$" || echo "No scripts found"

echo -e "\n${GREEN}✅ Archive complete!${NC}"
echo "Archive directory: $ARCHIVE_DIR"
echo "Summary available at: $ARCHIVE_DIR/ARCHIVE_SUMMARY.md"