#!/bin/bash

# Make all test debugging and fixing scripts executable
chmod +x scripts/debug-failed-tests.sh
chmod +x scripts/debug-failed-tests-enhanced.sh
chmod +x scripts/debug-failed-tests-fixed.sh
chmod +x scripts/debug-educational-tests.sh
chmod +x scripts/fix-educational-tests.sh
chmod +x scripts/setup-test-debugger.sh

echo "✅ All test debugging scripts are now executable!"
echo ""
echo "Available scripts:"
echo ""
echo "🔍 Debug Scripts:"
echo "  ./scripts/debug-failed-tests.sh              # Original basic debugger"
echo "  ./scripts/debug-failed-tests-enhanced.sh     # Enhanced with more features"
echo "  ./scripts/debug-failed-tests-fixed.sh        # Fixed version for real Jest output"
echo "  ./scripts/debug-educational-tests.sh         # Specific for Educational/Reporter tests"
echo ""
echo "🔧 Fix Scripts:"
echo "  ./scripts/fix-educational-tests.sh           # Auto-fix TypeScript errors"
echo ""
echo "📚 Documentation:"
echo "  scripts/TEST_DEBUGGING_README.md             # Full documentation"
echo ""
echo "Quick start:"
echo "  ./scripts/debug-failed-tests-fixed.sh testing    # Debug testing package"
echo "  ./scripts/fix-educational-tests.sh               # Fix Educational agent tests"
