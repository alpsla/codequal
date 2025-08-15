#!/usr/bin/env npx ts-node

/**
 * Test Enhanced DeepWiki Repository Analyzer
 * Demonstrates proper repository cloning and file location extraction
 */

import { DeepWikiRepositoryAnalyzer } from './src/standard/services/deepwiki-repository-analyzer';
import { ComparisonAgent } from './src/standard/comparison/comparison-agent';
import * as fs from 'fs/promises';
import * as path from 'path';

// Test configuration
const TEST_REPO = 'https://github.com/sindresorhus/ky';
const TEST_PR = 700;

async function runEnhancedAnalysis() {
  console.log('🚀 Enhanced DeepWiki Analysis with Repository Cloning');
  console.log('=' .repeat(60));
  console.log(`Repository: ${TEST_REPO}`);
  console.log(`PR Number: ${TEST_PR}`);
  console.log('=' .repeat(60));
  
  const startTime = Date.now();
  
  try {
    // Initialize the enhanced analyzer
    const analyzer = new DeepWikiRepositoryAnalyzer();
    
    // Step 1: Analyze main branch with repository cloning
    console.log('\n📦 Step 1: Analyzing main branch (with repository cloning)...');
    const mainAnalysis = await analyzer.analyzeRepository(TEST_REPO, {
      branch: 'main',
      useCache: true,
      cloneDepth: 10
    });
    
    console.log(`  ✅ Main branch analysis complete`);
    console.log(`  📁 Files analyzed: ${mainAnalysis.fileStats.analyzedFiles}`);
    console.log(`  🐛 Issues found: ${mainAnalysis.issues.length}`);
    console.log(`  📍 Issues with file locations: ${mainAnalysis.issues.filter(i => i.location.file !== 'unknown').length}`);
    console.log(`  📍 Issues with line numbers: ${mainAnalysis.issues.filter(i => i.location.line > 0).length}`);
    console.log(`  ⏱️ Analysis time: ${(mainAnalysis.analysisTime / 1000).toFixed(1)}s`);
    
    // Step 2: Analyze PR branch with repository cloning
    console.log('\n📦 Step 2: Analyzing PR branch (with repository cloning)...');
    const prAnalysis = await analyzer.analyzeRepository(TEST_REPO, {
      prNumber: TEST_PR,
      useCache: true,
      cloneDepth: 10
    });
    
    console.log(`  ✅ PR branch analysis complete`);
    console.log(`  📁 Files analyzed: ${prAnalysis.fileStats.analyzedFiles}`);
    console.log(`  🐛 Issues found: ${prAnalysis.issues.length}`);
    console.log(`  📍 Issues with file locations: ${prAnalysis.issues.filter(i => i.location.file !== 'unknown').length}`);
    console.log(`  📍 Issues with line numbers: ${prAnalysis.issues.filter(i => i.location.line > 0).length}`);
    console.log(`  ⏱️ Analysis time: ${(prAnalysis.analysisTime / 1000).toFixed(1)}s`);
    
    // Step 3: Compare branches
    console.log('\n🔄 Step 3: Comparing branches...');
    const comparison = await analyzer.compareBranches(mainAnalysis, prAnalysis);
    
    console.log(`  ✅ Fixed issues: ${comparison.resolvedIssues.length}`);
    console.log(`  ⚠️ New issues: ${comparison.newIssues.length}`);
    console.log(`  ➡️ Unchanged issues: ${comparison.unchangedIssues.length}`);
    
    // Step 4: Generate report using ComparisonAgent
    console.log('\n📄 Step 4: Generating comprehensive report...');
    const agent = new ComparisonAgent();
    await agent.initialize({
      language: 'typescript',
      complexity: 'medium',
      performance: 'balanced'
    });
    
    // Convert to expected format
    const convertToAnalysisResult = (repoAnalysis: any) => ({
      issues: repoAnalysis.issues.map((issue: any) => ({
        ...issue,
        message: issue.description, // Add missing message field
      })),
      scores: repoAnalysis.scores,
      metadata: {
        repository: repoAnalysis.repository,
        branch: repoAnalysis.branch,
        timestamp: repoAnalysis.timestamp
      }
    });
    
    const comparisonResult = await agent.analyze({
      mainBranchAnalysis: convertToAnalysisResult(mainAnalysis),
      featureBranchAnalysis: convertToAnalysisResult(prAnalysis),
      prMetadata: {
        id: `pr-${TEST_PR}`,
        number: TEST_PR,
        title: `PR #${TEST_PR}`,
        author: 'test-user',
        repository_url: TEST_REPO,
        created_at: new Date().toISOString()
      } as any,
      generateReport: true
    });
    
    // Step 5: Save reports
    console.log('\n💾 Step 5: Saving reports...');
    const outputDir = path.join(process.cwd(), 'test-outputs', 'enhanced-analysis');
    await fs.mkdir(outputDir, { recursive: true });
    
    // Save detailed JSON
    const jsonPath = path.join(outputDir, `enhanced-analysis-${TEST_PR}.json`);
    await fs.writeFile(jsonPath, JSON.stringify({
      metadata: {
        repository: TEST_REPO,
        prNumber: TEST_PR,
        timestamp: new Date().toISOString(),
        analysisTime: ((Date.now() - startTime) / 1000).toFixed(1) + 's'
      },
      mainBranch: {
        commit: mainAnalysis.commit,
        issuesCount: mainAnalysis.issues.length,
        withLocations: mainAnalysis.issues.filter(i => i.location.file !== 'unknown').length,
        withLineNumbers: mainAnalysis.issues.filter(i => i.location.line > 0).length,
        fileStats: mainAnalysis.fileStats
      },
      prBranch: {
        commit: prAnalysis.commit,
        issuesCount: prAnalysis.issues.length,
        withLocations: prAnalysis.issues.filter(i => i.location.file !== 'unknown').length,
        withLineNumbers: prAnalysis.issues.filter(i => i.location.line > 0).length,
        fileStats: prAnalysis.fileStats
      },
      comparison: comparison,
      sampleIssuesWithLocations: [
        ...mainAnalysis.issues.filter(i => i.location.line > 0).slice(0, 3),
        ...prAnalysis.issues.filter(i => i.location.line > 0).slice(0, 3)
      ]
    }, null, 2));
    console.log(`  ✅ JSON saved to: ${jsonPath}`);
    
    // Save markdown report
    const markdownPath = path.join(outputDir, `enhanced-report-${TEST_PR}.md`);
    await fs.writeFile(markdownPath, comparisonResult.report || 'No report generated');
    console.log(`  ✅ Markdown report saved to: ${markdownPath}`);
    
    // Save HTML report
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Enhanced Analysis Report - PR #${TEST_PR}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff; }
        .stat-value { font-size: 24px; font-weight: bold; color: #007bff; }
        .stat-label { color: #666; font-size: 14px; margin-top: 5px; }
        .issue { background: #fff; border: 1px solid #dee2e6; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .issue-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .severity-critical { background: #dc3545; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px; }
        .severity-high { background: #fd7e14; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px; }
        .severity-medium { background: #ffc107; color: black; padding: 2px 8px; border-radius: 3px; font-size: 12px; }
        .severity-low { background: #28a745; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px; }
        .location { font-family: 'Courier New', monospace; background: #f1f3f4; padding: 8px; border-radius: 3px; margin: 10px 0; }
        .code-snippet { background: #282c34; color: #abb2bf; padding: 10px; border-radius: 3px; overflow-x: auto; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .danger { color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Enhanced DeepWiki Analysis Report</h1>
        <p><strong>Repository:</strong> ${TEST_REPO}</p>
        <p><strong>Pull Request:</strong> #${TEST_PR}</p>
        <p><strong>Analysis Date:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Total Time:</strong> ${((Date.now() - startTime) / 1000).toFixed(1)} seconds</p>
        
        <h2>📊 Analysis Statistics</h2>
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${mainAnalysis.fileStats.analyzedFiles}</div>
                <div class="stat-label">Files Analyzed (Main)</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${prAnalysis.fileStats.analyzedFiles}</div>
                <div class="stat-label">Files Analyzed (PR)</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${comparison.resolvedIssues.length}</div>
                <div class="stat-label">Issues Fixed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${comparison.newIssues.length}</div>
                <div class="stat-label">New Issues</div>
            </div>
        </div>
        
        <h2>📍 Location Enhancement Results</h2>
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${mainAnalysis.issues.filter(i => i.location.file !== 'unknown').length}/${mainAnalysis.issues.length}</div>
                <div class="stat-label">Main Branch Issues with File Paths</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${mainAnalysis.issues.filter(i => i.location.line > 0).length}/${mainAnalysis.issues.length}</div>
                <div class="stat-label">Main Branch Issues with Line Numbers</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${prAnalysis.issues.filter(i => i.location.file !== 'unknown').length}/${prAnalysis.issues.length}</div>
                <div class="stat-label">PR Branch Issues with File Paths</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${prAnalysis.issues.filter(i => i.location.line > 0).length}/${prAnalysis.issues.length}</div>
                <div class="stat-label">PR Branch Issues with Line Numbers</div>
            </div>
        </div>
        
        <h2>🆕 New Issues with Locations</h2>
        ${comparison.newIssues.filter((i: any) => i.location.line > 0).slice(0, 5).map((issue: any) => `
            <div class="issue">
                <div class="issue-header">
                    <strong>${issue.title}</strong>
                    <span class="severity-${issue.severity}">${issue.severity.toUpperCase()}</span>
                </div>
                <p>${issue.description}</p>
                <div class="location">
                    📁 ${issue.location.file}:${issue.location.line}${issue.location.column ? ':' + issue.location.column : ''}
                </div>
                ${issue.codeSnippet ? `<pre class="code-snippet">${issue.codeSnippet}</pre>` : ''}
                ${issue.suggestion ? `<p><strong>Suggestion:</strong> ${issue.suggestion}</p>` : ''}
            </div>
        `).join('')}
        
        <h2>✅ Fixed Issues</h2>
        ${comparison.resolvedIssues.slice(0, 5).map((issue: any) => `
            <div class="issue">
                <div class="issue-header">
                    <strong>${issue.title}</strong>
                    <span class="severity-${issue.severity}">${issue.severity.toUpperCase()}</span>
                </div>
                <p>${issue.description}</p>
                <div class="location">
                    📁 ${issue.location.file}:${issue.location.line}${issue.location.column ? ':' + issue.location.column : ''}
                </div>
            </div>
        `).join('')}
        
        <h2>📈 Repository Scores</h2>
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${mainAnalysis.scores.overall}/100</div>
                <div class="stat-label">Main Branch Overall Score</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${prAnalysis.scores.overall}/100</div>
                <div class="stat-label">PR Branch Overall Score</div>
            </div>
            <div class="stat-card">
                <div class="stat-value ${prAnalysis.scores.overall > mainAnalysis.scores.overall ? 'success' : prAnalysis.scores.overall < mainAnalysis.scores.overall ? 'danger' : ''}">
                    ${prAnalysis.scores.overall > mainAnalysis.scores.overall ? '↑' : prAnalysis.scores.overall < mainAnalysis.scores.overall ? '↓' : '='} 
                    ${Math.abs(prAnalysis.scores.overall - mainAnalysis.scores.overall)}
                </div>
                <div class="stat-label">Score Change</div>
            </div>
        </div>
        
        <h2>🔍 Sample Issues with Enhanced Locations</h2>
        ${[...mainAnalysis.issues.filter(i => i.location.line > 0).slice(0, 3), ...prAnalysis.issues.filter(i => i.location.line > 0).slice(0, 3)].map(issue => `
            <div class="issue">
                <div class="issue-header">
                    <strong>${issue.title}</strong>
                    <span class="severity-${issue.severity}">${issue.severity.toUpperCase()}</span>
                </div>
                <p>${issue.description}</p>
                <div class="location">
                    📁 File: ${issue.location.file}<br>
                    📍 Line: ${issue.location.line}${issue.location.column ? ', Column: ' + issue.location.column : ''}<br>
                    🔗 Branch: ${mainAnalysis.issues.includes(issue) ? 'main' : 'PR #' + TEST_PR}
                </div>
                ${issue.codeSnippet ? `<pre class="code-snippet">${issue.codeSnippet}</pre>` : ''}
                <p><small>Confidence: ${(issue.confidence * 100).toFixed(0)}%</small></p>
            </div>
        `).join('')}
    </div>
</body>
</html>`;
    
    const htmlPath = path.join(outputDir, `enhanced-report-${TEST_PR}.html`);
    await fs.writeFile(htmlPath, htmlContent);
    console.log(`  ✅ HTML report saved to: ${htmlPath}`);
    
    // Display summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 ENHANCED ANALYSIS SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Repository: ${TEST_REPO}`);
    console.log(`PR: #${TEST_PR}`);
    console.log(`Total Analysis Time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    console.log('\nMain Branch:');
    console.log(`  Commit: ${mainAnalysis.commit}`);
    console.log(`  Files Analyzed: ${mainAnalysis.fileStats.analyzedFiles}`);
    console.log(`  Issues Found: ${mainAnalysis.issues.length}`);
    console.log(`  With File Paths: ${mainAnalysis.issues.filter(i => i.location.file !== 'unknown').length} (${((mainAnalysis.issues.filter(i => i.location.file !== 'unknown').length / mainAnalysis.issues.length) * 100).toFixed(1)}%)`);
    console.log(`  With Line Numbers: ${mainAnalysis.issues.filter(i => i.location.line > 0).length} (${((mainAnalysis.issues.filter(i => i.location.line > 0).length / mainAnalysis.issues.length) * 100).toFixed(1)}%)`);
    console.log('\nPR Branch:');
    console.log(`  Commit: ${prAnalysis.commit}`);
    console.log(`  Files Analyzed: ${prAnalysis.fileStats.analyzedFiles}`);
    console.log(`  Issues Found: ${prAnalysis.issues.length}`);
    console.log(`  With File Paths: ${prAnalysis.issues.filter(i => i.location.file !== 'unknown').length} (${((prAnalysis.issues.filter(i => i.location.file !== 'unknown').length / prAnalysis.issues.length) * 100).toFixed(1)}%)`);
    console.log(`  With Line Numbers: ${prAnalysis.issues.filter(i => i.location.line > 0).length} (${((prAnalysis.issues.filter(i => i.location.line > 0).length / prAnalysis.issues.length) * 100).toFixed(1)}%)`);
    console.log('\nComparison:');
    console.log(`  Fixed Issues: ${comparison.resolvedIssues.length}`);
    console.log(`  New Issues: ${comparison.newIssues.length}`);
    console.log(`  Unchanged Issues: ${comparison.unchangedIssues.length}`);
    console.log('=' .repeat(60));
    
    console.log('\n✅ Enhanced analysis complete!');
    console.log(`📂 Reports saved to: ${outputDir}`);
    
    // Open the HTML report
    console.log('\n🌐 Opening HTML report in browser...');
    const { exec } = require('child_process');
    exec(`open "${htmlPath}"`);
    
  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Run the enhanced analysis
runEnhancedAnalysis()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });