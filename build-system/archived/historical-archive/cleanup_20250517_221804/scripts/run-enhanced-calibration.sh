#!/bin/bash
# Enhanced Calibration Runner
# This script runs the enhanced calibration system with various modes

# Default to quick mode if not specified
MODE=${1:-quick}

# Set environment
source .env 2>/dev/null || echo "Warning: .env file not found"

# Define colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validate mode
if [[ "$MODE" != "quick" && "$MODE" != "realistic" && "$MODE" != "full" ]]; then
  echo -e "${RED}Invalid mode: $MODE${NC}"
  echo "Usage: $0 [quick|realistic|full]"
  exit 1
fi

# Check for required API keys
MISSING_KEYS=0
API_KEYS=("OPENAI_API_KEY" "ANTHROPIC_API_KEY" "GOOGLE_API_KEY" "DEEPSEEK_API_KEY" "OPENROUTER_API_KEY")

for KEY in "${API_KEYS[@]}"; do
  if [[ -z "${!KEY}" ]]; then
    echo -e "${YELLOW}Warning: $KEY is not set${NC}"
    MISSING_KEYS=$((MISSING_KEYS+1))
  fi
done

if [[ $MISSING_KEYS -gt 0 ]]; then
  echo -e "${YELLOW}Some API keys are missing. You can skip those providers with --skip-providers.${NC}"
fi

# Set parameters based on calibration mode
case "$MODE" in
  quick)
    RUNS=1
    MAX_TOKENS=500
    UPDATE_DB="false"
    ;;
  realistic)
    RUNS=2
    MAX_TOKENS=1000
    UPDATE_DB="true"
    ;;
  full)
    RUNS=3
    MAX_TOKENS=2000
    UPDATE_DB="true"
    ;;
esac

echo -e "${BLUE}Starting Enhanced Calibration in $MODE mode${NC}"
echo "Runs per model: $RUNS"
echo "Max tokens: $MAX_TOKENS"
echo "Update database: $UPDATE_DB"
echo ""

# Check for optional parameters
SKIP_PROVIDERS=""
REPO_COUNT=""
QUALITY_WEIGHT=""
COST_WEIGHT=""
SPEED_WEIGHT=""

# Parse additional arguments
shift # Remove the first argument (mode)
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-providers=*)
      SKIP_PROVIDERS="${1#*=}"
      shift
      ;;
    --repo-count=*)
      REPO_COUNT="${1#*=}"
      shift
      ;;
    --quality=*)
      QUALITY_WEIGHT="${1#*=}"
      shift
      ;;
    --cost=*)
      COST_WEIGHT="${1#*=}"
      shift
      ;;
    --speed=*)
      SPEED_WEIGHT="${1#*=}"
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Build command with optional parameters
CMD="node enhanced-calibration.js --mode $MODE --runs $RUNS --max-tokens $MAX_TOKENS"

if [[ "$UPDATE_DB" == "true" ]]; then
  CMD="$CMD --update-db"
fi

if [[ -n "$SKIP_PROVIDERS" ]]; then
  CMD="$CMD --skip-providers $SKIP_PROVIDERS"
fi

if [[ -n "$REPO_COUNT" ]]; then
  CMD="$CMD --repo-count $REPO_COUNT"
fi

if [[ -n "$QUALITY_WEIGHT" ]]; then
  CMD="$CMD --quality-weight $QUALITY_WEIGHT"
fi

if [[ -n "$COST_WEIGHT" ]]; then
  CMD="$CMD --cost-weight $COST_WEIGHT"
fi

if [[ -n "$SPEED_WEIGHT" ]]; then
  CMD="$CMD --speed-weight $SPEED_WEIGHT"
fi

echo -e "${BLUE}Executing: $CMD${NC}"
echo ""

# Run the calibration
eval "$CMD"

EXIT_CODE=$?

if [[ $EXIT_CODE -eq 0 ]]; then
  echo -e "${GREEN}Calibration completed successfully!${NC}"
  
  # Show the latest report
  LATEST_REPORT=$(ls -t ./reports/full-report-*.md 2>/dev/null | head -n 1)
  if [[ -n "$LATEST_REPORT" ]]; then
    echo -e "${GREEN}Latest report: $LATEST_REPORT${NC}"
  fi
  
  # Show CSV data
  CSV_FILE="./calibration-reports/all-models-data.csv"
  if [[ -f "$CSV_FILE" ]]; then
    echo -e "${GREEN}CSV data saved to: $CSV_FILE${NC}"
  fi
else
  echo -e "${RED}Calibration failed with exit code $EXIT_CODE${NC}"
fi

exit $EXIT_CODE