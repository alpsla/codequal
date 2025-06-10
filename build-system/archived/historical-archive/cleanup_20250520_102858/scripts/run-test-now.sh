#!/bin/bash

# Make the manual test script executable
chmod +x /Users/alpinro/Code\ Prjects/codequal/packages/core/src/deepwiki/manual-test.js
echo "Made manual-test.js executable"

# Create test results directory if it doesn't exist
mkdir -p /Users/alpinro/Code\ Prjects/codequal/packages/core/src/deepwiki/test-results
echo "Created test-results directory"

# Display current port-forwards
echo "Checking if DeepWiki API is accessible..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/health || {
  echo "Cannot access DeepWiki API at http://localhost:8001"
  echo "Make sure port forwarding is set up with:"
  echo "kubectl port-forward -n codequal-dev \$(kubectl get pods -n codequal-dev -l app=deepwiki -o jsonpath='{.items[0].metadata.name}') 8001:8001"
  echo ""
  echo "Would you like to set up port forwarding now? (y/n)"
  read -r setup_port_forward
  if [[ "$setup_port_forward" == "y" ]]; then
    kubectl_cmd="kubectl port-forward -n codequal-dev \$(kubectl get pods -n codequal-dev -l app=deepwiki -o jsonpath='{.items[0].metadata.name}') 8001:8001"
    echo "Running: $kubectl_cmd"
    eval "$kubectl_cmd" &
    port_forward_pid=$!
    sleep 3
    echo "Port forwarding started (PID: $port_forward_pid)"
    # Save PID to file for later cleanup
    echo $port_forward_pid > /tmp/deepwiki_port_forward.pid
  fi
}

# Run a sample test
echo ""
echo "Running a manual test with OpenAI GPT-4o..."
node /Users/alpinro/Code\ Prjects/codequal/packages/core/src/deepwiki/manual-test.js --repo=pallets/click --mode=chat --provider=openai --model=gpt-4o --query="What is the overall architecture of this repository?"

# Note about cleaning up
if [[ -f /tmp/deepwiki_port_forward.pid ]]; then
  echo ""
  echo "To stop port forwarding when done, run:"
  echo "kill $(cat /tmp/deepwiki_port_forward.pid)"
fi
