#!/bin/bash

echo "🔍 Phase 3 Test Status Check"
echo "============================"
echo ""

cd /Users/alpinro/Code\ Prjects/codequal

# Function to run a test and report status
run_test() {
    local test_file=$1
    local test_name=$(basename $test_file .test.ts)
    
    echo -n "Testing $test_name... "
    
    # Run test silently and capture exit code
    npx jest $test_file --silent --no-coverage > /tmp/test_output_$test_name.log 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ PASSED"
    else
        echo "❌ FAILED"
        echo "  Error output:"
        grep -E "(FAIL|Error:|Expected|Received|    at )" /tmp/test_output_$test_name.log | head -20
        echo "  Full log saved to: /tmp/test_output_$test_name.log"
        echo ""
    fi
}

# List of all Phase 3 tests
tests=(
    "integration-tests/tests/phase3-agents/agent-initialization.test.ts"
    "integration-tests/tests/phase3-agents/agent-tool-results-processing.test.ts"
    "integration-tests/tests/phase3-agents/agent-execution-without-tools.test.ts"
    "integration-tests/tests/phase3-agents/agent-context-enrichment.test.ts"
    "integration-tests/tests/phase3-agents/agent-integration-vectordb.test.ts"
    "integration-tests/tests/phase3-agents/agent-integration-simplified.test.ts"
    "integration-tests/tests/phase3-agents/agent-mcp-integration.test.ts"
    "integration-tests/tests/phase3-agents/agent-multi-integration.test.ts"
    "integration-tests/tests/phase3-agents/agent-orchestrator-flow.test.ts"
    "integration-tests/tests/phase3-agents/deepwiki-context-distribution.test.ts"
    "integration-tests/tests/phase3-agents/orchestrator-deepwiki-integration.test.ts"
)

# Check which tests exist
echo "📁 Checking test files..."
for test in "${tests[@]}"; do
    if [ -f "$test" ]; then
        echo "  ✓ $(basename $test)"
    else
        echo "  ✗ $(basename $test) - NOT FOUND"
    fi
done

echo ""
echo "🧪 Running tests..."
echo ""

# Run each test
for test in "${tests[@]}"; do
    if [ -f "$test" ]; then
        run_test $test
    fi
done

echo ""
echo "📊 Test Summary Complete"
echo "Check /tmp/test_output_*.log for detailed error logs"
