#!/usr/bin/env npx ts-node

/**
 * Fixed PR Analysis Test - Proper Dynamic Model Selection
 */

import { loadEnvironment, getEnvConfig } from './src/standard/utils/env-loader';
const envConfig = getEnvConfig();

import { DirectDeepWikiApiWithLocation } from './src/standard/services/direct-deepwiki-api-with-location';
import { PRAnalysisCategorizer } from './src/standard/services/pr-analysis-categorizer-improved';
import { DynamicModelSelector } from './src/standard/services/dynamic-model-selector';
import { ModelVersionSync } from './src/model-selection/model-version-sync';
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

async function analyzeWithDynamicModels() {
  console.log(`
${colors.bright}${colors.cyan}=====================================
  REAL PR ANALYSIS - DYNAMIC MODELS    
=====================================${colors.reset}
`);

  const repositoryUrl = 'https://github.com/sindresorhus/ky';
  const prNumber = 700;
  
  console.log(`Repository: sindresorhus/ky`);
  console.log(`PR Number: ${prNumber}`);
  console.log(`Mode: ${colors.green}REAL DeepWiki with Dynamic Model Selection${colors.reset}\n`);
  
  try {
    // Initialize Model Version Sync properly
    console.log(`${colors.cyan}Initializing model selection system...${colors.reset}`);
    const modelVersionSync = new ModelVersionSync(
      console,
      envConfig.supabaseUrl,
      envConfig.supabaseServiceRoleKey
    );
    
    // Wait for models to be loaded
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Initialize Dynamic Model Selector
    const modelSelector = new DynamicModelSelector();
    
    // Select best model for this repository
    const selectedModels = await modelSelector.selectModelsForRole({
      role: 'analyzer',
      language: 'typescript',
      repositorySize: 'medium',
      requiresHighAccuracy: true
    });
    
    const selectedModel = selectedModels.primary;
    
    console.log(`✅ Selected model: ${colors.green}${selectedModel.modelId}${colors.reset}`);
    console.log(`   Provider: ${selectedModel.provider}`);
    console.log(`   Cost: $${selectedModel.costPerMillion.input}/$${selectedModel.costPerMillion.output} per million tokens\n`);
    
    // Initialize DeepWiki with proper configuration
    const deepwiki = new DirectDeepWikiApiWithLocation();
    const categorizer = new PRAnalysisCategorizer();
    
    // Analyze main branch
    console.log(`${colors.cyan}Analyzing main branch...${colors.reset}`);
    const mainStart = Date.now();
    
    const mainResult = await deepwiki.analyzeRepository(repositoryUrl, {
      branch: 'main',
      useCache: false,
      maxIterations: 3,
      confidenceThreshold: 0.8
    });
    
    const mainDuration = ((Date.now() - mainStart) / 1000).toFixed(1);
    const mainIssues = mainResult.vulnerabilities || [];
    console.log(`✅ Main branch: ${mainIssues.length} issues found (${mainDuration}s)`);
    
    // Properly fetch and analyze PR branch
    console.log(`\n${colors.cyan}Fetching PR branch...${colors.reset}`);
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const repoPath = `/tmp/codequal-repos/sindresorhus-ky-pr-${prNumber}`;
    let prBranchName = 'main'; // Default fallback
    
    try {
      // Clean clone for PR
      if (fs.existsSync(repoPath)) {
        await execAsync(`rm -rf ${repoPath}`);
      }
      
      await execAsync(`git clone ${repositoryUrl} ${repoPath}`);
      await execAsync(`cd ${repoPath} && git fetch origin pull/${prNumber}/head:pr-${prNumber}`);
      await execAsync(`cd ${repoPath} && git checkout pr-${prNumber}`);
      prBranchName = `pr-${prNumber}`;
      console.log(`✅ PR branch fetched and checked out`);
    } catch (error) {
      console.log(`${colors.yellow}⚠️ Could not fetch PR branch, using main${colors.reset}`);
    }
    
    // Analyze PR branch
    console.log(`${colors.cyan}Analyzing PR branch...${colors.reset}`);
    const prStart = Date.now();
    
    const prResult = await deepwiki.analyzeRepository(
      prBranchName === `pr-${prNumber}` ? `file://${repoPath}` : repositoryUrl,
      {
        branch: prBranchName,
        useCache: false,
        maxIterations: 3,
        confidenceThreshold: 0.8
      }
    );
    
    const prDuration = ((Date.now() - prStart) / 1000).toFixed(1);
    const prIssues = prResult.vulnerabilities || [];
    console.log(`✅ PR branch: ${prIssues.length} issues found (${prDuration}s)`);
    
    // Categorize issues
    console.log(`\n${colors.cyan}Categorizing issues...${colors.reset}`);
    const categorized = categorizer.categorizeIssues(mainIssues, prIssues);
    
    // Calculate actual cost
    const mainTokens = mainResult.metadata?.tokens_used || 10000;
    const prTokens = prResult.metadata?.tokens_used || 10000;
    const totalTokens = mainTokens + prTokens;
    const cost = (totalTokens / 1000000) * selectedModel.costPerMillion.input;
    
    // Generate HTML report
    const htmlReport = generateHTMLReport(
      categorized,
      repositoryUrl,
      prNumber,
      selectedModel.modelId,
      cost
    );
    
    // Save reports
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(process.cwd(), 'test-reports');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const htmlPath = path.join(outputDir, `pr-analysis-dynamic-${timestamp}.html`);
    fs.writeFileSync(htmlPath, htmlReport);
    console.log(`\n${colors.green}✅ HTML report saved:${colors.reset} ${htmlPath}`);
    
    const jsonPath = path.join(outputDir, `pr-analysis-dynamic-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify({
      repository: repositoryUrl,
      prNumber,
      model: selectedModel.modelId,
      analysis: categorized,
      mainIssues,
      prIssues,
      cost
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
${colors.cyan}Model Used:${colors.reset} ${selectedModel.modelId}
${colors.cyan}Total Cost:${colors.reset} $${cost.toFixed(4)}
`);
    
    // Open in browser
    console.log(`${colors.cyan}Opening report in browser...${colors.reset}`);
    const { exec: execOpen } = require('child_process');
    execOpen(`open "${htmlPath}"`);
    
  } catch (error: any) {
    console.error(`\n${colors.red}❌ Analysis failed:${colors.reset}`, error.message);
    console.error(error.stack);
    
    if (error.message?.includes('ECONNREFUSED')) {
      console.log(`
${colors.yellow}⚠️ DeepWiki connection failed. Make sure port forwarding is active:${colors.reset}
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001
`);
    }
    
    if (error.message?.includes('No models available')) {
      console.log(`
${colors.yellow}⚠️ Model selection failed. Check that:${colors.reset}
1. OPENROUTER_API_KEY is set in .env
2. Supabase credentials are configured
3. Model configs exist in database
`);
    }
    
    process.exit(1);
  }
}

