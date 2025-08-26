#!/usr/bin/env npx ts-node

/**
 * Manual PR Validator - ENHANCED REAL DATA WITH LOCATION SEARCH
 * 
 * This version:
 * 1. ONLY uses real DeepWiki API (no mocking)
 * 2. Uses iterative collection (3-10 iterations)
 * 3. Clones repository and searches for real locations
 * 
 * USAGE:
 * npx ts-node manual-pr-validator-enhanced.ts https://github.com/owner/repo/pull/123
 */

import { ComparisonAgent } from '../../comparison';
import { registerDeepWikiApi } from '../../services/deepwiki-api-wrapper';
import { DirectDeepWikiApiWithLocation } from '../../services/direct-deepwiki-api-with-location';
import * as fs from 'fs';
import * as path from 'path';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Parse command line arguments
const prUrl = process.argv[2];
if (!prUrl) {
  console.error(`${colors.red}❌ Error: Please provide a GitHub PR URL${colors.reset}`);
  console.log(`
${colors.cyan}Usage:${colors.reset}
  npx ts-node manual-pr-validator-enhanced.ts https://github.com/owner/repo/pull/123

${colors.cyan}Examples:${colors.reset}
  npx ts-node manual-pr-validator-enhanced.ts https://github.com/sindresorhus/ky/pull/700
  npx ts-node manual-pr-validator-enhanced.ts https://github.com/vercel/next.js/pull/31616

${colors.cyan}Features:${colors.reset}
  ✅ Real DeepWiki API only (no mocking)
  ✅ Iterative collection (3-10 iterations until stable)
  ✅ Repository cloning and caching
  ✅ Code snippet to location search
  ✅ Enhanced location accuracy
  
${colors.yellow}⚠️  Requirements:${colors.reset}
  - DeepWiki must be running (kubectl port-forward)
  - Git must be installed
  - ripgrep (rg) must be installed
  `);
  process.exit(1);
}

// Configuration
const config = {
  deepwiki: {
    apiUrl: process.env.DEEPWIKI_API_URL || 'http://localhost:8001',
    apiKey: process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f'
  },
  output: {
    dir: './test-outputs/enhanced-validation'
  }
};

// Parse PR URL
function parsePRUrl(url: string): { owner: string; repo: string; prNumber: number } {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) {
    throw new Error(`Invalid PR URL: ${url}`);
  }
  return {
    owner: match[1],
    repo: match[2],
    prNumber: parseInt(match[3], 10)
  };
}

// Print section header
function printHeader(title: string) {
  const line = '═'.repeat(80);
  console.log(`\n${colors.cyan}${line}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}${title}${colors.reset}`);
  console.log(`${colors.cyan}${line}${colors.reset}\n`);
}

// Print status message
function printStatus(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const icons = { info: '📊', success: '✅', warning: '⚠️', error: '❌' };
  const colorMap = { info: colors.blue, success: colors.green, warning: colors.yellow, error: colors.red };
  console.log(`${icons[type]} ${colorMap[type]}${message}${colors.reset}`);
}

