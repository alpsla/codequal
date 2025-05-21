#!/bin/bash
# Cleanup script for DeepWiki OpenRouter integration

NAMESPACE="${1:-codequal-dev}"
POD_SELECTOR="${2:-deepwiki-fixed}"

# Function to display help
function show_help() {
  echo "DeepWiki OpenRouter Integration Cleanup Script"
  echo ""
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  -h, --help              Show this help message"
  echo "  -n, --namespace NAME    Kubernetes namespace (default: $NAMESPACE)"
  echo "  -p, --pod-selector SEL  Pod selector (default: $POD_SELECTOR)"
  echo "  --reset-logs            Reset pod logs"
  echo "  --restart-pod           Restart the DeepWiki pod"
  echo "  --cleanup-files         Remove test results files"
  echo "  --full-cleanup          Perform all cleanup operations"
  echo ""
  echo "Examples:"
  echo "  $0 --reset-logs"
  echo "  $0 --full-cleanup -n custom-namespace"
}

# Parse arguments
RESET_LOGS=false
RESTART_POD=false
CLEANUP_FILES=false
FULL_CLEANUP=false

while [[ "$#" -gt 0 ]]; do
  case $1 in
    -h|--help) show_help; exit 0 ;;
    -n|--namespace) NAMESPACE="$2"; shift ;;
    -p|--pod-selector) POD_SELECTOR="$2"; shift ;;
    --reset-logs) RESET_LOGS=true ;;
    --restart-pod) RESTART_POD=true ;;
    --cleanup-files) CLEANUP_FILES=true ;;
    --full-cleanup) FULL_CLEANUP=true ;;
    *) echo "Unknown parameter: $1"; show_help; exit 1 ;;
  esac
  shift
done

# If full cleanup is requested, enable all options
if [ "$FULL_CLEANUP" = true ]; then
  RESET_LOGS=true
  RESTART_POD=true
  CLEANUP_FILES=true
fi

# Get pod name
POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l app="$POD_SELECTOR" -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD_NAME" ]; then
  echo "❌ Error: No pod found with selector app=$POD_SELECTOR in namespace $NAMESPACE"
  exit 1
fi

echo "✅ Pod found: $POD_NAME in namespace $NAMESPACE"

# Reset pod logs if requested
if [ "$RESET_LOGS" = true ]; then
  echo "Clearing pod logs..."
  kubectl logs -n "$NAMESPACE" "$POD_NAME" > /dev/null
  echo "✅ Pod logs cleared"
fi

# Restart pod if requested
if [ "$RESTART_POD" = true ]; then
  echo "Restarting pod..."
  kubectl delete pod -n "$NAMESPACE" "$POD_NAME"
  echo "Waiting for new pod to be ready..."
  sleep 5
  NEW_POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l app="$POD_SELECTOR" -o jsonpath='{.items[0].metadata.name}')
  kubectl wait --for=condition=ready pod "$NEW_POD_NAME" -n "$NAMESPACE" --timeout=300s
  echo "✅ Pod restarted: $NEW_POD_NAME"
fi

# Cleanup files if requested
if [ "$CLEANUP_FILES" = true ]; then
  echo "Cleaning up test result files..."
  if [ -d "./test_results" ]; then
    rm -rf ./test_results
    mkdir -p ./test_results
    echo "✅ Test results directory cleaned"
  else
    echo "ℹ️ No test results directory found"
  fi
  
  if [ -d "./results" ]; then
    rm -rf ./results
    mkdir -p ./results
    echo "✅ Results directory cleaned"
  else
    echo "ℹ️ No results directory found"
  fi
fi

echo "Cleanup completed successfully!"
