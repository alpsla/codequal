#!/bin/bash

# Continue Calibration Script
# This script continues an existing calibration by testing only missing models and versions

# Load environment variables
if [ -f .env ]; then
  source .env
fi

# Check API keys
if [ -z "$DEEPWIKI_API_KEY" ] || [ -z "$DEEPWIKI_API_URL" ]; then
  echo "Error: DEEPWIKI_API_KEY and DEEPWIKI_API_URL must be set as environment variables"
  echo "Make sure you have a .env file with these variables or set them manually"
  exit 1
fi

# Check if Supabase credentials are available
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set as environment variables"
  echo "Make sure you have a .env file with these variables or set them manually"
  exit 1
fi

# Build packages if needed
echo "Building packages to ensure latest code is used..."
npm run build

# Check if build succeeded
if [ $? -ne 0 ]; then
  echo "Error: Build failed. Please fix any build errors before running calibration."
  exit 1
fi

# Run continued calibration
echo "Starting continued calibration process..."
node ./packages/core/scripts/calibration/continue-calibration.js

# Check if the script succeeded
if [ $? -eq 0 ]; then
  echo "Continued calibration process has completed successfully"
  echo "Any missing models or combinations have been tested and the database has been updated"
else
  echo "Continued calibration process failed"
  echo "Please check the error logs and try again"
  exit 1
fi