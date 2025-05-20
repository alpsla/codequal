#!/usr/bin/env node
/**
 * Calibration Results Dashboard Generator
 * 
 * This script generates an HTML dashboard with interactive charts
 * for visualizing model calibration results.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const RESULTS_PATH = path.join(__dirname, 'calibration-results', 'targeted-results.json');
const OUTPUT_DASHBOARD_PATH = path.join(__dirname, 'calibration-results', 'dashboard.html');

// Load results
if (!fs.existsSync(RESULTS_PATH)) {
  console.error(`Results file not found at ${RESULTS_PATH}`);
  process.exit(1);
}

const results = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8'));

// Generate dashboard
function generateDashboard() {
  // Extract data for charts
  const chartData = prepareChartData(results);
  
  // Create HTML content
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Model Calibration Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      color: #333;
    }
    .dashboard {
      max-width: 1200px;
      margin: 0 auto;
    }
    .chart-container {
      margin-bottom: 30px;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .table-container {
      margin-bottom: 30px;
      overflow-x: auto;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th, td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f2f2f2;
    }
    .model-label {
      font-weight: bold;
    }
    .score-high {
      color: green;
    }
    .score-medium {
      color: orange;
    }
    .score-low {
      color: red;
    }
    .filters {
      margin-bottom: 20px;
      display: flex;
      gap: 15px;
    }
    select {
      padding: 8px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="dashboard">
    <h1>Model Calibration Dashboard</h1>
    <p>Generated on: ${new Date().toISOString()}</p>
    
    <div class="filters">
      <div>
        <label for="languageFilter">Language:</label>
        <select id="languageFilter" onchange="filterResults()">
          <option value="all">All Languages</option>
          ${Object.keys(results.categories).map(lang => 
            `<option value="${lang}">${lang}</option>`
          ).join('')}
        </select>
      </div>
      <div>
        <label for="sizeFilter">Size:</label>
        <select id="sizeFilter" onchange="filterResults()">
          <option value="all">All Sizes</option>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>
      <div>
        <label for="metricFilter">Primary Metric:</label>
        <select id="metricFilter" onchange="filterResults()">
          <option value="combined">Combined Score</option>
          <option value="quality">Quality Score</option>
          <option value="speed">Response Time</option>
        </select>
      </div>
    </div>
    
    <div class="chart-container">
      <h2>Model Performance by Language</h2>
      <canvas id="languageChart"></canvas>
    </div>
    
    <div class="chart-container">
      <h2>Quality vs. Speed</h2>
      <canvas id="qualitySpeedChart"></canvas>
    </div>
    
    <div class="chart-container">
      <h2>Model Performance by Category</h2>
      <canvas id="categoryChart"></canvas>
    </div>
    
    <div class="table-container">
      <h2>Recommended Models</h2>
      <table id="recommendationsTable">
        <thead>
          <tr>
            <th>Language</th>
            <th>Size</th>
            <th>Recommended Model</th>
            <th>Combined Score</th>
            <th>Quality Score</th>
            <th>Response Time (s)</th>
          </tr>
        </thead>
        <tbody>
          ${generateRecommendationRows(results.recommendations)}
        </tbody>
      </table>
    </div>
  </div>

  <script>
    // Chart data
    const chartData = ${JSON.stringify(chartData)};
    
    // Initialize charts
    document.addEventListener('DOMContentLoaded', () => {
      renderLanguageChart();
      renderQualitySpeedChart();
      renderCategoryChart();
    });
    
    function renderLanguageChart() {
      const ctx = document.getElementById('languageChart').getContext('2d');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: chartData.languageLabels,
          datasets: chartData.languageDatasets
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Combined Score (0-10)'
              }
            }
          }
        }
      });
    }
    
    function renderQualitySpeedChart() {
      const ctx = document.getElementById('qualitySpeedChart').getContext('2d');
      new Chart(ctx, {
        type: 'scatter',
        data: {
          datasets: chartData.qualitySpeedDatasets
        },
        options: {
          responsive: true,
          scales: {
            x: {
              title: {
                display: true,
                text: 'Response Time (seconds)'
              }
            },
            y: {
              title: {
                display: true,
                text: 'Quality Score (0-10)'
              }
            }
          }
        }
      });
    }
    
    function renderCategoryChart() {
      const ctx = document.getElementById('categoryChart').getContext('2d');
      new Chart(ctx, {
        type: 'radar',
        data: {
          labels: chartData.categoryLabels,
          datasets: chartData.categoryDatasets
        },
        options: {
          responsive: true,
          scales: {
            r: {
              beginAtZero: true,
              max: 10
            }
          }
        }
      });
    }
    
    function filterResults() {
      // This would filter the table and charts based on selection
      // For a full implementation, we'd need to redraw charts with filtered data
      const language = document.getElementById('languageFilter').value;
      const size = document.getElementById('sizeFilter').value;
      const metric = document.getElementById('metricFilter').value;
      
      console.log('Filtering by:', language, size, metric);
      
      // Filter table rows
      const rows = document.querySelectorAll('#recommendationsTable tbody tr');
      rows.forEach(row => {
        const rowLang = row.querySelector('td:first-child').textContent;
        const rowSize = row.querySelector('td:nth-child(2)').textContent;
        
        const langMatch = language === 'all' || rowLang === language;
        const sizeMatch = size === 'all' || rowSize === size;
        
        row.style.display = langMatch && sizeMatch ? '' : 'none';
      });
    }
  </script>
</body>
</html>
  `;
  
  // Write dashboard
  fs.writeFileSync(OUTPUT_DASHBOARD_PATH, html);
  console.log(`Dashboard generated at ${OUTPUT_DASHBOARD_PATH}`);
}

/**
 * Prepare data for charts
 */
