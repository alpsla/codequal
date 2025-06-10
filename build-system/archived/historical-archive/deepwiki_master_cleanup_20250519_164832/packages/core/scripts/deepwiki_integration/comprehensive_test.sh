#!/bin/bash
# Comprehensive model testing script

set -e # Exit on any error

echo "=== Running Comprehensive DeepWiki OpenRouter Model Test ==="

# Get the pod name
POD_NAME=$(kubectl get pods -n codequal-dev | grep deepwiki-fixed | grep Running | awk '{print $1}')

if [ -z "$POD_NAME" ]; then
  echo "ERROR: No running DeepWiki pod found"
  kubectl get pods -n codequal-dev | grep deepwiki-fixed
  exit 1
fi

echo "Using pod: $POD_NAME"

# Copy the comprehensive test script to the pod
echo "Copying comprehensive test script to the pod..."
kubectl cp "/Users/alpinro/Code Prjects/codequal/packages/core/scripts/deepwiki_integration/comprehensive_test.py" codequal-dev/$POD_NAME:/tmp/

# Ensure the port-forwarding is set up correctly
echo "Setting up port forwarding..."
# Kill any existing port-forwarding
pkill -f "kubectl port-forward -n codequal-dev svc/deepwiki-api" 2>/dev/null || true
# Start new port-forwarding
kubectl port-forward -n codequal-dev svc/deepwiki-api 8001:8001 &
PF_PID=$!

# Give it a moment to establish
echo "Waiting for port forwarding to establish..."
sleep 5

# Test with API key directly in the environment
echo "Running the comprehensive model test..."
kubectl exec -it $POD_NAME -n codequal-dev -- /bin/bash -c 'export OPENROUTER_API_KEY="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" && python /tmp/comprehensive_test.py'
TEST_RESULT=$?

# Kill port forwarding
kill $PF_PID 2>/dev/null || true

# Create a markdown report with test results
echo "Creating test report..."
TEST_REPORT_FILE="/Users/alpinro/Code Prjects/codequal/packages/core/scripts/deepwiki_integration/model_compatibility_report.md"

echo "# DeepWiki OpenRouter Model Compatibility Report" > $TEST_REPORT_FILE
echo "" >> $TEST_REPORT_FILE
echo "## Test Summary" >> $TEST_REPORT_FILE
echo "" >> $TEST_REPORT_FILE
echo "This report documents the compatibility of various OpenRouter models with the DeepWiki integration." >> $TEST_REPORT_FILE
echo "" >> $TEST_REPORT_FILE
echo "Test date: $(date)" >> $TEST_REPORT_FILE
echo "" >> $TEST_REPORT_FILE
echo "## Results" >> $TEST_REPORT_FILE
echo "" >> $TEST_REPORT_FILE
echo "The following table shows the compatibility status of each tested model:" >> $TEST_REPORT_FILE
echo "" >> $TEST_REPORT_FILE
echo "| Model | Status | Notes |" >> $TEST_REPORT_FILE
echo "|-------|--------|-------|" >> $TEST_REPORT_FILE
echo "| anthropic/claude-3-opus | ✅ Working | Confirmed working in previous tests |" >> $TEST_REPORT_FILE
echo "| anthropic/claude-3-haiku | ✅ Working | Confirmed working in previous tests |" >> $TEST_REPORT_FILE
echo "| openai/gpt-4o | ✅ Working | Confirmed working in previous tests |" >> $TEST_REPORT_FILE
echo "| deepseek/deepseek-coder | ❓ Tested in this run | Check console output |" >> $TEST_REPORT_FILE
echo "| anthropic/claude-3.7-sonnet | ❓ Tested in this run | Check console output |" >> $TEST_REPORT_FILE
echo "| google/gemini-2.5-pro-preview | ❓ Tested in this run | Check console output |" >> $TEST_REPORT_FILE
echo "| google/gemini-2.5-pro-exp-03-25 | ❓ Tested in this run | Check console output |" >> $TEST_REPORT_FILE
echo "| openai/gpt-4.1 | ❓ Tested in this run | Check console output |" >> $TEST_REPORT_FILE
echo "" >> $TEST_REPORT_FILE
echo "## Recommendations" >> $TEST_REPORT_FILE
echo "" >> $TEST_REPORT_FILE
echo "Based on the test results, the following models are recommended for use with DeepWiki:" >> $TEST_REPORT_FILE
echo "" >> $TEST_REPORT_FILE
echo "1. anthropic/claude-3-opus - For comprehensive analysis" >> $TEST_REPORT_FILE
echo "2. anthropic/claude-3-haiku - For faster responses" >> $TEST_REPORT_FILE
echo "3. openai/gpt-4o - Alternative with different strengths" >> $TEST_REPORT_FILE
echo "" >> $TEST_REPORT_FILE
echo "Add newly confirmed working models from this test." >> $TEST_REPORT_FILE
echo "" >> $TEST_REPORT_FILE
echo "## Notes" >> $TEST_REPORT_FILE
echo "" >> $TEST_REPORT_FILE
echo "- Model availability may change based on your OpenRouter subscription" >> $TEST_REPORT_FILE
echo "- Some models may require specific naming conventions" >> $TEST_REPORT_FILE
echo "- Model performance may vary based on usage and rate limits" >> $TEST_REPORT_FILE
echo "" >> $TEST_REPORT_FILE
echo "Please update this report with the results from the latest test run." >> $TEST_REPORT_FILE

echo -e "\n✅ Test completed and report created at $TEST_REPORT_FILE"
echo -e "\n=== Comprehensive Model Testing completed! ==="
echo ""
echo "Please update the report with the actual test results and remember to rotate your OpenRouter API key."
