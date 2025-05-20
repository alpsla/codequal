/**
 * Utility functions for enhanced calibration
 */

const fs = require('fs');
const readline = require('readline');
const { RESULTS_FILE, ERROR_LOG_PATH, MODEL_PRICING } = require('./config');

// Manual API key registry
const manualApiKeys = {};

/**
 * Helper to get command line arguments
 * @param {string} argName - Argument name to search for
 * @return {string|null} - Argument value or null if not found
 */
function getCommandLineArg(argName) {
  const args = process.argv.slice(2);
  const arg = args.find(arg => arg.startsWith(`--${argName}=`));
  
  if (arg) {
    return arg.split('=')[1];
  }
  
  return null;
}

/**
 * Helper to load existing results
 * @return {object} - Loaded results or empty object
 */
function loadExistingResults() {
  if (fs.existsSync(RESULTS_FILE)) {
    try {
      const data = fs.readFileSync(RESULTS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading existing results:', error.message);
    }
  }
  
  return {};
}

/**
 * Helper to save results to file
 * @param {object} results - Results to save
 * @return {boolean} - Success status
 */
function saveResults(results) {
  try {
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving results:', error.message);
    return false;
  }
}

/**
 * Create readline interface for user input
 * @return {readline.Interface} - Readline interface object
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Promisified version of readline question
 * @param {readline.Interface} rl - Readline interface
 * @param {string} query - Question to ask
 * @return {Promise<string>} - User's answer
 */
function question(rl, query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

/**
 * Calculate price score based on model pricing
 * @param {string} provider - The provider name
 * @param {string} model - The model name
 * @return {number} - Price score on a scale of 0-10
 */
function calculatePriceScore(provider, model) {
  const modelKey = `${provider}/${model}`;
  const pricing = MODEL_PRICING[modelKey];
  
  if (!pricing) {
    console.warn(`No pricing information for ${modelKey}, using default price score`);
    return 5; // Default middle score
  }
  
  // Input and output costs are weighted with typical usage patterns
  // Assuming 3:1 ratio of input:output tokens
  const averageCost = (pricing.input * 3 + pricing.output) / 4;
  
  // Use a logarithmic scale for better distribution across price points
  // This will emphasize differences between low-cost models
  // while not over-penalizing mid-range models
  
  // Price benchmarks (per 1M tokens)
  const cheapestPrice = 0.25;  // Approximate lowest price (e.g., Claude 3 Haiku input)
  const expensivePrice = 30.0; // Approximate highest price (e.g., GPT-4 Turbo output)
  
  // Normalize to 0-1 scale with logarithmic scale
  // This makes differences between 0.25 and 1.0 more significant than
  // differences between 20.0 and 30.0
  const logMin = Math.log(cheapestPrice);
  const logMax = Math.log(expensivePrice);
  const logPrice = Math.log(Math.max(cheapestPrice, Math.min(expensivePrice, averageCost)));
  
  // Convert to 0-10 scale where 10 is cheapest
  const normalizedScore = (logMax - logPrice) / (logMax - logMin);
  const priceScore = normalizedScore * 10;
  
  console.log(`Price info for ${modelKey}: Input: $${pricing.input}, Output: $${pricing.output}, Avg: $${averageCost.toFixed(2)}, Score: ${priceScore.toFixed(2)}/10`);
  
  return Math.max(0, Math.min(10, priceScore));
}

/**
 * Log an error to the error log file
 * @param {string} message - Error message description
 * @param {Error} error - The error object
 */
function logError(message, error) {
  const timestamp = new Date().toISOString();
  const errorMessage = `[${timestamp}] ${message}: ${error.message}\n`;
  
  try {
    fs.appendFileSync(ERROR_LOG_PATH, errorMessage);
  } catch (logError) {
    // If we can't write to the log file, at least print to console
    console.error('Error writing to log file:', logError.message);
  }
  
  console.error(message, error.message);
}

module.exports = {
  manualApiKeys,
  getCommandLineArg,
  loadExistingResults,
  saveResults,
  createReadlineInterface,
  question,
  calculatePriceScore,
  logError
};