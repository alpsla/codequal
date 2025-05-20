/**
 * DeepSeek Test Report Generator
 * 
 * This script generates comprehensive reports from DeepSeek testing results
 * for comparison with other models.
 * 
 * Usage: node generate-test-report.js [results_directory]
 */

/* eslint-env node */
/* eslint-disable no-console, @typescript-eslint/no-var-requires, @typescript-eslint/no-unused-vars */

const fs = require('fs');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');

// Default results directory
const RESULTS_DIR = process.argv[2] || 'deepseek-test-results';

// Output files
const SUMMARY_CSV = path.join(RESULTS_DIR, 'summary.csv');
const LANGUAGE_SUMMARY_CSV = path.join(RESULTS_DIR, 'language_summary.csv');
const MODEL_SUMMARY_CSV = path.join(RESULTS_DIR, 'model_summary.csv');
const SIZE_SUMMARY_CSV = path.join(RESULTS_DIR, 'size_summary.csv');
const DETAILED_METRICS_CSV = path.join(RESULTS_DIR, 'detailed_metrics.csv');
const SUMMARY_MARKDOWN = path.join(RESULTS_DIR, 'summary.md');

console.log(`Generating report from results in ${RESULTS_DIR}`);

// Check if results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
  console.error(`Error: Results directory ${RESULTS_DIR} does not exist`);
  process.exit(1);
}

// Find all metrics files
function findMetricsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findMetricsFiles(filePath, fileList);
    } else if (file === 'metrics.json') {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

const metricsFiles = findMetricsFiles(RESULTS_DIR);
console.log(`Found ${metricsFiles.length} test results`);

// Parse metrics files
const results = metricsFiles.map(file => {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return data;
  } catch (error) {
    console.error(`Error parsing ${file}: ${error.message}`);
    return null;
  }
}).filter(Boolean);

// Group results by different dimensions
const groupByModel = {};
const groupByLanguage = {};
const groupBySize = {};
const groupByLanguageAndModel = {};
const groupBySizeAndModel = {};

results.forEach(result => {
  const { model, language, size } = result;
  
  // Group by model
  if (!groupByModel[model]) {
    groupByModel[model] = [];
  }
  groupByModel[model].push(result);
  
  // Group by language
  if (!groupByLanguage[language]) {
    groupByLanguage[language] = [];
  }
  groupByLanguage[language].push(result);
  
  // Group by size
  if (!groupBySize[size]) {
    groupBySize[size] = [];
  }
  groupBySize[size].push(result);
  
  // Group by language and model
  const langModelKey = `${language}:${model}`;
  if (!groupByLanguageAndModel[langModelKey]) {
    groupByLanguageAndModel[langModelKey] = [];
  }
  groupByLanguageAndModel[langModelKey].push(result);
  
  // Group by size and model
  const sizeModelKey = `${size}:${model}`;
  if (!groupBySizeAndModel[sizeModelKey]) {
    groupBySizeAndModel[sizeModelKey] = [];
  }
  groupBySizeAndModel[sizeModelKey].push(result);
});

// Calculate averages for a group
function calculateAverages(group) {
  const count = group.length;
  const avgResponseTime = group.reduce((sum, item) => sum + parseFloat(item.response_time), 0) / count;
  const avgContentSize = group.reduce((sum, item) => sum + parseInt(item.content_size), 0) / count;
  
  return {
    count,
    avgResponseTime,
    avgContentSize
  };
}

// Generate overall summary
const modelSummaries = Object.entries(groupByModel).map(([model, group]) => {
  const { count, avgResponseTime, avgContentSize } = calculateAverages(group);
  return {
    model,
    testCount: count,
    avgResponseTime: avgResponseTime.toFixed(2),
    avgContentSize: avgContentSize.toFixed(0)
  };
});

// Write model summary CSV
const modelSummaryCsvWriter = createObjectCsvWriter({
  path: MODEL_SUMMARY_CSV,
  header: [
    { id: 'model', title: 'Model' },
    { id: 'testCount', title: 'Test Count' },
    { id: 'avgResponseTime', title: 'Avg Response Time (s)' },
    { id: 'avgContentSize', title: 'Avg Content Size (bytes)' }
  ]
});

modelSummaryCsvWriter.writeRecords(modelSummaries)
  .then(() => console.log(`Model summary written to ${MODEL_SUMMARY_CSV}`));

// Generate language summary
const languageSummaries = Object.entries(groupByLanguage).map(([language, group]) => {
  const { count, avgResponseTime, avgContentSize } = calculateAverages(group);
  return {
    language,
    testCount: count,
    avgResponseTime: avgResponseTime.toFixed(2),
    avgContentSize: avgContentSize.toFixed(0)
  };
});

// Write language summary CSV
const languageSummaryCsvWriter = createObjectCsvWriter({
  path: LANGUAGE_SUMMARY_CSV,
  header: [
    { id: 'language', title: 'Language' },
    { id: 'testCount', title: 'Test Count' },
    { id: 'avgResponseTime', title: 'Avg Response Time (s)' },
    { id: 'avgContentSize', title: 'Avg Content Size (bytes)' }
  ]
});

