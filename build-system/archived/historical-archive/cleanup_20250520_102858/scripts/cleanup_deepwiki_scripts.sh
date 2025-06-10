#!/bin/bash
# Cleanup script for DeepWiki configuration directory
# This script organizes the DeepWiki configuration directory by keeping only the 
# final versions of scripts and documentation

# Set directories
BASE_DIR="/Users/alpinro/Code Prjects/codequal"
DOCS_DIR="$BASE_DIR/docs"
CONFIG_DIR="$DOCS_DIR/Deepwiki/configuration"
ARCH_DIR="$DOCS_DIR/architecture/Deepwiki"
SCRIPTS_DIR="$BASE_DIR/scripts"
ARCHIVE_DIR="$BASE_DIR/archive/deprecated_$(date +"%Y%m%d_%H%M%S")"

# Create archive directory
mkdir -p "$ARCHIVE_DIR/configuration"
mkdir -p "$ARCHIVE_DIR/architecture"
mkdir -p "$ARCHIVE_DIR/scripts"

echo "Cleaning up DeepWiki configuration and scripts..."

# Function to keep only specified files and archive the rest
clean_directory() {
    local dir="$1"
    local keep=("${@:2}")
    local archive_subdir="$3"

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
                mv "$file" "$ARCHIVE_DIR/$archive_subdir/"
            else
                echo "  Keeping: $filename"
            fi
        fi
    done
}

# Clean configuration directory
# Keep only the final documentation files
CONFIG_KEEP=(
    "OPENROUTER-README.md"
    "model-fallback-guide.md"
    "openrouter-integration.md"
)
clean_directory "$CONFIG_DIR" "${CONFIG_KEEP[@]}" "configuration"

# Clean architecture directory
# Keep only the final documentation and template files
ARCH_KEEP=(
    "fallback_scoring_approach.md"
    "deepwiki_openrouter_integration.md"
    "template_command_updated.sh"
)
clean_directory "$ARCH_DIR" "${ARCH_KEEP[@]}" "architecture"

# Clean scripts with DeepWiki-related scripts
# Keep only the main analysis script
SCRIPTS_KEEP=(
    "analyze_repository.sh"
    "README.md"
)

# Copy the latest analyze_repository.sh to the root with a more descriptive name
cp "$SCRIPTS_DIR/analyze_repository.sh" "$BASE_DIR/deepwiki_repository_analysis.sh"
chmod +x "$BASE_DIR/deepwiki_repository_analysis.sh"

# Clean up root-level scripts related to DeepWiki
echo "Cleaning up root-level DeepWiki scripts..."

# List of script patterns to archive
ROOT_SCRIPT_PATTERNS=(
    "fallback_scoring"
    "improved_fallback"
    "make_fallback"
    "make_improved"
    "deepwiki_"
    "make_manual"
    "manual_consolidation"
    "specialized_deepwiki"
    "comprehensive_deepwiki"
    "enhanced_deepwiki"
    "focused_deepwiki"
    "optimal_deepwiki"
    "direct_api"
    "enhanced_score"
    "enhanced_validation"
    "fixed_score"
    "fixed_specialized"
    "simplified_scoring"
)

# Archive matching scripts
for pattern in "${ROOT_SCRIPT_PATTERNS[@]}"; do
    for file in "$BASE_DIR"/$pattern*.sh; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            echo "  Archiving: $filename"
            mv "$file" "$ARCHIVE_DIR/scripts/"
        fi
    done
done

# Create a README file explaining what was kept
cat > "$ARCHIVE_DIR/README.md" << EOF
# DeepWiki Scripts and Configuration Archive

This archive contains deprecated and obsolete scripts and configuration files related to the DeepWiki integration that were cleaned up on $(date).

## What's Been Kept

The following files have been kept as the canonical, final versions:

### Configuration
- \`OPENROUTER-README.md\`: Main documentation for the OpenRouter integration
- \`model-fallback-guide.md\`: Guide for using the model fallback feature
- \`openrouter-integration.md\`: Technical documentation for the OpenRouter integration

### Architecture
- \`fallback_scoring_approach.md\`: Documentation of the fallback scoring approach
- \`deepwiki_openrouter_integration.md\`: Documentation of the OpenRouter integration
- \`template_command_updated.sh\`: The updated template command with fallback support

### Scripts
- \`deepwiki_repository_analysis.sh\`: The main repository analysis script with fallback support

## Why This Was Archived

This directory contains exploratory scripts, early implementations, and multiple iterations of documentation that were creating confusion. Only the final, functional versions have been kept to simplify maintenance and future development.
EOF

echo "Cleanup complete!"
echo "Archived files can be found in: $ARCHIVE_DIR"
echo "Main analysis script is now available as: $BASE_DIR/deepwiki_repository_analysis.sh"
