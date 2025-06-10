#!/bin/bash
# Make diagnostic and workaround scripts executable

chmod +x "$0"
chmod +x /Users/alpinro/Code\ Prjects/codequal/check_openrouter_key.sh
chmod +x /Users/alpinro/Code\ Prjects/codequal/test_openrouter_key.sh
chmod +x /Users/alpinro/Code\ Prjects/codequal/diagnose_security_scan.sh
chmod +x /Users/alpinro/Code\ Prjects/codequal/create_openai_workaround.sh

echo "All diagnosis and workaround scripts are now executable!"
echo ""
echo "Options for proceeding:"
echo ""
echo "1. Diagnose the OpenRouter API key issue:"
echo "   ./check_openrouter_key.sh"
echo ""
echo "2. Test if the OpenRouter API key is working:"
echo "   ./test_openrouter_key.sh"
echo ""
echo "3. Specifically diagnose the security scan issue:"
echo "   ./diagnose_security_scan.sh"
echo ""
echo "4. Create an OpenAI workaround (RECOMMENDED):"
echo "   ./create_openai_workaround.sh"
echo "   ./openai_scoring.sh"
echo ""
echo "The recommended approach is option #4, which creates a workaround"
echo "using OpenAI instead of OpenRouter to avoid the API key issue."
