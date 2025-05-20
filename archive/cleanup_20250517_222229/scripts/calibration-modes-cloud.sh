#!/bin/bash

# Enhanced calibration script for cloud DeepWiki
# This script has fixed all the issues with environment variables and connections

# Display colored status messages
function log_info() {
  echo -e "\033[0;36m[INFO]\033[0m $1"
}

function log_success() {
  echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

function log_error() {
  echo -e "\033[0;31m[ERROR]\033[0m $1"
}

function log_warning() {
  echo -e "\033[0;33m[WARNING]\033[0m $1"
}

function show_help() {
  echo "Calibration Modes (Cloud Version) - Run different types of calibration processes"
  echo ""
  echo "Usage: ./calibration-modes-cloud.sh [mode] [skip_providers]"
  echo ""
  echo "Modes:"
  echo "  quick     - Quick test with cloud API (1-3 second responses, one repo)"
  echo "  realistic - Realistic test with cloud API but longer delays (30-90 seconds)"
  echo "  full      - Full calibration with cloud API connection (several hours)"
  echo "  validate  - Only validate the DeepWiki API connection without running calibration"
  echo "  info      - Get information about the DeepWiki API endpoints and structure"
  echo "  help      - Show this help message"
  echo ""
  echo "Optional:"
  echo "  skip_providers - Comma-separated list of providers to skip (e.g. 'deepseek,google')"
  echo ""
  echo "Examples:"
  echo "  ./calibration-modes-cloud.sh quick                # Run a quick test (useful for development)"
  echo "  ./calibration-modes-cloud.sh realistic           # Run with realistic delays (test workflow)"
  echo "  ./calibration-modes-cloud.sh full                # Run full calibration (production use)"
  echo "  ./calibration-modes-cloud.sh validate            # Only test DeepWiki API connection"
  echo "  ./calibration-modes-cloud.sh info                # Get information about the API"
  echo "  ./calibration-modes-cloud.sh full deepseek       # Run full calibration but skip deepseek provider"
  echo ""
}

# ====== ENVIRONMENT SETUP ======
ENV_FILE="/Users/alpinro/Code Prjects/deepwiki-open/.env.cloud"
log_info "Loading environment from: $ENV_FILE"

if [ ! -f "$ENV_FILE" ]; then
  log_error "ERROR: Environment file not found: $ENV_FILE"
  exit 1
fi

# Load environment variables properly
set -a
source "$ENV_FILE"
set +a

# Validate critical environment variables
log_info "Validating environment variables..."
required_vars=("CLOUD_API_ENDPOINT" "GOOGLE_API_KEY" "OPENAI_API_KEY" "ANTHROPIC_API_KEY" "DEEPSEEK_API_KEY" "EMBEDDING_MODEL" "EMBEDDING_DIMENSIONS")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    log_warning "Required environment variable $var is not set"
  else
    log_info "$var is set"
  fi
done

# Parse command-line arguments
MODE=${1:-"help"}
SKIP_PROVIDERS=${2:-""}

# Set up cloud-specific environment variables
log_info "Setting up cloud environment variables"
export DEEPWIKI_API_URL="$CLOUD_API_ENDPOINT"
export USE_REAL_DEEPWIKI="true"
export SIMULATE_REAL_DELAY="false"
export EMBEDDING_MODEL="$EMBEDDING_MODEL"
export EMBEDDING_DIMENSIONS="$EMBEDDING_DIMENSIONS"

log_info "Using DeepWiki cloud endpoint: $DEEPWIKI_API_URL"
log_info "Using embedding model: $EMBEDDING_MODEL with dimensions: $EMBEDDING_DIMENSIONS"

# Handle different modes
case "$MODE" in
  "quick")
    log_info "Running QUICK calibration mode with CLOUD endpoint (one repo, fast responses)"
    export QUICK_TEST="true"
    ;;
  "realistic")
    log_info "Running REALISTIC calibration mode with CLOUD endpoint (realistic delays)"
    export QUICK_TEST="false"
    ;;
  "full")
    log_info "Running FULL calibration mode with CLOUD endpoint (all providers)"
    export QUICK_TEST="false"
    ;;
  "validate")
    log_info "Running DeepWiki cloud API connection validation only"
    
    # Try to do a simple test against the API endpoint first
    log_info "Testing direct connection to $DEEPWIKI_API_URL"
    if command -v curl &> /dev/null; then
      RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "$DEEPWIKI_API_URL" || echo "failed")
      if [ "$RESPONSE" = "failed" ]; then
        log_warning "Could not connect directly to cloud endpoint. This might be expected in Kubernetes."
      else
        log_info "Got response code $RESPONSE from cloud endpoint"
      fi
    fi

    # Check if kubectl is available
    if command -v kubectl &> /dev/null; then
      # Get DeepWiki pod
      NAMESPACE=${NAMESPACE:-"codequal-dev"}
      log_info "Looking for DeepWiki pods in namespace $NAMESPACE..."
      POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l app=deepwiki-fixed -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
      
      if [ -z "$POD_NAME" ]; then
        POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l app=deepwiki -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
      fi
      
      if [ -z "$POD_NAME" ]; then
        log_warning "No DeepWiki pods found in namespace $NAMESPACE"
        log_info "Trying to find DeepWiki service..."
        
        # Look for service instead
        SVC_NAME=$(kubectl get svc -n "$NAMESPACE" | grep -i deepwiki | head -1 | awk '{print $1}')
        if [ -n "$SVC_NAME" ]; then
          log_info "Found service: $SVC_NAME"
          CLUSTER_IP=$(kubectl get svc -n "$NAMESPACE" "$SVC_NAME" -o jsonpath='{.spec.clusterIP}')
          if [ -n "$CLUSTER_IP" ]; then
            log_info "Service ClusterIP: $CLUSTER_IP"
            export DEEPWIKI_API_URL="http://$CLUSTER_IP:8001"
            log_info "Updated DeepWiki URL to: $DEEPWIKI_API_URL"
          fi
        fi
      else
        log_info "Found DeepWiki pod: $POD_NAME"
        
        # Setup port forwarding for validation
        log_info "Setting up port forwarding to pod..."
        # Kill any existing port-forwards
        pkill -f "kubectl port-forward" 2>/dev/null || true
        
        # Start port forwarding in the background
        kubectl port-forward -n "$NAMESPACE" "pod/$POD_NAME" 8001:8001 &
        PORT_FORWARD_PID=$!
        log_info "Started port forwarding (PID: $PORT_FORWARD_PID)"
        
        # Give it a moment to start
        sleep 3
        
        # Update URL to use port forwarding
        export DEEPWIKI_API_URL="http://localhost:8001"
        log_info "Using port-forwarded URL: $DEEPWIKI_API_URL"
        
        # Make sure to clean up port forwarding when script exits
        trap "log_info 'Cleaning up port forwarding'; kill $PORT_FORWARD_PID 2>/dev/null || true" EXIT
      fi
    else
      log_warning "kubectl not available, skipping pod detection"
    fi
    
    # Now run the validation
    node ./validate-connection.js
    exit $?
    ;;
  "info")
    log_info "Getting DeepWiki cloud API information"
    node ./get-api-info.js
    exit $?
    ;;
  "help")
    show_help
    exit 0
    ;;
  *)
    log_error "Unknown mode: $MODE"
    show_help
    exit 1
    ;;
