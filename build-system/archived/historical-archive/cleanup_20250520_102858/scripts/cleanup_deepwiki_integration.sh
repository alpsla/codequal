#!/bin/bash
# DeepWiki OpenRouter Integration Cleanup Script
# This script organizes the DeepWiki OpenRouter integration files and documentation
# to reduce confusion and ensure only the essential files remain.

# Set directories
BASE_DIR="/Users/alpinro/Code Prjects/codequal"
CORE_SCRIPTS_DIR="$BASE_DIR/packages/core/scripts"
DEEPWIKI_INTEGRATION_DIR="$CORE_SCRIPTS_DIR/deepwiki_integration"
DOCS_DIR="$BASE_DIR/docs"
CONFIG_DIR="$DOCS_DIR/Deepwiki/configuration"
ARCH_DIR="$DOCS_DIR/architecture/Deepwiki"
ARCHIVE_DIR="$BASE_DIR/archive/deepwiki_integration_$(date +"%Y%m%d_%H%M%S")"

# Create archive directory
mkdir -p "$ARCHIVE_DIR/scripts"
mkdir -p "$ARCHIVE_DIR/docs/configuration"
mkdir -p "$ARCHIVE_DIR/docs/architecture"

echo "Cleaning up DeepWiki OpenRouter integration files and documentation..."