function prepareChartData(results) {
  // Extract languages and models
  const languages = Object.keys(results.categories);
  const allModels = new Set();
  const modelScores = {};
  const modelColors = {
    'openai': 'rgba(0, 128, 255, 0.7)',
    'anthropic': 'rgba(255, 64, 129, 0.7)',
    'google': 'rgba(255, 193, 7, 0.7)',
    'deepseek': 'rgba(76, 175, 80, 0.7)',
    'openrouter': 'rgba(156, 39, 176, 0.7)'
  };
  
  // Collect scores by language for each model
  for (const [language, sizes] of Object.entries(results.recommendations)) {
    for (const [size, recommendation] of Object.entries(sizes)) {
      if (recommendation.provider && recommendation.model) {
        const modelKey = `${recommendation.provider}/${recommendation.model}`;
        allModels.add(modelKey);
        
        if (!modelScores[modelKey]) {
          modelScores[modelKey] = {
            language: {},
            qualitySpeed: [],
            categories: {}
          };
        }
        
        // Add language score
        if (!modelScores[modelKey].language[language]) {
          modelScores[modelKey].language[language] = [];
        }
        modelScores[modelKey].language[language].push({
          size,
          combined: recommendation.combinedScore || 0,
          quality: recommendation.qualityScore || 0,
          speed: recommendation.performanceScore || 0
        });
        
        // Add quality-speed point
        modelScores[modelKey].qualitySpeed.push({
          x: recommendation.performanceScore || 0,
          y: recommendation.qualityScore || 0,
          language,
          size
        });
      }
    }
  }
  
  // Prepare language chart datasets
  const languageDatasets = [];
  for (const modelKey of allModels) {
    const [provider, model] = modelKey.split('/');
    const color = modelColors[provider] || 'rgba(100, 100, 100, 0.7)';
    
    const data = languages.map(language => {
      if (modelScores[modelKey]?.language[language]) {
        // Average across sizes
        const scores = modelScores[modelKey].language[language];
        return scores.reduce((sum, s) => sum + (s.combined || 0), 0) / scores.length;
      }
      return 0;
    });
    
    languageDatasets.push({
      label: modelKey,
      data,
      backgroundColor: color,
      borderColor: color.replace('0.7', '1.0'),
      borderWidth: 1
    });
  }
  
  // Prepare quality-speed datasets
  const qualitySpeedDatasets = [];
  for (const modelKey of allModels) {
    const [provider, model] = modelKey.split('/');
    const color = modelColors[provider] || 'rgba(100, 100, 100, 0.7)';
    
    qualitySpeedDatasets.push({
      label: modelKey,
      data: modelScores[modelKey].qualitySpeed,
      backgroundColor: color,
      borderColor: color.replace('0.7', '1.0'),
      borderWidth: 1,
      pointRadius: 5,
      pointHoverRadius: 7
    });
  }
  
  // Prepare category labels (prompt types)
  const allCategories = new Set();
  for (const [language, sizes] of Object.entries(results.categories)) {
    for (const [size, repos] of Object.entries(sizes)) {
      for (const [repo, repoData] of Object.entries(repos)) {
        for (const [provider, providerData] of Object.entries(repoData.providers)) {
          for (const [model, modelData] of Object.entries(providerData.models)) {
            for (const promptCategory of Object.keys(modelData.prompts)) {
              allCategories.add(promptCategory);
            }
          }
        }
      }
    }
  }
  const categoryLabels = Array.from(allCategories);
  
  // Prepare category datasets
  const categoryDatasets = [];
  for (const modelKey of allModels) {
    const [provider, model] = modelKey.split('/');
    const color = modelColors[provider] || 'rgba(100, 100, 100, 0.7)';
    
    // Calculate average quality score per category
    const categoryScores = {};
    for (const [language, sizes] of Object.entries(results.categories)) {
      for (const [size, repos] of Object.entries(sizes)) {
        for (const [repo, repoData] of Object.entries(repos)) {
          if (repoData.providers[provider]?.models[model]) {
            for (const [promptCategory, promptData] of Object.entries(repoData.providers[provider].models[model].prompts)) {
              if (promptData.success && promptData.qualityScore !== undefined) {
                if (!categoryScores[promptCategory]) {
                  categoryScores[promptCategory] = [];
                }
                categoryScores[promptCategory].push(promptData.qualityScore);
              }
            }
          }
        }
      }
    }
    
    const data = categoryLabels.map(category => {
      if (categoryScores[category] && categoryScores[category].length > 0) {
        return categoryScores[category].reduce((sum, score) => sum + score, 0) / categoryScores[category].length;
      }
      return 0;
    });
    
    categoryDatasets.push({
      label: modelKey,
      data,
      backgroundColor: color.replace('0.7', '0.2'),
      borderColor: color.replace('0.7', '1.0'),
      borderWidth: 2,
      fill: true
    });
  }
  
  return {
    languageLabels: languages,
    languageDatasets,
    qualitySpeedDatasets,
    categoryLabels,
    categoryDatasets
  };
}

