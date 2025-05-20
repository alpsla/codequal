
/**
 * CSV Report Generator for Model Calibration
 * 
 * Generates a detailed CSV report from calibration results to allow
 * manual analysis and verification of model performance across various
 * criteria.
 * 
 * @module generate-detailed-report
 */

// Import MODEL_PRICING from the main script
const MODEL_PRICING = {
  // Removed older Claude models
  'anthropic/claude-3.5-sonnet-20240620': { input: 5, output: 25 },
  'anthropic/claude-3.7-sonnet': { input: 8, output: 24 },
  'openai/gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'openai/gpt-4o': { input: 5, output: 15 },
  'openai/gpt-4-turbo': { input: 10, output: 30 },
  // Added all Deepseek models
  'deepseek/deepseek-coder': { input: 0.7, output: 1.0 },
  'deepseek/deepseek-coder-v2': { input: 0.8, output: 1.2 },
  'deepseek/deepseek-chat-v2': { input: 0.5, output: 0.8 },
  'google/gemini-2.5-pro': { input: 1.75, output: 14.00 },
  'google/gemini-2.5-pro-preview-05-06': { input: 1.75, output: 14.00 },
  'google/gemini-2.5-flash': { input: 0.3, output: 1.25 },
  'openrouter/anthropic/claude-3.7-sonnet': { input: 8.5, output: 25 },
  'openrouter/nousresearch/deephermes-3-mistral-24b-preview:free': { input: 0, output: 0 }
};

const fs = require('fs');
const path = require('path');

/**
 * Generates a detailed CSV report from calibration results
 * This allows manual verification and analysis of all models' performance
 * 
 * @param {Object} results - The full calibration results object
 * @param {string} outputPath - The path to save the CSV file
 * @returns {Promise<void>}
 */
async function generateDetailedReport(results, outputPath) {
  console.log(`Generating detailed calibration report to ${outputPath}...`);
  
  // CSV header
  const headers = [
    'Language',
    'Size',
    'Repository',
    'Provider',
    'Model',
    'Quality Score',
    'Speed Score',
    'Price Score',
    'Combined Score',
    'Architecture Score',
    'Code Quality Score',
    'Security Score',
    'Best Practices Score',
    'Performance Score',
    'Avg Response Time (s)',
    'Content Size (bytes)',
    'Input Price ($/1M tokens)',
    'Output Price ($/1M tokens)',
    'Best Model For Repo',
    'Best Model For Lang/Size'
  ];
  
  // Start with the header row
  let csvContent = headers.join(',') + '\n';
  
  // Add data rows
  for (const language of Object.keys(results)) {
    if (language === 'bestModels') continue; // Skip the bestModels summary
    
    for (const size of Object.keys(results[language])) {
      if (size === 'bestModel') continue; // Skip any bestModel entries
      
      // Get best model for this language/size if available
      const bestModelForLangSize = results.bestModels?.[language]?.[size]?.model || '';
      
      for (const repo of Object.keys(results[language][size])) {
        if (repo === 'bestModel') continue; // Skip the bestModel entries
        
        // Get best model for this repo if available
        const bestModelForRepo = results[language][size][repo]?.bestModel?.model || '';
        
        for (const modelKey of Object.keys(results[language][size][repo])) {
          if (modelKey === 'bestModel') continue; // Skip the bestModel entry
          
          const modelData = results[language][size][repo][modelKey];
          if (!modelData.scores) continue; // Skip if no scores available
          
          // Extract model parts
          const [provider, model] = modelKey.split('/');
          
          // Prepare category scores
          const categoryScores = {
            architecture: formatScore(modelData.categories?.architecture?.qualityScore),
            codeQuality: formatScore(modelData.categories?.codeQuality?.qualityScore),
            security: formatScore(modelData.categories?.security?.qualityScore),
            bestPractices: formatScore(modelData.categories?.bestPractices?.qualityScore),
            performance: formatScore(modelData.categories?.performance?.qualityScore)
          };
          
          // Extract pricing info
          const pricing = MODEL_PRICING[modelKey] || { input: 'N/A', output: 'N/A' };
          
          // Extract response time (using first available category)
          const responseTime = modelData.categories?.architecture?.responseTime || 
                              modelData.categories?.codeQuality?.responseTime || 
                              modelData.categories?.security?.responseTime || 
                              modelData.categories?.bestPractices?.responseTime || 
                              modelData.categories?.performance?.responseTime || 
                              'N/A';
           
          // Extract content size (using first available category)
          const contentSize = modelData.categories?.architecture?.contentSize || 
                             modelData.categories?.codeQuality?.contentSize || 
                             modelData.categories?.security?.contentSize || 
                             modelData.categories?.bestPractices?.contentSize || 
                             modelData.categories?.performance?.contentSize || 
                             'N/A';
          
          // Build CSV row
          const row = [
            language,
            size,
            repo,
            provider,
            model,
            formatScore(modelData.scores.quality),
            formatScore(modelData.scores.speed),
            formatScore(modelData.scores.price),
            formatScore(modelData.scores.combined),
            categoryScores.architecture,
            categoryScores.codeQuality,
            categoryScores.security,
            categoryScores.bestPractices,
            categoryScores.performance,
            responseTime,
            contentSize,
            pricing.input,
            pricing.output,
            bestModelForRepo === modelKey ? 'YES' : '',
            bestModelForLangSize === modelKey ? 'YES' : ''
          ];
          
          // Escape any values that contain commas
          const escapedRow = row.map(value => {
            if (typeof value === 'string' && value.includes(',')) {
              return `\"${value}\"`;
            }
            return value;
          });
          
          // Add row to CSV content
          csvContent += escapedRow.join(',') + '\n';
        }
      }
    }
  }
  
  // Write the CSV file
  try {
    fs.writeFileSync(outputPath, csvContent);
    console.log(`Detailed report generated successfully at ${outputPath}`);
  } catch (error) {
    console.error(`Error writing CSV file to ${outputPath}:`, error.message);
    throw error;
  }
  
  return Promise.resolve();
}

/**
 * Format score value for CSV output
 * @param {number|any} score - Score value to format
 * @return {string} - Formatted score
 */
function formatScore(score) {
  if (score === undefined || score === null) {
    return 'N/A';
  }
  
  if (typeof score === 'number') {
    return score.toFixed(2);
  }
  
  return score.toString();
}

module.exports = {
  generateDetailedReport
};