function generateHTMLReport(
  categorized: any,
  repoUrl: string,
  prNumber: number,
  modelUsed: string,
  cost: number
): string {
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
        
        .meta-info {
            display: flex;
            gap: 1rem;
            font-size: 0.95rem;
            opacity: 0.95;
            margin-top: 0.5rem;
        }
        
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
            text-align: center;
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
            flex: 1;
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
        
        .issue-confidence {
            margin-left: auto;
            font-size: 0.85rem;
            color: var(--text-secondary);
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
        
        .footer-info {
            display: flex;
            justify-content: center;
            gap: 2rem;
            margin-top: 0.5rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🔍 CodeQual PR Analysis Report</h1>
            <div class="meta-info">
                <span>📦 ${repoUrl.replace('https://github.com/', '')}</span>
                <span>•</span>
                <span>🔀 Pull Request #${prNumber}</span>
                <span>•</span>
                <span>📅 ${new Date().toLocaleDateString()}</span>
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
                <div class="stat-label">Unchanged</div>
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
                    <div class="issue-description">${item.issue.message || item.issue.description || ''}</div>
                    <div class="issue-location">
                        📍 ${item.issue.file || item.issue.location?.file || 'Unknown location'}
                        ${item.issue.line ? `:${item.issue.line}` : ''}
                        ${item.confidence ? `<span class="issue-confidence">Confidence: ${(item.confidence * 100).toFixed(0)}%</span>` : ''}
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
                    <div class="issue-description">${item.issue.message || item.issue.description || ''}</div>
                    <div class="issue-location">
                        📍 ${item.issue.file || item.issue.location?.file || 'Unknown location'}
                        ${item.confidence ? `<span class="issue-confidence">Confidence: ${(item.confidence * 100).toFixed(0)}%</span>` : ''}
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
                ${unchangedIssues.slice(0, 5).map((item: any) => `
                <div class="issue-card">
                    <div class="issue-header">
                        <div class="issue-title">${item.issue.title || item.issue.message}</div>
                        <span class="severity-badge severity-${item.issue.severity}">${item.issue.severity?.toUpperCase()}</span>
                    </div>
                    <div class="issue-description">${item.issue.message || item.issue.description || ''}</div>
                    <div class="issue-location">
                        📍 ${item.issue.file || item.issue.location?.file || 'Unknown location'}
                        ${item.confidence ? `<span class="issue-confidence">Confidence: ${(item.confidence * 100).toFixed(0)}%</span>` : ''}
                    </div>
                </div>
                `).join('')}
                ${unchangedIssues.length > 5 ? `
                <div class="empty-state">
                    ... and ${unchangedIssues.length - 5} more pre-existing issues
                </div>
                ` : ''}
            </div>
        </div>
        ` : ''}
        
        ${newIssues.length === 0 && fixedIssues.length === 0 && unchangedIssues.length === 0 ? `
        <div class="section">
            <div class="empty-state">
                <h2>📊 Analysis Complete</h2>
                <p>No issues were detected in this analysis.</p>
                <p>This could mean the code is clean, or the analysis needs adjustment.</p>
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
            <div>Generated by CodeQual Analysis</div>
            <div class="footer-info">
                <span>🤖 Model: ${modelUsed}</span>
                <span>💰 Cost: $${cost.toFixed(4)}</span>
                <span>🕐 ${new Date().toISOString()}</span>
            </div>
        </footer>
    </div>
</body>
</html>`;
}

// Run the analysis
analyzeWithDynamicModels().catch(console.error);