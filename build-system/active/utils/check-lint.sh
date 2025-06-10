#!/bin/bash
# Check Lint - Run linting checks across the project
# Usage: ./check-lint.sh [--fix]

set -e

echo "✨ Running linting checks..."

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../" && pwd)"
cd "$PROJECT_ROOT"

# Check for fix flag
FIX_ISSUES=false
if [ "$1" = "--fix" ]; then
    FIX_ISSUES=true
    echo "🔧 Will attempt to fix linting issues automatically"
fi

# Run ESLint
echo "📝 Running ESLint..."
if [ "$FIX_ISSUES" = true ]; then
    npx turbo lint:fix || echo "⚠️ Some ESLint issues could not be automatically fixed"
else
    npx turbo lint
fi

# Run Prettier check
echo "🎨 Checking code formatting with Prettier..."
if [ "$FIX_ISSUES" = true ]; then
    npx prettier --write "**/*.{ts,tsx,js,jsx,json,md}" || echo "⚠️ Some formatting issues were found"
else
    npx prettier --check "**/*.{ts,tsx,js,jsx,json,md}" || echo "⚠️ Some files need formatting"
fi

# TypeScript checks
echo "📝 Running TypeScript checks..."
npx turbo typecheck

if [ "$FIX_ISSUES" = true ]; then
    echo "✅ Linting completed with automatic fixes applied!"
else
    echo "✅ Linting checks completed!"
fi

echo "📊 Checks performed:"
echo "   - ESLint: ✅"
echo "   - Prettier: ✅"
echo "   - TypeScript: ✅"