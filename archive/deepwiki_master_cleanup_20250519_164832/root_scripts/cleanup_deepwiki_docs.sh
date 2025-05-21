#!/bin/bash
# Enhanced DeepWiki Documentation and Integration Cleanup Script
# This script organizes the DeepWiki documentation and integration files to 
# reduce confusion and ensure only the essential files remain.

# Set directories
BASE_DIR="/Users/alpinro/Code Prjects/codequal"
CORE_SCRIPTS_DIR="$BASE_DIR/packages/core/scripts"
DEEPWIKI_INTEGRATION_DIR="$CORE_SCRIPTS_DIR/deepwiki_integration"
DOCS_DIR="$BASE_DIR/docs"
DEEPWIKI_DOCS_DIR="$DOCS_DIR/Deepwiki"
CONFIG_DIR="$DEEPWIKI_DOCS_DIR/configuration"
ARCH_DIR="$DOCS_DIR/architecture/Deepwiki"
ARCHIVE_DIR="$BASE_DIR/archive/deepwiki_archive_$(date +"%Y%m%d_%H%M%S")"

# Create archive directory structure
mkdir -p "$ARCHIVE_DIR/scripts"
mkdir -p "$ARCHIVE_DIR/docs/configuration"
mkdir -p "$ARCHIVE_DIR/docs/architecture"
mkdir -p "$ARCHIVE_DIR/docs/deepwiki"

echo "Cleaning up DeepWiki documentation and integration files..."

# Function to keep only specified files and archive the rest
clean_directory() {
    local dir="$1"
    shift
    local keep=("$@")
    local dest_subdir="$3"
    local relative_path=$(echo "$dir" | sed "s|$BASE_DIR/||")

    echo "Organizing directory: $relative_path"
    
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
                mkdir -p "$ARCHIVE_DIR/$(dirname "$relative_path")"
                cp "$file" "$ARCHIVE_DIR/$relative_path/"
                rm "$file"
            else
                echo "  Keeping: $filename"
            fi
        fi
    done
}

