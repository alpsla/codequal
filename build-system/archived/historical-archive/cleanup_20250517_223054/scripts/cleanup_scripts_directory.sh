#!/bin/bash
# Script to clean up the root Scripts directory
# This script categorizes and archives outdated scripts from the Scripts directory

# Base directory
BASE_DIR="/Users/alpinro/Code Prjects/codequal"
cd "$BASE_DIR" || exit 1

# Timestamp for the archive
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ARCHIVE_DIR="$BASE_DIR/archive/scripts_cleanup_$TIMESTAMP"

# Create archive directories for different script categories
mkdir -p "$ARCHIVE_DIR/deepwiki_scripts"
mkdir -p "$ARCHIVE_DIR/debug_scripts"
mkdir -p "$ARCHIVE_DIR/build_scripts"
mkdir -p "$ARCHIVE_DIR/meta_scripts"
mkdir -p "$ARCHIVE_DIR/kubernetes_scripts"
mkdir -p "$ARCHIVE_DIR/database_scripts"
mkdir -p "$ARCHIVE_DIR/misc_scripts"

echo "Starting Scripts directory cleanup..."

# Core scripts to keep (these won't be moved)
KEEP_SCRIPTS=(
  "analyze_repository.sh"
  "quick_test.sh"
  "setup.sh"
  "build-packages.sh"
  "clean-install.sh"
)

# Scripts to categorize as DeepWiki-related
DEEPWIKI_SCRIPTS=(
  "create_deepwiki_docs.sh"
  "direct_deepwiki_test.sh"
  "explore_deepwiki_api.sh"
  "explore_deepwiki_k8s.sh"
  "fix_deepwiki_scripts.sh"
  "run_deepwiki_direct.sh"
  "run_deepwiki_investigation.sh"
  "test_deepwiki_cli.sh"
)

# Scripts to categorize as Kubernetes-related
KUBERNETES_SCRIPTS=(
  "kubectl_basic_test.sh"
  "kubernetes_diagnostic.sh"
  "manual_kubectl.sh"
  "simple_kubectl_check.sh"
)

# Scripts to categorize as database-related
DATABASE_SCRIPTS=(
  "build-database.sh"
  "migrate-database.sh"
  "setup-supabase.sh"
)

# Scripts to categorize as build-related
BUILD_SCRIPTS=(
  "build-packages.sh"
  "clean-build.sh"
  "fix-exports.sh"
  "fix-prompt-loader.sh"
  "fix_permissions.sh"
  "install-deps.sh"
  "typescript-fix.sh"
)

# Scripts to categorize as meta-scripts (scripts that manage other scripts)
META_SCRIPTS=(
  "archive_outdated_scripts.sh"
  "make_all_executable.sh"
  "make_direct_executable.sh"
  "make_fix_executable.sh"
  "make_make_scripts_executable.sh"
  "make_scripts_executable.sh"
  "run_archive.sh"
  "run_archive_direct.sh"
)

# Scripts to categorize as debug/troubleshooting scripts
DEBUG_SCRIPTS=(
  "check_config.py"
  "check_models.py"
  "direct_test.py"
  "explore_api.py"
  "run_troubleshooting.sh"
  "simple_test.py"
  "test_port8002.py"
  "troubleshoot_diagnostics.sh"
)

# Function to check if a script is in the keep list
is_kept_script() {
  local script="$1"
  for keep_script in "${KEEP_SCRIPTS[@]}"; do
    if [ "$script" = "$keep_script" ]; then
      return 0
    fi
  done
  return 1
}

# Function to archive a script to a specific category
archive_script() {
  local script="$1"
  local category="$2"
  
  if [ -f "$BASE_DIR/Scripts/$script" ]; then
    echo "Archiving $script to $category category..."
    cp "$BASE_DIR/Scripts/$script" "$ARCHIVE_DIR/${category}_scripts/$(basename "$script")"
  fi
}

# Archive DeepWiki-related scripts
for script in "${DEEPWIKI_SCRIPTS[@]}"; do
  archive_script "$script" "deepwiki"
done

# Archive Kubernetes-related scripts
for script in "${KUBERNETES_SCRIPTS[@]}"; do
  archive_script "$script" "kubernetes"
done

# Archive database-related scripts
for script in "${DATABASE_SCRIPTS[@]}"; do
  archive_script "$script" "database"
done

# Archive build-related scripts
for script in "${BUILD_SCRIPTS[@]}"; do
  archive_script "$script" "build"
done

# Archive meta-scripts
for script in "${META_SCRIPTS[@]}"; do
  archive_script "$script" "meta"
done

