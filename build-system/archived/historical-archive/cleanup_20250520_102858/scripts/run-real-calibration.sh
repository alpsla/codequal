#!/bin/bash

# Run Real Calibration with Fixed DeepWiki API
# This script:
# 1. Sets up the fixed DeepWiki environment
# 2. Initializes provider configurations
# 3. Runs calibration with real API connections
# 4. Collects comprehensive data for analysis

set -e

# Step 1: Make sure the fixed DeepWiki is running
if ! pgrep -f "kubectl port-forward.*8001:8001" > /dev/null; then
  echo "Setting up fixed DeepWiki environment..."
  ./setup-fixed-deepwiki.sh
  # Give it a moment to start
  sleep 5
fi

# Step 2: Initialize provider configurations
echo "Initializing provider configurations..."
./initialize-deepwiki-providers.sh

# Step 3: Check the configuration
echo "Checking DeepWiki configuration..."
./check-deepwiki-config.sh

# Step 4: Source calibration environment
source .env.calibration

# Step 3: Validate the connection
echo "Validating connection to DeepWiki API..."
./calibration-modes.sh validate

read -p "Continue with calibration? (y/n): " CONTINUE
if [[ ! $CONTINUE =~ ^[Yy]$ ]]; then
  echo "Calibration aborted."
  exit 1
fi

# Step 4: Run comprehensive data collection
echo "Starting comprehensive data collection..."
./generate-comparison-data.sh 4 realistic

# Step 5: Run data analysis
echo "Analyzing calibration results..."
node analyze-model-data.js

# Step 6: Show what the final model selection would be with different weightings
echo ""
echo "Alternative Weightings Analysis:"
echo "===============================\n"

echo "1. Cost-Efficient Focus (30% Quality, 60% Cost, 10% Speed):"
node analyze-model-data.js --quality 0.3 --cost 0.6 --speed 0.1

echo "\n2. Speed-Optimized Focus (40% Quality, 30% Cost, 30% Speed):"
node analyze-model-data.js --quality 0.4 --cost 0.3 --speed 0.3

echo "\nReal calibration completed successfully!"
echo "Review the results above and in the calibration-reports/ directory to select optimal weights."
echo "Use 'node analyze-model-data.js --quality X --cost Y --speed Z' to try other weightings."