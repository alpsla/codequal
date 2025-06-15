#!/bin/bash

cd "/Users/alpinro/Code Prjects/codequal"

echo "Running Reporter Agent Tests..."
echo "=============================="

# Store current directory
PROJECT_ROOT=$(pwd)

# Function to run test and capture output
run_test() {
    local test_file=$1
    local test_name=$2
    
    echo -e "\n🧪 Running: $test_name"
    echo "File: $test_file"
    echo "--------------------------"
    
    # Run test and capture output
    if npm test -- "$test_file" 2>&1; then
        echo "✅ PASSED: $test_name"
    else
        echo "❌ FAILED: $test_name"
    fi
}

# Run reporter agent unit tests
run_test "packages/agents/src/multi-agent/__tests__/reporter-agent-integration.test.ts" "Reporter Agent Integration Test"
run_test "packages/agents/src/multi-agent/__tests__/reporter-agent-standard.test.ts" "Reporter Agent Standard Test"

# Run educational-reporter integration test
run_test "packages/testing/src/integration/educational-agent/educational-reporter-integration.test.ts" "Educational-Reporter Integration Test"

# Run end-to-end report flow test
run_test "packages/testing/src/integration/end-to-end-report-flow.test.ts" "End-to-End Report Flow Test"

echo -e "\n=============================="
echo "Test Summary Complete!"
echo "=============================="
