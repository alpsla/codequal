/**
 * Model Scoring Variant Analysis
 * 
 * This script analyzes how different scoring formulas affect model selection.
 * It runs multiple analyses with different weight combinations to help determine
 * the optimal formula for specific use cases.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { calculateScore, DEFAULT_WEIGHTS } = require('./scoring-formula');

// Define different weight variants to test
const WEIGHT_VARIANTS = [
  { name: "Quality Focused", quality: 0.7, cost: 0.2, speed: 0.1 },
  { name: "Default Balance", quality: 0.5, cost: 0.35, speed: 0.15 },
  { name: "Cost Optimized", quality: 0.4, cost: 0.5, speed: 0.1 },
  { name: "Speed Focused", quality: 0.4, cost: 0.3, speed: 0.3 },
  { name: "Equal Weights", quality: 0.33, cost: 0.33, speed: 0.34 }
];

// Run analysis for each weight variant
function runAnalysisForVariants() {
  console.log('\n==== MODEL SCORING VARIANT ANALYSIS ====\n');
  console.log('This analysis shows how model selection changes with different scoring weights.\n');
  
  // Create a directory for variant reports
  const variantsDir = path.join(__dirname, 'calibration-reports', 'variants');
  if (!fs.existsSync(variantsDir)) {
    fs.mkdirSync(variantsDir, { recursive: true });
  }
  
  // Loop through each variant and run analysis
  const summaryRows = [];
  
  for (const variant of WEIGHT_VARIANTS) {
    console.log(`\n\n======== VARIANT: ${variant.name} ========`);
    console.log(`Weights: Quality=${variant.quality.toFixed(2)}, Cost=${variant.cost.toFixed(2)}, Speed=${variant.speed.toFixed(2)}\n`);
    
    // Run the analysis script with these weights
    const output = execSync(
      `node analyze-model-data.js --quality ${variant.quality} --cost ${variant.cost} --speed ${variant.speed}`,
      { encoding: 'utf8' }
    );
    
    console.log(output);
    
    // Save the output to a file
    const outputFile = path.join(variantsDir, `analysis-${variant.name.replace(/\s+/g, '-').toLowerCase()}.txt`);
    fs.writeFileSync(outputFile, output);
    
    // Extract model selections for summary
    const selectionsByRepo = extractModelSelections(output);
    summaryRows.push({
      variant: variant.name,
      weights: `Q:${variant.quality.toFixed(2)} C:${variant.cost.toFixed(2)} S:${variant.speed.toFixed(2)}`,
      selections: selectionsByRepo
    });
  }
  
  // Generate a comparative summary table
  generateComparisonTable(summaryRows);
}

// Extract model selections from analysis output
function extractModelSelections(output) {
  const selections = {};
  const repoLines = output.split('\n').filter(line => 
    !line.startsWith('===') && 
    !line.startsWith('---') && 
    !line.startsWith('REPOSITORY') &&
    line.includes(' | ') && 
    line.trim() !== ''
  );
  
  for (const line of repoLines) {
    const parts = line.split(' | ');
    if (parts.length >= 5) {
      const repo = parts[0].trim();
      const bestModel = parts[4].trim();
      selections[repo] = bestModel;
    }
  }
  
  return selections;
}

// Generate a comparison table showing model selections across variants
function generateComparisonTable(summaryRows) {
  console.log('\n\n========== COMPARATIVE ANALYSIS SUMMARY ==========\n');
  
  // Get all unique repositories
  const allRepos = new Set();
  for (const row of summaryRows) {
    Object.keys(row.selections).forEach(repo => allRepos.add(repo));
  }
  const repos = Array.from(allRepos).sort();
  
  // Calculate column widths
  const variantWidth = Math.max(...summaryRows.map(r => r.variant.length), 10);
  const weightsWidth = Math.max(...summaryRows.map(r => r.weights.length), 10);
  const repoWidth = Math.max(...repos.map(r => r.length), 30);
  
  // Print header
  console.log('VARIANT'.padEnd(variantWidth + 2) + 
              'WEIGHTS'.padEnd(weightsWidth + 2) + 
              repos.map(r => r.padEnd(repoWidth + 2)).join(''));
  
  console.log('-'.repeat(variantWidth + 2) + 
              '-'.repeat(weightsWidth + 2) + 
              '-'.repeat((repoWidth + 2) * repos.length));
  
  // Print rows
  for (const row of summaryRows) {
    const repoSelections = repos.map(repo => {
      const selection = row.selections[repo] || 'N/A';
      return selection.padEnd(repoWidth + 2);
    }).join('');
    
    console.log(row.variant.padEnd(variantWidth + 2) + 
                row.weights.padEnd(weightsWidth + 2) + 
                repoSelections);
  }
  
  // Save the comparison table to a CSV file
  saveComparisonToCSV(repos, summaryRows);
  
  console.log('\nAnalysis complete! Use these results to determine the optimal scoring formula for your needs.');
}

// Save comparison data to CSV for easy spreadsheet analysis
function saveComparisonToCSV(repos, summaryRows) {
  const csvFile = path.join(__dirname, 'calibration-reports', 'variants', 'scoring-comparison.csv');
  
  // Create header row
  const header = ['Variant', 'Quality', 'Cost', 'Speed', ...repos];
  
  // Create data rows
  const rows = summaryRows.map(row => {
    const weights = row.weights.split(' ');
    const quality = weights[0].replace('Q:', '');
    const cost = weights[1].replace('C:', '');
    const speed = weights[2].replace('S:', '');
    
    const repoSelections = repos.map(repo => row.selections[repo] || 'N/A');
    
    return [row.variant, quality, cost, speed, ...repoSelections];
  });
  
  // Combine header and rows
  const csvContent = [header, ...rows].map(row => row.join(',')).join('\n');
  
  // Write to file
  fs.writeFileSync(csvFile, csvContent);
  console.log(`\nComparative analysis saved to ${csvFile}`);
}

// Run the main function
runAnalysisForVariants();