#!/bin/bash
# Make the fallback scoring script executable

chmod +x "$0"
chmod +x /Users/alpinro/Code\ Prjects/codequal/fallback_scoring.sh

echo "Fallback scoring script is now executable!"
echo ""
echo "Run it with:"
echo "./fallback_scoring.sh"
echo ""
echo "This enhanced approach:"
echo "1. Uses OpenRouter as the provider for all models"
echo "2. Starts with anthropic/claude-3-opus as the primary model"
echo "3. Falls back to alternative models if the primary fails:"
echo "   - openai/gpt-4.1"
echo "   - anthropic/claude-3.7-sonnet"
echo "   - openai/gpt-4"
echo "4. Calculates an overall repository score from all analysis types"
echo "5. Creates a comprehensive report with scores and findings"
echo ""
echo "All results will be stored in: /Users/alpinro/Code Prjects/codequal/deepwiki_enhanced_scoring"
