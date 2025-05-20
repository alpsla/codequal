#!/usr/bin/env node
/**
 * Enhanced Calibration Script
 * 
 * This script addresses several issues with the previous calibration approach:
 * 1. Updates model list to include Gemini 2.5 models only (removes 1.5)
 * 2. Reduces the impact of speed on scoring (15% vs previous 30%)
 * 3. Adds price as a parameter (with 35% weight - comparable to quality)
 * 4. Provides manual API key override options for models with auth issues
 * 5. Implements more detailed error handling and reporting
 * 6. Generates a comprehensive CSV report for manual analysis
 * 
 * Usage:
 *   ./enhanced-calibration.js                   - Run full calibration
 *   ./enhanced-calibration.js --language=python - Test only Python repositories
 *   ./enhanced-calibration.js --size=small      - Test only small repositories
 *   ./enhanced-calibration.js --provider=google - Test only Google models
 *   ./enhanced-calibration.js --model=gpt-4o    - Test only models with 'gpt-4o' in the name
 *   ./enhanced-calibration.js --force           - Force retest of all models
 *   ./enhanced-calibration.js --generate-config - Generate config from existing results
 *   ./enhanced-calibration.js --generate-report - Generate CSV report from existing results
 *   ./enhanced-calibration.js --skip-api-validation - Skip API key validation
 */

const { runCalibration } = require('./modules/enhanced-calibration/runner');

// Run the script
runCalibration().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});