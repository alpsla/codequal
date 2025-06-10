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
  echo "You can use .env.sample as a template:"
  echo "cp .env.sample .env"
  exit 1
fi

# Load environment variables from .env file
export $(grep -v '^#' .env | xargs)

# Check if required environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file."
  exit 1
fi

# Extract project ID from SUPABASE_URL
PROJECT_ID=$(echo $SUPABASE_URL | awk -F[/:] '{print $4}')
if [ -z "$PROJECT_ID" ]; then
  echo "Error: Could not extract project ID from SUPABASE_URL."
  exit 1
fi

echo "Setting up Supabase project: $PROJECT_ID"
echo "------------------------------------------------------------------------"

# Build the database package
echo "Building database package..."
npm run build:database || {
  echo "Error: Failed to build database package."
  exit 1
}

# Run the migration script
echo "Applying database migrations..."
node -r dotenv/config packages/database/dist/migrations/apply-migrations.js || {
  echo "Error: Failed to apply database migrations."
  echo "This could be due to:"
  echo "  - Invalid Supabase credentials"
  echo "  - Insufficient permissions"
  echo "  - Connection issues"
  exit 1
}

echo "------------------------------------------------------------------------"
echo "Supabase setup completed successfully!"
echo ""
echo "The following tables have been created or updated:"
echo "  - repositories (added language and size fields)"
echo "  - pr_reviews (added analysis_mode field)"
echo "  - repository_analysis (new table for caching repository analysis)"
echo "  - calibration_runs (new table for model calibration)"
echo "  - calibration_test_results (new table for test results)"
echo ""
echo "You can now use the DatabaseService to interact with these tables."
echo "See the documentation in packages/database/README.md for more information."