/**
 * Generate recommendation table rows
 */
function generateRecommendationRows(recommendations) {
  let rows = '';
  
  for (const [language, sizes] of Object.entries(recommendations)) {
    for (const [size, recommendation] of Object.entries(sizes)) {
      if (recommendation.provider && recommendation.model) {
        const combinedScore = recommendation.combinedScore || 0;
        const qualityScore = recommendation.qualityScore || 0;
        const responseTime = recommendation.performanceScore || 0;
        
        const combinedScoreClass = getScoreClass(combinedScore);
        const qualityScoreClass = getScoreClass(qualityScore);
        
        rows += `<tr>
          <td>${language}</td>
          <td>${size}</td>
          <td class="model-label">${recommendation.provider}/${recommendation.model}</td>
          <td class="${combinedScoreClass}">${combinedScore.toFixed(2)}</td>
          <td class="${qualityScoreClass}">${qualityScore.toFixed(2)}</td>
          <td>${responseTime.toFixed(2)}s</td>
        </tr>`;
      }
    }
  }
  
  return rows;
}

/**
 * Get CSS class for score coloring
 */
function getScoreClass(score) {
  if (score >= 7.5) return 'score-high';
  if (score >= 5) return 'score-medium';
  return 'score-low';
}

// Run the script
generateDashboard();