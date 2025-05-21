#!/bin/bash
# Make the DeepWiki chat API exploration script executable

chmod +x "$0"
chmod +x /Users/alpinro/Code\ Prjects/codequal/scripts/deepwiki/explore_chat_api.sh

echo "DeepWiki chat API exploration script is now executable!"
echo ""
echo "Run it with:"
echo "./scripts/deepwiki/explore_chat_api.sh [repository_url] [question] [model]"
echo ""
echo "Examples:"
echo "./scripts/deepwiki/explore_chat_api.sh"
echo "./scripts/deepwiki/explore_chat_api.sh https://github.com/expressjs/express"
echo "./scripts/deepwiki/explore_chat_api.sh https://github.com/expressjs/express \"How is routing implemented?\" anthropic/claude-3-opus"
echo ""
echo "This script will:"
echo "1. Test the DeepWiki chat API with a set of predefined questions"
echo "2. Include your custom question if provided"
echo "3. Test fallback model functionality if the primary model fails"
echo "4. Generate a comprehensive report of findings"
echo ""
echo "Results will be saved to: /Users/alpinro/Code Prjects/codequal/deepwiki_chat_exploration/"
