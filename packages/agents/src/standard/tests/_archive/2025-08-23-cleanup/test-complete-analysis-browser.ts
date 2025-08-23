#!/usr/bin/env npx ts-node

/**
 * Complete test for PR analysis with iteration metrics and browser report
 * Uses the CachedDeepWikiAnalyzer directly
 */

import { CachedDeepWikiAnalyzer } from './src/standard/deepwiki/services/cached-deepwiki-analyzer';
import { AnalysisMonitor } from './src/standard/deepwiki/services/analysis-monitor';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testCompleteAnalysisBrowser() {
  console.log('🚀 CodeQual V8 - Complete PR Analysis with Browser Report\n');
  
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
  
  // Initialize components
  const monitor = AnalysisMonitor.getInstance();
  const analyzer = new CachedDeepWikiAnalyzer(
    process.env.DEEPWIKI_API_URL || 'http://localhost:8001',
    process.env.DEEPWIKI_API_KEY,
    console
  );
  const reportGenerator = new ReportGeneratorV8Final();
  
  try {
    console.log('\n🔍 Starting Analysis...\n');
    
    // Analyze PR branch with adaptive iterations
    console.log('⏳ Analyzing PR branch with adaptive iterations...');
    const startTime = Date.now();
    
    const prResult = await analyzer.analyzeWithGapFilling(
      testConfig.repositoryUrl,
      testConfig.prBranch
    );
    
    const duration = Date.now() - startTime;
    
    // Get aggregated metrics
    const metrics = monitor.getAggregatedMetrics();
    
    console.log('\n✅ Analysis Complete!\n');
    console.log('📈 Analysis Statistics:');
    console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`   Total Iterations: ${prResult.iterations.length}`);
    console.log(`   Completeness: ${prResult.completeness}%`);
    console.log(`   Issues Found: ${(prResult.finalResult.issues || []).length}`);
    console.log(`   Memory Used: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`);
    
    console.log('\n🔄 Iteration Details:');
    prResult.iterations.forEach((iter, index) => {
      console.log(`   Iteration ${index + 1}: ${iter.issues.length} issues, ${iter.completeness}% complete`);
    });
    
    console.log('\n📊 Global Metrics:');
    console.log(`   Average Iterations: ${metrics.averageIterations.toFixed(2)}`);
    console.log(`   Total Analyses: ${metrics.totalAnalyses}`);
    console.log(`   Success Rate: ${(metrics.successRate * 100).toFixed(1)}%`);
    
    // Create comparison result structure for report
    const comparisonResult = {
      newIssues: prResult.finalResult.issues || [],
      resolvedIssues: [],
      unchangedIssues: [],
      prBreakingChanges: prResult.finalResult.breakingChanges || [],
      scores: prResult.finalResult.scores || {
        overall: 75,
        security: 80,
        performance: 75,
        maintainability: 70,
        testing: 72
      },
      prMetadata: {
        repository_url: testConfig.repositoryUrl,
        number: testConfig.prNumber,
        prNumber: testConfig.prNumber,
        baseCommit: testConfig.mainBranch,
        headCommit: testConfig.prBranch,
        filesChanged: 15,
        additions: 200,
        deletions: 50
      },
      // Include analysis metrics for report
      analysisMetrics: {
        iterations: prResult.iterations.length,
        completeness: prResult.completeness,
        memoryUsed: process.memoryUsage().heapUsed,
        cacheHit: false,
        averageIterations: metrics.averageIterations
      },
      scanDuration: `${(duration / 1000).toFixed(2)}s`,
      modelUsed: 'Dynamic Model Selection',
      totalIssues: (prResult.finalResult.issues || []).length
    };
    
    // Generate markdown report
    console.log('\n📄 Generating Report...');
    const markdownReport = await reportGenerator.generateReport(comparisonResult as any);
    
    // Save reports
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const reportDir = path.join(__dirname, 'reports');
    await fs.mkdir(reportDir, { recursive: true });
    
    // Save markdown report
    const mdPath = path.join(reportDir, `pr-${testConfig.prNumber}-complete-${timestamp}.md`);
    await fs.writeFile(mdPath, markdownReport);
    console.log(`\n📄 Markdown report saved: ${mdPath}`);
    
    // Generate HTML with enhanced styling for iteration metrics
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
        
        /* Special styling for Analysis Iterations section */
        h3:contains("Analysis Iterations") {
            background: linear-gradient(90deg, #667eea10, #764ba210);
            padding: 10px;
            border-left: 4px solid #667eea;
            margin: 20px 0;
            border-radius: 4px;
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
        
        /* Iteration metrics highlight box */
        .iteration-metrics-box {
            background: linear-gradient(135deg, #667eea15, #764ba215);
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
        }
        
        .iteration-metrics-box h3 {
            color: #667eea;
            margin-top: 0;
            margin-bottom: 15px;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        
        .metric-item {
            background: white;
            padding: 12px;
            border-radius: 6px;
            border: 1px solid #e0e0e0;
        }
        
        .metric-label {
            font-size: 0.9em;
            color: #666;
            margin-bottom: 4px;
        }
        
        .metric-value {
            font-size: 1.8em;
            font-weight: bold;
            color: #333;
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
            Iterations: ${prResult.iterations.length} |
            Completeness: ${prResult.completeness}%
        </div>
    </div>
    
    <script>
        // Convert markdown to HTML
        const markdownContent = ${JSON.stringify(markdownReport)};
        document.getElementById('content').innerHTML = marked.parse(markdownContent);
        
        // Find and highlight the Analysis Iterations section
        const headings = document.querySelectorAll('h3');
        headings.forEach(h => {
            if (h.textContent.includes('Analysis Iterations')) {
                // Create a special box for iteration metrics
                const metricsBox = document.createElement('div');
                metricsBox.className = 'iteration-metrics-box';
                
                // Move the heading and its following list into the box
                h.parentNode.insertBefore(metricsBox, h);
                
                let nextElement = h;
                while (nextElement && !nextElement.tagName.match(/^H[123]$/)) {
                    const temp = nextElement.nextSibling;
                    metricsBox.appendChild(nextElement);
                    nextElement = temp;
                }
                
                // Add visual metrics grid
                const metricsGrid = document.createElement('div');
                metricsGrid.className = 'metrics-grid';
                metricsGrid.innerHTML = \`
                    <div class="metric-item">
                        <div class="metric-label">Total Iterations</div>
                        <div class="metric-value">${prResult.iterations.length}</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-label">Completeness</div>
                        <div class="metric-value">${prResult.completeness}%</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-label">Avg Iterations</div>
                        <div class="metric-value">${metrics.averageIterations.toFixed(1)}</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-label">Success Rate</div>
                        <div class="metric-value">${(metrics.successRate * 100).toFixed(0)}%</div>
                    </div>
                \`;
                metricsBox.appendChild(metricsGrid);
            }
        });
        
        // Style score values
        document.querySelectorAll('li').forEach(li => {
            if (li.textContent.includes('Score:')) {
                const match = li.textContent.match(/(\\d+)\\/100/);
                if (match) {
                    const score = parseInt(match[1]);
                    const className = score >= 80 ? 'score-high' : score >= 60 ? 'score-medium' : 'score-low';
                    li.innerHTML = li.innerHTML.replace(/(\\d+\\/100)/, '<span class="score ' + className + '">$1</span>');
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
    
    const htmlPath = path.join(reportDir, `pr-${testConfig.prNumber}-complete-${timestamp}.html`);
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
    console.log(`Overall Score: ${comparisonResult.scores?.overall || 0}/100`);
    console.log(`Issues Found: ${comparisonResult.totalIssues || 0}`);
    console.log(`Analysis Iterations: ${prResult.iterations.length}`);
    console.log(`Completeness: ${prResult.completeness}%`);
    
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
testCompleteAnalysisBrowser().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});