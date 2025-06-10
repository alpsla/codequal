#!/bin/bash
# Test Integration - Run integration tests only
# Usage: ./test-integration.sh [test-pattern]

set -e

echo "🔗 Running integration tests..."

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../" && pwd)"
cd "$PROJECT_ROOT"

# Change to integration tests directory
cd integration-tests

# Check if test pattern is provided
TEST_PATTERN=${1:-""}

if [ -n "$TEST_PATTERN" ]; then
    echo "🎯 Running tests matching pattern: $TEST_PATTERN"
    npm test -- --testPathPattern="$TEST_PATTERN"
else
    echo "🧪 Running all integration tests..."
    npm test
fi

echo "✅ Integration tests completed!"