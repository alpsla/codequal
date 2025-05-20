#!/bin/bash
# Make enhanced validation scripts executable

chmod +x "$0"
chmod +x /Users/alpinro/Code\ Prjects/codequal/enhanced_validation_test.sh
chmod +x /Users/alpinro/Code\ Prjects/codequal/enhanced_score_validation.sh

echo "Enhanced validation scripts are now executable!"
echo ""
echo "Recommended testing process:"
echo ""
echo "1. Run the enhanced quick validation test first:"
echo "   ./enhanced_validation_test.sh"
echo ""
echo "2. If successful, run the full enhanced validation:"
echo "   ./enhanced_score_validation.sh"
echo ""
echo "These scripts use an improved content extraction approach to properly handle the API responses."
