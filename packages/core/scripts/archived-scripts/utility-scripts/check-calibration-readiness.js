#!/usr/bin/env node
/**
 * Calibration Readiness Check
 * 
 * This script checks if we have all the necessary components in place
 * to start full calibration across all models and repository types.
 * 
 * Usage: node check-calibration-readiness.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration
const DEEPWIKI_API_URL = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// API Keys required for calibration
const REQUIRED_API_KEYS = [
  { name: 'OPENAI_API_KEY', environment: process.env.OPENAI_API_KEY },
  { name: 'ANTHROPIC_API_KEY', environment: process.env.ANTHROPIC_API_KEY },
  { name: 'GEMINI_API_KEY', environment: process.env.GEMINI_API_KEY },
  { name: 'DEEPSEEK_API_KEY', environment: process.env.DEEPSEEK_API_KEY },
  { name: 'OPENROUTER_API_KEY', environment: process.env.OPENROUTER_API_KEY }
];

// Required scripts and components
const REQUIRED_FILES = [
  { path: path.join(__dirname, 'run-comprehensive-calibration.js'), description: 'Comprehensive calibration script' },
  { path: path.join(__dirname, '..', 'src', 'services', 'model-selection', 'RepositoryModelSelectionService.ts'), description: 'Repository model selection service' },
  { path: path.join(__dirname, '..', 'src', 'services', 'model-selection', 'RepositoryCalibrationService.ts'), description: 'Repository calibration service' },
  { path: path.join(__dirname, '..', 'src', 'services', 'model-selection', 'ModelConfigStore.ts'), description: 'Model configuration store' },
  { path: path.join(__dirname, '..', 'src', 'services', 'model-selection', 'ModelVersionSync.ts'), description: 'Model version synchronization service' },
  { path: path.join(__dirname, '..', 'src', 'config', 'models', 'repository-model-config.ts'), description: 'Repository model configuration' },
  { path: path.join(__dirname, '..', 'src', 'config', 'models', 'migrations', 'model-config-migration.ts'), description: 'Database migration script' }
];

// Main function
async function checkCalibrationReadiness() {
  console.log('Checking calibration readiness...\n');
  
  let readyCount = 0;
  let totalChecks = 0;
  const issues = [];
  
  // Check required files
  console.log('Checking required files:');
  totalChecks += REQUIRED_FILES.length;
  
  for (const file of REQUIRED_FILES) {
    if (fs.existsSync(file.path)) {
      console.log(`✅ ${file.description} [${file.path}]`);
      readyCount++;
    } else {
      console.log(`❌ ${file.description} [${file.path}] - Not found`);
      issues.push(`Missing required file: ${file.path}`);
    }
  }
  
  console.log();
  
  // Check API keys
  console.log('Checking API keys:');
  totalChecks += REQUIRED_API_KEYS.length;
  
  for (const key of REQUIRED_API_KEYS) {
    if (key.environment && key.environment.length > 0) {
      console.log(`✅ ${key.name} - Available`);
      readyCount++;
    } else {
      console.log(`❌ ${key.name} - Not available`);
      issues.push(`Missing API key: ${key.name}`);
    }
  }
  
  console.log();
  
  // Check Supabase connection
  console.log('Checking Supabase connection:');
  totalChecks += 1;
  
  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    try {
      // Import Supabase client
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      
      // Test connection
      const { data, error } = await supabase.from('model_configurations').select('count');
      
      if (!error) {
        console.log('✅ Supabase connection - Successful');
        readyCount++;
      } else {
        console.log(`❌ Supabase connection - Failed: ${error.message}`);
        issues.push(`Supabase connection error: ${error.message}`);
      }
    } catch (error) {
      console.log(`❌ Supabase connection - Failed: ${error.message}`);
      issues.push(`Supabase connection error: ${error.message}`);
    }
  } else {
    console.log('❌ Supabase connection - Missing URL or service key');
    issues.push('Missing Supabase URL or service key');
  }
  
  console.log();
  
  // Check DeepWiki API
  console.log('Checking DeepWiki API:');
  totalChecks += 1;
  
  try {
    // Try different health check endpoints
    const response = await axios.get(`${DEEPWIKI_API_URL}/api/health`, { timeout: 5000 })
      .catch(() => axios.get(`${DEEPWIKI_API_URL}/healthz`, { timeout: 5000 }))
      .catch(() => axios.get(`${DEEPWIKI_API_URL}`, { timeout: 5000 }));
    
    if (response && response.status === 200) {
      console.log('✅ DeepWiki API - Responding');
      readyCount++;
    } else {
      console.log(`❌ DeepWiki API - Unexpected status: ${response.status}`);
      issues.push(`DeepWiki API returned unexpected status: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ DeepWiki API - Not responding: ${error.message}`);
    issues.push(`DeepWiki API not responding: ${error.message}`);
  }
  
  console.log();
  
  // Summary
  const readyPercentage = Math.round((readyCount / totalChecks) * 100);
  
  console.log(`Calibration readiness: ${readyPercentage}% (${readyCount}/${totalChecks} checks passed)`);
  
  if (issues.length > 0) {
    console.log('\nIssues to resolve:');
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
    
    console.log('\nPlease resolve these issues before starting full calibration.');
  } else {
    console.log('\n🎉 All checks passed! You are ready to start full calibration.');
    console.log('\nTo start calibration, run:');
    console.log('  node run-comprehensive-calibration.js');
    console.log('\nTo update the database with calibration results, run:');
    console.log('  node run-comprehensive-calibration.js --update-db');
  }
}

// Run the check
checkCalibrationReadiness().catch(error => {
  console.error('Error during readiness check:', error);
  process.exit(1);
});
