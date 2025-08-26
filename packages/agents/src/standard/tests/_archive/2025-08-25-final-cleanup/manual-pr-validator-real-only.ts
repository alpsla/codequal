#!/usr/bin/env npx ts-node

/**
 * Manual PR Validator - REAL DATA ONLY
 * 
 * This version ONLY works with real DeepWiki API - no mocking allowed.
 * Created to ensure we test with actual data and identify real issues.
 * 
 * USAGE:
 * npx ts-node manual-pr-validator-real-only.ts https://github.com/owner/repo/pull/123
 */

import { ComparisonAgent } from '../../comparison';
import { ComparisonOrchestrator } from '../../orchestrator/comparison-orchestrator';
import { registerDeepWikiApi } from '../../services/deepwiki-api-wrapper';
import { DirectDeepWikiApi } from '../../services/direct-deepwiki-api';
import * as fs from 'fs';
import * as path from 'path';

// ANSI color codes for terminal output
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
  npx ts-node manual-pr-validator-real-only.ts https://github.com/owner/repo/pull/123

${colors.cyan}Examples:${colors.reset}
  npx ts-node manual-pr-validator-real-only.ts https://github.com/sindresorhus/ky/pull/700
  npx ts-node manual-pr-validator-real-only.ts https://github.com/vercel/next.js/pull/31616

${colors.cyan}Environment Variables:${colors.reset}
  DEEPWIKI_API_URL    - DeepWiki API endpoint (default: http://localhost:8001)
  DEEPWIKI_API_KEY    - DeepWiki API key (default: dw-key-e48329b6c05b4a36a18d65af21ac3c2f)
  
${colors.yellow}⚠️  NOTE: This version ONLY uses real DeepWiki API - no mocking!${colors.reset}
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
    dir: './test-outputs/real-only-validation'
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
  
  printHeader('CODEQUAL MANUAL PR VALIDATOR - REAL DATA ONLY');
  
  const prData = parsePRUrl(prUrl);
  const repoUrl = `https://github.com/${prData.owner}/${prData.repo}`;
  
  console.log(`Repository: ${colors.bright}${prData.owner}/${prData.repo}${colors.reset}`);
  console.log(`PR Number: ${colors.bright}#${prData.prNumber}${colors.reset}`);
  console.log(`DeepWiki API: ${colors.bright}${config.deepwiki.apiUrl}${colors.reset}`);
  console.log(`Mode: ${colors.bright}${colors.yellow}REAL DATA ONLY${colors.reset}\n`);
  
  try {
    // Initialize services
    printStatus('Initializing services...', 'info');
    
    // ALWAYS use DirectDeepWikiApi - no mocking allowed
    printStatus('Initializing DirectDeepWikiApi for real data analysis...', 'info');
    const directApi = new DirectDeepWikiApi();
    registerDeepWikiApi(directApi);
    printStatus('DirectDeepWikiApi registered - using REAL DATA', 'success');
    
    // Create comparison agent directly for simpler testing
    const comparisonAgent = new ComparisonAgent(
      console as any, // logger
      {}, // config
      null as any, // metrics client
      null as any // skills tracker
    );
    
    // Execute comparison
    printHeader('EXECUTING REAL DATA ANALYSIS');
    
    printStatus(`Analyzing main branch...`, 'info');
    const mainDeepWiki = await directApi.analyzeRepository(repoUrl, { branch: 'main' });
    
    printStatus(`Analyzing PR branch #${prData.prNumber}...`, 'info');
    const prDeepWiki = await directApi.analyzeRepository(repoUrl, { 
      branch: `pull/${prData.prNumber}/head`,
      prId: prData.prNumber.toString()
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
    
    // Debug output
    console.log('\n🔍 DEBUG - Orchestrator result:');
    console.log(`Resolved issues: ${result.resolvedIssues?.length || 0}`);
    console.log(`New issues: ${result.newIssues?.length || 0}`);
    console.log(`Modified issues: ${result.modifiedIssues?.length || 0}`);
    console.log(`Unchanged issues: ${result.unchangedIssues?.length || 0}`);
    
    // Save outputs
    printHeader('SAVING OUTPUTS');
    
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filePrefix = `${prData.owner}-${prData.repo}-pr${prData.prNumber}-${timestamp}`;
    
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
    
    // Save JSON data
    const jsonPath = path.join(config.output.dir, `${filePrefix}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
    printStatus(`JSON saved: ${jsonPath}`, 'success');
    
    // Save HTML report
    if (result.report) {
      const htmlContent = generateHTMLReport(result.report, prData);
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
    
    // Show top issues
    if (result.newIssues && result.newIssues.length > 0) {
      console.log(`\n${colors.bright}${colors.red}Top New Issues to Address:${colors.reset}\n`);
      
      result.newIssues.slice(0, 3).forEach((issue: any, index: number) => {
        const severity = issue.severity?.toUpperCase() || 'UNKNOWN';
        const severityColor = severity === 'CRITICAL' ? colors.red :
                             severity === 'HIGH' ? colors.yellow :
                             colors.blue;
        
        console.log(`  ${index + 1}. ${severityColor}[${severity}]${colors.reset} ${issue.title || issue.message}`);
        console.log(`     📍 ${issue.location?.file || 'unknown'}:${issue.location?.line || '?'}\n`);
      });
    }
    
    printHeader('');
    console.log(`${colors.green}✨ Analysis completed successfully!${colors.reset}`);
    console.log(`${colors.cyan}Check ${config.output.dir} for detailed results.${colors.reset}`);
    printHeader('');
    
  } catch (error) {
    printStatus(`Analysis failed: ${error}`, 'error');
    console.error('\nFull error:', error);
    
    // Check if DeepWiki is running
    if (error.message?.includes('ECONNREFUSED')) {
      console.log(`\n${colors.yellow}💡 Tip: Make sure DeepWiki is running:${colors.reset}`);
      console.log(`   kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001`);
    }
    
    process.exit(1);
  }
}

// Generate HTML report
function generateHTMLReport(markdown: string, prData: any): string {
  // Convert markdown to HTML (simple conversion)
  let html = markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^\* (.*)$/gim, '<li>$1</li>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  return `<!DOCTYPE html>
<html>
<head>
  <title>CodeQual Analysis - ${prData.owner}/${prData.repo} PR #${prData.prNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { color: #2c3e50; border-bottom: 1px solid #ecf0f1; padding-bottom: 10px; }
    code { background: #f4f4f4; padding: 2px 5px; border-radius: 3px; }
    pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
    .critical { color: #e74c3c; font-weight: bold; }
    .high { color: #e67e22; font-weight: bold; }
    .medium { color: #f39c12; }
    .low { color: #95a5a6; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .success { color: #27ae60; }
    .danger { color: #e74c3c; }
    .warning { color: #f39c12; }
  </style>
</head>
<body>
  <p>${html}</p>
</body>
</html>`;
}

// Run the script
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});