#!/bin/bash
# Master DeepWiki Cleanup Script
# This script organizes all DeepWiki-related files and documentation to reduce confusion

# Set directories
BASE_DIR="/Users/alpinro/Code Prjects/codequal"
SCRIPTS_DIR="$BASE_DIR/scripts"
CORE_SCRIPTS_DIR="$BASE_DIR/packages/core/scripts"
DEEPWIKI_INTEGRATION_DIR="$CORE_SCRIPTS_DIR/deepwiki_integration"
DOCS_DIR="$BASE_DIR/docs"
DEEPWIKI_DOCS_DIR="$DOCS_DIR/Deepwiki"
CONFIG_DIR="$DEEPWIKI_DOCS_DIR/configuration"
ARCH_DIR="$DOCS_DIR/architecture/Deepwiki"
ARCHIVE_DIR="$BASE_DIR/archive/deepwiki_master_cleanup_$(date +"%Y%m%d_%H%M%S")"

# Create archive directory structure
mkdir -p "$ARCHIVE_DIR/scripts"
mkdir -p "$ARCHIVE_DIR/scripts/deepwiki_api_investigation"
mkdir -p "$ARCHIVE_DIR/scripts/deepwiki_k8s_investigation"
mkdir -p "$ARCHIVE_DIR/root_scripts"
mkdir -p "$ARCHIVE_DIR/docs/configuration"
mkdir -p "$ARCHIVE_DIR/docs/architecture"
mkdir -p "$ARCHIVE_DIR/docs/deepwiki"
mkdir -p "$ARCHIVE_DIR/packages/core/scripts/deepwiki_integration"

echo "Starting comprehensive DeepWiki cleanup..."

