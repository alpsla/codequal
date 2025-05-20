#!/bin/bash

# Reset Calibration Script
# This script resets all calibration data in the database
# to allow for a fresh calibration process

# Load environment variables
if [ -f .env ]; then
  source .env
fi

# Check if Supabase credentials are available
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set as environment variables"
  echo "Make sure you have a .env file with these variables or set them manually"
  exit 1
fi

# Run the reset script
echo "Starting calibration data reset..."
node ./packages/core/scripts/reset-calibration.js

# Check if the script succeeded
if [ $? -eq 0 ]; then
  echo "Calibration data has been reset successfully"
  echo "You can now start a new calibration process"
else
  echo "Failed to reset calibration data"
  echo "Please check the error logs and try again"
  exit 1
fi

# Optionally run the SQL migration
if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Applying SQL migration to reset repository calibration status..."
  
  # Use the supabase CLI or psql to run the SQL migration
  # This is a placeholder - you may need to modify this based on your setup
  
  # Option 1: Using psql (if available)
  # psql "$DATABASE_URL" -f ./packages/database/src/migrations/reset-calibration-status.sql
  
  # Option 2: Using node script to execute SQL
  node -e "
    const { createClient } = require('@supabase/supabase-js');
    const fs = require('fs');
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const sql = fs.readFileSync('./packages/database/src/migrations/reset-calibration-status.sql', 'utf8');
    
    supabase.rpc('exec_sql', { sql })
      .then(({ error }) => {
        if (error) {
          console.error('Error executing SQL:', error);
          process.exit(1);
        } else {
          console.log('SQL migration applied successfully');
          process.exit(0);
        }
      })
      .catch(err => {
        console.error('Unexpected error:', err);
        process.exit(1);
      });
  "
fi

echo "Reset complete. You can now start a new calibration process."