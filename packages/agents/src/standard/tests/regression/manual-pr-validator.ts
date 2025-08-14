#!/usr/bin/env npx ts-node
/**
 * Manual PR Validator - Standalone Script for Real PR Analysis
 * 
 * This script performs real analysis without any mocking for manual validation.
 * It's designed to be run directly from the command line.
 * 
 * USAGE:
 * npx ts-node manual-pr-validator.ts https://github.com/owner/repo/pull/123
 * 
 * Or with environment variables:
 * DEEPWIKI_API_URL=http://localhost:8001 npx ts-node manual-pr-validator.ts <PR_URL>
 */

import { ComparisonAgent } from '../../comparison';
import { DynamicModelSelector } from '../../services/dynamic-model-selector';
import { DeepWikiApiWrapper, registerDeepWikiApi } from '../../services/deepwiki-api-wrapper';
import { DeepWikiClient } from '@codequal/core/deepwiki';
import { parseDeepWikiResponse } from './parse-deepwiki-response';
import * as fs from 'fs';
import * as path from 'path';
import * as chalk from 'chalk';

// ANSI color codes for terminal output (fallback if chalk not available)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// Parse command line arguments
const prUrl = process.argv[2];
if (!prUrl) {
  console.error(`${colors.red}❌ Error: Please provide a GitHub PR URL${colors.reset}`);
  console.log(`
${colors.cyan}Usage:${colors.reset}
  npx ts-node manual-pr-validator.ts https://github.com/owner/repo/pull/123

${colors.cyan}Examples:${colors.reset}
  npx ts-node manual-pr-validator.ts https://github.com/sindresorhus/ky/pull/700
  npx ts-node manual-pr-validator.ts https://github.com/vercel/next.js/pull/31616

${colors.cyan}Environment Variables (optional):${colors.reset}
  DEEPWIKI_API_URL    - DeepWiki API endpoint (default: http://localhost:8001)
  DEEPWIKI_API_KEY    - DeepWiki API key
  DEEPWIKI_TIMEOUT   - Timeout in ms (default: 600000 / 10 minutes)
  OUTPUT_FORMAT       - Output format: markdown, json, html, all (default: all)
  OUTPUT_DIR          - Output directory (default: ./test-outputs/manual-validation)
  
${colors.cyan}For large repositories:${colors.reset}
  DEEPWIKI_TIMEOUT=1200000 npx ts-node manual-pr-validator.ts <PR_URL>
  `);
  process.exit(1);
}

