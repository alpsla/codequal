#!/usr/bin/env node
/**
 * Calibration Results Visualization
 * 
 * This script generates a markdown summary of model calibration results.
 * It shows comparisons between models, highlights key metrics, and generates
 * tables for easy review.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const RESULTS_PATH = path.join(__dirname, 'calibration-results', 'targeted-results.json');
const OUTPUT_REPORT_PATH = path.join(__dirname, 'calibration-results', 'calibration-report.md');

// Load results
if (!fs.existsSync(RESULTS_PATH)) {
  console.error(`Results file not found at ${RESULTS_PATH}`);
  process.exit(1);
}

const results = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8'));

// Generate report
function generateReport() {
  let report = `# Model Calibration Results\n\n`;
  report += `Generated on: ${new Date().toISOString()}\n\n`;
  
  // Add recommendations summary table
  report += `## Recommended Models by Category\n\n`;
  report += generateRecommendationTable(results.recommendations);
  
  // Detailed results by category
  report += `\n## Detailed Test Results\n\n`;
  
  // For each language and size category
  for (const [language, sizes] of Object.entries(results.categories)) {
    report += `### ${language.toUpperCase()}\n\n`;
    
    for (const [size, repos] of Object.entries(sizes)) {
      report += `#### ${size} Repositories\n\n`;
      
      // For each repository
      for (const [repo, repoData] of Object.entries(repos)) {
        report += `##### Repository: ${repo}\n\n`;
        
        // Compare models for this repository
        report += generateModelComparisonTable(repoData.providers);
        report += '\n\n';
      }
    }
  }
  
  // Write report
  fs.writeFileSync(OUTPUT_REPORT_PATH, report);
  console.log(`Report generated at ${OUTPUT_REPORT_PATH}`);
}

/**
 * Generate recommendation table
 */
function generateRecommendationTable(recommendations) {
  let table = '| Language | Size | Recommended Model | Combined Score | Quality Score | Response Time (s) |\n';
  table += '| -------- | ---- | ----------------- | -------------- | ------------- | ---------------- |\n';
  
  for (const [language, sizes] of Object.entries(recommendations)) {
    for (const [size, recommendation] of Object.entries(sizes)) {
      if (recommendation.provider && recommendation.model) {
        table += `| ${language} | ${size} | ${recommendation.provider}/${recommendation.model} | `;
        table += `${recommendation.combinedScore ? recommendation.combinedScore.toFixed(2) : 'N/A'} | `;
        table += `${recommendation.qualityScore ? recommendation.qualityScore.toFixed(2) : 'N/A'} | `;
        table += `${recommendation.performanceScore ? recommendation.performanceScore.toFixed(2) : 'N/A'} |\n`;
      }
    }
  }
  
  return table;
}

/**
 * Generate model comparison table for a repository
 */
function generateModelComparisonTable(providers) {
  const rows = [];
  
  // Collect data
  for (const [provider, providerData] of Object.entries(providers)) {
    for (const [model, modelData] of Object.entries(providerData.models)) {
      for (const [promptCategory, promptData] of Object.entries(modelData.prompts)) {
        if (promptData.success) {
          rows.push({
            provider,
            model,
            promptCategory,
            responseTime: promptData.responseTime,
            contentSize: promptData.contentSize,
            qualityScore: promptData.qualityScore || 'N/A'
          });
        }
      }
    }
  }
  
  if (rows.length === 0) {
    return '*No successful tests found for this repository*';
  }
  
  // Sort by quality score (high to low)
  rows.sort((a, b) => {
    const scoreA = a.qualityScore === 'N/A' ? 0 : a.qualityScore;
    const scoreB = b.qualityScore === 'N/A' ? 0 : b.qualityScore;
    return scoreB - scoreA;
  });
  
  // Generate table
  let table = '| Provider | Model | Category | Quality Score | Response Time (s) | Content Size |\n';
  table += '| -------- | ----- | -------- | ------------- | ---------------- | ------------ |\n';
  
  for (const row of rows) {
    table += `| ${row.provider} | ${row.model} | ${row.promptCategory} | `;
    table += `${row.qualityScore === 'N/A' ? 'N/A' : row.qualityScore.toFixed(2)} | `;
    table += `${row.responseTime.toFixed(2)} | `;
    table += `${formatBytes(row.contentSize)} |\n`;
  }
  
  return table;
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Run the script
generateReport();