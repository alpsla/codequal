#!/usr/bin/env npx ts-node

/**
 * Simple test to generate and open an HTML report with iteration metrics
 */

import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testBrowserReportSimple() {
  console.log('🚀 Generating Sample Report with Iteration Metrics\n');
  
  const reportGenerator = new ReportGeneratorV8Final();
  
  // Create sample comparison result with iteration metrics
  const comparisonResult = {
    newIssues: [
      {
        id: 'issue-1',
        severity: 'high',
        category: 'security',
        type: 'vulnerability',
        location: { file: 'src/auth.ts', line: 45 },
        message: 'Potential SQL injection vulnerability',
        description: 'User input is not properly sanitized before being used in SQL query'
      },
      {
        id: 'issue-2',
        severity: 'medium',
        category: 'performance',
        type: 'optimization',
        location: { file: 'src/api.ts', line: 120 },
        message: 'Inefficient loop in data processing',
        description: 'Consider using array methods instead of for loops for better performance'
      },
      {
        id: 'issue-3',
        severity: 'low',
        category: 'maintainability',
        type: 'code-smell',
        location: { file: 'src/utils.ts', line: 78 },
        message: 'Function is too complex',
        description: 'Cyclomatic complexity is 15, consider breaking into smaller functions'
      }
    ],
    resolvedIssues: [
      {
        id: 'resolved-1',
        severity: 'high',
        category: 'security',
        type: 'vulnerability',
        location: { file: 'src/config.ts', line: 12 },
        message: 'Fixed: Hardcoded API key removed',
        description: 'API key is now loaded from environment variables'
      }
    ],
    // These are existing repository issues that remain unchanged
    unchangedIssues: [
      {
        id: 'repo-1',
        severity: 'medium',
        category: 'security',
        type: 'vulnerability',
        location: { file: 'src/legacy/db.ts', line: 234 },
        message: 'Deprecated crypto algorithm',
        description: 'Using MD5 for password hashing, should use bcrypt or argon2'
      },
      {
        id: 'repo-2',
        severity: 'low',
        category: 'performance',
        type: 'optimization',
        location: { file: 'src/legacy/cache.ts', line: 89 },
        message: 'Inefficient cache implementation',
        description: 'Consider using LRU cache instead of simple object storage'
      },
      {
        id: 'repo-3',
        severity: 'low',
        category: 'maintainability',
        type: 'code-smell',
        location: { file: 'src/legacy/utils.ts', line: 456 },
        message: 'Dead code detected',
        description: 'Function is never called and can be removed'
      }
    ],
    prBreakingChanges: [],
    scores: {
      overall: 85,
      security: 80,
      performance: 90,
      maintainability: 85,
      testing: 82
    },
    prMetadata: {
      repository_url: 'https://github.com/sindresorhus/ky',
      number: 700,
      prNumber: 700,
      baseCommit: 'main',
      headCommit: 'pr-700',
      filesChanged: 15,
      additions: 200,
      deletions: 50
    },
    // Analysis metrics with iteration data
    analysisMetrics: {
      iterations: 4,
      completeness: 92,
      memoryUsed: 256 * 1024 * 1024,  // 256MB
      cacheHit: false,
      averageIterations: 3.67
    },
    scanDuration: '45.3s',
    // Model should be dynamically selected - this shows what was actually used
    modelUsed: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini (dynamic selection)',
    totalIssues: 6  // 3 new + 3 unchanged repo issues
  };
  
  console.log('📊 Sample Data Configuration:');
  console.log(`   Repository: sindresorhus/ky`);
  console.log(`   PR Number: #700`);
  console.log(`   Iterations: ${comparisonResult.analysisMetrics.iterations}`);
  console.log(`   Completeness: ${comparisonResult.analysisMetrics.completeness}%`);
  console.log(`   Issues: ${comparisonResult.newIssues.length} new, ${comparisonResult.resolvedIssues.length} resolved, ${comparisonResult.unchangedIssues.length} from repo\n`);
  console.log(`   Model Used: ${comparisonResult.modelUsed}\n`);
  
  // Generate markdown report
  console.log('📄 Generating Markdown Report...');
  const markdownReport = await reportGenerator.generateReport(comparisonResult as any);
  
  // Save reports
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const reportDir = path.join(__dirname, 'reports');
  await fs.mkdir(reportDir, { recursive: true });
  
  // Save markdown
  const mdPath = path.join(reportDir, `sample-report-${timestamp}.md`);
  await fs.writeFile(mdPath, markdownReport);
  console.log(`✅ Markdown saved: ${mdPath}`);
  
  // Generate HTML with enhanced styling
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeQual Report - PR #700 - sindresorhus/ky</title>
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
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header .subtitle { font-size: 1.1em; opacity: 0.9; }
        
        .metrics-banner {
            background: #f8f9fa;
            padding: 20px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            border-bottom: 2px solid #e0e0e0;
        }
        
        .metric-card {
            text-align: center;
        }
        
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }
        
        .metric-label {
            font-size: 0.9em;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .content { padding: 40px; }
        
        h1, h2 { 
            color: #667eea; 
            border-bottom: 2px solid #e0e0e0; 
            padding-bottom: 8px; 
            margin: 25px 0 15px; 
        }
        h3 { color: #555; margin: 20px 0 10px; }
        
        /* Highlight Analysis Iterations section */
        .iteration-highlight {
            background: linear-gradient(135deg, #667eea10, #764ba210);
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
        }
        
        .iteration-highlight h3 {
            color: #667eea;
            margin-top: 0;
        }
        
        ul { margin-left: 30px; margin-bottom: 15px; }
        li { margin: 5px 0; }
        
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Consolas', monospace;
            font-size: 0.9em;
        }
        
        .score {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 20px;
            font-weight: bold;
        }
        .score-high { background: #4caf50; color: white; }
        .score-medium { background: #ff9800; color: white; }
        .score-low { background: #f44336; color: white; }
        
        .severity-critical { color: #d32f2f; font-weight: bold; }
        .severity-high { color: #f57c00; font-weight: bold; }
        .severity-medium { color: #fbc02d; font-weight: bold; }
        .severity-low { color: #388e3c; font-weight: bold; }
        
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
            <div class="subtitle">sindresorhus/ky - Pull Request #700</div>
        </div>
        
        <div class="metrics-banner">
            <div class="metric-card">
                <div class="metric-value">${comparisonResult.analysisMetrics.iterations}</div>
                <div class="metric-label">Iterations</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${comparisonResult.analysisMetrics.completeness}%</div>
                <div class="metric-label">Completeness</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${comparisonResult.scores.overall}/100</div>
                <div class="metric-label">Score</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${comparisonResult.totalIssues}</div>
                <div class="metric-label">Total Issues</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${comparisonResult.unchangedIssues.length}</div>
                <div class="metric-label">Repo Issues</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${comparisonResult.scanDuration}</div>
                <div class="metric-label">Duration</div>
            </div>
        </div>
        
        <div class="content" id="content">
            <!-- Markdown content will be rendered here -->
        </div>
        
        <div class="timestamp">
            Generated: ${new Date().toLocaleString()} | 
            Model: ${comparisonResult.modelUsed} |
            Cache: ${comparisonResult.analysisMetrics.cacheHit ? 'Hit' : 'Miss'}
        </div>
    </div>
    
    <script>
        // Convert markdown to HTML
        const markdownContent = ${JSON.stringify(markdownReport)};
        document.getElementById('content').innerHTML = marked.parse(markdownContent);
        
        // Find and highlight Analysis Iterations section
        const headings = document.querySelectorAll('h3');
        headings.forEach(h => {
            if (h.textContent.includes('Analysis Iterations')) {
                const highlightDiv = document.createElement('div');
                highlightDiv.className = 'iteration-highlight';
                h.parentNode.insertBefore(highlightDiv, h);
                
                // Move content into highlight box
                let nextElement = h;
                while (nextElement && !nextElement.tagName.match(/^H[123]$/)) {
                    const temp = nextElement.nextSibling;
                    highlightDiv.appendChild(nextElement);
                    nextElement = temp;
                }
            }
        });
        
        // Style scores
        document.querySelectorAll('li').forEach(li => {
            const scoreMatch = li.textContent.match(/(\\d+)\\/100/);
            if (scoreMatch) {
                const score = parseInt(scoreMatch[1]);
                const className = score >= 80 ? 'score-high' : score >= 60 ? 'score-medium' : 'score-low';
                li.innerHTML = li.innerHTML.replace(/(\\d+\\/100)/, '<span class="score ' + className + '">$1</span>');
            }
        });
        
        // Style severities
        ['critical', 'high', 'medium', 'low'].forEach(severity => {
            const regex = new RegExp('\\\\b(' + severity + ')\\\\b', 'gi');
            document.querySelectorAll('td, li').forEach(el => {
                if (el.innerHTML.match(regex)) {
                    el.innerHTML = el.innerHTML.replace(regex, '<span class="severity-' + severity + '">$1</span>');
                }
            });
        });
    </script>
</body>
</html>`;
  
  const htmlPath = path.join(reportDir, `sample-report-${timestamp}.html`);
  await fs.writeFile(htmlPath, htmlContent);
  console.log(`✅ HTML saved: ${htmlPath}`);
  
  // Open in browser
  console.log('\n🌐 Opening report in browser...');
  const openCommand = process.platform === 'darwin' ? 'open' :
                     process.platform === 'win32' ? 'start' : 'xdg-open';
  
  try {
    await execAsync(`${openCommand} "${htmlPath}"`);
    console.log('✅ Report opened in browser!');
  } catch (error) {
    console.log(`⚠️  Could not auto-open. Please open:\n   ${htmlPath}`);
  }
  
  // Display the metadata section from the report
  const metadataMatch = markdownReport.match(/## Report Metadata[\s\S]*?(?=##|$)/);
  if (metadataMatch) {
    console.log('\n' + '='.repeat(60));
    console.log('REPORT METADATA SECTION:');
    console.log('='.repeat(60));
    console.log(metadataMatch[0]);
    console.log('='.repeat(60));
  }
  
  console.log('\n✅ Test completed successfully!');
  console.log('   Check your browser for the visual report with iteration metrics.');
}

// Run the test
testBrowserReportSimple().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});