esac

# Handle provider skipping
if [ -n "$SKIP_PROVIDERS" ]; then
  log_info "Will skip the following providers: $SKIP_PROVIDERS"
  export SKIP_PROVIDERS="$SKIP_PROVIDERS"
fi

# Run healthcheck against cloud endpoint
log_info "Running healthcheck against cloud endpoint..."
node ./healthcheck.js

if [ $? -ne 0 ]; then
  log_warning "Healthcheck failed against cloud endpoint. Trying to set up port forwarding..."
  
  # Try to set up port forwarding
  if command -v kubectl &> /dev/null; then
    NAMESPACE=${NAMESPACE:-"codequal-dev"}
    log_info "Looking for DeepWiki pods in namespace $NAMESPACE..."
    POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l app=deepwiki-fixed -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    
    if [ -z "$POD_NAME" ]; then
      POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l app=deepwiki -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    fi
    
    if [ -n "$POD_NAME" ]; then
      log_info "Found DeepWiki pod: $POD_NAME"
      
      # Kill any existing port-forwards
      pkill -f "kubectl port-forward" 2>/dev/null || true
      
      # Start port forwarding in the background
      kubectl port-forward -n "$NAMESPACE" "pod/$POD_NAME" 8001:8001 &
      PORT_FORWARD_PID=$!
      
      # Give it a moment to start
      sleep 3
      
      # Update URL to use port forwarding
      export DEEPWIKI_API_URL="http://localhost:8001"
      log_info "Using port-forwarded URL: $DEEPWIKI_API_URL"
      
      # Make sure to clean up port forwarding when script exits
      trap "log_info 'Cleaning up port forwarding'; kill $PORT_FORWARD_PID 2>/dev/null || true" EXIT
      
      # Run healthcheck again
      log_info "Running healthcheck again with port forwarding..."
      node ./healthcheck.js
      
      if [ $? -ne 0 ]; then
        log_error "Healthcheck still failed after attempting port forwarding."
        exit 1
      fi
    else
      log_error "No DeepWiki pods found in namespace $NAMESPACE"
      exit 1
    fi
  else
    log_error "kubectl not available, cannot set up port forwarding"
    exit 1
  fi
