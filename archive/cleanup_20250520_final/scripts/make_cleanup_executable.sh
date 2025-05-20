#!/bin/bash
# Make cleanup script executable

chmod +x "$0"
chmod +x /Users/alpinro/Code\ Prjects/codequal/cleanup_deepwiki_scripts.sh

echo "Cleanup script is now executable!"
echo ""
echo "Run it with:"
echo "./cleanup_deepwiki_scripts.sh"
echo ""
echo "This will:"
echo "1. Organize the Deepwiki configuration directory"
echo "2. Archive obsolete scripts and documentation"
echo "3. Keep only the final versions of important files"
echo "4. Create a main analysis script at the root level"
echo ""
echo "The script is non-destructive - all files will be moved to an archive directory."