# Function to keep only specified files and archive the rest
clean_directory() {
    local dir="$1"
    shift
    local keep=("$@")
    local dest_subdir="$2"

    echo "Organizing directory: $dir"
    
    # Move all files to archive except those we want to keep
    for file in "$dir"/*; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            keep_file=false
            
            for keep_name in "${keep[@]}"; do
                if [ "$filename" == "$keep_name" ]; then
                    keep_file=true
                    break
                fi
            done
            
            if [ "$keep_file" == false ]; then
                echo "  Archiving: $filename"
                cp "$file" "$ARCHIVE_DIR/$dest_subdir/"
                rm "$file"
            else
                echo "  Keeping: $filename"
            fi
        fi
    done
}

# 1. Clean up the core scripts integration directory
echo "Cleaning up DeepWiki integration scripts directory..."
INTEGRATION_KEEP=(
    "README.md"
    "complete_openrouter_fix.py"  # The comprehensive fix script
    "comprehensive_test.py"       # The comprehensive test script
    "deepwiki-api-keys.yaml"      # Kubernetes API key configuration
    "deepwiki_openrouter_integration.md"  # The main documentation
)
mkdir -p "$ARCHIVE_DIR/scripts/deepwiki_integration"
clean_directory "$DEEPWIKI_INTEGRATION_DIR" "${INTEGRATION_KEEP[@]}" "scripts/deepwiki_integration"

# 2. Clean up the Deepwiki configuration directory
echo "Cleaning up DeepWiki configuration directory..."
CONFIG_KEEP=(
    "OPENROUTER-README.md"  # The main README
    "model-fallback-guide.md"  # Guide for model fallback
)
clean_directory "$CONFIG_DIR" "${CONFIG_KEEP[@]}" "docs/configuration"

# 3. Clean up the architecture directory for DeepWiki
ARCH_KEEP=(
    "template_command_updated.sh"  # The updated template command
)
mkdir -p "$ARCHIVE_DIR/docs/architecture"
clean_directory "$ARCH_DIR" "${ARCH_KEEP[@]}" "docs/architecture"

# 4. Consolidate documentation - copy the most important documentation to a central location
echo "Consolidating documentation..."
mkdir -p "$DOCS_DIR/DeepWiki/final"
cp "$DEEPWIKI_INTEGRATION_DIR/deepwiki_openrouter_integration.md" "$DOCS_DIR/DeepWiki/final/DeepWiki_OpenRouter_Integration.md"
cp "$CONFIG_DIR/OPENROUTER-README.md" "$DOCS_DIR/DeepWiki/final/README.md"
cp "$CONFIG_DIR/model-fallback-guide.md" "$DOCS_DIR/DeepWiki/final/Model_Fallback_Guide.md"

# 5. Create a consolidated script at the root directory
echo "Creating consolidated repository analysis script..."
cp "$BASE_DIR/scripts/analyze_repository.sh" "$BASE_DIR/deepwiki_analyze_repository.sh"
chmod +x "$BASE_DIR/deepwiki_analyze_repository.sh"

# 6. Update the scripts directory
echo "Updating scripts directory..."
mkdir -p "$BASE_DIR/scripts/deepwiki"
cp "$DEEPWIKI_INTEGRATION_DIR/complete_openrouter_fix.py" "$BASE_DIR/scripts/deepwiki/"
cp "$DEEPWIKI_INTEGRATION_DIR/comprehensive_test.py" "$BASE_DIR/scripts/deepwiki/"
cp "$ARCH_DIR/template_command_updated.sh" "$BASE_DIR/scripts/deepwiki/"
chmod +x "$BASE_DIR/scripts/deepwiki/"*.py
chmod +x "$BASE_DIR/scripts/deepwiki/"*.sh

# 7. Create a README in the scripts/deepwiki directory
cat > "$BASE_DIR/scripts/deepwiki/README.md" << EOF
# DeepWiki OpenRouter Integration Scripts

These are the final, verified scripts for the DeepWiki OpenRouter integration.

## Key Scripts

1. **complete_openrouter_fix.py**: The comprehensive fix script for the OpenRouter integration
   - Applies all necessary patches to make OpenRouter work with DeepWiki
   - Supports provider-prefixed model names (e.g., anthropic/claude-3-opus)

2. **comprehensive_test.py**: A comprehensive test script for the OpenRouter integration
   - Tests multiple models across different providers
   - Provides detailed reporting on model performance

3. **template_command_updated.sh**: The updated template command with model fallback support
   - Accepts primary model and fallback models as parameters
   - Provides automatic fallback if primary model fails

## Usage

For standard repository analysis with fallback capability, use:

\`\`\`bash
# At project root
./deepwiki_analyze_repository.sh <repo_url> [primary_model]
\`\`\`

For a detailed guide on using the OpenRouter integration, see:
- /docs/DeepWiki/final/README.md
- /docs/DeepWiki/final/Model_Fallback_Guide.md
- /docs/DeepWiki/final/DeepWiki_OpenRouter_Integration.md
EOF

# Create a README file in the archive explaining what was organized
cat > "$ARCHIVE_DIR/README.md" << EOF
# DeepWiki OpenRouter Integration Archive

This archive contains files related to the DeepWiki OpenRouter integration that were archived during cleanup on $(date).

## What's Been Kept

The following files have been kept as the canonical, final versions:

### Scripts
- \`complete_openrouter_fix.py\`: The comprehensive fix script
- \`comprehensive_test.py\`: The comprehensive test script
- \`deepwiki-api-keys.yaml\`: Kubernetes API key configuration
- \`template_command_updated.sh\`: The updated template command with fallback support

### Documentation
- \`DeepWiki_OpenRouter_Integration.md\`: Comprehensive integration documentation
- \`README.md\`: Main OpenRouter README
- \`Model_Fallback_Guide.md\`: Guide for model fallback

### Analysis Script
- \`deepwiki_analyze_repository.sh\`: The consolidated repository analysis script

## Why These Files Were Archived

This directory contains exploratory scripts, early implementations, and multiple iterations of documentation that were creating confusion. Only the final, functional versions have been kept to simplify maintenance and future development.
EOF

echo "Cleanup complete!"
echo "Archived files can be found in: $ARCHIVE_DIR"
echo "Consolidated documentation is now available in: $DOCS_DIR/DeepWiki/final/"
echo "Main analysis script is now available as: $BASE_DIR/deepwiki_analyze_repository.sh"
echo "Key scripts are now available in: $BASE_DIR/scripts/deepwiki/"
