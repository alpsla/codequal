#!/bin/bash

echo "🔧 Quick Jest Fix"
echo "================"
echo ""

cd "/Users/alpinro/Code Prjects/codequal"

# Just run the test using node directly
echo "Running test with Node.js directly (bypassing npx)..."
echo ""

node node_modules/jest/bin/jest.js \
  integration-tests/tests/phase3-agents/minimal-test.test.ts \
  --config jest.config.integration.js \
  --verbose \
  --no-coverage

echo ""
echo "If that worked, running all Phase 3 tests..."
echo ""

if [ $? -eq 0 ]; then
    # Create a wrapper script
    cat > run-phase3-tests.sh << 'EOF'
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
EOF

    chmod +x run-phase3-tests.sh
    echo "Created run-phase3-tests.sh"
    echo "Run: ./run-phase3-tests.sh"
else
    echo "Single test failed. Check the error above."
fi
