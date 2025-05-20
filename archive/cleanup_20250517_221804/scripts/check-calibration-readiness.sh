#!/bin/bash

# Check Calibration Readiness Script
# This script verifies that all prerequisites for calibration are in place

# Load environment variables
if [ -f .env ]; then
  source .env
fi

echo "Running calibration readiness check..."
node ./packages/core/scripts/check-calibration-readiness.js

# Check if the script succeeded
if [ $? -eq 0 ]; then
  echo "Your system is ready for calibration!"
  echo "You can run ./reset-calibration.sh to clear previous data"
  echo "Then run ./run-calibration.sh to start the calibration process"
else
  echo "Please address the issues above before proceeding with calibration."
  exit 1
fi