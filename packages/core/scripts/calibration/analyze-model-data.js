/**
 * Model Comparison Data Analyzer
 * 
 * This script analyzes the collected calibration data and allows
 * experimenting with different scoring formulas to find optimal 
 * model selections for different repository types.
 */

const fs = require('fs');
const path = require('path');
const { calculateScore, DEFAULT_WEIGHTS } = require('./scoring-formula');

// Directory where calibration reports are stored
const REPORTS_DIR = path.join(__dirname, 'calibration-reports');
const ALL_MODELS_DATA_FILE = path.join(REPORTS_DIR, 'all-models-data.csv');

/**
 * Parse the CSV data into structured objects
 */
function parseCSVData(csvPath) {
  try {
    // Check if file exists
    if (!fs.existsSync(csvPath)) {
      console.error(`CSV file not found: ${csvPath}`);
      return [];
    }
    
    // Read and parse the CSV file
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
      console.warn('CSV file contains no data rows');
      return [];
    }
    
    // Parse header line to get column indexes
    const header = lines[0].split(',');
    const indexes = {};
    header.forEach((colName, index) => {
      indexes[colName.trim()] = index;
    });
    
    // Process data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      
      // Skip invalid rows
      if (cols.length !== header.length) {
        console.warn(`Skipping invalid row ${i}: ${lines[i]}`);
        continue;
      }
      
      data.push({
        repository: cols[indexes.repository],
        language: cols[indexes.language],
        sizeCategory: cols[indexes.size_category],
        provider: cols[indexes.provider],
        model: cols[indexes.model],
        weightedScore: parseFloat(cols[indexes.weighted_score]),
        metrics: {
          qualityScore: parseFloat(cols[indexes.quality_score]),
          responseTime: parseFloat(cols[indexes.response_time_ms]),
          costEstimate: {
            totalCost: parseFloat(cols[indexes.cost_estimate])
          }
        },
        rawComponents: {
          quality: parseFloat(cols[indexes.quality_component_raw]),
          cost: parseFloat(cols[indexes.cost_component_raw]),
          speed: parseFloat(cols[indexes.speed_component_raw])
        },
        timestamp: cols[indexes.timestamp]
      });
    }
    
    return data;
  } catch (error) {
    console.error('Error parsing CSV data:', error);
    return [];
  }
}

/**
 * Group data by repository characteristics
 */
function groupDataByRepository(data) {
  const grouped = {};
  
  data.forEach(entry => {
    const key = `${entry.repository}|${entry.language}|${entry.sizeCategory}`;
    
    if (!grouped[key]) {
      grouped[key] = {
        repository: entry.repository,
        language: entry.language,
        sizeCategory: entry.sizeCategory,
        models: []
      };
    }
    
    grouped[key].models.push({
      provider: entry.provider,
      model: entry.model,
      metrics: entry.metrics,
      originalWeightedScore: entry.weightedScore,
      timestamp: entry.timestamp
    });
  });
  
  return grouped;
}

/**
 * Apply a scoring formula to grouped data
 */
function applyFormula(groupedData, weights = DEFAULT_WEIGHTS) {
  const results = {};
  
  Object.keys(groupedData).forEach(key => {
    const group = groupedData[key];
    
    // Calculate scores for each model
    const scoredModels = group.models.map(model => {
      const scoreResult = calculateScore(model.metrics, weights);
      
      return {
        ...model,
        scoreResult,
        newWeightedScore: scoreResult.weightedScore
      };
    });
    
    // Sort by new weighted score (highest first)
    scoredModels.sort((a, b) => b.newWeightedScore - a.newWeightedScore);
    
    // Store the results
    results[key] = {
      ...group,
      scoredModels,
      bestModel: scoredModels.length > 0 ? scoredModels[0] : null
    };
  });
  
  return results;
}

/**
 * Display results table with original and new scores
 */