languageSummaryCsvWriter.writeRecords(languageSummaries)
  .then(() => console.log(`Language summary written to ${LANGUAGE_SUMMARY_CSV}`));

// Generate size summary
const sizeSummaries = Object.entries(groupBySize).map(([size, group]) => {
  const { count, avgResponseTime, avgContentSize } = calculateAverages(group);
  return {
    size,
    testCount: count,
    avgResponseTime: avgResponseTime.toFixed(2),
    avgContentSize: avgContentSize.toFixed(0)
  };
});

// Write size summary CSV
const sizeSummaryCsvWriter = createObjectCsvWriter({
  path: SIZE_SUMMARY_CSV,
  header: [
    { id: 'size', title: 'Repository Size' },
    { id: 'testCount', title: 'Test Count' },
    { id: 'avgResponseTime', title: 'Avg Response Time (s)' },
    { id: 'avgContentSize', title: 'Avg Content Size (bytes)' }
  ]
});

sizeSummaryCsvWriter.writeRecords(sizeSummaries)
  .then(() => console.log(`Size summary written to ${SIZE_SUMMARY_CSV}`));

// Generate language-model combinations
const languageModelSummaries = Object.entries(groupByLanguageAndModel).map(([key, group]) => {
  const [language, model] = key.split(':');
  const { count, avgResponseTime, avgContentSize } = calculateAverages(group);
  return {
    language,
    model,
    testCount: count,
    avgResponseTime: avgResponseTime.toFixed(2),
    avgContentSize: avgContentSize.toFixed(0)
  };
});

// Generate size-model combinations
const sizeModelSummaries = Object.entries(groupBySizeAndModel).map(([key, group]) => {
  const [size, model] = key.split(':');
  const { count, avgResponseTime, avgContentSize } = calculateAverages(group);
  return {
    size,
    model,
    testCount: count,
    avgResponseTime: avgResponseTime.toFixed(2),
    avgContentSize: avgContentSize.toFixed(0)
  };
});

// Generate overall summary
const overallSummary = {
  totalTests: results.length,
  uniqueModels: Object.keys(groupByModel).length,
  uniqueLanguages: Object.keys(groupByLanguage).length,
  uniqueSizes: Object.keys(groupBySize).length,
  avgResponseTime: (results.reduce((sum, result) => sum + parseFloat(result.response_time), 0) / results.length).toFixed(2),
  avgContentSize: (results.reduce((sum, result) => sum + parseInt(result.content_size), 0) / results.length).toFixed(0)
};

// Write detailed metrics CSV
const detailedCsvWriter = createObjectCsvWriter({
  path: DETAILED_METRICS_CSV,
  header: [
    { id: 'repository', title: 'Repository' },
    { id: 'model', title: 'Model' },
    { id: 'language', title: 'Language' },
    { id: 'size', title: 'Size' },
    { id: 'response_time', title: 'Response Time (s)' },
    { id: 'content_size', title: 'Content Size (bytes)' },
    { id: 'timestamp', title: 'Timestamp' }
  ]
});

detailedCsvWriter.writeRecords(results)
  .then(() => console.log(`Detailed metrics written to ${DETAILED_METRICS_CSV}`));

// Generate summary CSV
const summaryCsvWriter = createObjectCsvWriter({
  path: SUMMARY_CSV,
  header: [
    { id: 'category', title: 'Category' },
    { id: 'name', title: 'Name' },
    { id: 'avgResponseTime', title: 'Avg Response Time (s)' },
    { id: 'avgContentSize', title: 'Avg Content Size (bytes)' },
    { id: 'testCount', title: 'Test Count' }
  ]
});

// Build summary records
const summaryRecords = [
  { category: 'Overall', name: 'All Tests', avgResponseTime: overallSummary.avgResponseTime, avgContentSize: overallSummary.avgContentSize, testCount: overallSummary.totalTests },
  ...modelSummaries.map(summary => ({ category: 'Model', ...summary })),
  ...languageSummaries.map(summary => ({ category: 'Language', ...summary })),
  ...sizeSummaries.map(summary => ({ category: 'Size', ...summary }))
];

summaryCsvWriter.writeRecords(summaryRecords)
  .then(() => console.log(`Summary written to ${SUMMARY_CSV}`));

// Generate best model recommendations by language
const bestModelsByLanguage = {};

Object.keys(groupByLanguage).forEach(language => {
  // Get all results for this language
  const langResults = results.filter(result => result.language === language);
  
  // Group by model
  const modelGroups = {};
  langResults.forEach(result => {
    if (!modelGroups[result.model]) {
      modelGroups[result.model] = [];
    }
    modelGroups[result.model].push(result);
  });
  
  // Calculate averages for each model
  const modelAverages = Object.entries(modelGroups).map(([model, group]) => {
    const { avgResponseTime, avgContentSize } = calculateAverages(group);
    return {
      model,
      avgResponseTime,
      avgContentSize,
      // Calculate a composite score (lower response time and higher content size is better)
      score: (avgContentSize / 1000) - (avgResponseTime * 0.5)
    };
  });
  
  // Sort by score (highest first)
  modelAverages.sort((a, b) => b.score - a.score);
  
  // Get top model
  bestModelsByLanguage[language] = modelAverages[0];
});