# Function to keep only specified files and archive the rest
clean_directory() {
    local dir="$1"
    shift
    local keep=("$@")
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

# Clean up the scripts directory
echo "Cleaning up scripts directory..."

# 1. Create deepwiki directory if it doesn't exist
mkdir -p "$SCRIPTS_DIR/deepwiki"

# 2. List of DeepWiki-related scripts to be moved
DEEPWIKI_SCRIPTS=(
    "direct_deepwiki_test.sh"
    "explore_deepwiki_api.sh"
    "explore_deepwiki_k8s.sh"
    "fix_deepwiki_scripts.sh"
    "run_deepwiki_direct.sh"
    "run_deepwiki_investigation.sh"
    "test_deepwiki_cli.sh"
    "create_deepwiki_docs.sh"
)

# 3. Move DeepWiki-related scripts to deepwiki directory
for script in "${DEEPWIKI_SCRIPTS[@]}"; do
    if [ -f "$SCRIPTS_DIR/$script" ]; then
        echo "  Moving $script to scripts/deepwiki/"
        cp "$SCRIPTS_DIR/$script" "$SCRIPTS_DIR/deepwiki/"
        # Archive the original
        cp "$SCRIPTS_DIR/$script" "$ARCHIVE_DIR/scripts/"
        # Remove the original
        rm "$SCRIPTS_DIR/$script"
    fi
done

# 4. Move investigation directories to archive and copy to deepwiki
if [ -d "$SCRIPTS_DIR/deepwiki_api_investigation" ]; then
    echo "  Archiving and moving deepwiki_api_investigation/"
    cp -r "$SCRIPTS_DIR/deepwiki_api_investigation/"* "$SCRIPTS_DIR/deepwiki/"
    cp -r "$SCRIPTS_DIR/deepwiki_api_investigation" "$ARCHIVE_DIR/scripts/"
    rm -rf "$SCRIPTS_DIR/deepwiki_api_investigation"
fi

if [ -d "$SCRIPTS_DIR/deepwiki_k8s_investigation" ]; then
    echo "  Archiving and moving deepwiki_k8s_investigation/"
    cp -r "$SCRIPTS_DIR/deepwiki_k8s_investigation/"* "$SCRIPTS_DIR/deepwiki/" 2>/dev/null || true
    cp -r "$SCRIPTS_DIR/deepwiki_k8s_investigation" "$ARCHIVE_DIR/scripts/" 2>/dev/null || true
    rm -rf "$SCRIPTS_DIR/deepwiki_k8s_investigation"
fi

# 5. Clean up the core scripts integration directory
echo "Cleaning up DeepWiki integration scripts directory..."
INTEGRATION_KEEP=(
    "README.md"
    "complete_openrouter_fix.py"  # The comprehensive fix script
    "comprehensive_test.py"       # The comprehensive test script
    "deepwiki-api-keys.yaml"      # Kubernetes API key configuration
    "deepwiki_openrouter_integration.md"  # The main documentation
)

# Copy key integration scripts to scripts/deepwiki
cp "$DEEPWIKI_INTEGRATION_DIR/complete_openrouter_fix.py" "$SCRIPTS_DIR/deepwiki/" 2>/dev/null || true
cp "$DEEPWIKI_INTEGRATION_DIR/comprehensive_test.py" "$SCRIPTS_DIR/deepwiki/" 2>/dev/null || true

# Clean the integration directory
for file in "$DEEPWIKI_INTEGRATION_DIR"/*; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        keep_file=false
        
        for keep_name in "${INTEGRATION_KEEP[@]}"; do
            if [ "$filename" == "$keep_name" ]; then
                keep_file=true
                break
            fi
        done
        
        if [ "$keep_file" == false ]; then
            echo "  Archiving: $filename"
            cp "$file" "$ARCHIVE_DIR/packages/core/scripts/deepwiki_integration/"
            rm "$file"
        else
            echo "  Keeping: $filename"
        fi
    fi
done

# 6. Clean up the Deepwiki configuration directory
echo "Cleaning up DeepWiki configuration directory..."
CONFIG_KEEP=(
    "OPENROUTER-README.md"  # The main README
    "model-fallback-guide.md"  # Guide for model fallback
)
clean_directory "$CONFIG_DIR" "${CONFIG_KEEP[@]}"

# 7. Clean up the architecture directory for DeepWiki
ARCH_KEEP=(
    "template_command_updated.sh"  # The updated template command
)
clean_directory "$ARCH_DIR" "${ARCH_KEEP[@]}"

# 8. Copy template command to scripts/deepwiki
cp "$ARCH_DIR/template_command_updated.sh" "$SCRIPTS_DIR/deepwiki/" 2>/dev/null || true

# 9. Clean up the main DeepWiki directory
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

# 10. Archive unnecessary subdirectories
echo "Archiving unnecessary subdirectories..."
for dir in "$DEEPWIKI_DOCS_DIR"/*; do
    if [ -d "$dir" ] && [ "$(basename "$dir")" != "configuration" ] && [ "$(basename "$dir")" != "final" ] && [ "$(basename "$dir")" != "." ] && [ "$(basename "$dir")" != ".." ]; then
        archive_directory "$dir"
    fi
done

# 11. Create consolidated documentation directory
echo "Creating consolidated documentation directory..."
mkdir -p "$DEEPWIKI_DOCS_DIR/final"

# Copy key documentation to the final directory
cp "$DEEPWIKI_INTEGRATION_DIR/deepwiki_openrouter_integration.md" "$DEEPWIKI_DOCS_DIR/final/DeepWiki_OpenRouter_Integration.md" 2>/dev/null || true
cp "$CONFIG_DIR/OPENROUTER-README.md" "$DEEPWIKI_DOCS_DIR/final/README.md" 2>/dev/null || true
cp "$CONFIG_DIR/model-fallback-guide.md" "$DEEPWIKI_DOCS_DIR/final/Model_Fallback_Guide.md" 2>/dev/null || true

# Update index.md to point to the consolidated documentation
cat > "$DEEPWIKI_DOCS_DIR/index.md" << EOF
# DeepWiki Documentation

This is the centralized documentation for the DeepWiki integration in the CodeQual project.

## Main Documentation

- [README](./final/README.md) - Main OpenRouter integration documentation
- [Model Fallback Guide](./final/Model_Fallback_Guide.md) - Detailed guide for using model fallback
- [DeepWiki OpenRouter Integration](./final/DeepWiki_OpenRouter_Integration.md) - Comprehensive integration documentation

## Scripts

All DeepWiki scripts have been consolidated in a single directory:
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

# 12. Clean up root-level DeepWiki scripts
echo "Cleaning up root-level DeepWiki scripts..."

# List of DeepWiki-related scripts to archive
ROOT_DEEPWIKI_SCRIPTS=(
    "comprehensive_deepwiki_analysis.sh"
    "deep_analysis_claude.sh"
    "deepwiki_api_diagnostics.sh"
    "enhanced_deepwiki_test.sh"
    "explore_deepwiki_cli.sh"
    "fallback_scoring.sh"
    "focused_deepwiki_analysis.sh"
    "improved_fallback_scoring.sh"
    "manual_consolidation.sh"
    "optimal_deepwiki_analysis.sh"
    "simplified_scoring.sh"
    "specialized_deepwiki_analysis.sh"
    "cleanup_deepwiki_docs.sh"
    "cleanup_deepwiki_integration.sh"
    "cleanup_deepwiki_scripts.sh"
    "make_deepwiki_cleanup_executable.sh"
    "make_deepwiki_docs_cleanup_executable.sh"
)

for script in "${ROOT_DEEPWIKI_SCRIPTS[@]}"; do
    if [ -f "$BASE_DIR/$script" ]; then
        echo "  Archiving root script: $script"
        cp "$BASE_DIR/$script" "$ARCHIVE_DIR/root_scripts/"
        rm "$BASE_DIR/$script"
    fi
done

# 13. Create a consolidated analysis script at the root
echo "Creating consolidated repository analysis script..."
if [ -f "$SCRIPTS_DIR/analyze_repository.sh" ]; then
    cp "$SCRIPTS_DIR/analyze_repository.sh" "$BASE_DIR/deepwiki_analyze_repository.sh"
    chmod +x "$BASE_DIR/deepwiki_analyze_repository.sh"
    echo "  Created: deepwiki_analyze_repository.sh"
else
    echo "  Warning: analyze_repository.sh not found in scripts directory"
fi

# 14. Create a README in the scripts/deepwiki directory
cat > "$SCRIPTS_DIR/deepwiki/README.md" << EOF
# DeepWiki Integration Scripts

These are the consolidated scripts for the DeepWiki integration in the CodeQual project.

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

## Testing Scripts

Various scripts for testing different aspects of the DeepWiki integration:
- Testing the API
- Exploring the Kubernetes CLI
- Running direct interactions with DeepWiki

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
# DeepWiki Master Cleanup Archive

This archive contains files related to the DeepWiki integration that were archived during the master cleanup on $(date).

## What's Been Done

1. **Scripts Organization**:
   - Consolidated all DeepWiki scripts in \`/scripts/deepwiki/\`
   - Archived investigation directories after moving useful scripts
   - Created \`deepwiki_analyze_repository.sh\` at the root level

2. **Documentation Consolidation**:
   - Created a \`/docs/DeepWiki/final/\` directory for key documentation
   - Updated the index.md file to point to consolidated documentation
   - Archived unnecessary documentation subdirectories

3. **Root-Level Cleanup**:
   - Archived DeepWiki-related scripts from the root directory
   - Archived previous cleanup scripts

## What's Been Kept

The following structure is now in place:

- \`/scripts/deepwiki/\`: All DeepWiki integration scripts
- \`/docs/DeepWiki/final/\`: Consolidated documentation
- \`/deepwiki_analyze_repository.sh\`: Main analysis script at root level

## Why These Files Were Archived

This directory contains exploratory scripts, early implementations, and multiple iterations of documentation that were creating confusion. Only the final, functional versions have been kept to simplify maintenance and future development.
EOF

# Make all scripts in the deepwiki directory executable
chmod +x "$SCRIPTS_DIR/deepwiki/"*.sh 2>/dev/null || true
chmod +x "$SCRIPTS_DIR/deepwiki/"*.py 2>/dev/null || true

echo "Master cleanup complete!"
echo "Archived files can be found in: $ARCHIVE_DIR"
echo "Consolidated documentation is now available in: $DEEPWIKI_DOCS_DIR/final/"
echo "Main analysis script is now available as: $BASE_DIR/deepwiki_analyze_repository.sh"
echo "All DeepWiki scripts are now consolidated in: $SCRIPTS_DIR/deepwiki/"
