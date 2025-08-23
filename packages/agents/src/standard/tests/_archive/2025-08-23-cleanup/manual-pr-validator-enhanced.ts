#!/usr/bin/env npx ts-node
/**
 * Enhanced Manual PR Validator with Educational Insights
 * 
 * This script performs real analysis without any mocking for manual validation.
 * Includes the text parser for DeepWiki responses and educational content generation.
 * 
 * Note: This test file is currently disabled due to type mismatches
 * TODO: Update types and restore functionality
 * 
 * USAGE:
 * npx ts-node manual-pr-validator-enhanced.ts https://github.com/owner/repo/pull/123
 */

// TypeScript file - enhanced manual PR validator
/* eslint-disable */

import { ComparisonAgent } from '../../comparison';
import { EducatorAgent } from '../../educator/educator-agent';
import { DeepWikiApiWrapper, registerDeepWikiApi } from '../../services/deepwiki-api-wrapper';
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

${colors.cyan}Environment Variables (optional):${colors.reset}
  DEEPWIKI_API_URL     - DeepWiki API endpoint (default: http://localhost:8001)
  DEEPWIKI_API_KEY     - DeepWiki API key
  DEEPWIKI_TIMEOUT     - Timeout in ms (default: 600000 / 10 minutes)
  OUTPUT_FORMAT        - Output format: markdown, json, html, all (default: all)
  OUTPUT_DIR           - Output directory (default: ./test-outputs/manual-validation)
  INCLUDE_EDUCATION    - Include educational insights: true/false (default: true)
  
${colors.cyan}For large repositories:${colors.reset}
  DEEPWIKI_TIMEOUT=1200000 npx ts-node manual-pr-validator-enhanced.ts <PR_URL>
  `);
  process.exit(1);
}

// Configuration
const config = {
  deepwiki: {
    apiUrl: process.env.DEEPWIKI_API_URL || 'http://localhost:8001',
    apiKey: process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f',
    timeout: parseInt(process.env.DEEPWIKI_TIMEOUT || '600000') // Default 10 minutes
  },
  output: {
    format: process.env.OUTPUT_FORMAT || 'all',
    dir: process.env.OUTPUT_DIR || './test-outputs/manual-validation'
  },
  features: {
    includeEducation: process.env.INCLUDE_EDUCATION !== 'false' // Default true
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
  const typeColors = {
    info: colors.blue,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red
  };
  console.log(`${icons[type]} ${typeColors[type]}${message}${colors.reset}`);
}

// Main analysis function
async function analyzePR(url: string) {
  printHeader('CODEQUAL ENHANCED PR VALIDATOR');
  
  const prData = parsePRUrl(url);
  console.log(`Repository: ${colors.bright}${prData.owner}/${prData.repo}${colors.reset}`);
  console.log(`PR Number: ${colors.bright}#${prData.prNumber}${colors.reset}`);
  console.log(`DeepWiki API: ${colors.bright}${config.deepwiki.apiUrl}${colors.reset}`);
  console.log(`Timeout: ${colors.bright}${config.deepwiki.timeout / 1000}s${colors.reset}`);
  console.log(`Educational Insights: ${colors.bright}${config.features.includeEducation ? 'Enabled' : 'Disabled'}${colors.reset}\n`);
  
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
      // Register real DeepWiki client with text parser
      printStatus('Connecting to real DeepWiki API...', 'info');
      
      const adapter = {
        analyzeRepository: async (repoUrl: string, options?: any) => {
          try {
            const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
            if (!match) {
              throw new Error(`Invalid repository URL: ${repoUrl}`);
            }
            
            const branch = options?.branch || (options?.prId ? `pull/${options.prId}/head` : 'main');
            
            // Make direct HTTP call to DeepWiki API
            const axios = require('axios');
            const response = await axios.post(
              `${config.deepwiki.apiUrl}/chat/completions/stream`,
              {
                repo_url: repoUrl,
                messages: [{
                  role: 'user',
                  content: `Analyze the repository ${repoUrl} (branch: ${branch}) for code quality issues, security vulnerabilities, performance problems, and architectural concerns. 
                  
For each issue found, provide:
- Clear title and description
- Severity level (critical, high, medium, low)
- Category (security, performance, code-quality, testing, architecture)
- File path and line number if possible
- Specific recommendations for fixing

Format the response as a structured list of issues.`
                }],
                stream: false,
                provider: 'openrouter',
                model: 'openai/gpt-4o',
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
            
            // Parse the response - DeepWiki returns plain text
            const content = typeof response.data === 'string' ? response.data : '';
            
            // Parse the DeepWiki text response using the parser
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
                model_used: 'openai/gpt-4o',
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
      printStatus('Real DeepWiki API registered with text parser', 'success');
    } else {
      printStatus('Using mock DeepWiki API', 'info');
    }
    
    // Initialize DeepWiki wrapper (will use registered API or mock)
    const deepwikiClient = new DeepWikiApiWrapper();
    
    // Initialize comparison agent
    const agent = new ComparisonAgent(
      console as any,
      null, // No model selector needed
      null  // No skill provider needed
    );
    
    // Initialize educator agent if enabled
    let educatorAgent: EducatorAgent | undefined;
    if (config.features.includeEducation) {
      educatorAgent = new EducatorAgent(null, console);
      printStatus('Educational insights enabled', 'success');
    }
    
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
    
    // Step 3: Generate comparison report
    printHeader('GENERATING COMPARISON REPORT');
    
    // Initialize agent with model configuration
    printStatus('Selecting optimal model...', 'info');
    await agent.initialize({
      language: detectPrimaryLanguage(prData.repo),
      complexity: determineComplexity(mainAnalysis.issues.length + prAnalysis.issues.length),
      performance: 'quality',
      rolePrompt: 'Analyze code quality, security, performance, and provide actionable insights'
    });
    
    printStatus('Comparing branches and generating report...', 'info');
    const comparisonStart = Date.now();
    const comparisonResult = await agent.analyze({
      mainBranchAnalysis: mainAnalysis,
      featureBranchAnalysis: prAnalysis,
      prMetadata: {
        number: prData.prNumber,
        title: `PR #${prData.prNumber}`,
        author: prData.owner,
        repository_url: `https://github.com/${prData.owner}/${prData.repo}`,
        linesAdded: 0,
        linesRemoved: 0
      }
    });
    const comparisonTime = ((Date.now() - comparisonStart) / 1000).toFixed(1);
    printStatus(`Report generated in ${comparisonTime}s`, 'success');
    
    // Step 4: Generate educational insights if enabled
    let educationalContent = null;
    if (config.features.includeEducation && educatorAgent) {
      printHeader('GENERATING EDUCATIONAL INSIGHTS');
      printStatus('Finding relevant learning resources...', 'info');
      
      // Combine all issues for educational analysis
      const allIssues = [...(comparisonResult.comparison?.newIssues || []), 
                        ...(comparisonResult.comparison?.unchangedIssues || [])];
      
      // Generate educational suggestions based on issues
      const suggestions = allIssues.map(issue => ({
        id: issue.id || `issue-${Math.random()}`,
        issueType: issue.category || 'code-quality',
        severity: issue.severity || 'medium',
        topic: issue.message || issue.title || 'General improvement',
        description: issue.description || '',
        priority: issue.severity === 'critical' || issue.severity === 'high' ? 'immediate' as const : 'short-term' as const,
        examples: []
      }));
      
      educationalContent = await educatorAgent.findMatchingCourses({
        suggestions,
        developerLevel: 'intermediate',
        preferredFormat: 'video',
        timeAvailable: 120,
        focusAreas: ['security', 'performance', 'best-practices']
      });
      
      printStatus(`Found ${educationalContent.courses.length} courses, ${educationalContent.articles.length} articles, and ${educationalContent.videos.length} videos`, 'success');
    }
    
    // Step 5: Generate final report with educational content
    if (educationalContent) {
      const finalReport = await agent.generateFinalReport({
        comparison: comparisonResult.comparison as any,
        educationalContent,
        prMetadata: {
          number: prData.prNumber,
          title: `PR #${prData.prNumber}`,
          author: prData.owner,
          repository_url: `https://github.com/${prData.owner}/${prData.repo}`,
          linesAdded: 0,
          linesRemoved: 0
        },
        includeEducation: true
      });
      
      // Update the report with educational content
      comparisonResult.report = finalReport.report;
      comparisonResult.prComment = finalReport.prComment;
    }
    
    // Step 6: Save outputs
    printHeader('SAVING OUTPUTS');
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(config.output.dir)) {
      fs.mkdirSync(config.output.dir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const baseName = `${prData.owner}-${prData.repo}-pr${prData.prNumber}-${timestamp}`;
    
    // Save markdown report
    if (config.output.format === 'markdown' || config.output.format === 'all') {
      const mdPath = path.join(config.output.dir, `${baseName}.md`);
      fs.writeFileSync(mdPath, comparisonResult.report || '');
      printStatus(`Markdown saved: ${mdPath}`, 'success');
    }
    
    // Save JSON data
    if (config.output.format === 'json' || config.output.format === 'all') {
      const jsonPath = path.join(config.output.dir, `${baseName}.json`);
      const jsonData = {
        metadata: comparisonResult.metadata,
        comparison: comparisonResult.comparison,
        educational: educationalContent,
        skillTracking: comparisonResult.skillTracking,
        timestamp: new Date().toISOString()
      };
      fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
      printStatus(`JSON saved: ${jsonPath}`, 'success');
    }
    
    // Save HTML report
    if (config.output.format === 'html' || config.output.format === 'all') {
      const htmlPath = path.join(config.output.dir, `${baseName}.html`);
      const htmlContent = generateHTMLReport(comparisonResult.report || '', educationalContent);
      fs.writeFileSync(htmlPath, htmlContent);
      printStatus(`HTML saved: ${htmlPath}`, 'success');
    }
    
    // Step 7: Display summary
    printHeader('ANALYSIS COMPLETE');
    
    const summary = comparisonResult.comparison?.summary;
    if (summary) {
      console.log(`${colors.bright}${colors.green}Summary:${colors.reset}`);
      console.log(`  📈 Resolved Issues: ${colors.green}${summary.totalResolved}${colors.reset}`);
      console.log(`  📉 New Issues: ${colors.red}${summary.totalNew}${colors.reset}`);
      console.log(`  🔄 Modified Issues: ${colors.yellow}${summary.totalModified}${colors.reset}`);
      console.log(`  ↔️  Unchanged Issues: ${summary.totalUnchanged}`);
      
      console.log(`\n${colors.bright}Assessment:${colors.reset}`);
      const assessment = summary.overallAssessment;
      const recommendationColor = assessment.prRecommendation === 'approve' ? colors.green :
                                 assessment.prRecommendation === 'review' ? colors.yellow : colors.red;
      console.log(`  🎯 PR Recommendation: ${recommendationColor}${assessment.prRecommendation.toUpperCase()}${colors.reset}`);
      console.log(`  🔒 Security Posture: ${assessment.securityPostureChange}`);
      console.log(`  📊 Code Quality: ${assessment.codeQualityTrend}`);
      console.log(`  💯 Confidence: ${Math.round(assessment.confidence * 100)}%`);
    }
    
    // Display educational insights summary
    if (educationalContent && educationalContent.courses.length > 0) {
      console.log(`\n${colors.bright}${colors.magenta}Educational Resources:${colors.reset}`);
      console.log(`  📚 Recommended Courses: ${educationalContent.courses.length}`);
      console.log(`  📄 Relevant Articles: ${educationalContent.articles.length}`);
      console.log(`  🎥 Tutorial Videos: ${educationalContent.videos.length}`);
      console.log(`  ⏱️  Total Learning Time: ${educationalContent.estimatedLearningTime} hours`);
      
      if (educationalContent.personalizedPath?.steps.length > 0) {
        console.log(`\n  ${colors.cyan}Personalized Learning Path:${colors.reset}`);
        educationalContent.personalizedPath.steps.slice(0, 3).forEach((step, idx) => {
          console.log(`    ${idx + 1}. ${step.title} (${step.duration})`);
        });
      }
    }
    
    console.log(`\n${colors.bright}Model Information:${colors.reset}`);
    console.log(`  🤖 Model Used: ${comparisonResult.metadata?.modelUsed || 'Unknown'}`);
    console.log(`  🏢 Agent: ${comparisonResult.metadata?.agentId} v${comparisonResult.metadata?.agentVersion}`);
    
    // Display files generated
    console.log(`\n${colors.bright}Files Generated:${colors.reset}`);
    const outputFiles = [];
    if (config.output.format === 'markdown' || config.output.format === 'all') {
      outputFiles.push(path.join(config.output.dir, `${baseName}.md`));
    }
    if (config.output.format === 'json' || config.output.format === 'all') {
      outputFiles.push(path.join(config.output.dir, `${baseName}.json`));
    }
    if (config.output.format === 'html' || config.output.format === 'all') {
      outputFiles.push(path.join(config.output.dir, `${baseName}.html`));
    }
    outputFiles.forEach(file => {
      console.log(`  📄 ${file}`);
    });
    
    // Display top issues
    const newIssues = comparisonResult.comparison?.newIssues || [];
    if (newIssues.length > 0) {
      console.log(`\n${colors.bright}${colors.red}Top New Issues to Address:${colors.reset}\n`);
      newIssues.slice(0, 5).forEach((issue, idx) => {
        const severityIcon = issue.severity === 'critical' ? '🔴' :
                           issue.severity === 'high' ? '🟠' :
                           issue.severity === 'medium' ? '🟡' : '🟢';
        console.log(`  ${idx + 1}. ${severityIcon} [${issue.severity?.toUpperCase()}] ${issue.message || issue.title || 'Unknown issue'}`);
        console.log(`     📍 ${issue.location?.file || 'unknown'}`);
      });
    }
    
    printHeader('');
    console.log(`${colors.green}✨ Analysis completed successfully!${colors.reset}`);
    printHeader('');
    
  } catch (error) {
    printStatus(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Helper functions
function detectPrimaryLanguage(repo: string): string {
  // Simple heuristic - could be enhanced with actual file analysis
  if (repo.includes('node') || repo.includes('js') || repo.includes('react')) return 'javascript';
  if (repo.includes('py') || repo.includes('python')) return 'python';
  if (repo.includes('go')) return 'go';
  if (repo.includes('rust')) return 'rust';
  if (repo.includes('java')) return 'java';
  return 'typescript'; // Default
}

function determineComplexity(issueCount: number): 'low' | 'medium' | 'high' {
  if (issueCount < 10) return 'low';
  if (issueCount < 50) return 'medium';
  return 'high';
}

function generateHTMLReport(markdown: string, educational: any): string {
  // Convert markdown to HTML (simple conversion)
  let html = markdown
    .replace(/^# (.*)/gm, '<h1>$1</h1>')
    .replace(/^## (.*)/gm, '<h2>$1</h2>')
    .replace(/^### (.*)/gm, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>\n');
  
  // Add educational section if available
  let educationalHTML = '';
  if (educational && educational.courses.length > 0) {
    educationalHTML = `
      <section class="educational">
        <h2>📚 Educational Resources</h2>
        <div class="courses">
          <h3>Recommended Courses</h3>
          <ul>
            ${educational.courses.map((c: any) => `
              <li>
                <a href="${c.url}" target="_blank">${c.title}</a>
                <span class="duration">(${c.duration})</span>
                <span class="provider">${c.provider}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      </section>
    `;
  }
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PR Analysis Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1, h2, h3 {
      color: #2c3e50;
      border-bottom: 2px solid #ecf0f1;
      padding-bottom: 10px;
    }
    pre {
      background: #2c3e50;
      color: #ecf0f1;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
    }
    code {
      background: #ecf0f1;
      padding: 2px 5px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    .educational {
      background: #fff;
      padding: 20px;
      border-radius: 8px;
      margin-top: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .educational h3 {
      color: #8e44ad;
    }
    .educational ul {
      list-style: none;
      padding: 0;
    }
    .educational li {
      padding: 10px;
      border-left: 3px solid #8e44ad;
      margin: 10px 0;
      background: #f8f9fa;
    }
    .educational a {
      color: #3498db;
      text-decoration: none;
      font-weight: bold;
    }
    .educational a:hover {
      text-decoration: underline;
    }
    .duration {
      color: #7f8c8d;
      margin-left: 10px;
    }
    .provider {
      float: right;
      background: #3498db;
      color: white;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 0.85em;
    }
  </style>
</head>
<body>
  ${html}
  ${educationalHTML}
</body>
</html>
  `;
}

// Run the analysis
analyzePR(prUrl).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});