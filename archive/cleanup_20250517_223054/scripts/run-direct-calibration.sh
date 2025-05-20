#!/bin/bash

# Direct Calibration Runner
# This script streamlines the process of running the enhanced calibration system
# with direct provider access and analyzing the results with different scoring formulas.

set -e  # Exit on any error

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

# Default values
MODE="normal"
SKIP=""
ANALYSIS=false
VARIANTS=false

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    -q|--quick) MODE="quick"; shift ;;
    -f|--full) MODE="full"; shift ;;
    -s|--skip) SKIP="$2"; shift; shift ;;
    -a|--analyze) ANALYSIS=true; shift ;;
    -v|--variants) VARIANTS=true; shift ;;
    -h|--help) HELP=true; shift ;;
    *) echo "Unknown parameter: $1"; exit 1 ;;
  esac
done

# Show help and exit
if [[ "$HELP" == true ]]; then
  echo "Direct Calibration Runner"
  echo "========================="
  echo ""
  echo "This script runs the enhanced calibration system with direct provider access."
  echo ""
  echo "Usage: ./run-direct-calibration.sh [options]"
  echo ""
  echo "Options:"
  echo "  -q, --quick           Run in quick mode (one repo, one provider)"
  echo "  -f, --full            Run in full mode (all repos, all providers)"
  echo "  -s, --skip <list>     Skip providers (comma-separated: openai,anthropic,google,deepseek)"
  echo "  -a, --analyze         Run analysis after calibration"
  echo "  -v, --variants        Run variant analysis (different scoring weights)"
  echo "  -h, --help            Show this help"
  echo ""
  echo "Examples:"
  echo "  ./run-direct-calibration.sh --quick                  # Run quick test"
  echo "  ./run-direct-calibration.sh --full --analyze         # Run full calibration and analyze"
  echo "  ./run-direct-calibration.sh --skip deepseek,google   # Skip specific providers"
  echo "  ./run-direct-calibration.sh --variants               # Analyze with different weights"
  exit 0
fi

# Check if DeepWiki connection script exists
if [[ -f "./ensure-deepwiki-connection.sh" ]] && [[ -x "./ensure-deepwiki-connection.sh" ]]; then
  log_info "Checking DeepWiki status for comparison purposes..."
  source "./ensure-deepwiki-connection.sh"
  main > /dev/null 2>&1
  DEEPWIKI_STATUS=$?
  
  if [[ $DEEPWIKI_STATUS -eq 0 ]]; then
    log_info "DeepWiki connection is available. Note that direct calibration will still be used, but you could use DeepWiki calibration if preferred."
    
    # Ask if the user wants to switch to DeepWiki calibration instead
    read -p "Would you like to use DeepWiki calibration instead of direct calibration? (y/n): " USE_DEEPWIKI
    
    if [[ $USE_DEEPWIKI =~ ^[Yy]$ ]]; then
      log_info "Switching to DeepWiki calibration."
      
      # If calibration-modes.sh exists and is executable, use it
      if [[ -f "./calibration-modes.sh" ]] && [[ -x "./calibration-modes.sh" ]]; then
        DEEPWIKI_MODE=""
        case $MODE in
          "quick") DEEPWIKI_MODE="quick" ;;
          "full") DEEPWIKI_MODE="full" ;;
          *) DEEPWIKI_MODE="realistic" ;;
        esac
        
        # Execute calibration-modes.sh with the appropriate mode and skip providers
        exec ./calibration-modes.sh $DEEPWIKI_MODE $SKIP
        exit $?
      else
        log_error "Cannot find calibration-modes.sh script. Continuing with direct calibration."
      fi
    else
      log_info "Continuing with direct calibration as requested."
    fi
  else
    log_info "DeepWiki connection is not available. Using direct calibration."
  fi
fi

# Configure environment based on mode
if [[ "$MODE" == "quick" ]]; then
  QUICK_ARG="--quick"
  log_info "Running in QUICK mode (1 repo, faster testing)"
elif [[ "$MODE" == "full" ]]; then
  QUICK_ARG=""
  log_info "Running in FULL mode (all repos, all providers)"
else
  QUICK_ARG=""
  log_info "Running in NORMAL mode (2 repos, all providers)"
fi

# Configure provider skipping
if [[ ! -z "$SKIP" ]]; then
  export SKIP_PROVIDERS="$SKIP"
  log_info "Skipping providers: $SKIP"
fi

# Check if API keys are available for all providers
log_info "Checking for required API keys..."

# Check OpenAI API key
if [[ -z "$OPENAI_API_KEY" ]]; then
  log_warning "OPENAI_API_KEY is not set. OpenAI provider will be skipped."
  
  # Add to skip providers if not already present
  if [[ -z "$SKIP_PROVIDERS" ]]; then
    export SKIP_PROVIDERS="openai"
  elif [[ ! "$SKIP_PROVIDERS" =~ "openai" ]]; then
    export SKIP_PROVIDERS="${SKIP_PROVIDERS},openai"
  fi
fi

