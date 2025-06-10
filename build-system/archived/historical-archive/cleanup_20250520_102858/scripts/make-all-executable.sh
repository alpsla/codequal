#!/bin/bash

# Make all test scripts executable

echo "Making all DeepWiki test scripts executable..."

chmod +x /Users/alpinro/Code\ Prjects/codequal/packages/core/src/deepwiki/simple-multi-test.sh
chmod +x /Users/alpinro/Code\ Prjects/codequal/packages/core/src/deepwiki/simple-openrouter-test.sh
chmod +x /Users/alpinro/Code\ Prjects/codequal/packages/core/src/deepwiki/run-full-tests.sh
chmod +x /Users/alpinro/Code\ Prjects/codequal/packages/core/src/deepwiki/analyze-results.sh

echo "All test scripts are now executable!"
echo ""
echo "Next steps:"
echo "1. Check API keys: node /Users/alpinro/Code\\ Prjects/codequal/packages/core/src/deepwiki/check-api-keys-simple.js"
echo "2. Run simple multi-test: bash /Users/alpinro/Code\\ Prjects/codequal/packages/core/src/deepwiki/simple-multi-test.sh"
echo ""
echo "Note: The scripts now support GEMINI_API_KEY as an alternative to GOOGLE_API_KEY"
