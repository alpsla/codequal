#!/bin/bash

# Get the directory of the script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."

# Change to the project root directory
cd "$PROJECT_ROOT"

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found in the project root."
  echo "Please create an .env file with SUPABASE_URL and SUPABASE_KEY."
  exit 1
fi

# Load environment variables from .env file
export $(grep -v '^#' .env | xargs)

# Check if required environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file."
  exit 1
fi

# Build the database package
echo "Building database package..."
npm run build:database

# Run the migration script
echo "Applying database migrations..."
node -r dotenv/config packages/database/dist/migrations/apply-migrations.js

# Exit with the status of the last command
exit $?