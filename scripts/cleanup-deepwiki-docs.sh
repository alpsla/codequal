#!/bin/bash

# DeepWiki Documentation Cleanup Script
# This script archives outdated DeepWiki documentation and removes test files

echo "🧹 Starting DeepWiki Documentation Cleanup"
echo "========================================="

# Set base directory
BASE_DIR="/Users/alpinro/Code Prjects/codequal"
cd "$BASE_DIR"

# Create archive directory with timestamp
ARCHIVE_DIR="$BASE_DIR/docs/archive/deepwiki-legacy-$(date +%Y%m%d)"
mkdir -p "$ARCHIVE_DIR"

echo "📁 Archive directory: $ARCHIVE_DIR"

# Function to archive files
archive_file() {
    local file="$1"
    local dest_dir="$2"
    
    if [ -f "$file" ]; then
        # Create subdirectory structure in archive
        local rel_path=$(dirname "$file" | sed "s|$BASE_DIR/||")
        mkdir -p "$dest_dir/$rel_path"
        mv "$file" "$dest_dir/$rel_path/"
        echo "  ✓ Archived: $file"
    fi
}

# Archive main docs directory DeepWiki files (except the new consolidated one)
echo -e "\n📚 Archiving main documentation files..."
for file in $(find "$BASE_DIR/docs" -name "*deepwiki*.md" -o -name "*DeepWiki*.md" | grep -v "/architecture/Deepwiki/README.md"); do
    archive_file "$file" "$ARCHIVE_DIR"
done

# Archive API directory DeepWiki files
echo -e "\n📦 Archiving API documentation..."
for file in "$BASE_DIR/apps/api/"*DEEPWIKI*.md "$BASE_DIR/apps/api/docs/deepwiki-"*.md; do
    archive_file "$file" "$ARCHIVE_DIR"
done

# Archive agents package DeepWiki files
echo -e "\n🤖 Archiving agents documentation..."
for file in "$BASE_DIR/packages/agents/docs-archive/"*DEEPWIKI*.md \
           "$BASE_DIR/packages/agents/docs-archive/"*deepwiki*.md \
           "$BASE_DIR/packages/agents/src/standard/"*DEEPWIKI*.md \
           "$BASE_DIR/packages/agents/reports/"*deepwiki*.md; do
    archive_file "$file" "$ARCHIVE_DIR"
done

# Clean up test files (these can be safely deleted)
echo -e "\n🗑️  Removing test files..."
rm -f "$BASE_DIR/packages/agents/test-deepwiki-"*.ts
rm -f "$BASE_DIR/packages/agents/test-deepwiki-"*.js
echo "  ✓ Removed test files"

# Remove the duplicate fix documentation (now consolidated)
rm -f "$BASE_DIR/docs/deepwiki-api-fix-documentation.md"
rm -f "$BASE_DIR/docs/deepwiki-github-auth-fix.md"
echo "  ✓ Removed duplicate documentation"

# Archive old reports
echo -e "\n📊 Archiving old reports..."
mkdir -p "$ARCHIVE_DIR/reports"
for file in "$BASE_DIR/reports/"*deepwiki*.md; do
    if [ -f "$file" ]; then
        mv "$file" "$ARCHIVE_DIR/reports/"
        echo "  ✓ Archived report: $(basename $file)"
    fi
done

# Keep important files in place
echo -e "\n✅ Keeping important files:"
echo "  - $BASE_DIR/docs/architecture/Deepwiki/README.md (Main documentation)"
echo "  - $BASE_DIR/docs/architecture/Deepwiki/deepwiki_openrouter_integration.md"
echo "  - $BASE_DIR/docs/architecture/Deepwiki/prompts/* (Prompt templates)"
echo "  - $BASE_DIR/.claude/DO-NOT-DELETE-DEEPWIKI-STANDARD.md (Claude config)"
echo "  - $BASE_DIR/k8s/deepwiki-analyzer/* (Kubernetes configs)"

# Count files
ARCHIVED_COUNT=$(find "$ARCHIVE_DIR" -type f | wc -l)
echo -e "\n📈 Summary:"
echo "  - Files archived: $ARCHIVED_COUNT"
echo "  - Archive location: $ARCHIVE_DIR"

# Create index file in archive
echo -e "\n📝 Creating archive index..."
cat > "$ARCHIVE_DIR/INDEX.md" << EOF
# DeepWiki Legacy Documentation Archive

**Archived Date:** $(date +"%Y-%m-%d %H:%M:%S")
**Reason:** Documentation consolidation into single comprehensive file
**New Location:** /docs/architecture/Deepwiki/README.md

## Archive Contents

### Files Archived
$(find "$ARCHIVE_DIR" -type f -name "*.md" | sed "s|$ARCHIVE_DIR/|- |" | sort)

## Notes
- These files have been superseded by the consolidated documentation
- Keep for historical reference only
- Do not use for current development
EOF

echo "  ✓ Archive index created"

echo -e "\n✨ DeepWiki documentation cleanup complete!"
echo "All DeepWiki documentation is now consolidated in:"
echo "  📖 $BASE_DIR/docs/architecture/Deepwiki/README.md"
echo ""
echo "Legacy files archived to:"
echo "  📦 $ARCHIVE_DIR"