# Archive debug/troubleshooting scripts
for script in "${DEBUG_SCRIPTS[@]}"; do
  archive_script "$script" "debug"
done

# Archive the directory structures
echo "Archiving directory structures..."
if [ -d "$BASE_DIR/Scripts/deepwiki_api_investigation" ]; then
  cp -r "$BASE_DIR/Scripts/deepwiki_api_investigation" "$ARCHIVE_DIR/deepwiki_scripts/"
fi

if [ -d "$BASE_DIR/Scripts/deepwiki_k8s_investigation" ]; then
  cp -r "$BASE_DIR/Scripts/deepwiki_k8s_investigation" "$ARCHIVE_DIR/deepwiki_scripts/"
fi

if [ -d "$BASE_DIR/Scripts/deployment" ]; then
  cp -r "$BASE_DIR/Scripts/deployment" "$ARCHIVE_DIR/kubernetes_scripts/"
fi

# Archive any remaining scripts that weren't explicitly categorized
echo "Archiving miscellaneous scripts..."
find "$BASE_DIR/Scripts" -maxdepth 1 -type f -name "*.sh" -o -name "*.py" | while read script; do
  script_name=$(basename "$script")
  
  # Skip if it's a script we want to keep
  if is_kept_script "$script_name"; then
    echo "Keeping core script: $script_name"
    continue
  fi
  
  # Skip if it's already been archived in a specific category
  already_archived=false
  for category in "deepwiki" "kubernetes" "database" "build" "meta" "debug"; do
    if [ -f "$ARCHIVE_DIR/${category}_scripts/$script_name" ]; then
      already_archived=true
      break
    fi
  done
  
  if ! $already_archived; then
    echo "Archiving miscellaneous script: $script_name"
    cp "$script" "$ARCHIVE_DIR/misc_scripts/$script_name"
  fi
done

# Create a documentation file for the archived scripts
cat > "$ARCHIVE_DIR/README.md" << EOF
# Scripts Archive

This archive contains scripts that were previously in the root Scripts directory.
They have been organized into categories for easier reference.

## Categories

- **DeepWiki Scripts**: Scripts related to DeepWiki integration and testing
- **Kubernetes Scripts**: Scripts for Kubernetes operations and testing
- **Database Scripts**: Scripts for database setup and migration
- **Build Scripts**: Scripts related to building and fixing the codebase
- **Meta Scripts**: Scripts that manage other scripts (making executable, etc.)
- **Debug Scripts**: Scripts for troubleshooting and diagnostics
- **Misc Scripts**: Scripts that don't fit into the above categories

## Archive Date

This archive was created on $(date).

## Usage

These scripts are kept for reference purposes. For current functionality, please use:

- \`analyze_repository.sh\`: For comprehensive repository analysis
- \`quick_test.sh\`: For quick API testing
- \`setup.sh\`: For setting up the project
- \`build-packages.sh\`: For building packages
- \`clean-install.sh\`: For clean installation
EOF

# Update the scripts directory's README to document current scripts
cat > "$BASE_DIR/Scripts/README.md" << EOF
# CodeQual Scripts

This directory contains the core scripts for the CodeQual project.

## Core Scripts

- **analyze_repository.sh**: Comprehensive repository analysis with fallback mechanism
  - Usage: \`./Scripts/analyze_repository.sh <repository_url> [model_name]\`
  - Analyzes architecture, code quality, security, dependencies, and performance
  - Generates reports in the reports directory with timestamps

- **quick_test.sh**: Quick test for the DeepWiki OpenRouter integration
  - Usage: \`./Scripts/quick_test.sh [repository_url] [model_name]\`
  - Useful for checking if the integration is working

- **setup.sh**: Project setup script
  - Usage: \`./Scripts/setup.sh\`
  - Sets up dependencies and configurations

- **build-packages.sh**: Build all project packages
  - Usage: \`./Scripts/build-packages.sh\`
  - Builds all packages in the correct dependency order

- **clean-install.sh**: Clean installation of dependencies
  - Usage: \`./Scripts/clean-install.sh\`
  - Removes node_modules and reinstalls all dependencies

## Output Reports

Reports are generated in the \`/reports\` directory with timestamps for each run.
The latest report is always available at \`/reports/latest\`.

## Documentation

For detailed documentation on using these scripts, see the project's 
documentation in the \`/docs\` directory.
EOF

echo "Scripts directory cleanup complete!"
echo "Core scripts have been kept in the Scripts directory, with documentation added."
echo "Other scripts have been archived to: $ARCHIVE_DIR"
echo ""
echo "A README.md file has been created in the Scripts directory to document the core scripts."
echo "A README.md file has been created in the archive directory to document the archived scripts."