# Function to archive entire directory
archive_directory() {
    local dir="$1"
    local relative_path=$(echo "$dir" | sed "s|$BASE_DIR/||")
    
    echo "Archiving directory: $relative_path"
    
    # Create the directory structure in the archive
    mkdir -p "$ARCHIVE_DIR/$(dirname "$relative_path")"
    
    # Copy all files and subdirectories
    cp -r "$dir" "$ARCHIVE_DIR/$(dirname "$relative_path")/"
    
    # Remove the original directory
    rm -rf "$dir"
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
clean_directory "$DEEPWIKI_INTEGRATION_DIR" "${INTEGRATION_KEEP[@]}"

# 2. Clean up the Deepwiki configuration directory
echo "Cleaning up DeepWiki configuration directory..."
CONFIG_KEEP=(
    "OPENROUTER-README.md"  # The main README
    "model-fallback-guide.md"  # Guide for model fallback
)
clean_directory "$CONFIG_DIR" "${CONFIG_KEEP[@]}"

# 3. Clean up the architecture directory for DeepWiki
ARCH_KEEP=(
    "template_command_updated.sh"  # The updated template command
)
clean_directory "$ARCH_DIR" "${ARCH_KEEP[@]}"

# 4. Clean up the main DeepWiki directory
echo "Cleaning up main DeepWiki directory..."
MAIN_DOCS_KEEP=(
    "index.md"               # The main index file
    "reorganization-summary.md"  # The reorganization summary
)
for file in "$DEEPWIKI_DOCS_DIR"/*.md; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        keep_file=false
        
        for keep_name in "${MAIN_DOCS_KEEP[@]}"; do
            if [ "$filename" == "$keep_name" ]; then
                keep_file=true
                break
            fi
        done
        
        if [ "$keep_file" == false ]; then
            echo "  Archiving: $filename"
            cp "$file" "$ARCHIVE_DIR/docs/deepwiki/"
            rm "$file"
        else
            echo "  Keeping: $filename"
        fi
    fi
done

# 5. Archive unnecessary subdirectories
echo "Archiving unnecessary subdirectories..."
for dir in "$DEEPWIKI_DOCS_DIR"/*; do
    if [ -d "$dir" ] && [ "$(basename "$dir")" != "configuration" ] && [ "$(basename "$dir")" != "final" ] && [ "$(basename "$dir")" != "." ] && [ "$(basename "$dir")" != ".." ]; then
        archive_directory "$dir"
    fi
done

# 6. Create consolidated documentation directory
echo "Creating consolidated documentation directory..."
mkdir -p "$DEEPWIKI_DOCS_DIR/final"

# Copy key documentation to the final directory
cp "$DEEPWIKI_INTEGRATION_DIR/deepwiki_openrouter_integration.md" "$DEEPWIKI_DOCS_DIR/final/DeepWiki_OpenRouter_Integration.md"
cp "$CONFIG_DIR/OPENROUTER-README.md" "$DEEPWIKI_DOCS_DIR/final/README.md"
cp "$CONFIG_DIR/model-fallback-guide.md" "$DEEPWIKI_DOCS_DIR/final/Model_Fallback_Guide.md"

# Update index.md to point to the consolidated documentation
cat > "$DEEPWIKI_DOCS_DIR/index.md" << EOF
# DeepWiki Documentation

This is the centralized documentation for the DeepWiki integration in the CodeQual project.

## Main Documentation

- [README](./final/README.md) - Main OpenRouter integration documentation
- [Model Fallback Guide](./final/Model_Fallback_Guide.md) - Detailed guide for using model fallback
- [DeepWiki OpenRouter Integration](./final/DeepWiki_OpenRouter_Integration.md) - Comprehensive integration documentation

## Scripts

Key scripts for DeepWiki integration can be found in:
- \`/scripts/deepwiki/\` - Central location for all DeepWiki integration scripts
- \`/deepwiki_analyze_repository.sh\` - Main repository analysis script at the root level

## Configuration

DeepWiki is configured to use OpenRouter exclusively, with automatic fallback capabilities if the primary model fails. See the Model Fallback Guide for details on configuring and using this feature.

## Usage

For basic repository analysis:

\`\`\`bash
./deepwiki_analyze_repository.sh <repo_url> [primary_model]
\`\`\`

For more advanced usage with fallback model customization, see the scripts directory.
EOF

# 7. Create a consolidated script at the root directory
echo "Creating consolidated repository analysis script..."
cp "$BASE_DIR/scripts/analyze_repository.sh" "$BASE_DIR/deepwiki_analyze_repository.sh"
chmod +x "$BASE_DIR/deepwiki_analyze_repository.sh"

# 8. Update the scripts directory
echo "Updating scripts directory..."
mkdir -p "$BASE_DIR/scripts/deepwiki"
cp "$DEEPWIKI_INTEGRATION_DIR/complete_openrouter_fix.py" "$BASE_DIR/scripts/deepwiki/"
cp "$DEEPWIKI_INTEGRATION_DIR/comprehensive_test.py" "$BASE_DIR/scripts/deepwiki/"
cp "$ARCH_DIR/template_command_updated.sh" "$BASE_DIR/scripts/deepwiki/"
chmod +x "$BASE_DIR/scripts/deepwiki/"*.py
chmod +x "$BASE_DIR/scripts/deepwiki/"*.sh

# 9. Create a README in the scripts/deepwiki directory
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
# DeepWiki Documentation and Integration Archive

This archive contains files related to the DeepWiki documentation and integration that were archived during cleanup on $(date).

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
- \`index.md\`: Central navigation document

### Analysis Script
- \`deepwiki_analyze_repository.sh\`: The consolidated repository analysis script

## Why These Files Were Archived

This directory contains exploratory scripts, early implementations, and multiple iterations of documentation that were creating confusion. Only the final, functional versions have been kept to simplify maintenance and future development.
EOF

echo "Cleanup complete!"
echo "Archived files can be found in: $ARCHIVE_DIR"
echo "Consolidated documentation is now available in: $DEEPWIKI_DOCS_DIR/final/"
echo "Main analysis script is now available as: $BASE_DIR/deepwiki_analyze_repository.sh"
echo "Key scripts are now available in: $BASE_DIR/scripts/deepwiki/"
