#!/bin/bash

# Comprehensive Model Comparison Data Generator
# This script runs calibration with all providers for multiple repositories
# to generate comprehensive comparison data in CSV and JSON formats

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

function show_help() {
  echo "Generate Comparison Data - Run calibrations to collect model performance data"
  echo ""
  echo "Usage: ./generate-comparison-data.sh [repos] [type]"
  echo ""
  echo "Arguments:"
  echo "  repos     - Number of repositories to test (1-4, default: 2)"
  echo "  type      - Type of test: quick, realistic (default: realistic)"
  echo ""
  echo "Examples:"
  echo "  ./generate-comparison-data.sh 1 quick     # Test 1 repo with quick mode"
  echo "  ./generate-comparison-data.sh 4 realistic # Test all 4 repos with realistic delays"
}

# Default values
NUM_REPOS=${1:-2}
TEST_TYPE=${2:-"realistic"}

# Validate arguments
if [[ ! $NUM_REPOS =~ ^[1-4]$ ]]; then
  log_error "Invalid number of repositories. Must be between 1 and 4."
  show_help
  exit 1
fi

if [[ ! "$TEST_TYPE" =~ ^(quick|realistic)$ ]]; then
  log_error "Invalid test type. Must be 'quick' or 'realistic'."
  show_help
  exit 1
fi

log_info "Starting comprehensive model comparison data generation"
log_info "Testing $NUM_REPOS repos with $TEST_TYPE mode"

# Prepare environment for consistent testing
export SKIP_PROVIDERS=""
export REPO_COUNT=$NUM_REPOS

# Set test parameters in run-calibration.js
log_info "Updating test parameters in run-calibration.js"

# First modify the repository count
sed -i.bak "s/: ALL_CALIBRATION_REPOSITORIES\.slice(0, 2);/: ALL_CALIBRATION_REPOSITORIES.slice(0, $NUM_REPOS);/" ./run-calibration.js

# Create reports directory if it doesn't exist
mkdir -p calibration-reports

# Run calibration with current settings
log_info "Running calibration with $TEST_TYPE mode"
./calibration-modes.sh $TEST_TYPE

log_success "Comparison data generation completed"
log_info "Data saved to calibration-reports/ directory"
log_info "Use the all-models-data.csv file for comprehensive analysis"

# Restore original settings
mv ./run-calibration.js.bak ./run-calibration.js > /dev/null 2>&1

echo ""
log_info "Generated files:"
ls -la calibration-reports/