// Main execution
async function main() {
  const startTime = Date.now();
  
  printHeader('CODEQUAL ENHANCED PR VALIDATOR - REAL DATA WITH LOCATION SEARCH');
  
  const prData = parsePRUrl(prUrl);
  const repoUrl = `https://github.com/${prData.owner}/${prData.repo}`;
  
  console.log(`Repository: ${colors.bright}${prData.owner}/${prData.repo}${colors.reset}`);
  console.log(`PR Number: ${colors.bright}#${prData.prNumber}${colors.reset}`);
  console.log(`DeepWiki API: ${colors.bright}${config.deepwiki.apiUrl}${colors.reset}`);
  console.log(`Mode: ${colors.bright}${colors.magenta}ENHANCED REAL DATA${colors.reset}\n`);
  
  try {
    // Initialize services
    printStatus('Initializing enhanced services...', 'info');
    
    // Use DirectDeepWikiApiWithLocation for enhanced analysis
    printStatus('Initializing DirectDeepWikiApiWithLocation...', 'info');
    const enhancedApi = new DirectDeepWikiApiWithLocation();
    registerDeepWikiApi(enhancedApi);
    printStatus('Enhanced API registered - using REAL DATA + LOCATION SEARCH', 'success');
    
    // Create comparison agent
    const comparisonAgent = new ComparisonAgent(
      console as any,
      {},
      null as any,
      null as any
    );
    
    // Execute comparison
    printHeader('EXECUTING ENHANCED ANALYSIS');
    
    printStatus(`Analyzing main branch with location search...`, 'info');
    const mainDeepWiki = await enhancedApi.analyzeRepository(repoUrl, { branch: 'main' });
    
    printStatus(`Analyzing PR #${prData.prNumber} with location search...`, 'info');
    const prDeepWiki = await enhancedApi.analyzeRepository(repoUrl, { 
      branch: `pull/${prData.prNumber}/head`,
      prId: prData.prNumber
    });
    
    // Transform DeepWiki response to AnalysisResult format
    const transformToAnalysisResult = (deepwiki: any): any => ({
      issues: deepwiki.issues.map((issue: any) => ({
        ...issue,
        message: issue.description || issue.title,
        type: issue.type || 'issue'
      })),
      scores: deepwiki.scores,
      metadata: deepwiki.metadata
    });
    
    printStatus('Comparing branches...', 'info');
    const result = await comparisonAgent.analyze({
      mainBranchAnalysis: transformToAnalysisResult(mainDeepWiki),
      featureBranchAnalysis: transformToAnalysisResult(prDeepWiki),
      prMetadata: {
        number: prData.prNumber,
        title: `PR #${prData.prNumber}`,
        author: prData.owner
      }
    });
    
    const analysisTime = ((Date.now() - startTime) / 1000).toFixed(1);
    printStatus(`Analysis completed in ${analysisTime}s`, 'success');
    
    // Location statistics
    printHeader('LOCATION SEARCH RESULTS');
    
    const allIssues = [
      ...(result.newIssues || []),
      ...(result.resolvedIssues || []),
      ...(result.modifiedIssues || []),
      ...(result.unchangedIssues || [])
    ];
    
    const withLocation = allIssues.filter((i: any) => 
      i.location?.file && i.location.file !== 'unknown' && i.location.line > 0
    );
    
    const locationStats = {
      total: allIssues.length,
      withLocation: withLocation.length,
      percentage: allIssues.length > 0 ? ((withLocation.length / allIssues.length) * 100).toFixed(1) : 0
    };
    
    console.log(`📍 Location Statistics:`);
    console.log(`  Total issues: ${locationStats.total}`);
    console.log(`  With real locations: ${colors.green}${locationStats.withLocation}${colors.reset}`);
    console.log(`  Success rate: ${colors.bright}${locationStats.percentage}%${colors.reset}`);
    
    // Show location methods used
    const methodCounts: Record<string, number> = {};
    withLocation.forEach((issue: any) => {
      const method = issue.locationMethod || 'unknown';
      methodCounts[method] = (methodCounts[method] || 0) + 1;
    });
    
    if (Object.keys(methodCounts).length > 0) {
      console.log(`\n  Location methods used:`);
      Object.entries(methodCounts).forEach(([method, count]) => {
        console.log(`    ${method}: ${count}`);
      });
    }
    
    // Save outputs
    printHeader('SAVING OUTPUTS');
    
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filePrefix = `${prData.owner}-${prData.repo}-pr${prData.prNumber}-enhanced-${timestamp}`;
    
    // Ensure output directory exists
    if (!fs.existsSync(config.output.dir)) {
      fs.mkdirSync(config.output.dir, { recursive: true });
    }
    
    // Save markdown report
    if (result.report) {
      const mdPath = path.join(config.output.dir, `${filePrefix}.md`);
      fs.writeFileSync(mdPath, result.report);
      printStatus(`Markdown saved: ${mdPath}`, 'success');
    }
    
    // Save JSON data with location stats
    const jsonData = {
      ...result,
      locationStats,
      methodCounts
    };
    const jsonPath = path.join(config.output.dir, `${filePrefix}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
    printStatus(`JSON saved: ${jsonPath}`, 'success');
    
    // Save HTML report
    if (result.report) {
      const htmlContent = generateEnhancedHTMLReport(result.report, prData, locationStats);
      const htmlPath = path.join(config.output.dir, `${filePrefix}.html`);
      fs.writeFileSync(htmlPath, htmlContent);
      printStatus(`HTML saved: ${htmlPath}`, 'success');
    }
    
    // Print summary
    printHeader('ANALYSIS COMPLETE');
    
    console.log(`${colors.bright}${colors.green}Summary:${colors.reset}`);
    console.log(`  📈 Resolved Issues: ${colors.green}${result.resolvedIssues?.length || 0}${colors.reset}`);
    console.log(`  📉 New Issues: ${colors.red}${result.newIssues?.length || 0}${colors.reset}`);
    console.log(`  🔄 Modified Issues: ${colors.yellow}${result.modifiedIssues?.length || 0}${colors.reset}`);
    console.log(`  ↔️  Unchanged Issues: ${result.unchangedIssues?.length || 0}`);
    
    // Show top issues with real locations
    const newIssuesWithLocation = (result.newIssues || []).filter((i: any) => 
      i.location?.file && i.location.file !== 'unknown'
    );
    
    if (newIssuesWithLocation.length > 0) {
      console.log(`\n${colors.bright}${colors.red}Top New Issues with Real Locations:${colors.reset}\n`);
      
      newIssuesWithLocation.slice(0, 5).forEach((issue: any, index: number) => {
        const severity = issue.severity?.toUpperCase() || 'UNKNOWN';
        const severityColor = severity === 'CRITICAL' ? colors.red :
                             severity === 'HIGH' ? colors.yellow :
                             colors.blue;
        
        console.log(`  ${index + 1}. ${severityColor}[${severity}]${colors.reset} ${issue.title || issue.message}`);
        console.log(`     📍 ${colors.cyan}${issue.location.file}:${issue.location.line}${colors.reset}`);
        if (issue.locationMethod) {
          console.log(`     🔍 Found via: ${issue.locationMethod} (confidence: ${issue.locationConfidence || 'N/A'}%)`);
        }
        console.log();
      });
    }
    
    printHeader('');
    console.log(`${colors.green}✨ Enhanced analysis completed successfully!${colors.reset}`);
    console.log(`${colors.cyan}Check ${config.output.dir} for detailed results.${colors.reset}`);
    printHeader('');
    
  } catch (error: any) {
    printStatus(`Analysis failed: ${error.message}`, 'error');
    console.error('\nFull error:', error);
    
    // Check common issues
    if (error.message?.includes('ECONNREFUSED')) {
      console.log(`\n${colors.yellow}💡 Tip: Make sure DeepWiki is running:${colors.reset}`);
      console.log(`   kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001`);
    } else if (error.message?.includes('git')) {
      console.log(`\n${colors.yellow}💡 Tip: Make sure git is installed and accessible${colors.reset}`);
    } else if (error.message?.includes('rg')) {
      console.log(`\n${colors.yellow}💡 Tip: Make sure ripgrep (rg) is installed:${colors.reset}`);
      console.log(`   brew install ripgrep  # on macOS`);
      console.log(`   apt install ripgrep   # on Ubuntu`);
    }
    
    process.exit(1);
  }
}

// Generate enhanced HTML report with location statistics
function generateEnhancedHTMLReport(markdown: string, prData: any, locationStats: any): string {
  // Convert markdown to HTML
  let html = markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^\* (.*)$/gim, '<li>$1</li>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  // Add location statistics section
  const locationSection = `
    <div class="location-stats">
      <h2>📍 Location Search Results</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${locationStats.total}</div>
          <div class="stat-label">Total Issues</div>
        </div>
        <div class="stat-card success">
          <div class="stat-value">${locationStats.withLocation}</div>
          <div class="stat-label">With Real Locations</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${locationStats.percentage}%</div>
          <div class="stat-label">Success Rate</div>
        </div>
      </div>
    </div>
  `;
  
  return `<!DOCTYPE html>
<html>
<head>
  <title>CodeQual Enhanced Analysis - ${prData.owner}/${prData.repo} PR #${prData.prNumber}</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      max-width: 1200px; 
      margin: 0 auto; 
      padding: 20px; 
      background: #f5f5f5;
    }
    h1, h2, h3 { 
      color: #2c3e50; 
      border-bottom: 1px solid #ecf0f1; 
      padding-bottom: 10px; 
    }
    code { 
      background: #f4f4f4; 
      padding: 2px 5px; 
      border-radius: 3px; 
      font-family: 'Monaco', 'Courier New', monospace;
    }
    pre { 
      background: #f4f4f4; 
      padding: 10px; 
      border-radius: 5px; 
      overflow-x: auto; 
    }
    .critical { color: #e74c3c; font-weight: bold; }
    .high { color: #e67e22; font-weight: bold; }
    .medium { color: #f39c12; }
    .low { color: #95a5a6; }
    table { 
      border-collapse: collapse; 
      width: 100%; 
      margin: 20px 0; 
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    th, td { 
      border: 1px solid #ddd; 
      padding: 12px; 
      text-align: left; 
    }
    th { 
      background-color: #34495e; 
      color: white;
    }
    .success { color: #27ae60; }
    .danger { color: #e74c3c; }
    .warning { color: #f39c12; }
    
    /* Location statistics styles */
    .location-stats {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .stat-card {
      text-align: center;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .stat-card.success {
      background: #d4edda;
      color: #155724;
    }
    .stat-value {
      font-size: 2em;
      font-weight: bold;
      color: #2c3e50;
    }
    .stat-label {
      font-size: 0.9em;
      color: #7f8c8d;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  ${locationSection}
  <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <p>${html}</p>
  </div>
</body>
</html>`;
}

// Run the script
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});