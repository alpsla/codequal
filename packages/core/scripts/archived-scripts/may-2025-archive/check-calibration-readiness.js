/**
 * Check Calibration Readiness
 * 
 * This script verifies that all prerequisites for running calibration are in place.
 */

require('dotenv').config();

// Function to check if a variable is set and non-empty
function checkEnvVar(name) {
  const value = process.env[name];
  return !!value && value.length > 0;
}

// Check Supabase credentials
function checkSupabase() {
  const url = checkEnvVar('SUPABASE_URL');
  const key = checkEnvVar('SUPABASE_SERVICE_ROLE_KEY');
  
  console.log(`Supabase URL: ${url ? '✅' : '❌'}`);
  console.log(`Supabase Key: ${key ? '✅' : '❌'}`);
  
  return url && key;
}

// Check DeepWiki API credentials
function checkDeepWiki() {
  const apiKey = checkEnvVar('DEEPWIKI_API_KEY');
  const apiUrl = checkEnvVar('DEEPWIKI_API_URL');
  
  console.log(`DeepWiki API Key: ${apiKey ? '✅' : '❌'}`);
  console.log(`DeepWiki API URL: ${apiUrl ? '✅' : '❌'}`);
  
  return apiKey && apiUrl;
}

// Check model provider API keys
function checkModelProviders() {
  const openai = checkEnvVar('OPENAI_API_KEY');
  const anthropic = checkEnvVar('ANTHROPIC_API_KEY');
  const google = checkEnvVar('GOOGLE_API_KEY');
  const deepseek = checkEnvVar('DEEPSEEK_API_KEY');
  
  console.log('Model Provider API Keys:');
  console.log(`  OpenAI: ${openai ? '✅' : '❌'}`);
  console.log(`  Anthropic: ${anthropic ? '✅' : '❌'}`);
  console.log(`  Google: ${google ? '✅' : '❌'}`);
  console.log(`  DeepSeek: ${deepseek ? '✅' : '❌'}`);
  
  return openai && anthropic && (google || deepseek); // Need at least 3 providers
}

// Check file system access
function checkFileSystem() {
  const fs = require('fs');
  const path = require('path');
  
  // Check if scripts directory exists
  const scriptsPath = path.resolve(__dirname);
  const modelSelectPath = path.resolve(__dirname, '../src/services/model-selection');
  
  try {
    fs.accessSync(scriptsPath, fs.constants.R_OK | fs.constants.W_OK);
    fs.accessSync(modelSelectPath, fs.constants.R_OK);
    
    console.log(`File system access: ✅`);
    return true;
  } catch (error) {
    console.log(`File system access: ❌ (${error.message})`);
    return false;
  }
}

// Check build status
function checkBuild() {
  const fs = require('fs');
  const path = require('path');
  
  // Check if dist directory exists
  const distPath = path.resolve(__dirname, '../dist');
  
  try {
    if (fs.existsSync(distPath)) {
      const stats = fs.statSync(distPath);
      
      // Check if directory is not empty
      if (stats.isDirectory()) {
        const files = fs.readdirSync(distPath);
        
        if (files.length > 0) {
          console.log(`Build status: ✅`);
          return true;
        }
      }
    }
    
    console.log(`Build status: ❌ (dist directory not found or empty)`);
    return false;
  } catch (error) {
    console.log(`Build status: ❌ (${error.message})`);
    return false;
  }
}

// Run all checks
function runChecks() {
  console.log('Checking Calibration Readiness');
  console.log('=============================');
  
  const checks = [
    { name: 'Supabase', check: checkSupabase },
    { name: 'DeepWiki', check: checkDeepWiki },
    { name: 'Model Providers', check: checkModelProviders },
    { name: 'File System', check: checkFileSystem },
    { name: 'Build', check: checkBuild }
  ];
  
  const results = checks.map(({ name, check }) => {
    console.log(`\n${name} Check:`);
    const result = check();
    return { name, result };
  });
  
  console.log('\nSummary:');
  console.log('========');
  
  const failed = results.filter(r => !r.result);
  
  if (failed.length === 0) {
    console.log('✅ All checks passed! You are ready to run calibration.');
    return true;
  } else {
    console.log(`❌ ${failed.length} check(s) failed:`);
    failed.forEach(f => console.log(`  - ${f.name}`));
    console.log('\nPlease fix the issues above before running calibration.');
    return false;
  }
}

// Execute checks
const isReady = runChecks();
process.exit(isReady ? 0 : 1);