// Generate best model recommendations by size
const bestModelsBySize = {};

Object.keys(groupBySize).forEach(size => {
  // Get all results for this size
  const sizeResults = results.filter(result => result.size === size);
  
  // Group by model
  const modelGroups = {};
  sizeResults.forEach(result => {
    if (!modelGroups[result.model]) {
      modelGroups[result.model] = [];
    }
    modelGroups[result.model].push(result);
  });
  
  // Calculate averages for each model
  const modelAverages = Object.entries(modelGroups).map(([model, group]) => {
    const { avgResponseTime, avgContentSize } = calculateAverages(group);
    return {
      model,
      avgResponseTime,
      avgContentSize,
      // Calculate a composite score (lower response time and higher content size is better)
      score: (avgContentSize / 1000) - (avgResponseTime * 0.5)
    };
  });
  
  // Sort by score (highest first)
  modelAverages.sort((a, b) => b.score - a.score);
  
  // Get top model
  bestModelsBySize[size] = modelAverages[0];
});

// Generate markdown summary
const markdownSummary = `# DeepSeek Model Testing Summary

## Overview

- **Total Tests**: ${overallSummary.totalTests}
- **Unique Models**: ${overallSummary.uniqueModels}
- **Languages Tested**: ${overallSummary.uniqueLanguages}
- **Repository Sizes**: ${overallSummary.uniqueSizes}
- **Average Response Time**: ${overallSummary.avgResponseTime} seconds
- **Average Content Size**: ${overallSummary.avgContentSize} bytes

## Model Performance

| Model | Response Time (s) | Content Size (bytes) | Test Count |
|-------|------------------|---------------------|------------|
${modelSummaries.map(summary => `| ${summary.model} | ${summary.avgResponseTime} | ${summary.avgContentSize} | ${summary.testCount} |`).join('\n')}

## Performance by Language

| Language | Best Model | Response Time (s) | Content Size (bytes) |
|----------|------------|------------------|---------------------|
${Object.entries(bestModelsByLanguage).map(([language, best]) => `| ${language} | ${best.model} | ${best.avgResponseTime.toFixed(2)} | ${best.avgContentSize.toFixed(0)} |`).join('\n')}

## Performance by Repository Size

| Size | Best Model | Response Time (s) | Content Size (bytes) |
|------|------------|------------------|---------------------|
${Object.entries(bestModelsBySize).map(([size, best]) => `| ${size} | ${best.model} | ${best.avgResponseTime.toFixed(2)} | ${best.avgContentSize.toFixed(0)} |`).join('\n')}

## Key Insights

${Object.entries(bestModelsByLanguage)
  .map(([language, best]) => `- For ${language} repositories, ${best.model} performs best with an average response time of ${best.avgResponseTime.toFixed(2)}s and content size of ${best.avgContentSize.toFixed(0)} bytes.`)
  .join('\n')}

${Object.entries(bestModelsBySize)
  .map(([size, best]) => `- For ${size} repositories, ${best.model} performs best with an average response time of ${best.avgResponseTime.toFixed(2)}s and content size of ${best.avgContentSize.toFixed(0)} bytes.`)
  .join('\n')}

## Recommended Model Configuration

Based on these test results, the following model configuration is recommended:

\`\`\`typescript
const RECOMMENDED_MODEL_CONFIGS = {
${Object.entries(bestModelsByLanguage)
  .map(([language, best]) => `  '${language}': {
    'small': { provider: '${best.model.split('/')[0]}', model: '${best.model.split('/')[1]}' },
    'medium': { provider: '${best.model.split('/')[0]}', model: '${best.model.split('/')[1]}' },
    'large': { provider: '${best.model.split('/')[0]}', model: '${best.model.split('/')[1]}' }
  },`)
  .join('\n')}
  'default': {
    'small': { provider: '${bestModelsBySize.small?.model.split('/')[0] || 'openai'}', model: '${bestModelsBySize.small?.model.split('/')[1] || 'gpt-4o'}' },
    'medium': { provider: '${bestModelsBySize.medium?.model.split('/')[0] || 'anthropic'}', model: '${bestModelsBySize.medium?.model.split('/')[1] || 'claude-3-7-sonnet'}' },
    'large': { provider: '${bestModelsBySize.large?.model.split('/')[0] || 'google'}', model: '${bestModelsBySize.large?.model.split('/')[1] || 'gemini-2.5-pro-preview-05-06'}' }
  }
};
\`\`\`

*Note: This recommendation is based purely on quantitative metrics. Actual model selection should also consider qualitative factors such as accuracy, comprehensiveness, and educational value.*
`;

// Write markdown summary
fs.writeFileSync(SUMMARY_MARKDOWN, markdownSummary);
console.log(`Markdown summary written to ${SUMMARY_MARKDOWN}`);

console.log('Report generation complete');
