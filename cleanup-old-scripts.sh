#!/bin/bash

# Remove all the outdated fix scripts
set -euo pipefail

echo "🧹 Removing outdated fix scripts..."

# Remove scripts from root directory
rm -f ultimate-fix-educational-tests.sh
rm -f final-fix-educational-tests.sh
rm -f quick-fix-educational-tests.sh
rm -f final-working-fix.sh
rm -f manual-fix-tool-test.sh
rm -f fix-all-educational-tests.sh
rm -f enable-fix-scripts.sh
rm -f make-fix-executable.sh
rm -f make-all-executable.sh
rm -f make-corrected-scripts-executable.sh

# Remove scripts from scripts directory
rm -f scripts/debug-failed-tests.sh
rm -f scripts/debug-failed-tests-enhanced.sh
rm -f scripts/debug-failed-tests-fixed.sh
rm -f scripts/debug-failed-tests-corrected.sh
rm -f scripts/debug-educational-tests.sh
rm -f scripts/fix-educational-tests.sh
rm -f scripts/fix-educational-tests-corrected.sh
rm -f scripts/setup-test-debugger.sh

# Keep the working debug scripts
echo "✅ Keeping working scripts:"
echo "  • scripts/debug-failed-tests-working.sh"
echo "  • debug-testing-package.sh"

echo ""
echo "🗑️  Removed all outdated fix scripts"
echo ""
echo "Now let's create a single, working fix script..."
