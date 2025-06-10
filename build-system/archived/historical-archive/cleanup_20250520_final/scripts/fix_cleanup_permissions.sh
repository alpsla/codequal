#!/bin/bash
# Fix permissions and execute master cleanup scripts

# Make scripts executable using chmod
chmod +x /Users/alpinro/Code\ Prjects/codequal/make_master_deepwiki_cleanup_executable.sh
chmod +x /Users/alpinro/Code\ Prjects/codequal/master_deepwiki_cleanup.sh

echo "Permissions fixed for cleanup scripts!"
echo ""
echo "Now you can run:"
echo "./make_master_deepwiki_cleanup_executable.sh"
echo "./master_deepwiki_cleanup.sh"
