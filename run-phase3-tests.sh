#!/bin/bash
cd "/Users/alpinro/Code Prjects/codequal"

echo "🚀 Running Phase 3 Integration Tests"
echo "==================================="
echo ""

# Function to run test
run_test() {
    local test_file=$1
    local test_name=$(basename $test_file .test.ts)
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🧪 Testing: $test_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    node node_modules/jest/bin/jest.js $test_file --verbose --no-coverage 2>&1
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        echo "✅ $test_name: PASSED"
        return 0
    else
        echo "❌ $test_name: FAILED"
        return 1
    fi
}

# Track results
passed=0
failed=0

# Run all tests
for test in integration-tests/tests/phase3-agents/*.test.ts; do
    if [[ $test != *"super-simple"* ]] && [[ $test != *"fixed-minimal"* ]]; then
        if run_test "$test"; then
            ((passed++))
        else
            ((failed++))
        fi
        echo ""
    fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Passed: $passed"
echo "❌ Failed: $failed"
echo "📁 Total:  $((passed + failed))"
