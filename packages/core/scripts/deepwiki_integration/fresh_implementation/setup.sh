#!/bin/bash
# Setup script for DeepWiki OpenRouter integration fresh implementation

# Configuration
NAMESPACE="${1:-codequal-dev}"
POD_SELECTOR="${2:-deepwiki-fixed}"
PORT="${3:-8001}"
OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-}"

# Function to display help
function show_help() {
  echo "DeepWiki OpenRouter Integration Setup Script"
  echo ""
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  -h, --help              Show this help message"
  echo "  -n, --namespace NAME    Kubernetes namespace (default: $NAMESPACE)"
  echo "  -p, --pod-selector SEL  Pod selector (default: $POD_SELECTOR)"
  echo "  --port PORT             Port for DeepWiki API (default: $PORT)"
  echo "  --api-key KEY           OpenRouter API key (default: from env var OPENROUTER_API_KEY)"
  echo ""
  echo "Examples:"
  echo "  $0 -n codequal-dev -p deepwiki-fixed --port 8001"
  echo "  OPENROUTER_API_KEY=your-key $0"
}

# Parse arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    -h|--help) show_help; exit 0 ;;
    -n|--namespace) NAMESPACE="$2"; shift ;;
    -p|--pod-selector) POD_SELECTOR="$2"; shift ;;
    --port) PORT="$2"; shift ;;
    --api-key) OPENROUTER_API_KEY="$2"; shift ;;
    *) echo "Unknown parameter: $1"; show_help; exit 1 ;;
  esac
  shift
done

# Verify API key
if [ -z "$OPENROUTER_API_KEY" ]; then
  echo "❌ Error: OpenRouter API key not provided"
  echo "Please set the OPENROUTER_API_KEY environment variable or use --api-key parameter"
  exit 1
fi

echo "=== DeepWiki OpenRouter Integration Setup ==="
echo "Namespace: $NAMESPACE"
echo "Pod Selector: $POD_SELECTOR"
echo "Port: $PORT"
echo "API Key: ${OPENROUTER_API_KEY:0:5}...${OPENROUTER_API_KEY:(-5)}"
echo ""

# Make all scripts executable
echo "Making scripts executable..."
chmod +x simple_analysis.sh validate_integration.sh run_comprehensive_tests.sh cleanup.sh
echo "✅ Scripts are now executable"

# Check if pod exists
POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l app="$POD_SELECTOR" -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD_NAME" ]; then
  echo "❌ Error: No pod found with selector app=$POD_SELECTOR in namespace $NAMESPACE"
  exit 1
fi

echo "✅ Pod found: $POD_NAME"

# Update API key in kubernetes secret
echo "Updating OpenRouter API key in Kubernetes secret..."
kubectl create secret generic deepwiki-api-keys \
  --from-literal=OPENROUTER_API_KEY="$OPENROUTER_API_KEY" \
  --namespace "$NAMESPACE" \
  --dry-run=client -o yaml | kubectl apply -f -
echo "✅ API key updated in Kubernetes secret"

# Create output directories
echo "Creating output directories..."
mkdir -p ./results
mkdir -p ./test_results
echo "✅ Output directories created"

# Restart the pod to apply the new API key
echo "Restarting DeepWiki pod to apply new configuration..."
kubectl delete pod -n "$NAMESPACE" "$POD_NAME"
echo "Waiting for new pod to be ready..."
sleep 5
NEW_POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l app="$POD_SELECTOR" -o jsonpath='{.items[0].metadata.name}')
kubectl wait --for=condition=ready pod "$NEW_POD_NAME" -n "$NAMESPACE" --timeout=300s
echo "✅ Pod restarted and ready: $NEW_POD_NAME"

# Set up port forwarding if needed
PORT_FORWARD_PID=$(ps aux | grep "kubectl port-forward.*$PORT:$PORT" | grep -v grep | awk '{print $2}')
if [ -z "$PORT_FORWARD_PID" ]; then
  echo "Setting up port forwarding in background..."
  kubectl port-forward -n "$NAMESPACE" "pod/$NEW_POD_NAME" "$PORT:$PORT" > /dev/null 2>&1 &
  PORT_FORWARD_PID=$!
  echo "✅ Port forwarding started (PID: $PORT_FORWARD_PID)"
else
  echo "✅ Port forwarding already active (PID: $PORT_FORWARD_PID)"
fi

# Validate the setup
echo "Validating the integration..."
./validate_integration.sh "$NAMESPACE" "$POD_SELECTOR" "$PORT"

echo ""
echo "=== Setup Complete ==="
echo "Your DeepWiki OpenRouter integration is now configured and ready to use."
echo ""
echo "Next steps:"
echo "1. Run a simple analysis test:"
echo "   ./simple_analysis.sh https://github.com/pallets/click anthropic/claude-3-haiku"
echo ""
echo "2. Run comprehensive tests (if needed):"
echo "   ./run_comprehensive_tests.sh $NAMESPACE $POD_SELECTOR $PORT"
echo ""
echo "3. Clean up (if needed):"
echo "   ./cleanup.sh --full-cleanup -n $NAMESPACE -p $POD_SELECTOR"
