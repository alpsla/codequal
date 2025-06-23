#!/bin/bash

chmod +x scripts/debug-failed-tests-working.sh
chmod +x debug-testing-package.sh
chmod +x ultimate-fix-educational-tests.sh

echo "✅ Scripts are now executable!"
echo ""
echo "To properly see test failures, use:"
echo ""
echo "1. For all packages with detailed output:"
echo "   ./scripts/debug-failed-tests-working.sh"
echo ""
echo "2. For just the testing package:"
echo "   ./debug-testing-package.sh"
echo ""
echo "3. To fix Educational Agent tests:"
echo "   ./ultimate-fix-educational-tests.sh"
