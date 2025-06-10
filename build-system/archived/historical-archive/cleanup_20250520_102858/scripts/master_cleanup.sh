#!/bin/bash
# Master cleanup script that runs both the project cleanup and Scripts directory cleanup

# Base directory
BASE_DIR="/Users/alpinro/Code Prjects/codequal"
cd "$BASE_DIR" || exit 1

# Make sure the individual cleanup scripts are executable
chmod +x "$BASE_DIR/fixed_cleanup_project.sh"
chmod +x "$BASE_DIR/cleanup_scripts_directory.sh"

echo "Starting comprehensive project cleanup..."
echo ""
echo "Step 1: Cleaning up temporary directories and organizing project structure..."
"$BASE_DIR/fixed_cleanup_project.sh"

echo ""
echo "Step 2: Cleaning up the Scripts directory..."
"$BASE_DIR/cleanup_scripts_directory.sh"

echo ""
echo "====================================================="
echo "Comprehensive project cleanup complete!"
echo "====================================================="
echo ""
echo "Project structure has been organized:"
echo "- Temporary directories have been archived"
echo "- Core scripts have been organized in the Scripts directory"
echo "- Documentation has been created"
echo "- Timestamped reports directory has been set up"
echo ""
echo "To analyze a repository, run:"
echo "./Scripts/analyze_repository.sh <repository_url> [model_name]"
echo ""
echo "To run a quick test, run:"
echo "./Scripts/quick_test.sh"
echo ""
echo "Cleanup logs and detailed information can be found in the archive directory."
