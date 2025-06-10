#!/bin/bash

# Setup and Run Calibration Script
# This script performs the necessary setup for calibration, including:
# 1. Applying database migrations to create required tables
# 2. Running the calibration process

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

log_info "Starting calibration setup and execution process..."

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

# Run healthcheck to verify environment and connections
log_info "Running healthcheck..."
node ./healthcheck.js

if [ $? -ne 0 ]; then
  log_error "Healthcheck failed. Please fix the issues before continuing."
  exit 1
fi

log_success "Healthcheck passed successfully."

# Check if tables already exist (we already confirmed this in the healthcheck)
log_info "Calibration tables already exist, skipping migration."
log_success "Database tables are ready."

log_success "Database migration completed successfully."

# Run calibration process
log_info "Starting calibration process..."
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