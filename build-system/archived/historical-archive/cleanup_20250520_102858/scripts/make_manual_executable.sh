#!/bin/bash
# Make the manual consolidation script executable

chmod +x "$0"
chmod +x /Users/alpinro/Code\ Prjects/codequal/manual_consolidation.sh

echo "Manual consolidation script is now executable!"
echo ""
echo "Run it with:"
echo "./manual_consolidation.sh"
echo ""
echo "This approach:"
echo "1. Does NOT make any new API calls"
echo "2. Uses raw response content from previous runs"
echo "3. Extracts available content directly from source files"
echo "4. Creates a comprehensive report with all valid analyses"
echo "5. Calculates an overall repository score"
echo ""
echo "All results will be stored in: /Users/alpinro/Code Prjects/codequal/deepwiki_manual_consolidation"
