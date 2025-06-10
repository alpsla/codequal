#!/bin/bash
# Archive Outdated Scripts - Move outdated scripts to archive
# Usage: ./archive-outdated.sh

set -e

echo "📦 Archiving outdated build scripts..."

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../" && pwd)"
BUILD_SYSTEM="$PROJECT_ROOT/build-system"
ARCHIVE_DIR="$BUILD_SYSTEM/archived/2025-06-10-root-cleanup"

cd "$PROJECT_ROOT"

# Create archive directory if it doesn't exist
mkdir -p "$ARCHIVE_DIR"

# List of scripts to archive (outdated/redundant ones from root)
SCRIPTS_TO_ARCHIVE=(
    "comprehensive-jest-fix.sh"
    "debug-single-test.sh"
    "debug-test-failures.sh"
    "diagnose-tests.sh"
    "direct-jest-test.sh"
    "emergency-jest-fix.sh"
    "fix-axios-targeted.sh"
    "fix-axios.sh"
    "fix-build.sh"
    "fix-integration-setup.sh"
    "fix-jest-installation.sh"
    "fix-remaining-builds.sh"
    "quick-fix-and-test.sh"
    "quick-fix-imports.sh"
    "quick-jest-fix.sh"
    "reset-npm-complete.sh"
    "simple-fix.sh"
    "targeted-fix.sh"
    "test-and-build.sh"
    "test-basic-imports.sh"
    "test-from-integration-dir.sh"
    "test-without-jest.sh"
    "patch-axios.sh"
    "move-project.sh"
)

# Create archive manifest
cat > "$ARCHIVE_DIR/ARCHIVE_MANIFEST.md" << EOF
# Archived Scripts - June 10, 2025

This directory contains scripts that were moved from the project root during the build system reorganization.

## Reason for Archival
These scripts were either:
- Superseded by new organized build scripts
- One-time fixes that are no longer relevant
- Duplicate functionality
- Experimental or debugging scripts

## Archived Scripts
EOF

# Archive the scripts
ARCHIVED_COUNT=0
for script in "${SCRIPTS_TO_ARCHIVE[@]}"; do
    if [ -f "$script" ]; then
        echo "📁 Archiving $script..."
        mv "$script" "$ARCHIVE_DIR/"
        echo "- \`$script\` - Moved to build-system/active equivalent or obsolete" >> "$ARCHIVE_DIR/ARCHIVE_MANIFEST.md"
        ((ARCHIVED_COUNT++))
    else
        echo "⚠️ Script not found: $script"
    fi
done

# Archive large script collections from archive directory
if [ -d "archive" ]; then
    echo "📁 Moving archive directory to build-system archive..."
    mv archive "$BUILD_SYSTEM/archived/historical-archive"
fi

echo ""
echo "✅ Archival completed!"
echo "📊 Summary:"
echo "   - Scripts archived: $ARCHIVED_COUNT"
echo "   - Archive location: build-system/archived/2025-06-10-root-cleanup/"
echo "   - Historical archive moved to: build-system/archived/historical-archive/"
echo ""
echo "🧹 Root directory is now cleaner and organized!"