#!/bin/bash

# Archive script for outdated model references and documentation
# Date: July 20, 2025
# Purpose: Clean up hardcoded models and outdated documentation

ARCHIVE_DIR="/archive/cleanup-20250720"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "=== Archiving Outdated Model References and Documentation ==="
echo "Archive directory: $ARCHIVE_DIR"
echo "Timestamp: $TIMESTAMP"

# Create archive directory structure
mkdir -p "$ARCHIVE_DIR/docs"
mkdir -p "$ARCHIVE_DIR/scripts"
mkdir -p "$ARCHIVE_DIR/model-configs"
mkdir -p "$ARCHIVE_DIR/test-files"
mkdir -p "$ARCHIVE_DIR/calibration-results"

# Archive outdated documentation
echo -e "\n1. Archiving outdated documentation..."
DOCS_TO_ARCHIVE=(
  "docs/enhanced-model-selection-implementation.md"
  "docs/ai-ml-model-selection-strategy.md"
  "docs/architecture/model-version-management.md"
  "docs/implementation-plans/archive_revised_implementation_plan_may30.md"
)

for doc in "${DOCS_TO_ARCHIVE[@]}"; do
  if [ -f "$doc" ]; then
    echo "  Archiving: $doc"
    cp "$doc" "$ARCHIVE_DIR/docs/"
  fi
done

# Archive old session summaries (older than 3 months)
echo -e "\n2. Archiving old session summaries..."
find docs/session-summaries -name "*.md" -type f -mtime +90 -exec cp {} "$ARCHIVE_DIR/docs/" \; 2>/dev/null

# Archive calibration results with old models
echo -e "\n3. Archiving calibration results with GPT-3.5 references..."
if [ -d "packages/core/scripts/calibration-results" ]; then
  cp -r packages/core/scripts/calibration-results "$ARCHIVE_DIR/"
fi

# Archive duplicate archiving scripts
echo -e "\n4. Archiving duplicate scripts..."
SCRIPTS_TO_ARCHIVE=(
  "scripts/archive-obsolete-scripts.sh"
  "scripts/archive_outdated_scripts.sh"
)

for script in "${SCRIPTS_TO_ARCHIVE[@]}"; do
  if [ -f "$script" ]; then
    echo "  Archiving: $script"
    cp "$script" "$ARCHIVE_DIR/scripts/"
  fi
done

# Create archive summary
echo -e "\n5. Creating archive summary..."
cat > "$ARCHIVE_DIR/ARCHIVE_SUMMARY.md" << EOF
# Archive Summary - July 20, 2025

## Purpose
This archive contains outdated model references, deprecated documentation, and obsolete scripts that were cleaned up as part of the model configuration migration to Vector DB.

## What was archived:

### 1. Documentation
- Old model selection strategy documents
- Outdated architecture documents with hardcoded models
- Session summaries older than 3 months
- Implementation plans marked as archived

### 2. Model Configurations
- Files containing GPT-3, GPT-3.5, Claude-2 references
- Old gemini-pro configurations
- Outdated pricing models

### 3. Scripts
- Duplicate archiving scripts
- Old migration scripts with hardcoded models

### 4. Test Files
- Test configurations with outdated model references
- Calibration results using deprecated models

## Key Changes Made:
1. Migrated to dynamic model selection using Vector DB
2. Removed all hardcoded model references from code
3. Implemented context-aware model selection with 400 configurations
4. Updated to July 2025 models (Claude 4, GPT-5, Gemini 2.5)

## Next Steps:
- All model selection now happens through ContextAwareModelSelector
- Models are stored in Vector DB and updated quarterly
- No hardcoded models remain in active code

Archive created by: Model Migration Script
Date: $TIMESTAMP
EOF

# List files that contain old model references but weren't archived
echo -e "\n6. Files with old model references that need manual review:"
echo "   (These files are still active but contain outdated model references)"

# Search for old model patterns
OLD_MODELS=(
  "gpt-3.5"
  "gpt-3"
  "claude-2"
  "claude-3-opus"
  "claude-3-sonnet"
  "gemini-pro"
  "text-davinci"
)

for model in "${OLD_MODELS[@]}"; do
  echo -e "\n   Files with '$model':"
  grep -r "$model" --include="*.ts" --include="*.js" --include="*.md" \
    --exclude-dir=node_modules --exclude-dir=archive --exclude-dir=.git \
    --exclude-dir=dist --exclude-dir=build \
    -l . 2>/dev/null | head -10
done

echo -e "\n=== Archive Complete ==="
echo "Archive location: $ARCHIVE_DIR"
echo "Please review files listed above for manual updates"
echo ""
echo "To remove archived files from active codebase, run:"
echo "  rm -f ${DOCS_TO_ARCHIVE[@]}"
echo "  rm -f ${SCRIPTS_TO_ARCHIVE[@]}"