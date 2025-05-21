#!/bin/bash
# Fix permissions on the DeepWiki analysis scripts

# Make the main analysis script executable
chmod +x "/Users/alpinro/Code Prjects/codequal/packages/testing/scripts/run_deepwiki_analysis.sh"
echo "Set executable permission on run_deepwiki_analysis.sh"

# Make the analysis results script executable
chmod +x "/Users/alpinro/Code Prjects/codequal/packages/testing/scripts/analyze_results.sh"
echo "Set executable permission on analyze_results.sh"

echo ""
echo "====================================================================="
echo "Scripts are now executable. You can run them with:"
echo ""
echo "cd \"/Users/alpinro/Code Prjects/codequal/packages/testing/scripts\""
echo "./run_deepwiki_analysis.sh"
echo ""
echo "Or from your current directory with the full path:"
echo "\"/Users/alpinro/Code Prjects/codequal/packages/testing/scripts/run_deepwiki_analysis.sh\""
echo "====================================================================="
