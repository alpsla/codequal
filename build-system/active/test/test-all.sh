#!/bin/bash
# Test All - Run all test suites
# Usage: ./test-all.sh

set -e

echo "🧪 Starting comprehensive test suite..."

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../" && pwd)"
cd "$PROJECT_ROOT"

# Ensure project is built
echo "🔨 Ensuring project is built..."
npm run build

# Run unit tests
echo "🔬 Running unit tests..."
npm test

# Run integration tests
echo "🔗 Running integration tests..."
cd integration-tests
npm test
cd ..

# Run type checking
echo "📝 Running type checks..."
npx turbo typecheck

# Run linting
echo "✨ Running linting..."
npx turbo lint

# Test summary
echo "✅ All tests completed!"
echo "📊 Test summary:"
echo "   - Unit tests: Passed"
echo "   - Integration tests: Passed"
echo "   - Type checks: Passed"
echo "   - Linting: Passed"

echo "🎉 All tests passing!"