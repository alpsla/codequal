#!/bin/bash

echo "🚀 Phase 3 Integration Tests - Core Flow Testing (Skip Build)"
echo "=========================================================="
echo ""
echo "Testing: PR → Orchestrator → DeepWiki → Agents → Results"
echo ""

cd "/Users/alpinro/Code Prjects/codequal"

# Check if we have the minimum required dist files
echo "📦 Checking for built packages..."
if [ -f "packages/core/dist/index.js" ] && [ -f "packages/agents/dist/index.js" ]; then
    echo "✅ Core and Agents packages have JavaScript files"
else
    echo "❌ Missing required JavaScript files. Run build first."
    exit 1
fi
echo ""

# Function to run test and capture results
run_test() {
    local test_file=$1
    local test_name=$(basename $test_file .test.ts)
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🧪 Testing: $test_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Run test and capture output
    npx jest $test_file --verbose --no-coverage 2>&1 | tee /tmp/${test_name}.log
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        echo "✅ $test_name: PASSED"
        return 0
    else
        echo "❌ $test_name: FAILED"
        echo "   See /tmp/${test_name}.log for details"
        return 1
    fi
}

# Core tests in order of dependency
echo "🔄 Running Core Agent Tests (without Educational & Reporting)"
echo ""

# Track results
passed=0
failed=0

# Test 1: Agent initialization
if run_test "integration-tests/tests/phase3-agents/agent-initialization.test.ts"; then
    ((passed++))
else
    ((failed++))
fi
echo ""

# Test 2: DeepWiki context distribution
if run_test "integration-tests/tests/phase3-agents/deepwiki-context-distribution.test.ts"; then
    ((passed++))
else
    ((failed++))
fi
echo ""

# Test 3: Orchestrator DeepWiki integration
if run_test "integration-tests/tests/phase3-agents/orchestrator-deepwiki-integration.test.ts"; then
    ((passed++))
else
    ((failed++))
fi
echo ""

# Test 4: Agent tool results processing
if run_test "integration-tests/tests/phase3-agents/agent-tool-results-processing.test.ts"; then
    ((passed++))
else
    ((failed++))
fi
echo ""

# Test 5: Agent execution without tools
if run_test "integration-tests/tests/phase3-agents/agent-execution-without-tools.test.ts"; then
    ((passed++))
else
    ((failed++))
fi
echo ""

# Test 6: MCP integration
if run_test "integration-tests/tests/phase3-agents/agent-mcp-integration.test.ts"; then
    ((passed++))
else
    ((failed++))
fi
echo ""

# Test 7: Multi-agent integration
if run_test "integration-tests/tests/phase3-agents/agent-multi-integration.test.ts"; then
    ((passed++))
else
    ((failed++))
fi
echo ""

# Test 8: Orchestrator flow
if run_test "integration-tests/tests/phase3-agents/agent-orchestrator-flow.test.ts"; then
    ((passed++))
else
    ((failed++))
fi
echo ""

# Test 9: DeepWiki generation flow
if run_test "integration-tests/tests/phase3-agents/deepwiki-generation-flow.test.ts"; then
    ((passed++))
else
    ((failed++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Passed: $passed"
echo "❌ Failed: $failed"
echo "📁 Total:  $((passed + failed))"
echo ""

if [ $failed -eq 0 ]; then
    echo "🎉 All core flow tests passed!"
    echo ""
    echo "Next steps:"
    echo "1. Review any warnings in the logs"
    echo "2. Run with actual MCP tools when available"
    echo "3. Add Educational and Reporting agents"
else
    echo "⚠️  Some tests failed. Check the logs above."
    echo ""
    echo "Failed test logs are in /tmp/*.log"
    echo ""
    echo "Common issues to check:"
    echo "1. Missing imports or exports"
    echo "2. TypeScript type mismatches"
    echo "3. Missing mock data"
    echo "4. Supabase connection issues"
fi

echo ""
echo "💡 To run a specific test:"
echo "   npx jest integration-tests/tests/phase3-agents/[test-name].test.ts --verbose"
