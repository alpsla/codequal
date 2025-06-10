#!/bin/bash

# Calibration Modes Script
# This script provides different calibration modes:
# 1. Quick Test (Mock API, Fast Response) - For development and testing
# 2. Realistic Test (Mock API, Realistic Delays) - For testing the full workflow
# 3. Full Calibration (Real API) - For production calibration

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
  echo "Calibration Modes - Run different types of calibration processes"
  echo ""
  echo "Usage: ./calibration-modes.sh [mode] [skip_providers]"
  echo ""
  echo "Modes:"
  echo "  quick     - Quick test with mock API (1-3 second responses, one repo)"
  echo "  realistic - Realistic test with mock API but longer delays (30-90 seconds)"
  echo "  full      - Full calibration with real API connection (several hours)"
  echo "  validate  - Only validate the DeepWiki API connection without running calibration"
  echo "  info      - Get information about the DeepWiki API endpoints and structure"
  echo "  help      - Show this help message"
  echo ""
  echo "Optional:"
  echo "  skip_providers - Comma-separated list of providers to skip (e.g. 'deepseek,google')"
  echo ""
  echo "Examples:"
  echo "  ./calibration-modes.sh quick                # Run a quick test (useful for development)"
  echo "  ./calibration-modes.sh realistic           # Run with realistic delays (test workflow)"
  echo "  ./calibration-modes.sh full                # Run full calibration (production use)"
  echo "  ./calibration-modes.sh validate            # Only test DeepWiki API connection"
  echo "  ./calibration-modes.sh info                # Get information about the API"
  echo "  ./calibration-modes.sh full deepseek       # Run full calibration but skip deepseek provider"
  echo "  ./calibration-modes.sh full deepseek,google # Run full calibration but skip deepseek and google"
  echo ""
}

# Check for .env file in various potential locations
for env_file in ".env" "../../../.env" "../../../../.env" "../../../../../.env"
do
  if [ -f "$env_file" ]; then
    log_info "Found .env file at $env_file"
    source "$env_file"
    break
  fi
done

log_info "Environment variables loaded"

# Set default values for required variables if not set
if [ -z "$DEEPWIKI_API_URL" ]; then
  export DEEPWIKI_API_URL="http://deepwiki-api.codequal-dev.svc.cluster.local:8001"
  log_info "Using default DEEPWIKI_API_URL: $DEEPWIKI_API_URL"
fi

if [ -z "$DEEPSEEK_API_KEY" ]; then
  export DEEPSEEK_API_KEY="mock-key-for-testing"
  log_info "Using default DEEPSEEK_API_KEY for testing"
fi

# Parse command-line arguments
MODE=${1:-"help"}
SKIP_PROVIDERS=${2:-""}

case "$MODE" in
  "quick")
    log_info "Running QUICK calibration mode (one repo, fast responses)"
    export QUICK_TEST="true"
    # Allow USE_REAL_DEEPWIKI to be set from the environment
    export USE_REAL_DEEPWIKI="${USE_REAL_DEEPWIKI:-false}"
    export SIMULATE_REAL_DELAY="false"
    if [ "$USE_REAL_DEEPWIKI" = "true" ]; then
      log_info "Using real DeepWiki API"
    else
      log_info "Using mock DeepWiki client"
    fi
    ;;
  "realistic")
    log_info "Running REALISTIC calibration mode (realistic delays)"
    export QUICK_TEST="false"
    # Allow USE_REAL_DEEPWIKI to be set from the environment
    export USE_REAL_DEEPWIKI="${USE_REAL_DEEPWIKI:-false}"
    export SIMULATE_REAL_DELAY="true"
    if [ "$USE_REAL_DEEPWIKI" = "true" ]; then
      log_info "Using real DeepWiki API"
    else
      log_info "Using mock DeepWiki client"
    fi
    ;;
  "full")
    log_info "Running FULL calibration mode (real API, all providers)"
    export QUICK_TEST="false"
    export USE_REAL_DEEPWIKI="true"
    export SIMULATE_REAL_DELAY="false"
    log_info "Using real DeepWiki API"
    ;;
  "validate")
    log_info "Running DeepWiki API connection validation only"
    node ./validate-connection.js
    exit $?
    ;;
  "info")
    log_info "Getting DeepWiki API information"
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