function displayResults(results, weights) {
  console.log('\n===== MODEL SELECTION ANALYSIS =====');
  console.log(`Scoring Formula Weights: Quality=${weights.quality * 100}%, Cost=${weights.cost * 100}%, Speed=${weights.speed * 100}%\n`);
  
  // Table header
  console.log('REPOSITORY'.padEnd(30) + ' | ' + 
              'LANGUAGE'.padEnd(12) + ' | ' + 
              'SIZE'.padEnd(8) + ' | ' + 
              'ORIGINAL MODEL'.padEnd(25) + ' | ' + 
              'NEW BEST MODEL'.padEnd(25) + ' | ' + 
              'SCORE CHANGE');
  
  console.log('-'.repeat(125));
  
  // Table rows
  Object.values(results).forEach(result => {
    if (!result.bestModel) return;
    
    // Find the model with the highest original score
    const originalBestModel = [...result.scoredModels].sort((a, b) => b.originalWeightedScore - a.originalWeightedScore)[0];
    
    // Determine if selection changed
    const modelChanged = originalBestModel.provider !== result.bestModel.provider || 
                         originalBestModel.model !== result.bestModel.model;
    
    const scoreChange = ((result.bestModel.newWeightedScore / originalBestModel.originalWeightedScore) - 1) * 100;
    
    // Format the row
    console.log(
      result.repository.padEnd(30) + ' | ' +
      result.language.padEnd(12) + ' | ' +
      result.sizeCategory.padEnd(8) + ' | ' +
      `${originalBestModel.provider}/${originalBestModel.model}`.padEnd(25) + ' | ' +
      `${result.bestModel.provider}/${result.bestModel.model}`.padEnd(25) + ' | ' +
      `${scoreChange.toFixed(2)}%` + (modelChanged ? ' (*)' : '')
    );
  });
  
  console.log('\n(*) Selection changed with new formula');
}

/**
 * Print detailed metrics for the selected model
 */
function printDetailedMetrics(model, weights) {
  console.log(`\n----- Detailed Metrics for ${model.provider}/${model.model} -----`);
  console.log(`Quality Score: ${model.metrics.qualityScore.toFixed(4)} (weight: ${weights.quality})`);
  console.log(`Response Time: ${model.metrics.responseTime.toFixed(2)}ms (weight: ${weights.speed})`);
  console.log(`Cost Estimate: $${model.metrics.costEstimate.totalCost.toFixed(6)} (weight: ${weights.cost})`);
  console.log('\nScore Components:');
  console.log(`- Quality Component: ${model.scoreResult.components.qualityComponent.toFixed(4)} (${(model.scoreResult.components.qualityComponent / model.scoreResult.weightedScore * 100).toFixed(2)}% of total)`);
  console.log(`- Cost Component: ${model.scoreResult.components.costComponent.toFixed(4)} (${(model.scoreResult.components.costComponent / model.scoreResult.weightedScore * 100).toFixed(2)}% of total)`);
  console.log(`- Speed Component: ${model.scoreResult.components.speedComponent.toFixed(4)} (${(model.scoreResult.components.speedComponent / model.scoreResult.weightedScore * 100).toFixed(2)}% of total)`);
  console.log(`Final Weighted Score: ${model.scoreResult.weightedScore.toFixed(4)}`);
}

/**
 * Main function
 */
function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  // Set weights from command line or use defaults
  const weights = { ...DEFAULT_WEIGHTS };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--quality' && args[i+1]) {
      weights.quality = parseFloat(args[i+1]);
      i++;
    } else if (args[i] === '--cost' && args[i+1]) {
      weights.cost = parseFloat(args[i+1]);
      i++;
    } else if (args[i] === '--speed' && args[i+1]) {
      weights.speed = parseFloat(args[i+1]);
      i++;
    } else if (args[i] === '--help') {
      console.log('Usage: node analyze-model-data.js [--quality X] [--cost Y] [--speed Z]');
      console.log('  X, Y, Z are weights between 0 and 1, and should sum to 1.0');
      console.log('  Default weights: quality=0.5, cost=0.35, speed=0.15');
      return;
    }
  }
  
  // Normalize weights to ensure they sum to 1.0
  const sum = weights.quality + weights.cost + weights.speed;
  if (Math.abs(sum - 1.0) > 0.001) {
    console.warn(`Weights sum to ${sum}, normalizing to 1.0`);
    weights.quality /= sum;
    weights.cost /= sum;
    weights.speed /= sum;
  }
  
  // Parse the data
  const data = parseCSVData(ALL_MODELS_DATA_FILE);
  
  if (data.length === 0) {
    console.error('No data found. Please run generate-comparison-data.sh to collect model performance data first.');
    return;
  }
  
  console.log(`Loaded ${data.length} data points from ${ALL_MODELS_DATA_FILE}`);
  
  // Group by repository
  const groupedData = groupDataByRepository(data);
  
  // Apply the scoring formula with specified weights
  const results = applyFormula(groupedData, weights);
  
  // Display results
  displayResults(results, weights);
  
  // Print detailed metrics for each best model
  console.log('\n===== DETAILED METRICS FOR BEST MODELS =====');
  Object.values(results).forEach(result => {
    if (result.bestModel) {
      printDetailedMetrics(result.bestModel, weights);
    }
  });
  
  console.log('\nAnalysis complete!');
}

// Run the main function
main();