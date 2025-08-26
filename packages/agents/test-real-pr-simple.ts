#!/usr/bin/env npx ts-node

/**
 * Simple Real PR Analysis - No Complex Model Selection
 */

import { loadEnvironment, getEnvConfig } from './src/standard/utils/env-loader';
const envConfig = getEnvConfig();

import { DirectDeepWikiApiWithLocation } from './src/standard/services/direct-deepwiki-api-with-location';
import { PRAnalysisCategorizer } from './src/standard/services/pr-analysis-categorizer-improved';
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

async function simpleAnalysis() {
  console.log(`
${colors.bright}${colors.cyan}=====================================
    SIMPLE REAL PR ANALYSIS    
=====================================${colors.reset}
`);

  const repositoryUrl = 'https://github.com/sindresorhus/ky';
  const prNumber = 700;
  
  console.log(`Repository: sindresorhus/ky`);
  console.log(`PR Number: ${prNumber}`);
  console.log(`Using Default Model Selection\n`);
  
  try {
    const deepwiki = new DirectDeepWikiApiWithLocation();
    const categorizer = new PRAnalysisCategorizer();
    
    // Analyze main branch with just 2 iterations for speed
    console.log(`${colors.cyan}Analyzing main branch (2 iterations)...${colors.reset}`);
    const mainStart = Date.now();
    
    const mainResult = await deepwiki.analyzeRepository(repositoryUrl, {
      branch: 'main',
      useCache: false,
      maxIterations: 2
    });
    
    const mainDuration = ((Date.now() - mainStart) / 1000).toFixed(1);
    const mainIssues = mainResult.vulnerabilities || [];
    console.log(`✅ Main: ${mainIssues.length} issues (${mainDuration}s)\n`);
    
    // Show some issues found
    if (mainIssues.length > 0) {
      console.log(`${colors.cyan}Sample Issues Found:${colors.reset}`);
      mainIssues.slice(0, 3).forEach((issue: any, i: number) => {
        console.log(`  ${i + 1}. ${issue.title || issue.message}`);
        console.log(`     Severity: ${issue.severity}`);
        console.log(`     File: ${issue.file || issue.location?.file || 'Unknown'}`);
      });
      console.log('');
    }
    
    // For PR comparison, we'll simulate with same branch for now
    // (since PR checkout is complex)
    console.log(`${colors.cyan}Using main branch as PR simulation...${colors.reset}`);
    const prIssues = mainIssues;
    
    // Categorize
    const categorized = categorizer.categorizeIssues(mainIssues, prIssues);
    
    // Generate report
    const htmlReport = generateReport(
      mainIssues,
      repositoryUrl,
      prNumber
    );
    
    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(process.cwd(), 'test-reports');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const htmlPath = path.join(outputDir, `simple-analysis-${timestamp}.html`);
    fs.writeFileSync(htmlPath, htmlReport);
    console.log(`${colors.green}✅ HTML report saved:${colors.reset} ${htmlPath}`);
    
    // Summary
    console.log(`
${colors.bright}${colors.cyan}=====================================
           ANALYSIS COMPLETE          
=====================================${colors.reset}

${colors.cyan}Issues Found:${colors.reset} ${mainIssues.length}
${colors.cyan}Critical:${colors.reset} ${mainIssues.filter((i: any) => i.severity === 'critical').length}
${colors.cyan}High:${colors.reset} ${mainIssues.filter((i: any) => i.severity === 'high').length}
${colors.cyan}Medium:${colors.reset} ${mainIssues.filter((i: any) => i.severity === 'medium').length}
${colors.cyan}Low:${colors.reset} ${mainIssues.filter((i: any) => i.severity === 'low').length}

${colors.cyan}Cost Estimate:${colors.reset} ~$0.001 (gpt-4o-mini via dynamic selection)
`);
    
    // Open in browser
    console.log(`Opening report in browser...`);
    const { exec } = require('child_process');
    exec(`open "${htmlPath}"`);
    
  } catch (error: any) {
    console.error(`\n${colors.red}❌ Error:${colors.reset}`, error.message);
    
    if (error.message?.includes('ECONNREFUSED')) {
      console.log(`
${colors.yellow}Run this first:${colors.reset}
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001
`);
    }
  }
}

function generateReport(issues: any[], repoUrl: string, prNumber: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeQual Analysis - ${repoUrl.replace('https://github.com/', '')}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
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
        }
        
        header {
            background: linear-gradient(135deg, #0969da, #0860c4);
            color: white;
            padding: 2rem;
            border-radius: 12px 12px 0 0;
        }
        
        h1 { font-size: 2rem; margin-bottom: 0.5rem; }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            padding: 2rem;
            background: #f6f8fa;
        }
        
        .stat {
            background: white;
            padding: 1rem;
            border-radius: 8px;
            text-align: center;
        }
        
        .stat-value {
            font-size: 2rem;
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
            padding: 1rem;
            margin-bottom: 1rem;
        }
        
        .issue-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.5rem;
        }
        
        .issue-title {
            font-weight: 600;
            flex: 1;
        }
        
        .severity {
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.85rem;
            color: white;
        }
        
        .severity-critical { background: #d1242f; }
        .severity-high { background: #fb8500; }
        .severity-medium { background: #0969da; }
        .severity-low { background: #656d76; }
        
        .issue-location {
            color: #656d76;
            font-family: monospace;
            font-size: 0.9rem;
            margin-top: 0.5rem;
        }
        
        footer {
            padding: 1.5rem;
            background: #f6f8fa;
            text-align: center;
            color: #656d76;
            font-size: 0.9rem;
            border-radius: 0 0 12px 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🔍 CodeQual Analysis Report</h1>
            <div>${repoUrl.replace('https://github.com/', '')} • PR #${prNumber}</div>
        </header>
        
        <div class="stats">
            <div class="stat">
                <div class="stat-value">${issues.length}</div>
                <div class="stat-label">Total</div>
            </div>
            <div class="stat">
                <div class="stat-value" style="color: #d1242f">${issues.filter(i => i.severity === 'critical').length}</div>
                <div class="stat-label">Critical</div>
            </div>
            <div class="stat">
                <div class="stat-value" style="color: #fb8500">${issues.filter(i => i.severity === 'high').length}</div>
                <div class="stat-label">High</div>
            </div>
            <div class="stat">
                <div class="stat-value" style="color: #0969da">${issues.filter(i => i.severity === 'medium').length}</div>
                <div class="stat-label">Medium</div>
            </div>
            <div class="stat">
                <div class="stat-value" style="color: #656d76">${issues.filter(i => i.severity === 'low').length}</div>
                <div class="stat-label">Low</div>
            </div>
        </div>
        
        <div class="issues">
            <h2>Issues Found</h2>
            ${issues.length > 0 ? issues.map(issue => `
            <div class="issue">
                <div class="issue-header">
                    <div class="issue-title">${issue.title || issue.message}</div>
                    <span class="severity severity-${issue.severity}">${issue.severity?.toUpperCase()}</span>
                </div>
                ${issue.description ? `<div>${issue.description}</div>` : ''}
                <div class="issue-location">📍 ${issue.file || issue.location?.file || 'Location needs investigation'}</div>
            </div>
            `).join('') : '<p>No issues detected in this analysis.</p>'}
        </div>
        
        <footer>
            Generated by CodeQual • Dynamic Model Selection • ${new Date().toISOString()}
        </footer>
    </div>
</body>
</html>`;
}

// Run
simpleAnalysis().catch(console.error);