# Run healthcheck
log_info "Running healthcheck..."
node ./healthcheck.js

if [ $? -ne 0 ]; then
  log_error "Healthcheck failed. Please fix the issues before continuing."
  exit 1
fi

log_success "Healthcheck passed successfully."

# If using real DeepWiki API, ensure connection is active and validate it
if [ "$USE_REAL_DEEPWIKI" = "true" ]; then
  log_info "Ensuring DeepWiki API connection is active..."
  
  # Check if ensure-deepwiki-connection.sh exists and is executable
  if [ -f "./ensure-deepwiki-connection.sh" ] && [ -x "./ensure-deepwiki-connection.sh" ]; then
    # Run the connection check script
    source ./ensure-deepwiki-connection.sh
    
    # Call the main function from the script
    main
    CONNECTION_EXIT_CODE=$?
    
    if [ $CONNECTION_EXIT_CODE -ne 0 ]; then
      log_warning "Failed to establish DeepWiki API connection."
      
      # Ask the user if they want to proceed with mock mode instead
      read -p "Do you want to continue with mock mode instead? (y/n): " CONTINUE_WITH_MOCK
      
      if [[ $CONTINUE_WITH_MOCK =~ ^[Yy] ]]; then
        log_info "Switching to mock mode."
        export USE_REAL_DEEPWIKI="false"
      else
        # Ask if they want to try direct calibration instead
        if [ -f "./run-direct-calibration.sh" ] && [ -x "./run-direct-calibration.sh" ]; then
          read -p "Do you want to use direct calibration instead? (y/n): " USE_DIRECT
          
          if [[ $USE_DIRECT =~ ^[Yy] ]]; then
            log_info "Switching to direct calibration."
            exec ./run-direct-calibration.sh $MODE
            exit $?
          else
            log_error "Calibration aborted due to DeepWiki API connection issues."
            exit 1
          fi
        else
          log_error "Calibration aborted due to DeepWiki API connection issues."
          exit 1
        fi
      fi
    else
      log_success "DeepWiki API connection is established."
    fi
  else
    log_warning "ensure-deepwiki-connection.sh not found or not executable."
    log_info "Falling back to simple validation..."
    
    # Run the validation script
    node ./validate-connection.js
    VALIDATION_EXIT_CODE=$?
    
    if [ $VALIDATION_EXIT_CODE -ne 0 ]; then
      log_warning "DeepWiki API connection validation failed."
      
      # Ask the user if they want to proceed with mock mode instead
      read -p "Do you want to continue with mock mode instead? (y/n): " CONTINUE_WITH_MOCK
      
      if [[ $CONTINUE_WITH_MOCK =~ ^[Yy] ]]; then
        log_info "Switching to mock mode."
        export USE_REAL_DEEPWIKI="false"
      else
        log_error "Calibration aborted due to DeepWiki API connection issues."
        exit 1
      fi
    else
      log_success "DeepWiki API connection validation passed."
    fi
  fi
  
  # If we're still using real DeepWiki, validate the providers
  if [ "$USE_REAL_DEEPWIKI" = "true" ]; then
    log_info "Validating DeepWiki providers..."
    
    # Validate the connection with the real DeepWiki API
    node ./validate-connection.js
    VALIDATION_EXIT_CODE=$?
    
    # Get the automatically detected problematic providers to skip
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
  fi
fi

# Skip migration since tables already exist
log_info "Calibration tables already exist, skipping migration."
log_success "Database tables are ready."

# Run calibration process with the configured environment
log_info "Starting calibration process in $MODE mode..."
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

log_success "Calibration setup and execution completed."