// Configuration
const config = {
  deepwiki: {
    apiUrl: process.env.DEEPWIKI_API_URL || 'http://localhost:8001',
    apiKey: process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f',
    timeout: parseInt(process.env.DEEPWIKI_TIMEOUT || '600000') // Default 10 minutes, configurable
  },
  output: {
    format: process.env.OUTPUT_FORMAT || 'all',
    dir: process.env.OUTPUT_DIR || './test-outputs/manual-validation'
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
  const icons = {
    info: '📊',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };
  const colorMap = {
    info: colors.blue,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red
  };
  console.log(`${icons[type]} ${colorMap[type]}${message}${colors.reset}`);
}

// Main analysis function
async function analyzePR(url: string) {
  printHeader('CODEQUAL MANUAL PR VALIDATOR');
  
  const prData = parsePRUrl(url);
  console.log(`Repository: ${colors.bright}${prData.owner}/${prData.repo}${colors.reset}`);
  console.log(`PR Number: ${colors.bright}#${prData.prNumber}${colors.reset}`);
  console.log(`DeepWiki API: ${colors.bright}${config.deepwiki.apiUrl}${colors.reset}`);
  console.log(`Timeout: ${colors.bright}${config.deepwiki.timeout / 1000}s${colors.reset}\n`);
  
  // Warn for large repositories
  const largeRepos = ['facebook/react', 'vercel/next.js', 'microsoft/vscode', 'angular/angular'];
  if (largeRepos.some(repo => url.toLowerCase().includes(repo))) {
    printStatus('⚠️  Large repository detected. Analysis may take several minutes...', 'warning');
  }
  
  try {
    // Initialize services
    printStatus('Initializing services...', 'info');
    
    // Initialize DeepWiki based on environment
    if (process.env.USE_DEEPWIKI_MOCK === 'false' && config.deepwiki.apiUrl) {
      // Register real DeepWiki client for non-mock mode
      printStatus('Connecting to real DeepWiki API...', 'info');
      
      // For real DeepWiki, we need to use the chat completions endpoint to analyze
      // Create adapter to match IDeepWikiApi interface
      const adapter = {
        analyzeRepository: async (repoUrl: string, options?: any) => {
          try {
            // Parse repo URL to get owner and repo
            const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
            if (!match) {
              throw new Error(`Invalid repository URL: ${repoUrl}`);
            }
            
            const owner = match[1];
            const repo = match[2];
            const branch = options?.branch || (options?.prId ? `pull/${options.prId}/head` : 'main');
            
            // Make direct HTTP call to DeepWiki API
            const axios = require('axios');
            const response = await axios.post(
              `${config.deepwiki.apiUrl}/chat/completions/stream`,
              {
                repo_url: repoUrl,
                messages: [{
                  role: 'user',
                  content: `Analyze the repository ${repoUrl} (branch: ${branch}) for code quality issues, security vulnerabilities, performance problems, and architectural concerns. Return a structured analysis with issues categorized by severity (critical, high, medium, low).`
                }],
                stream: false,
                provider: 'openrouter',
                model: 'openai/gpt-4-turbo-preview',
                temperature: 0.1,
                max_tokens: 4000
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${config.deepwiki.apiKey}`
                },
                timeout: config.deepwiki.timeout
              }
            );
            
            // Parse the response - DeepWiki returns plain text directly
            const content = typeof response.data === 'string' ? response.data : '';
            
            // Parse the DeepWiki text response
            const parsedData = parseDeepWikiResponse(content);
            
            // Transform to our expected format
            return {
              issues: parsedData.issues,
              scores: parsedData.scores,
              metadata: {
                timestamp: new Date().toISOString(),
                tool_version: 'deepwiki-1.0.0',
                duration_ms: Date.now() - Date.now(),
                files_analyzed: parsedData.issues.length * 5, // Estimate
                model_used: 'openai/gpt-4-turbo-preview',
                branch
              }
            };
          } catch (error) {
            console.error('DeepWiki API call failed:', error);
            throw error;
          }
        }
      };
      
      registerDeepWikiApi(adapter);
      printStatus('Real DeepWiki API registered', 'success');
    } else {
      printStatus('Using mock DeepWiki API', 'info');
    }
    
    // Initialize DeepWiki wrapper (will use registered API or mock)
    const deepwikiClient = new DeepWikiApiWrapper();
    
    // Initialize comparison agent
    const agent = new ComparisonAgent(
      console as any,
      null, // No model selector needed
      null  // No model provider needed
    );
    
    // Step 1: Analyze main branch
    printHeader('ANALYZING MAIN BRANCH');
    const startMain = Date.now();
    const mainAnalysis = await deepwikiClient.analyzeRepository(
      `https://github.com/${prData.owner}/${prData.repo}`,
      { branch: 'main' }
    );
    const mainTime = ((Date.now() - startMain) / 1000).toFixed(1);
    printStatus(`Main branch analyzed in ${mainTime}s - Found ${mainAnalysis.issues.length} issues`, 'success');
    
    // Display main branch summary
    const mainSeverities = mainAnalysis.issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`\n${colors.cyan}Main Branch Issues by Severity:${colors.reset}`);
    Object.entries(mainSeverities).forEach(([severity, count]) => {
      const icon = severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : severity === 'medium' ? '🟡' : '🟢';
      console.log(`  ${icon} ${severity.toUpperCase()}: ${count}`);
    });
    
    // Step 2: Analyze PR branch
    printHeader('ANALYZING PR BRANCH');
    const startPR = Date.now();
    const prAnalysis = await deepwikiClient.analyzeRepository(
      `https://github.com/${prData.owner}/${prData.repo}`,
      { prId: `${prData.prNumber}` }
    );
    const prTime = ((Date.now() - startPR) / 1000).toFixed(1);
    printStatus(`PR branch analyzed in ${prTime}s - Found ${prAnalysis.issues.length} issues`, 'success');
    
    // Display PR branch summary
    const prSeverities = prAnalysis.issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`\n${colors.cyan}PR Branch Issues by Severity:${colors.reset}`);
    Object.entries(prSeverities).forEach(([severity, count]) => {
      const icon = severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : severity === 'medium' ? '🟡' : '🟢';
      console.log(`  ${icon} ${severity.toUpperCase()}: ${count}`);
    });
    
    // Step 3: Initialize agent
    printHeader('GENERATING COMPARISON REPORT');
    printStatus('Selecting optimal model...', 'info');
    await agent.initialize({
      language: detectLanguage(prData.repo),
      complexity: 'high',
      performance: 'quality'
    });
    
    // Step 4: Generate comparison
    printStatus('Comparing branches and generating report...', 'info');
    const startComparison = Date.now();
    
    // Convert DeepWiki response to AnalysisResult format
    const convertToAnalysisResult = (deepwikiResponse: any) => ({
      issues: deepwikiResponse.issues.map((issue: any) => ({
        ...issue,
        message: issue.description // Map description to message
      })),
      scores: deepwikiResponse.scores || {},
      metadata: deepwikiResponse.metadata
    });
    
    const result = await agent.analyze({
      mainBranchAnalysis: convertToAnalysisResult(mainAnalysis),
      featureBranchAnalysis: convertToAnalysisResult(prAnalysis),
      prMetadata: {
        number: prData.prNumber,
        title: `PR #${prData.prNumber}`,
        author: prData.owner,
        repository_url: `https://github.com/${prData.owner}/${prData.repo}`,
        linesAdded: 0,
        linesRemoved: 0
      },
      generateReport: true
    });
    const comparisonTime = ((Date.now() - startComparison) / 1000).toFixed(1);
    printStatus(`Report generated in ${comparisonTime}s`, 'success');
    
    // Step 5: Save outputs
    printHeader('SAVING OUTPUTS');
    
    // Ensure output directory exists
    const outputDir = path.resolve(config.output.dir);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const baseFileName = `${prData.owner}-${prData.repo}-pr${prData.prNumber}-${timestamp}`;
    
    const formats = config.output.format === 'all' 
      ? ['markdown', 'json', 'html'] 
      : [config.output.format];
    
    const savedFiles: string[] = [];
    
    // Save markdown
    if (formats.includes('markdown')) {
      const mdPath = path.join(outputDir, `${baseFileName}.md`);
      fs.writeFileSync(mdPath, result.report || 'No report generated');
      savedFiles.push(mdPath);
      printStatus(`Markdown saved: ${mdPath}`, 'success');
    }
    
    // Save JSON
    if (formats.includes('json')) {
      const jsonPath = path.join(outputDir, `${baseFileName}.json`);
      const jsonData = {
        metadata: {
          url,
          ...prData,
          timestamp: new Date().toISOString(),
          analysisTime: {
            main: `${mainTime}s`,
            pr: `${prTime}s`,
            comparison: `${comparisonTime}s`,
            total: `${((Date.now() - startMain) / 1000).toFixed(1)}s`
          },
          deepwikiUrl: config.deepwiki.apiUrl,
          modelUsed: result.metadata?.modelUsed
        },
        comparison: result.comparison,
        skillTracking: result.skillTracking,
        summary: {
          totalResolved: result.comparison?.resolvedIssues?.length || 0,
          totalNew: result.comparison?.newIssues?.length || 0,
          totalModified: result.comparison?.modifiedIssues?.length || 0,
          totalUnchanged: result.comparison?.unchangedIssues?.length || 0,
          confidence: result.metadata?.confidence
        }
      };
      fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
      savedFiles.push(jsonPath);
      printStatus(`JSON saved: ${jsonPath}`, 'success');
    }
    
    // Save HTML
    if (formats.includes('html')) {
      const htmlPath = path.join(outputDir, `${baseFileName}.html`);
      const htmlContent = generateStyledHTML(result.report || '', {
        url,
        ...prData,
        timestamp: new Date().toISOString(),
        modelUsed: result.metadata?.modelUsed
      });
      fs.writeFileSync(htmlPath, htmlContent);
      savedFiles.push(htmlPath);
      printStatus(`HTML saved: ${htmlPath}`, 'success');
    }
    
    // Display final summary
    printHeader('ANALYSIS COMPLETE');
    
    console.log(`${colors.bright}${colors.green}Summary:${colors.reset}`);
    console.log(`  📈 Resolved Issues: ${colors.green}${result.comparison?.resolvedIssues?.length || 0}${colors.reset}`);
    console.log(`  📉 New Issues: ${colors.red}${result.comparison?.newIssues?.length || 0}${colors.reset}`);
    console.log(`  🔄 Modified Issues: ${colors.yellow}${result.comparison?.modifiedIssues?.length || 0}${colors.reset}`);
    console.log(`  ↔️  Unchanged Issues: ${result.comparison?.unchangedIssues?.length || 0}`);
    
    console.log(`\n${colors.bright}Assessment:${colors.reset}`);
    const assessment = result.comparison?.summary?.overallAssessment;
    if (assessment) {
      const recColor = assessment.prRecommendation === 'approve' ? colors.green 
        : assessment.prRecommendation === 'review' ? colors.yellow 
        : colors.red;
      console.log(`  🎯 PR Recommendation: ${recColor}${assessment.prRecommendation?.toUpperCase()}${colors.reset}`);
      console.log(`  🔒 Security Posture: ${assessment.securityPostureChange}`);
      console.log(`  📊 Code Quality: ${assessment.codeQualityTrend}`);
      console.log(`  💯 Confidence: ${(assessment.confidence * 100).toFixed(0)}%`);
    }
    
    console.log(`\n${colors.bright}Model Information:${colors.reset}`);
    console.log(`  🤖 Model Used: ${result.metadata?.modelUsed || 'Dynamic Selection'}`);
    console.log(`  🏢 Agent: ${result.metadata?.agentId} v${result.metadata?.agentVersion}`);
    
    console.log(`\n${colors.bright}Files Generated:${colors.reset}`);
    savedFiles.forEach(file => {
      console.log(`  📄 ${file}`);
    });
    
    // Show key new issues if any
    if (result.comparison?.newIssues && result.comparison.newIssues.length > 0) {
      console.log(`\n${colors.bright}${colors.red}Top New Issues to Address:${colors.reset}`);
      result.comparison.newIssues
        .filter((issue: any) => issue.severity === 'critical' || issue.severity === 'high')
        .slice(0, 5)
        .forEach((issue: any, index: number) => {
          const icon = issue.severity === 'critical' ? '🔴' : '🟠';
          console.log(`\n  ${index + 1}. ${icon} [${issue.severity.toUpperCase()}] ${issue.title}`);
          if (issue.location) {
            console.log(`     📍 ${issue.location.file}${issue.location.line ? `:${issue.location.line}` : ''}`);
          }
          if (issue.recommendation) {
            console.log(`     💡 ${issue.recommendation}`);
          }
        });
    }
    
    console.log(`\n${colors.cyan}${'═'.repeat(80)}${colors.reset}`);
    console.log(`${colors.green}✨ Analysis completed successfully!${colors.reset}`);
    console.log(`${colors.cyan}${'═'.repeat(80)}${colors.reset}\n`);
    
  } catch (error) {
    printStatus(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    console.error('\nFull error details:', error);
    process.exit(1);
  }
}

// Generate styled HTML
function generateStyledHTML(markdown: string, metadata: any): string {
  const html = markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>\n');
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeQual Report - PR #${metadata.prNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .header h1 { font-size: 2.5em; margin-bottom: 10px; }
    .header p { opacity: 0.9; }
    .metadata {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
    }
    .metadata-item {
      text-align: center;
    }
    .metadata-item .label {
      font-size: 0.85em;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .metadata-item .value {
      font-size: 1.2em;
      font-weight: bold;
      color: #495057;
      margin-top: 5px;
    }
    .content {
      padding: 40px;
    }
    h1, h2, h3 {
      margin: 30px 0 15px;
      color: #2c3e50;
    }
    h1 { border-bottom: 3px solid #667eea; padding-bottom: 10px; }
    h2 { border-bottom: 2px solid #e9ecef; padding-bottom: 8px; }
    code {
      background: #f8f9fa;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 0.9em;
      color: #e83e8c;
    }
    pre {
      background: #2d3748;
      color: #e2e8f0;
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 20px 0;
    }
    pre code {
      background: none;
      color: inherit;
      padding: 0;
    }
    .footer {
      background: #f8f9fa;
      padding: 30px;
      text-align: center;
      color: #6c757d;
      border-top: 1px solid #dee2e6;
    }
    a { color: #667eea; text-decoration: none; }
    a:hover { text-decoration: underline; }
    strong { color: #495057; }
    em { color: #6c757d; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 CodeQual Analysis Report</h1>
      <p>Comprehensive PR Analysis with AI-Powered Insights</p>
    </div>
    <div class="metadata">
      <div class="metadata-item">
        <div class="label">Repository</div>
        <div class="value">${metadata.owner}/${metadata.repo}</div>
      </div>
      <div class="metadata-item">
        <div class="label">Pull Request</div>
        <div class="value">#${metadata.prNumber}</div>
      </div>
      <div class="metadata-item">
        <div class="label">Analysis Date</div>
        <div class="value">${new Date(metadata.timestamp).toLocaleDateString()}</div>
      </div>
      <div class="metadata-item">
        <div class="label">Model Used</div>
        <div class="value">${metadata.modelUsed || 'Dynamic'}</div>
      </div>
    </div>
    <div class="content">
      ${html}
    </div>
    <div class="footer">
      <p>Generated by CodeQual v2.0 | ${new Date().toISOString()}</p>
      <p><a href="https://github.com/${metadata.owner}/${metadata.repo}/pull/${metadata.prNumber}" target="_blank">View PR on GitHub →</a></p>
    </div>
  </div>
</body>
</html>`;
}

// Detect repository language
function detectLanguage(repoName: string): string {
  const patterns: Record<string, string[]> = {
    typescript: ['ts', 'typescript', 'angular', 'nest', 'next'],
    javascript: ['js', 'javascript', 'react', 'vue', 'node'],
    python: ['py', 'python', 'django', 'flask'],
    java: ['java', 'spring', 'maven'],
    go: ['go', 'golang'],
    rust: ['rs', 'rust']
  };
  
  const lower = repoName.toLowerCase();
  for (const [lang, keywords] of Object.entries(patterns)) {
    if (keywords.some(k => lower.includes(k))) {
      return lang;
    }
  }
  return 'typescript';
}

// Run the analysis
analyzePR(prUrl).catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});