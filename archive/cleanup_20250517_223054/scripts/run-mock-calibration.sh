#!/bin/bash

# Mock Calibration Script
# This script runs a fully mocked calibration that doesn't require any real dependencies

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

# Change to the calibration directory
cd "$(dirname "$0")"

# Run the bypass healthcheck to ensure environment setup
log_info "Running bypass healthcheck..."
node bypass-healthcheck.js

if [ $? -ne 0 ]; then
  log_error "Bypass healthcheck failed. Please check the script."
  exit 1
fi

log_success "Bypass healthcheck passed!"

# Run the mock calibration
log_info "Starting mock calibration process..."
node mock-calibration.js

if [ $? -ne 0 ]; then
  log_error "Mock calibration failed."
  exit 1
fi

log_success "Mock calibration completed successfully!"
log_info "This simulates the full calibration workflow without requiring real dependencies."
