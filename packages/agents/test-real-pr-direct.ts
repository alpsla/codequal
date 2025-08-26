#!/usr/bin/env npx ts-node

/**
 * Direct PR Analysis Test - Simplified Real Data Flow
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

async function analyzeRealPR() {
  console.log(`
${colors.bright}${colors.cyan}=====================================
     REAL PR ANALYSIS - DIRECT TEST    
=====================================${colors.reset}
`);

  const repositoryUrl = 'https://github.com/sindresorhus/ky';
  const prNumber = 700;
  
  console.log(`Repository: sindresorhus/ky`);
  console.log(`PR Number: ${prNumber}`);
  console.log(`Mode: ${colors.green}REAL DeepWiki${colors.reset}\n`);
  
  try {
    const deepwiki = new DirectDeepWikiApiWithLocation();
    const categorizer = new PRAnalysisCategorizer();
    
    // Set OpenRouter model to use gpt-4o-mini
    process.env.OPENROUTER_DEFAULT_MODEL = 'openai/gpt-4o-mini';
    
    // Analyze main branch
    console.log(`${colors.cyan}Analyzing main branch with gpt-4o-mini...${colors.reset}`);
    const mainStart = Date.now();
    const mainResult = await deepwiki.analyzeRepository(repositoryUrl, {
      branch: 'main',
      useCache: true,
      maxIterations: 5,
      model: 'openai/gpt-4o-mini'  // Explicitly use cheap model
    });
    console.log(`✅ Main branch: ${mainResult.vulnerabilities?.length || 0} issues found (${((Date.now() - mainStart) / 1000).toFixed(1)}s)`);
    
    // First fetch the PR branch properly
    console.log(`\n${colors.cyan}Fetching PR branch...${colors.reset}`);
    const childProcess = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(childProcess.exec);
    
    const repoPath = `/tmp/codequal-repos/sindresorhus-ky-pr-${prNumber}`;
    try {
      // Clone if not exists
      if (!fs.existsSync(repoPath)) {
        await execAsync(`git clone ${repositoryUrl} ${repoPath}`);
      }
      // Fetch the PR
      await execAsync(`cd ${repoPath} && git fetch origin pull/${prNumber}/head:pr-${prNumber}`);
      await execAsync(`cd ${repoPath} && git checkout pr-${prNumber}`);
      console.log(`✅ PR branch fetched and checked out`);
    } catch (error) {
      console.log(`${colors.yellow}⚠️ Could not fetch PR, using main branch${colors.reset}`);
    }
    
    // Analyze PR branch
    console.log(`${colors.cyan}Analyzing PR branch with gpt-4o-mini...${colors.reset}`);
    const prStart = Date.now();
    const prResult = await deepwiki.analyzeRepository(repositoryUrl, {
      branch: `pr-${prNumber}`,
      useCache: true,
      maxIterations: 5,
      model: 'openai/gpt-4o-mini'  // Explicitly use cheap model
    });
    console.log(`✅ PR branch: ${prResult.vulnerabilities?.length || 0} issues found (${((Date.now() - prStart) / 1000).toFixed(1)}s)`);
    
    // Categorize issues
    console.log(`\n${colors.cyan}Categorizing issues...${colors.reset}`);
    const categorized = categorizer.categorizeIssues(
      mainResult.vulnerabilities || [],
      prResult.vulnerabilities || []
    );
    
    // Generate HTML report
    const htmlReport = generateHTMLReport(categorized, repositoryUrl, prNumber);
    
    // Save reports
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(process.cwd(), 'test-reports');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const htmlPath = path.join(outputDir, `pr-analysis-${timestamp}.html`);
    fs.writeFileSync(htmlPath, htmlReport);
    console.log(`\n${colors.green}✅ HTML report saved:${colors.reset} ${htmlPath}`);
    
    const jsonPath = path.join(outputDir, `pr-analysis-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify({
      repository: repositoryUrl,
      prNumber,
      analysis: categorized,
      mainIssues: mainResult.vulnerabilities,
      prIssues: prResult.vulnerabilities
    }, null, 2));
    console.log(`${colors.green}✅ JSON report saved:${colors.reset} ${jsonPath}`);
    
    // Display summary
    console.log(`
${colors.bright}${colors.cyan}=====================================
           ANALYSIS SUMMARY          
=====================================${colors.reset}

${colors.cyan}Issues Found:${colors.reset}
  🆕 New: ${categorized.summary.totalNew}
  ✅ Fixed: ${categorized.summary.totalFixed}
  ➖ Unchanged: ${categorized.summary.totalUnchanged}
  
${colors.cyan}PR Quality Score:${colors.reset} ${categorized.summary.prQualityScore}/100
${colors.cyan}Net Impact:${colors.reset} ${categorized.summary.netImpact > 0 ? '+' : ''}${categorized.summary.netImpact} issues
`);
    
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

function generateHTMLReport(categorized: any, repoUrl: string, prNumber: number): string {
  const { newIssues, fixedIssues, unchangedIssues, summary } = categorized;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PR Analysis Report - #${prNumber}</title>
    <style>
        :root {
            --primary: #0969da;
            --success: #1a7f37;
            --warning: #9a6700;
            --danger: #d1242f;
            --bg: #ffffff;
            --bg-secondary: #f6f8fa;
            --border: #d1d9e0;
            --text: #1f2328;
            --text-secondary: #656d76;
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: var(--text);
            background: var(--bg-secondary);
            padding: 2rem;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: var(--bg);
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(31, 35, 40, 0.12);
            overflow: hidden;
        }
        
        header {
            background: linear-gradient(135deg, var(--primary), #0860c4);
            color: white;
            padding: 2rem;
        }
        
        h1 { font-size: 2rem; margin-bottom: 0.5rem; }
        
        .repo-info {
            display: flex;
            gap: 1rem;
            font-size: 1.1rem;
            opacity: 0.95;
        }
        
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            padding: 2rem;
            background: var(--bg-secondary);
            border-bottom: 1px solid var(--border);
        }
        
        .stat-card {
            background: var(--bg);
            padding: 1.5rem;
            border-radius: 8px;
            border: 1px solid var(--border);
        }
        
        .stat-value {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 0.25rem;
        }
        
        .stat-label {
            color: var(--text-secondary);
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .new-stat { color: var(--danger); }
        .fixed-stat { color: var(--success); }
        .unchanged-stat { color: var(--text-secondary); }
        .score-stat { color: var(--primary); }
        
        .section {
            padding: 2rem;
        }
        
        h2 {
            font-size: 1.5rem;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .issue-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        
        .issue-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1.25rem;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .issue-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
            color: var(--text);
        }
        
        .severity-badge {
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 500;
            white-space: nowrap;
        }
        
        .severity-critical {
            background: #ffebe9;
            color: var(--danger);
            border: 1px solid #ffcecb;
        }
        
        .severity-high {
            background: #fff8c5;
            color: var(--warning);
            border: 1px solid #ffe88c;
        }
        
        .severity-medium {
            background: #ddf4ff;
            color: var(--primary);
            border: 1px solid #b6e3ff;
        }
        
        .severity-low {
            background: var(--bg-secondary);
            color: var(--text-secondary);
            border: 1px solid var(--border);
        }
        
        .issue-description {
            color: var(--text-secondary);
            margin-bottom: 0.75rem;
            line-height: 1.5;
        }
        
        .issue-location {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--text-secondary);
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            font-size: 0.9rem;
        }
        
        .empty-state {
            padding: 3rem;
            text-align: center;
            color: var(--text-secondary);
        }
        
        .recommendations {
            background: #ddf4ff;
            border: 1px solid #b6e3ff;
            border-radius: 8px;
            padding: 1.5rem;
            margin-top: 1.5rem;
        }
        
        .recommendations h3 {
            color: var(--primary);
            margin-bottom: 1rem;
        }
        
        .recommendations ul {
            list-style: none;
            padding-left: 0;
        }
        
        .recommendations li {
            padding: 0.5rem 0;
            padding-left: 1.5rem;
            position: relative;
        }
        
        .recommendations li:before {
            content: "→";
            position: absolute;
            left: 0;
            color: var(--primary);
        }
        
        footer {
            padding: 1.5rem 2rem;
            background: var(--bg-secondary);
            border-top: 1px solid var(--border);
            text-align: center;
            color: var(--text-secondary);
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🔍 CodeQual PR Analysis Report</h1>
            <div class="repo-info">
                <span>${repoUrl.replace('https://github.com/', '')}</span>
                <span>•</span>
                <span>Pull Request #${prNumber}</span>
                <span>•</span>
                <span>${new Date().toLocaleDateString()}</span>
            </div>
        </header>
        
        <div class="summary">
            <div class="stat-card">
                <div class="stat-value new-stat">${summary.totalNew}</div>
                <div class="stat-label">New Issues</div>
            </div>
            <div class="stat-card">
                <div class="stat-value fixed-stat">${summary.totalFixed}</div>
                <div class="stat-label">Fixed Issues</div>
            </div>
            <div class="stat-card">
                <div class="stat-value unchanged-stat">${summary.totalUnchanged}</div>
                <div class="stat-label">Unchanged Issues</div>
            </div>
            <div class="stat-card">
                <div class="stat-value score-stat">${summary.prQualityScore}/100</div>
                <div class="stat-label">Quality Score</div>
            </div>
        </div>
        
        ${newIssues.length > 0 ? `
        <div class="section">
            <h2>🆕 New Issues Introduced by This PR</h2>
            <div class="issue-list">
                ${newIssues.map((item: any) => `
                <div class="issue-card">
                    <div class="issue-header">
                        <div class="issue-title">${item.issue.title || item.issue.message}</div>
                        <span class="severity-badge severity-${item.issue.severity}">${item.issue.severity?.toUpperCase()}</span>
                    </div>
                    <div class="issue-description">${item.issue.message || item.issue.description}</div>
                    <div class="issue-location">
                        📍 ${item.issue.file || item.issue.location?.file || 'Unknown location'}
                        ${item.issue.line ? `:${item.issue.line}` : ''}
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        ${fixedIssues.length > 0 ? `
        <div class="section">
            <h2>✅ Issues Fixed by This PR</h2>
            <div class="issue-list">
                ${fixedIssues.map((item: any) => `
                <div class="issue-card">
                    <div class="issue-header">
                        <div class="issue-title">${item.issue.title || item.issue.message}</div>
                        <span class="severity-badge severity-${item.issue.severity}">${item.issue.severity?.toUpperCase()}</span>
                    </div>
                    <div class="issue-description">${item.issue.message || item.issue.description}</div>
                    <div class="issue-location">
                        📍 ${item.issue.file || item.issue.location?.file || 'Unknown location'}
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        ${unchangedIssues.length > 0 ? `
        <div class="section">
            <h2>➖ Pre-existing Issues (Not Affected by PR)</h2>
            <div class="issue-list">
                ${unchangedIssues.slice(0, 10).map((item: any) => `
                <div class="issue-card">
                    <div class="issue-header">
                        <div class="issue-title">${item.issue.title || item.issue.message}</div>
                        <span class="severity-badge severity-${item.issue.severity}">${item.issue.severity?.toUpperCase()}</span>
                    </div>
                    <div class="issue-description">${item.issue.message || item.issue.description}</div>
                    <div class="issue-location">
                        📍 ${item.issue.file || item.issue.location?.file || 'Unknown location'}
                    </div>
                </div>
                `).join('')}
                ${unchangedIssues.length > 10 ? `
                <div class="empty-state">
                    ... and ${unchangedIssues.length - 10} more pre-existing issues
                </div>
                ` : ''}
            </div>
        </div>
        ` : ''}
        
        <div class="section">
            <div class="recommendations">
                <h3>📋 Recommendations</h3>
                <ul>
                    ${categorized.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        </div>
        
        <footer>
            Generated by CodeQual Analysis • ${new Date().toISOString()}
        </footer>
    </div>
</body>
</html>`;
}

// Run the analysis
analyzeRealPR().catch(console.error);