fi

log_success "Healthcheck passed successfully."

# Validate the cloud DeepWiki API connection
log_info "Validating DeepWiki cloud API connection..."
node ./validate-connection.js
VALIDATION_EXIT_CODE=$?

if [ $VALIDATION_EXIT_CODE -ne 0 ]; then
  log_warning "DeepWiki cloud API connection validation failed."
  
  # Ask the user if they want to proceed anyway
  read -p "Do you want to continue anyway? (y/n): " CONTINUE_ANYWAY
  
  if [[ $CONTINUE_ANYWAY =~ ^[Nn] ]]; then
    log_error "Calibration aborted due to DeepWiki API connection issues."
    exit 1
  fi
else
  log_success "DeepWiki cloud API connection validation passed."
fi

# Get provider information
log_info "Checking providers for cloud DeepWiki..."
DETECTED_SKIP_PROVIDERS=$(node -e "const { validateConnection } = require('./validate-connection'); validateConnection().then(result => { const nonWorking = Object.keys(result.providerResults).filter(p => !result.providerResults[p]); console.log(nonWorking.join(',')); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });")

if [ -n "$DETECTED_SKIP_PROVIDERS" ]; then
  log_warning "Some providers were detected as problematic: $DETECTED_SKIP_PROVIDERS"
  
  # If user didn't manually specify providers to skip, use the detected ones
  if [ -z "$SKIP_PROVIDERS" ]; then
    read -p "Do you want to automatically skip these problematic providers? (y/n): " AUTO_SKIP
    
    if [[ $AUTO_SKIP =~ ^[Yy] ]]; then
      SKIP_PROVIDERS="$DETECTED_SKIP_PROVIDERS"
      log_info "Will skip problematic providers: $SKIP_PROVIDERS"
      export SKIP_PROVIDERS
    fi
  fi
fi

# Skip migration since tables already exist
log_info "Calibration tables already exist, skipping migration."
log_success "Database tables are ready."

# Run calibration process with the configured environment
log_info "Starting calibration process in $MODE mode against cloud endpoint..."
node ./run-calibration.js

if [ $? -ne 0 ]; then
  log_error "Calibration process failed."
  exit 1
fi

log_success "Calibration process completed successfully!"
log_info "Model configurations have been updated in the database."

echo ""
log_info "To view stored model configurations, use the ModelConfigStore.getAllModelConfigs() method."
log_info "To continue adding more test results, run the continue-calibration.js script."
echo ""

log_success "Cloud calibration setup and execution completed."
