#!/usr/bin/env node
/**
 * Model Version Update Checker
 * 
 * This script checks for updates to the AI models we use and updates our
 * configuration when new versions are available. It can be run regularly
 * as a scheduled task to ensure we're always using the latest models.
 * 
 * Usage: node check-model-versions.js [--update] [--force-update]
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);
const shouldUpdate = args.includes('--update');
const forceUpdate = args.includes('--force-update');

// Configuration
const CONFIG_PATH = path.join(__dirname, '..', 'src', 'services', 'model-selection', 'ModelVersionSync.ts');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Model provider API endpoints for version checking
const VERSION_CHECK_ENDPOINTS = {
  openai: 'https://api.openai.com/v1/models',
  anthropic: 'https://api.anthropic.com/v1/models',
  google: 'https://generativelanguage.googleapis.com/v1/models',
  deepseek: 'https://api.deepseek.com/v1/models',
  openrouter: 'https://openrouter.ai/api/v1/models'
};

// API keys for different providers
const API_KEYS = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  google: process.env.GOOGLE_API_KEY,
  deepseek: process.env.DEEPSEEK_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY
};

// Main function
async function checkModelVersions() {
  console.log('Checking for model updates...\n');
  
  // Parse current model versions from configuration
  const currentVersions = parseCurrentVersions();
  console.log(`Parsed ${Object.keys(currentVersions).length} model versions from configuration`);
  
  // Check for updates
  const updates = await checkForUpdates(currentVersions);
  
  // Display updates
  if (updates.length === 0) {
    console.log('\n✅ All models are up to date!');
  } else {
    console.log(`\nFound ${updates.length} model updates:`);
    
    updates.forEach((update, index) => {
      console.log(`${index + 1}. ${update.provider}/${update.model}:`);
      console.log(`   - Current: ${update.currentVersion || 'N/A'} (${update.currentReleaseDate || 'N/A'})`);
      console.log(`   - New: ${update.newVersion || 'latest'} (${update.newReleaseDate})`);
    });
    
    // Update if needed
    if (shouldUpdate || forceUpdate) {
      await updateModelVersions(currentVersions, updates);
    } else {
      console.log('\nTo update model versions, run with --update flag:');
      console.log('  node check-model-versions.js --update');
    }
  }
}

// Parse current model versions from configuration
function parseCurrentVersions() {
  try {
    // Read configuration file
    const configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
    
    // Extract version information
    const versions = {};
    const versionRegex = /['"]([^\/]+)\/([^'"]+)['"]\s*:\s*{\s*provider\s*:\s*['"]([^'"]+)['"]\s*,\s*model\s*:\s*['"]([^'"]+)['"]\s*,\s*versionId\s*:\s*([^,]+)\s*,\s*releaseDate\s*:\s*['"]([^'"]+)['"]/g;
    
    let match;
    while ((match = versionRegex.exec(configContent)) !== null) {
      const [, providerRaw, modelRaw, provider, model, versionIdRaw, releaseDate] = match;
      
      // Parse version ID (could be null)
      const versionId = versionIdRaw.trim() === 'null' ? null : versionIdRaw.replace(/['"]/g, '');
      
      const key = `${provider}/${model}`;
      versions[key] = {
        provider,
        model,
        versionId,
        releaseDate
      };
    }
    
    return versions;
  } catch (error) {
    console.error('Error parsing current versions:', error);
    return {};
  }
}

// Check each provider for model updates
async function checkForUpdates(currentVersions) {
  const updates = [];
  
  // Check each provider
  for (const [provider, endpoint] of Object.entries(VERSION_CHECK_ENDPOINTS)) {
    // Skip providers without API keys
    if (!API_KEYS[provider]) {
      console.log(`Skipping ${provider} (no API key available)`);
      continue;
    }
    
    try {
      console.log(`Checking ${provider} models...`);
      
      // Get models from provider
      const models = await fetchModels(provider, endpoint);
      
      if (!models || models.length === 0) {
        console.log(`No models found for ${provider}`);
        continue;
      }
      
      console.log(`Found ${models.length} models for ${provider}`);
      
      // Check each model for updates
      for (const model of models) {
        const modelName = model.id || model.name;
        const key = `${provider}/${modelName}`;
        
        // Skip models we don't currently use
        if (!currentVersions[key] && !isImportantModel(provider, modelName)) {
          continue;
        }
        
        const currentVersion = currentVersions[key]?.versionId;
        const currentReleaseDate = currentVersions[key]?.releaseDate;
        
        // Extract version information
        const newVersion = model.version || model.id || null;
        const newReleaseDate = model.created || model.updated || new Date().toISOString().split('T')[0];
        
        // Check if version is new or release date is newer
        if (forceUpdate || 
            !currentVersion || 
            !currentReleaseDate || 
            newVersion !== currentVersion || 
            new Date(newReleaseDate) > new Date(currentReleaseDate)) {
          
          updates.push({
            provider,
            model: modelName,
            currentVersion,
            currentReleaseDate,
            newVersion,
            newReleaseDate,
            description: model.description || `Updated ${provider}/${modelName} model`
          });
        }
      }
    } catch (error) {
      console.error(`Error checking ${provider} models:`, error.message);
    }
  }
  
  return updates;
}

// Fetch models from a provider
async function fetchModels(provider, endpoint) {
  try {
    // Prepare request headers
    const headers = { 'Content-Type': 'application/json' };
    
    // Add authorization header based on provider
    switch (provider) {
      case 'openai':
        headers['Authorization'] = `Bearer ${API_KEYS.openai}`;
        break;
      case 'anthropic':
        headers['x-api-key'] = API_KEYS.anthropic;
        break;
      case 'google':
        headers['x-goog-api-key'] = API_KEYS.google;
        break;
      case 'deepseek':
        headers['Authorization'] = `Bearer ${API_KEYS.deepseek}`;
        break;
      case 'openrouter':
        headers['Authorization'] = `Bearer ${API_KEYS.openrouter}`;
        break;
    }
    
    // Make API request
    const response = await axios.get(endpoint, { headers, timeout: 10000 });
    
    // Extract models based on provider's response format
    switch (provider) {
      case 'openai':
        return response.data.data;
      case 'anthropic':
        return response.data.models;
      case 'google':
        return response.data.models;
      case 'deepseek':
        return response.data.data;
      case 'openrouter':
        return response.data.data;
      default:
        return [];
    }
  } catch (error) {
    console.error(`Error fetching models from ${provider}:`, error.message);
    return [];
  }
}

// Check if this is a model we want to track even if not in our current list
function isImportantModel(provider, modelName) {
  const importantModels = {
    'openai': ['gpt-4', 'gpt-4o', 'gpt-4-turbo'],
    'anthropic': ['claude-3', 'claude-3-7', 'claude-3.7', 'claude-3-sonnet', 'claude-3-opus'],
    'google': ['gemini-pro', 'gemini-2', 'gemini-2.5', 'gemini-2.5-pro'],
    'deepseek': ['deepseek-coder', 'deepseek-coder-plus', 'deepseek-coder-lite'],
    'openrouter': ['anthropic/claude', 'openai/gpt']
  };
  
  // Check if model name contains any of the important model patterns
  return importantModels[provider]?.some(pattern => modelName.includes(pattern)) || false;
}

// Update model versions in configuration
async function updateModelVersions(currentVersions, updates) {
  try {
    console.log('\nUpdating model versions...');
    
    // Read configuration file
    let configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
    
    // Update each model
    for (const update of updates) {
      const key = `${update.provider}/${update.model}`;
      const versionId = update.newVersion ? `'${update.newVersion}'` : 'null';
      
      // Create pattern to match the model entry
      const pattern = new RegExp(`(['"])${escapeRegExp(key)}\\1\\s*:\\s*{[^}]*}`);
      
      // Create replacement entry
      const replacement = `'${key}': {
    provider: '${update.provider}',
    model: '${update.model}',
    versionId: ${versionId},
    releaseDate: '${update.newReleaseDate}',
    description: '${update.description.replace(/'/g, "\\'")}'
  }`;
      
      // Update configuration
      if (currentVersions[key]) {
        // Update existing entry
        configContent = configContent.replace(pattern, replacement);
      } else {
        // Add new entry before the closing brace
        const insertPoint = configContent.lastIndexOf('};');
        configContent = configContent.slice(0, insertPoint) + 
          ',\n  ' + replacement + '\n' + 
          configContent.slice(insertPoint);
      }
      
      console.log(`✅ Updated ${key} to version ${update.newVersion || 'latest'}`);
    }
    
    // Save updated configuration
    fs.writeFileSync(CONFIG_PATH, configContent);
    
    // Update database if available
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      await updateDatabaseVersions(updates);
    }
    
    console.log('\nModel versions updated successfully!');
  } catch (error) {
    console.error('Error updating model versions:', error);
  }
}

// Update model versions in database
async function updateDatabaseVersions(updates) {
  try {
    console.log('Updating model versions in database...');
    
    // Import Supabase client
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Update model versions
    for (const update of updates) {
      // Find existing configurations using this model
      const { data, error } = await supabase
        .from('model_configurations')
        .select('*')
        .eq('provider', update.provider)
        .eq('model', update.model);
      
      if (error) {
        console.error(`Error fetching configurations for ${update.provider}/${update.model}:`, error);
        continue;
      }
      
      if (data && data.length > 0) {
        console.log(`Updating ${data.length} configurations using ${update.provider}/${update.model}`);
        
        // Add version info to notes
        for (const config of data) {
          const newNotes = config.notes 
            ? `${config.notes} [Updated to version ${update.newVersion || 'latest'} on ${new Date().toISOString().split('T')[0]}]`
            : `Updated to version ${update.newVersion || 'latest'} on ${new Date().toISOString().split('T')[0]}`;
          
          // Update configuration
          const { error: updateError } = await supabase
            .from('model_configurations')
            .update({ 
              notes: newNotes,
              updated_at: new Date().toISOString()
            })
            .eq('id', config.id);
          
          if (updateError) {
            console.error(`Error updating configuration ${config.id}:`, updateError);
          }
        }
      }
    }
    
    console.log('Database updates complete');
  } catch (error) {
    console.error('Error updating database:', error);
  }
}

// Helper function to escape special characters in regex
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Run the check
checkModelVersions().catch(error => {
  console.error('Error checking model versions:', error);
  process.exit(1);
});
