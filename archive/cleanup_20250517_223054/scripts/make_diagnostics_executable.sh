#!/bin/bash
# Make API diagnostic scripts executable

chmod +x "$0"
chmod +x /Users/alpinro/Code\ Prjects/codequal/minimal_api_test.sh
chmod +x /Users/alpinro/Code\ Prjects/codequal/deepwiki_api_diagnostics.sh
chmod +x /Users/alpinro/Code\ Prjects/codequal/direct_api_test.sh

echo "API diagnostic scripts are now executable!"
echo ""
echo "Diagnostic options:"
echo ""
echo "1. Run minimal API test (simplest approach):"
echo "   ./minimal_api_test.sh"
echo ""
echo "2. Run detailed API diagnostics (captures HTTP details):"
echo "   ./deepwiki_api_diagnostics.sh"
echo ""
echo "3. Run direct API test (uses kubectl exec):"
echo "   ./direct_api_test.sh"
echo ""
echo "These scripts will help diagnose the specific JSON formatting issue."
