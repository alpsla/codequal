#!/bin/bash
# Script to make all new scripts executable and offer them to run
# Created: May 15, 2025

echo "Making all troubleshooting scripts executable..."

# Make all scripts executable
chmod +x /Users/alpinro/Code\ Prjects/codequal/scripts/troubleshoot_diagnostics.sh
chmod +x /Users/alpinro/Code\ Prjects/codequal/scripts/simple_kubectl_check.sh
chmod +x /Users/alpinro/Code\ Prjects/codequal/scripts/manual_kubectl.sh
chmod +x /Users/alpinro/Code\ Prjects/codequal/scripts/direct_deepwiki_test.sh
chmod +x /Users/alpinro/Code\ Prjects/codequal/scripts/run_troubleshooting.sh

echo "All scripts are now executable."
echo ""
echo "Available troubleshooting scripts:"
echo "1. Troubleshoot Diagnostics (troubleshoot_diagnostics.sh)"
echo "2. Simple kubectl Check (simple_kubectl_check.sh)"
echo "3. Manual kubectl Configuration (manual_kubectl.sh)"
echo "4. Direct DeepWiki Container Test (direct_deepwiki_test.sh)"
echo ""
echo "To run a script, use one of these commands:"
echo "/Users/alpinro/Code\ Prjects/codequal/scripts/troubleshoot_diagnostics.sh"
echo "/Users/alpinro/Code\ Prjects/codequal/scripts/simple_kubectl_check.sh"
echo "/Users/alpinro/Code\ Prjects/codequal/scripts/manual_kubectl.sh"
echo "/Users/alpinro/Code\ Prjects/codequal/scripts/direct_deepwiki_test.sh"
echo ""
echo "I recommend starting with the simple kubectl check:"
echo "/Users/alpinro/Code\ Prjects/codequal/scripts/simple_kubectl_check.sh"
echo ""
echo "Then try the direct DeepWiki container test:"
echo "/Users/alpinro/Code\ Prjects/codequal/scripts/direct_deepwiki_test.sh"
