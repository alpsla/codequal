#!/bin/bash
# Make the Scripts directory cleanup script executable

chmod +x "$0"
chmod +x /Users/alpinro/Code\ Prjects/codequal/cleanup_scripts_directory.sh

echo "Scripts directory cleanup script is now executable!"
echo ""
echo "Run it with:"
echo "./cleanup_scripts_directory.sh"
echo ""
echo "This script will:"
echo "1. Archive most of the scripts from the Scripts directory to categorized folders"
echo "2. Keep only the core essential scripts for your workflow"
echo "3. Add documentation for both the kept scripts and the archived scripts"
echo "4. Create a proper README.md for the Scripts directory"
echo ""
echo "The following core scripts will be kept in the Scripts directory:"
echo "- analyze_repository.sh: Comprehensive repository analysis"
echo "- quick_test.sh: Quick testing of the DeepWiki OpenRouter integration"
echo "- setup.sh: Project setup"
echo "- build-packages.sh: Building packages"
echo "- clean-install.sh: Clean installation of dependencies"
echo ""
echo "All other scripts will be archived for reference."
