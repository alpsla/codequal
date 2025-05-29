#!/bin/bash

# Run all tests with proper environment setup
echo "🧪 Running Complete Test Suite for Vector Database System"
echo "========================================================="
echo ""

# Unset problematic environment variable
unset VECTOR_EMBEDDING_MODEL

# Set working directory
cd "$(dirname "$0")"

# Build if needed
echo "📦 Building database package..."
npm run build

echo ""
echo "🔧 Test Suite Execution Plan:"
echo "1. Unit Tests - UnifiedSearchService"
echo "2. Integration Tests - Real DeepWiki Reports" 
echo "3. Concurrent Request Tests"
echo "4. Memory Management Tests"
echo "5. Cross-Repository Search Tests"
echo "6. Database Failure Recovery Tests"
echo "7. Performance Scale Tests"
echo "8. Search Quality Tests"
echo ""

# Track results
PASSED=0
FAILED=0

# Function to run a test
run_test() {
    local test_name=$1
    local test_file=$2
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Running: $test_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if node $test_file; then
        echo "✅ $test_name - PASSED"
        ((PASSED++))
    else
        echo "❌ $test_name - FAILED"
        ((FAILED++))
    fi
}

# Run individual tests
run_test "1. Unit Tests - UnifiedSearchService" "comprehensive-targeted-tests.js"
run_test "2. Integration Tests - Real DeepWiki Reports" "src/services/ingestion/__tests__/test-real-deepwiki-reports.ts"
run_test "3. Concurrent Request Tests" "test-concurrent-requests.js"
run_test "4. Memory Management Tests" "--expose-gc test-memory-management.js"
run_test "5. Cross-Repository Search Tests" "test-cross-repository.js"
run_test "6. Database Failure Recovery Tests" "test-failure-recovery.js"
run_test "7. Performance Scale Tests" "test-performance-scale.js"
run_test "8. Search Quality Tests" "test-search-quality.js"

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 FINAL TEST RESULTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total Tests: $((PASSED + FAILED))"
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "Success Rate: $(( PASSED * 100 / (PASSED + FAILED) ))%"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 All tests passed! System is production ready."
    exit 0
else
    echo "⚠️  Some tests failed. Review the logs above for details."
    exit 1
fi