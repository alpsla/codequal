#!/bin/bash
# Make all validation scripts executable

chmod +x "$0"
chmod +x /Users/alpinro/Code\ Prjects/codequal/fixed_score_validation.sh
chmod +x /Users/alpinro/Code\ Prjects/codequal/quick_validation_test.sh
chmod +x /Users/alpinro/Code\ Prjects/codequal/make_validation_executable.sh

echo "All validation scripts are now executable!"
echo ""
echo "Recommended testing process:"
echo ""
echo "1. Run the quick validation test first (fastest):"
echo "   ./quick_validation_test.sh"
echo ""
echo "2. If successful, run the full validation:"
echo "   ./fixed_score_validation.sh"
echo ""
echo "All results will be stored in separate directories for comparison."