# Check Anthropic API key
if [[ -z "$ANTHROPIC_API_KEY" ]]; then
  log_warning "ANTHROPIC_API_KEY is not set. Anthropic provider will be skipped."
  
  # Add to skip providers if not already present
  if [[ -z "$SKIP_PROVIDERS" ]]; then
    export SKIP_PROVIDERS="anthropic"
  elif [[ ! "$SKIP_PROVIDERS" =~ "anthropic" ]]; then
    export SKIP_PROVIDERS="${SKIP_PROVIDERS},anthropic"
  fi
fi

# Check Google API key
if [[ -z "$GOOGLE_API_KEY" ]]; then
  log_warning "GOOGLE_API_KEY is not set. Google provider will be skipped."
  
  # Add to skip providers if not already present
  if [[ -z "$SKIP_PROVIDERS" ]]; then
    export SKIP_PROVIDERS="google"
  elif [[ ! "$SKIP_PROVIDERS" =~ "google" ]]; then
    export SKIP_PROVIDERS="${SKIP_PROVIDERS},google"
  fi
fi

# Check DeepSeek API key
if [[ -z "$DEEPSEEK_API_KEY" ]]; then
  log_warning "DEEPSEEK_API_KEY is not set. DeepSeek provider will be skipped."
  
  # Add to skip providers if not already present
  if [[ -z "$SKIP_PROVIDERS" ]]; then
    export SKIP_PROVIDERS="deepseek"
  elif [[ ! "$SKIP_PROVIDERS" =~ "deepseek" ]]; then
    export SKIP_PROVIDERS="${SKIP_PROVIDERS},deepseek"
  fi
fi

# If all providers are skipped, notify and exit
if [[ "$SKIP_PROVIDERS" == "openai,anthropic,google,deepseek" ]] || 
   [[ "$SKIP_PROVIDERS" == "openai,anthropic,deepseek,google" ]] || 
   [[ "$SKIP_PROVIDERS" == "anthropic,openai,google,deepseek" ]] || 
   [[ "$SKIP_PROVIDERS" == "anthropic,openai,deepseek,google" ]] || 
   [[ "$SKIP_PROVIDERS" == "google,deepseek,openai,anthropic" ]] || 
   [[ "$SKIP_PROVIDERS" == "google,deepseek,anthropic,openai" ]] || 
   [[ "$SKIP_PROVIDERS" == "deepseek,google,openai,anthropic" ]] || 
   [[ "$SKIP_PROVIDERS" == "deepseek,google,anthropic,openai" ]]; then
  log_error "All providers are set to be skipped. Cannot run calibration without any providers."
  log_info "Please set at least one of the following environment variables:"
  log_info "- OPENAI_API_KEY"
  log_info "- ANTHROPIC_API_KEY"
  log_info "- GOOGLE_API_KEY"
  log_info "- DEEPSEEK_API_KEY"
  exit 1
fi

# Final confirmation with providers to be used
providers_to_use=""
if [[ ! "$SKIP_PROVIDERS" =~ "openai" ]]; then
  providers_to_use="${providers_to_use} OpenAI"
fi
if [[ ! "$SKIP_PROVIDERS" =~ "anthropic" ]]; then
  providers_to_use="${providers_to_use} Anthropic"
fi
if [[ ! "$SKIP_PROVIDERS" =~ "google" ]]; then
  providers_to_use="${providers_to_use} Google"
fi
if [[ ! "$SKIP_PROVIDERS" =~ "deepseek" ]]; then
  providers_to_use="${providers_to_use} DeepSeek"
fi

log_info "Will use the following providers:${providers_to_use}"

# Run the direct calibration
log_info "Starting direct calibration process..."
node direct-calibration.js $QUICK_ARG

# Check the exit status
if [ $? -eq 0 ]; then
  echo "✅ Direct calibration completed successfully!"
  
  # Show the output CSV file
  echo "CSV output is available in: calibration-reports/all-models-data.csv"
  
  # Preview the CSV file if it exists
  CSV_FILE="calibration-reports/all-models-data.csv"
  if [ -f "$CSV_FILE" ]; then
    echo ""
    echo "Preview of calibration data (first 10 lines):"
    echo "-------------------------------------------"
    head -n 10 "$CSV_FILE"
    echo "-------------------------------------------"
    echo ""
    echo "Full calibration data is available for analysis in:"
    echo "$CSV_FILE"
    echo ""
    echo "You can analyze this data to determine the optimal weights for quality (50%), cost (35%), and speed (15%)"
  fi
else
  echo "❌ Direct calibration failed. Check the logs for more information."
fi

# Run analysis if requested
if [[ "$ANALYSIS" == true ]]; then
  echo "Running analysis with default weights..."
  node analyze-model-data.js
fi

# Run variant analysis if requested
if [[ "$VARIANTS" == true ]]; then
  echo "Running analysis with different weight variants..."
  node analyze-scoring-variants.js
fi

echo "Calibration process complete!"
echo ""
echo "Next steps:"
echo "1. View raw data in calibration-reports/all-models-data.csv"
echo "2. Run custom analysis: node analyze-model-data.js --quality 0.5 --cost 0.35 --speed 0.15"
echo "3. Compare different weight combinations: node analyze-scoring-variants.js"