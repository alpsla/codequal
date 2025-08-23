#!/usr/bin/env npx ts-node

/**
 * Test script for real PR analysis with browser-viewable report
 * Includes iteration metrics and full V8 report generation
 */

import { ComparisonAgent } from './src/standard/comparison/comparison-agent';
import { AnalysisMonitor } from './src/standard/deepwiki/services/analysis-monitor';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testRealPRWithBrowser() {
  console.log('🚀 CodeQual V8 - Real PR Analysis with Iteration Metrics\n');
  
  const useMock = process.env.USE_DEEPWIKI_MOCK !== 'false';
  
  // Test configuration
  const testConfig = {
    owner: 'sindresorhus',
    repo: 'ky',
    prNumber: 700,
    repositoryUrl: 'https://github.com/sindresorhus/ky',
    mainBranch: 'main',
    prBranch: 'pr-700'
  };
  
  console.log('📊 Analysis Configuration:');
  console.log(`   Repository: ${testConfig.owner}/${testConfig.repo}`);
  console.log(`   PR Number: #${testConfig.prNumber}`);
  console.log(`   Mode: ${useMock ? 'MOCK' : 'REAL'} DeepWiki`);
  console.log(`   DeepWiki URL: ${process.env.DEEPWIKI_API_URL || 'http://localhost:8001'}`);
  
  if (!useMock) {
    console.log('\n⚠️  Using REAL DeepWiki - Ensure:');
    console.log('   1. kubectl port-forward is running');
    console.log('   2. Git authentication is configured');
    console.log('   3. DEEPWIKI_API_KEY is set\n');
  }
  
  // Initialize monitor for metrics tracking
  const monitor = AnalysisMonitor.getInstance();
  
  try {
    console.log('\n🔍 Starting Comparison Analysis...\n');
    
    // Create comparison agent
    const agent = new ComparisonAgent();
    
    // Prepare input
    const input = {
      owner: testConfig.owner,
      repo: testConfig.repo,
      prNumber: testConfig.prNumber,
      githubToken: process.env.GITHUB_TOKEN
    };
    
    // Run comparison analysis
    const startTime = Date.now();
    console.log('⏳ Analyzing main branch...');
    console.log('⏳ Analyzing PR branch...');
    console.log('⏳ Comparing changes...\n');
    
    const result = await agent.analyze(input);
    
    const duration = Date.now() - startTime;
    
    // Get aggregated metrics
    const metrics = monitor.getAggregatedMetrics();
    
    console.log('✅ Analysis Complete!\n');
    console.log('📈 Analysis Statistics:');
    console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`   Total Issues: ${result.comparison.totalIssues || 0}`);
    console.log(`   New Issues: ${result.comparison.newIssues?.length || 0}`);
    console.log(`   Resolved Issues: ${result.comparison.resolvedIssues?.length || 0}`);
    console.log(`   Score: ${result.comparison.scores?.overall || 0}/100`);
    
    // Check if we have iteration metrics
    const analysisMetrics = (result.comparison as any).analysisMetrics;
    if (analysisMetrics) {
      console.log('\n🔄 Iteration Metrics:');
      console.log(`   Iterations: ${analysisMetrics.iterations || 'N/A'}`);
      console.log(`   Completeness: ${analysisMetrics.completeness || 0}%`);
      console.log(`   Memory Used: ${analysisMetrics.memoryUsed ? (analysisMetrics.memoryUsed / 1024 / 1024).toFixed(2) + 'MB' : 'N/A'}`);
      console.log(`   Cache Hit: ${analysisMetrics.cacheHit ? 'Yes' : 'No'}`);
    }
    
    console.log('\n📊 Global Metrics:');
    console.log(`   Average Iterations: ${metrics.averageIterations.toFixed(2)}`);
    console.log(`   Total Analyses: ${metrics.totalAnalyses}`);
    console.log(`   Success Rate: ${(metrics.successRate * 100).toFixed(1)}%`);
    
    // Extract model used
    const modelUsed = (result.comparison as any).aiModel || 
                     (result.comparison as any).modelUsed || 
                     'Dynamic Model Selection';
    console.log(`   AI Model: ${modelUsed}`);
    
    // Save reports
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const reportDir = path.join(__dirname, 'reports');
    await fs.mkdir(reportDir, { recursive: true });
    
    // Save markdown report
    const mdPath = path.join(reportDir, `pr-${testConfig.prNumber}-report-${timestamp}.md`);
    await fs.writeFile(mdPath, result.markdownReport);
    console.log(`\n📄 Markdown report saved: ${mdPath}`);
    
    // Generate HTML with enhanced styling
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeQual Report - PR #${testConfig.prNumber} - ${testConfig.owner}/${testConfig.repo}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
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
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .header .subtitle {
            font-size: 1.1em;
            opacity: 0.9;
        }
        .content {
            padding: 40px;
        }
        h1 { color: #667eea; border-bottom: 3px solid #667eea; padding-bottom: 10px; margin: 30px 0 20px; }
        h2 { color: #764ba2; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin: 25px 0 15px; }
        h3 { color: #555; margin: 20px 0 10px; }
        
        /* Metrics Section Highlighting */
        h2:contains("Report Metadata") + h3:contains("Analysis Iterations") {
            background: linear-gradient(90deg, #667eea10, #764ba210);
            padding: 10px;
            border-left: 4px solid #667eea;
            margin: 20px 0;
        }
        
        ul { margin-left: 30px; margin-bottom: 15px; }
        li { margin: 5px 0; }
        
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.9em;
        }
        
        pre {
            background: #2d2d2d;
            color: #f8f8f2;
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 15px 0;
        }
        
        pre code {
            background: none;
            color: #f8f8f2;
            padding: 0;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e0e0e0;
        }
        
        th {
            background: #f8f8f8;
            font-weight: 600;
            color: #667eea;
        }
        
        tr:hover {
            background: #f8f8f8;
        }
        
        /* Score badges */
        .score {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 20px;
            font-weight: bold;
            margin: 0 5px;
        }
        .score-high { background: #4caf50; color: white; }
        .score-medium { background: #ff9800; color: white; }
        .score-low { background: #f44336; color: white; }
        
        /* Issue severity badges */
        .critical { color: #d32f2f; font-weight: bold; }
        .high { color: #f57c00; font-weight: bold; }
        .medium { color: #fbc02d; font-weight: bold; }
        .low { color: #388e3c; font-weight: bold; }
        
        /* Iteration metrics highlight */
        .iteration-metrics {
            background: linear-gradient(135deg, #667eea15, #764ba215);
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
            border-radius: 8px;
        }
        
        .iteration-metrics h3 {
            color: #667eea;
            margin-top: 0;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        
        .metric-card {
            background: white;
            padding: 10px;
            border-radius: 6px;
            border: 1px solid #e0e0e0;
        }
        
        .metric-label {
            font-size: 0.9em;
            color: #666;
        }
        
        .metric-value {
            font-size: 1.5em;
            font-weight: bold;
            color: #333;
        }
        
        .timestamp {
            text-align: center;
            color: #999;
            font-size: 0.9em;
            margin: 20px 0;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 CodeQual Analysis Report</h1>
            <div class="subtitle">
                ${testConfig.owner}/${testConfig.repo} - Pull Request #${testConfig.prNumber}
            </div>
        </div>
        <div class="content" id="content">
            <!-- Markdown content will be rendered here -->
        </div>
        <div class="timestamp">
            Generated: ${new Date().toLocaleString()} | 
            Duration: ${(duration / 1000).toFixed(2)}s |
            Model: ${modelUsed}
        </div>
    </div>
    
    <script>
        // Convert markdown to HTML
        const markdownContent = ${JSON.stringify(result.markdownReport)};
        document.getElementById('content').innerHTML = marked.parse(markdownContent);
        
        // Highlight iteration metrics section
        const headings = document.querySelectorAll('h3');
        headings.forEach(h => {
            if (h.textContent.includes('Analysis Iterations')) {
                const metricsDiv = document.createElement('div');
                metricsDiv.className = 'iteration-metrics';
                h.parentNode.insertBefore(metricsDiv, h);
                
                // Move the heading and following list into the div
                let nextElement = h;
                while (nextElement && !nextElement.tagName.match(/^H[123]$/)) {
                    const temp = nextElement.nextSibling;
                    metricsDiv.appendChild(nextElement);
                    nextElement = temp;
                }
            }
        });
        
        // Style score values
        document.querySelectorAll('li').forEach(li => {
            if (li.textContent.includes('Score:')) {
                const match = li.textContent.match(/(\d+)\/100/);
                if (match) {
                    const score = parseInt(match[1]);
                    const className = score >= 80 ? 'score-high' : score >= 60 ? 'score-medium' : 'score-low';
                    li.innerHTML = li.innerHTML.replace(/(\d+\/100)/, '<span class="score ' + className + '">$1</span>');
                }
            }
        });
        
        // Style severity keywords
        const severities = ['critical', 'high', 'medium', 'low'];
        severities.forEach(severity => {
            document.body.innerHTML = document.body.innerHTML.replace(
                new RegExp('\\\\b(' + severity + ')\\\\b', 'gi'),
                '<span class="' + severity.toLowerCase() + '">$1</span>'
            );
        });
    </script>
</body>
</html>`;
    
    const htmlPath = path.join(reportDir, `pr-${testConfig.prNumber}-report-${timestamp}.html`);
    await fs.writeFile(htmlPath, htmlContent);
    console.log(`📄 HTML report saved: ${htmlPath}`);
    
    // Open in browser
    console.log('\n🌐 Opening report in browser...');
    const openCommand = process.platform === 'darwin' ? 'open' :
                       process.platform === 'win32' ? 'start' : 'xdg-open';
    
    try {
      await execAsync(`${openCommand} "${htmlPath}"`);
      console.log('✅ Report opened in browser!');
    } catch (error) {
      console.log(`⚠️  Could not auto-open browser. Please open manually:\n   ${htmlPath}`);
    }
    
    // Display summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 ANALYSIS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Repository: ${testConfig.owner}/${testConfig.repo}`);
    console.log(`PR Number: #${testConfig.prNumber}`);
    console.log(`Overall Score: ${result.comparison.scores?.overall || 0}/100`);
    console.log(`Issues Found: ${result.comparison.totalIssues || 0}`);
    
    if (result.comparison.prBreakingChanges?.length > 0) {
      console.log(`⚠️  Breaking Changes: ${result.comparison.prBreakingChanges.length}`);
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    
    // Try to provide helpful error messages
    if (error.message?.includes('ECONNREFUSED')) {
      console.error('\n💡 Tip: Make sure kubectl port-forward is running:');
      console.error('   kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001');
    } else if (error.message?.includes('authentication')) {
      console.error('\n💡 Tip: Configure git authentication:');
      console.error('   ./scripts/configure-deepwiki-git.sh');
    }
    
    process.exit(1);
  } finally {
    // Cleanup
    monitor.cleanup();
  }
}

// Run the test
console.log('✅ Environment loaded from:', process.env.NODE_ENV === 'test' ? '.env.test' : '.env');
testRealPRWithBrowser().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});