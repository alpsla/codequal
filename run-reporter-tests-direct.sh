#!/bin/bash

cd "/Users/alpinro/Code Prjects/codequal"

echo "Running Reporter Agent Tests..."
echo "=============================="

# Function to run tests and show results
run_test() {
    local package_dir=$1
    local test_pattern=$2
    local test_name=$3
    
    echo -e "\n🧪 Running: $test_name"
    echo "Package: $package_dir"
    echo "Test: $test_pattern"
    echo "--------------------------"
    
    cd "$package_dir"
    
    # Run jest directly with the test file
    if npx jest "$test_pattern" --no-coverage --verbose 2>&1; then
        echo "✅ PASSED: $test_name"
    else
        echo "❌ FAILED: $test_name (see output above)"
    fi
    
    cd - > /dev/null
}

# Run tests individually
run_test "packages/agents" "src/multi-agent/__tests__/reporter-agent-standard.test.ts" "Reporter Agent Standard Test"
run_test "packages/agents" "src/multi-agent/__tests__/reporter-agent-integration.test.ts" "Reporter Agent Integration Test"
run_test "packages/testing" "src/integration/educational-agent/educational-reporter-integration.test.ts" "Educational-Reporter Integration Test"
run_test "packages/testing" "src/integration/end-to-end-report-flow.test.ts" "End-to-End Report Flow Test"

echo -e "\n=============================="
echo "All tests completed!"
echo "=============================="
