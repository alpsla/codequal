#!/usr/bin/env node

/**
 * DeepWiki Performance Report Generator
 * 
 * This script generates an HTML report from the metrics collected by the collect-metrics.js script.
 * 
 * Usage:
 *   node generate-report.js --metrics=/path/to/metrics-summary.json --output=/path/to/report.html
 */

/* eslint-env node */
/* eslint-disable no-console, @typescript-eslint/no-var-requires */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  if (key.startsWith('--')) {
    acc[key.substring(2)] = value;
  }
  return acc;
}, {});

// Configuration
const config = {
  metricsFile: args.metrics || path.join(__dirname, 'metrics-summary.json'),
  outputFile: args.output || path.join(__dirname, 'performance-report.html'),
  title: args.title || 'DeepWiki Performance Report'
};

/**
 * Generate an HTML report from metrics
 * @param {Object} metrics Metrics data
 * @returns {string} HTML report
 */
function generateReport(metrics) {
  // Create HTML
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #1a73e8;
    }
    .summary {
      background-color: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .summary p {
      margin: 5px 0;
    }
    .card {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      padding: 20px;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
    .highlight {
      background-color: #e6f3ff;
    }
    .chart-container {
      height: 300px;
      margin: 20px 0;
    }
    .recommendation {
      background-color: #e6f7ed;
      padding: 15px;
      border-radius: 5px;
      margin-top: 10px;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      font-size: 12px;
      font-weight: bold;
      border-radius: 4px;
      margin-right: 5px;
    }
    .badge-openai {
      background-color: #41a2ff;
      color: white;
    }
    .badge-google {
      background-color: #ea4335;
      color: white;
    }
    .badge-anthropic {
      background-color: #75c8a6;
      color: white;
    }
    .badge-openrouter {
      background-color: #6100a5;
      color: white;
    }
    .badge-ollama {
      background-color: #ffc107;
      color: black;
    }
    .badge-default {
      background-color: #888;
      color: white;
    }
    footer {
      margin-top: 50px;
      text-align: center;
      color: #666;
      font-size: 14px;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <h1>${config.title}</h1>
  <p>Generated on ${new Date().toLocaleString()}</p>
  
  <div class="summary">
    <h2>Summary</h2>
    <p><strong>Total Tests:</strong> ${metrics.totalTests}</p>
    <p><strong>Chat Tests:</strong> ${metrics.chatTests}</p>
    <p><strong>Wiki Tests:</strong> ${metrics.wikiTests}</p>
  </div>

  <h2>Repository Recommendations</h2>
  <div class="card">
    <table>
      <thead>
        <tr>
          <th>Repository</th>
          <th>Recommended Chat Model</th>
          <th>Recommended Wiki Model</th>
        </tr>
      </thead>
      <tbody>
        ${Object.values(metrics.repoSummary).map(repo => `
          <tr>
            <td>${repo.repository}</td>
            <td>${formatModel(repo.bestChatModel)}</td>
            <td>${formatModel(repo.bestWikiModel)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <h2>Provider/Model Performance</h2>
  
  <div class="card">
    <h3>Chat Completion Performance</h3>
    <div class="chart-container">
      <canvas id="chatTokensChart"></canvas>
    </div>
    <table>
      <thead>
        <tr>
          <th>Provider/Model</th>
          <th>Tests</th>
          <th>Avg Token Count</th>
          <th>Avg Content Length</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(metrics.providerModelSummary)
          .filter(([_, summary]) => summary.chatTests > 0)
          .sort((a, b) => b[1].chat.avgTokenCount - a[1].chat.avgTokenCount)
          .map(([_key, summary]) => `
            <tr>
              <td>${formatProviderModel(summary.provider, summary.model)}</td>
              <td>${summary.chatTests}</td>
              <td>${summary.chat.avgTokenCount}</td>
              <td>${summary.chat.avgContentLength}</td>
            </tr>
          `).join('')}
      </tbody>
    </table>
  </div>
  
  <div class="card">
    <h3>Wiki Generation Performance</h3>
    <div class="chart-container">
      <canvas id="wikiSectionsChart"></canvas>
    </div>
    <table>
      <thead>
        <tr>
          <th>Provider/Model</th>
          <th>Tests</th>
          <th>Avg Sections</th>
          <th>Avg Code Blocks</th>
          <th>Avg References</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(metrics.providerModelSummary)
          .filter(([_, summary]) => summary.wikiTests > 0)
          .sort((a, b) => b[1].wiki.avgSectionCount - a[1].wiki.avgSectionCount)
          .map(([_key, summary]) => `
            <tr>
              <td>${formatProviderModel(summary.provider, summary.model)}</td>
              <td>${summary.wikiTests}</td>
              <td>${summary.wiki.avgSectionCount}</td>
              <td>${summary.wiki.avgCodeBlockCount}</td>
              <td>${summary.wiki.avgReferenceCount}</td>
            </tr>
          `).join('')}
      </tbody>
    </table>
  </div>

  <h2>Detailed Repository Analysis</h2>
  ${Object.values(metrics.repoSummary).map(repo => `
    <div class="card">
      <h3>${repo.repository}</h3>
      <p><strong>Total Tests:</strong> ${repo.totalTests} (${repo.chatTests} chat, ${repo.wikiTests} wiki)</p>
      
      ${repo.bestChatModel ? `
        <div class="recommendation">
          <h4>Recommended Chat Model</h4>
          <p>${formatProviderModel(repo.bestChatModel.provider, repo.bestChatModel.model)}</p>
          <p><strong>Token Count:</strong> ${repo.bestChatModel.tokenCount}</p>
          <p><strong>Content Length:</strong> ${repo.bestChatModel.contentLength}</p>
        </div>
      ` : ''}
      
      ${repo.bestWikiModel ? `
        <div class="recommendation">
          <h4>Recommended Wiki Model</h4>
          <p>${formatProviderModel(repo.bestWikiModel.provider, repo.bestWikiModel.model)}</p>
          <p><strong>Section Count:</strong> ${repo.bestWikiModel.sectionCount}</p>
          <p><strong>Code Block Count:</strong> ${repo.bestWikiModel.codeBlockCount}</p>
          <p><strong>Reference Count:</strong> ${repo.bestWikiModel.referenceCount}</p>
        </div>
      ` : ''}
    </div>
  `).join('')}

  <footer>
    <p>Generated by DeepWiki Performance Report Generator | CodeQual</p>
  </footer>

  <script>
    // Chat Token Chart
    const chatTokensCtx = document.getElementById('chatTokensChart').getContext('2d');
    new Chart(chatTokensCtx, {
      type: 'bar',
      data: {
        labels: [${Object.entries(metrics.providerModelSummary)
          .filter(([_, summary]) => summary.chatTests > 0)
          .map(([_, summary]) => `'${summary.provider}/${summary.model}'`)
          .join(', ')}],
        datasets: [{
          label: 'Average Token Count',
          data: [${Object.entries(metrics.providerModelSummary)
            .filter(([_, summary]) => summary.chatTests > 0)
            .map(([_, summary]) => summary.chat.avgTokenCount)
            .join(', ')}],
          backgroundColor: [
            ${Object.entries(metrics.providerModelSummary)
              .filter(([_, summary]) => summary.chatTests > 0)
              .map(([_, summary]) => `'${getProviderColor(summary.provider, summary.model)}'`)
              .join(', ')}
          ],
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        plugins: {
          title: {
            display: true,
            text: 'Average Token Count by Provider/Model'
          }
        },
        scales: {
          x: {
            beginAtZero: true
          }
        }
      }
    });

    // Wiki Sections Chart
    const wikiSectionsCtx = document.getElementById('wikiSectionsChart').getContext('2d');
    new Chart(wikiSectionsCtx, {
      type: 'bar',
      data: {
        labels: [${Object.entries(metrics.providerModelSummary)
          .filter(([_, summary]) => summary.wikiTests > 0)
          .map(([_, summary]) => `'${summary.provider}/${summary.model}'`)
          .join(', ')}],
        datasets: [{
          label: 'Average Sections',
          data: [${Object.entries(metrics.providerModelSummary)
            .filter(([_, summary]) => summary.wikiTests > 0)
            .map(([_, summary]) => summary.wiki.avgSectionCount)
            .join(', ')}],
          backgroundColor: [
            ${Object.entries(metrics.providerModelSummary)
              .filter(([_, summary]) => summary.wikiTests > 0)
              .map(([_, summary]) => `'${getProviderColor(summary.provider, summary.model)}'`)
              .join(', ')}
          ],
          borderWidth: 1
        }, {
          label: 'Average Code Blocks',
          data: [${Object.entries(metrics.providerModelSummary)
            .filter(([_, summary]) => summary.wikiTests > 0)
            .map(([_, summary]) => summary.wiki.avgCodeBlockCount)
            .join(', ')}],
          backgroundColor: [
            ${Object.entries(metrics.providerModelSummary)
              .filter(([_, summary]) => summary.wikiTests > 0)
              .map(([_, summary]) => `'${getProviderColor(summary.provider, summary.model, 0.7)}'`)
              .join(', ')}
          ],
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        plugins: {
          title: {
            display: true,
            text: 'Wiki Generation Performance by Provider/Model'
          }
        },
        scales: {
          x: {
            beginAtZero: true
          }
        }
      }
    });
  </script>
</body>
</html>
  `;
  
  return html;
}

/**
 * Format provider and model name for display
 * @param {string} provider Provider name
 * @param {string} model Model name
 * @returns {string} Formatted provider and model
 */
function formatProviderModel(provider, model) {
  const providerClass = provider ? `badge-${provider.toLowerCase()}` : 'badge-default';
  const providerBadge = `<span class="badge ${providerClass}">${provider || 'default'}</span>`;
  
  return `${providerBadge} ${model || 'default'}`;
}

/**
 * Format model for display
 * @param {Object} model Model data
 * @returns {string} Formatted model
 */
function formatModel(model) {
  if (!model) {
    return 'Not enough data';
  }
  
  return formatProviderModel(model.provider, model.model);
}

/**
 * Get color for provider
 * @param {string} provider Provider name
 * @param {string} modelName Model name (optional)
 * @param {number} alpha Alpha value (optional)
 * @returns {string} Color string
 */
function getProviderColor(provider, modelName = '', alpha = 1) {
  const colors = {
    'openai': `rgba(65, 162, 255, ${alpha})`,
    'google': `rgba(234, 67, 53, ${alpha})`,
    'anthropic': `rgba(117, 200, 166, ${alpha})`,
    'openrouter': `rgba(97, 0, 165, ${alpha})`,
    'ollama': `rgba(255, 193, 7, ${alpha})`,
    'default': `rgba(136, 136, 136, ${alpha})`
  };
  
  if (!provider) {
    return colors.default;
  }
  
  // Check for Anthropic models via OpenRouter
  if (provider === 'openrouter' && modelName.includes('claude')) {
    return colors.anthropic;
  }
  
  return colors[provider.toLowerCase()] || colors.default;
}

/**
 * Main function
 */
async function main() {
  console.log('DeepWiki Performance Report Generator');
  console.log('====================================');
  console.log(`Metrics file: ${config.metricsFile}`);
  console.log(`Output file: ${config.outputFile}`);
  console.log();
  
  try {
    // Read metrics file
    const metricsJson = await fs.promises.readFile(config.metricsFile, 'utf8');
    const metrics = JSON.parse(metricsJson);
    
    console.log(`Read metrics for ${metrics.totalTests} tests`);
    
    // Generate report
    const report = generateReport(metrics);
    
    // Write report to file
    await fs.promises.writeFile(config.outputFile, report);
    
    console.log(`Generated report at ${config.outputFile}`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
