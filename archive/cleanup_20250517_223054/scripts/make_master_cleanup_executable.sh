#!/bin/bash
# Make the master cleanup script executable

chmod +x "$0"
chmod +x /Users/alpinro/Code\ Prjects/codequal/master_cleanup.sh

echo "Master cleanup script is now executable!"
echo ""
echo "Run it with:"
echo "./master_cleanup.sh"
echo ""
echo "This script will:"
echo "1. Run the project cleanup script to organize the overall project structure"
echo "2. Run the Scripts directory cleanup to organize the Scripts directory"
echo "3. Ensure all documentation is created and properly organized"
echo ""
echo "After running this script, your project will be clean and organized with:"
echo "- Core scripts in the Scripts directory"
echo "- A timestamped reports directory structure"
echo "- Proper documentation"
echo "- All temporary and outdated files archived"
