/**
 * Reset Calibration Script
 * 
 * This script clears all existing calibration data from the database
 * to allow for a fresh calibration process.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set as environment variables');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Clear calibration data
 */
async function resetCalibrationData() {
  console.log('Resetting calibration data...');
  
  try {
    // First, delete all calibration test results
    console.log('Deleting calibration test results...');
    const { error: testResultsError } = await supabase
      .from('calibration_test_results')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Dummy condition to delete all records
    
    if (testResultsError) {
      throw new Error(`Error deleting calibration test results: ${testResultsError.message}`);
    }
    
    console.log('Calibration test results deleted successfully');
    
    // Then, delete all calibration runs
    console.log('Deleting calibration runs...');
    const { error: runsError } = await supabase
      .from('calibration_runs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Dummy condition to delete all records
    
    if (runsError) {
      throw new Error(`Error deleting calibration runs: ${runsError.message}`);
    }
    
    console.log('Calibration runs deleted successfully');
    
    // Optionally, reset any repository calibration flags
    console.log('Updating repository calibration status...');
    const { error: repoError } = await supabase.rpc('reset_repository_calibration_status');
    
    if (repoError) {
      console.warn(`Warning: Could not reset repository calibration status: ${repoError.message}`);
      console.warn('You may need to manually update any calibration flags in the repositories table.');
    } else {
      console.log('Repository calibration status reset successfully');
    }
    
    console.log('Calibration data reset complete');
    return true;
  } catch (error) {
    console.error('Error resetting calibration data:', error);
    return false;
  }
}

// Execute the reset function
resetCalibrationData()
  .then((success) => {
    if (success) {
      console.log('Calibration data has been successfully reset.');
    } else {
      console.error('Failed to reset calibration data. Please check the error logs.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });