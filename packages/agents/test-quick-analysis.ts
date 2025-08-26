#!/usr/bin/env npx ts-node

/**
 * Quick Analysis Test - Show Real DeepWiki Results
 */

import { loadEnvironment, getEnvConfig } from './src/standard/utils/env-loader';
const envConfig = getEnvConfig();

import { DirectDeepWikiApiWithLocation } from './src/standard/services/direct-deepwiki-api-with-location';
import * as fs from 'fs';
import * as path from 'path';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

async function quickAnalysis() {
  console.log(`
${colors.bright}${colors.cyan}=====================================
    QUICK REAL DEEPWIKI ANALYSIS    
=====================================${colors.reset}
`);

  const repositoryUrl = 'https://github.com/sindresorhus/ky';
  
  console.log(`Repository: sindresorhus/ky`);
  console.log(`Model: ${colors.green}gpt-4o-mini${colors.reset}`);
  console.log(`Mode: ${colors.green}REAL DeepWiki${colors.reset}\n`);
  
  try {
    const deepwiki = new DirectDeepWikiApiWithLocation();
    
    // Set to use cheap model
    process.env.OPENROUTER_DEFAULT_MODEL = 'openai/gpt-4o-mini';
    
    // Quick analysis with just 3 iterations
    console.log(`${colors.cyan}Running analysis (3 iterations max)...${colors.reset}`);
    const startTime = Date.now();
    
    const result = await deepwiki.analyzeRepository(repositoryUrl, {
      branch: 'main',
      useCache: false,  // Don't use cache to see real results
      maxIterations: 3,  // Quick 3 iterations
      model: 'openai/gpt-4o-mini'
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Analysis completed in ${duration}s`);
    console.log(`📊 Issues found: ${result.vulnerabilities?.length || 0}`);
    
    // Generate simple HTML report
    const htmlReport = generateSimpleReport(result.vulnerabilities || [], repositoryUrl);
    
    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(process.cwd(), 'test-reports');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const htmlPath = path.join(outputDir, `quick-analysis-${timestamp}.html`);
    fs.writeFileSync(htmlPath, htmlReport);
    console.log(`\n${colors.green}✅ HTML report saved:${colors.reset} ${htmlPath}`);
    
    // Display issues summary
    if (result.vulnerabilities && result.vulnerabilities.length > 0) {
      console.log(`\n${colors.cyan}Top Issues Found:${colors.reset}`);
      result.vulnerabilities.slice(0, 5).forEach((issue: any, i: number) => {
        console.log(`  ${i + 1}. ${issue.title || issue.message}`);
        console.log(`     Severity: ${issue.severity}`);
        console.log(`     File: ${issue.file || issue.location?.file || 'Unknown'}`);
      });
    }
    
    // Calculate cost
    const tokens = result.metadata?.tokens_used || 5000; // Estimate if not provided
    const costPerMillion = 0.15; // GPT-4o-mini input price
    const cost = (tokens / 1000000) * costPerMillion;
    console.log(`\n${colors.cyan}Cost:${colors.reset} $${cost.toFixed(4)}`);
    
    // Open in browser
    console.log(`\n${colors.cyan}Opening report in browser...${colors.reset}`);
    const { exec } = require('child_process');
    exec(`open "${htmlPath}"`);
    
  } catch (error: any) {
    console.error(`\n${colors.red}❌ Analysis failed:${colors.reset}`, error.message);
    
    if (error.message?.includes('ECONNREFUSED')) {
      console.log(`
${colors.yellow}⚠️ DeepWiki connection failed. Make sure port forwarding is active:${colors.reset}
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001
`);
    }
    
    process.exit(1);
  }
}

function generateSimpleReport(issues: any[], repoUrl: string): string {
  const severityColors = {
    critical: '#d1242f',
    high: '#fb8500',
    medium: '#0969da',
    low: '#656d76'
  };
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeQual Analysis - ${repoUrl.replace('https://github.com/', '')}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #1f2328;
            background: #f6f8fa;
            padding: 2rem;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(31, 35, 40, 0.12);
            overflow: hidden;
        }
        
        header {
            background: linear-gradient(135deg, #0969da, #0860c4);
            color: white;
            padding: 2rem;
        }
        
        h1 { font-size: 2rem; margin-bottom: 0.5rem; }
        
        .stats {
            display: flex;
            gap: 2rem;
            padding: 2rem;
            background: #f6f8fa;
            border-bottom: 1px solid #d1d9e0;
        }
        
        .stat {
            text-align: center;
        }
        
        .stat-value {
            font-size: 2.5rem;
            font-weight: bold;
            color: #0969da;
        }
        
        .stat-label {
            color: #656d76;
            font-size: 0.9rem;
            text-transform: uppercase;
        }
        
        .issues {
            padding: 2rem;
        }
        
        .issue {
            background: #f6f8fa;
            border: 1px solid #d1d9e0;
            border-radius: 8px;
            padding: 1.25rem;
            margin-bottom: 1rem;
        }
        
        .issue-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 0.75rem;
        }
        
        .issue-title {
            font-weight: 600;
            font-size: 1.1rem;
        }
        
        .severity {
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 500;
            color: white;
        }
        
        .severity-critical { background: #d1242f; }
        .severity-high { background: #fb8500; }
        .severity-medium { background: #0969da; }
        .severity-low { background: #656d76; }
        
        .issue-description {
            color: #656d76;
            margin-bottom: 0.75rem;
        }
        
        .issue-location {
            color: #656d76;
            font-family: monospace;
            font-size: 0.9rem;
        }
        
        footer {
            padding: 1.5rem 2rem;
            background: #f6f8fa;
            text-align: center;
            color: #656d76;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🔍 CodeQual Analysis Report</h1>
            <div>${repoUrl.replace('https://github.com/', '')} • ${new Date().toLocaleDateString()}</div>
        </header>
        
        <div class="stats">
            <div class="stat">
                <div class="stat-value">${issues.length}</div>
                <div class="stat-label">Total Issues</div>
            </div>
            <div class="stat">
                <div class="stat-value">${issues.filter(i => i.severity === 'critical').length}</div>
                <div class="stat-label">Critical</div>
            </div>
            <div class="stat">
                <div class="stat-value">${issues.filter(i => i.severity === 'high').length}</div>
                <div class="stat-label">High</div>
            </div>
            <div class="stat">
                <div class="stat-value">${issues.filter(i => i.severity === 'medium').length}</div>
                <div class="stat-label">Medium</div>
            </div>
        </div>
        
        <div class="issues">
            <h2>Issues Found</h2>
            ${issues.map(issue => `
            <div class="issue">
                <div class="issue-header">
                    <div class="issue-title">${issue.title || issue.message}</div>
                    <span class="severity severity-${issue.severity}">${issue.severity?.toUpperCase()}</span>
                </div>
                <div class="issue-description">${issue.message || issue.description || ''}</div>
                <div class="issue-location">📍 ${issue.file || issue.location?.file || 'Location needs investigation'}</div>
            </div>
            `).join('')}
        </div>
        
        <footer>
            Generated by CodeQual • Using gpt-4o-mini • ${new Date().toISOString()}
        </footer>
    </div>
</body>
</html>`;
}

// Run the analysis
quickAnalysis().catch(console.error);