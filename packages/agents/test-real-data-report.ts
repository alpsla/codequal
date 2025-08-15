#!/usr/bin/env npx ts-node

/**
 * Real Data Test - Generates actual analysis report using DeepWiki
 * This test uses the sindresorhus/ky PR #700 as a test case
 */

import * as fs from 'fs';
import * as path from 'path';
import { ComparisonAgentProduction } from './src/standard/comparison/comparison-agent-production';

// Set environment for real DeepWiki
process.env.USE_DEEPWIKI_MOCK = 'false';
process.env.DEEPWIKI_API_URL = 'http://localhost:8001';
process.env.DEEPWIKI_API_KEY = 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';

async function runRealDataTest() {
  console.log('🚀 Starting Real Data Test with DeepWiki\n');
  console.log('Configuration:');
  console.log('- USE_DEEPWIKI_MOCK:', process.env.USE_DEEPWIKI_MOCK);
  console.log('- DEEPWIKI_API_URL:', process.env.DEEPWIKI_API_URL);
  console.log('- Target PR: https://github.com/sindresorhus/ky/pull/700\n');

  try {
    // Initialize the production comparison agent
    const agent = new ComparisonAgentProduction();

    // Prepare input for the analysis
    const input = {
      repositoryUrl: 'https://github.com/sindresorhus/ky',
      prNumber: 700,
      mainBranch: 'main',
      generateReport: true,
      skipCache: true, // Force fresh analysis
      prMetadata: {
        prNumber: 700,
        title: 'Fix timeout handling in retry logic',
        author: 'brabeji',
        repository_url: 'https://github.com/sindresorhus/ky',
        repoOwner: 'sindresorhus',
        repoName: 'ky'
      }
    };

    console.log('📊 Starting PR analysis...\n');
    const startTime = Date.now();

    // Run the comparison analysis
    const result = await agent.analyze(input);

    const duration = (Date.now() - startTime) / 1000;
    console.log(`\n✅ Analysis completed in ${duration.toFixed(1)} seconds\n`);

    // Extract the report
    const report = result.report || 'No report generated';

    // Save the report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(__dirname, 'test-outputs', 'real-data');
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save as Markdown
    const mdPath = path.join(outputDir, `real-data-report-${timestamp}.md`);
    fs.writeFileSync(mdPath, report);
    console.log(`📝 Markdown report saved to: ${mdPath}`);

    // Convert to HTML
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeQual Analysis Report - PR #700</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; border-bottom: 2px solid #ecf0f1; padding-bottom: 8px; }
        h3 { color: #7f8c8d; margin-top: 20px; }
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        pre {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 15px;
            overflow-x: auto;
        }
        pre code {
            background: none;
            padding: 0;
        }
        .metric {
            display: inline-block;
            padding: 5px 10px;
            margin: 5px;
            background: #e8f4f8;
            border-radius: 4px;
            font-weight: 500;
        }
        .critical { background: #ffe0e0; color: #d32f2f; }
        .high { background: #fff3e0; color: #f57c00; }
        .medium { background: #fff8e1; color: #fbc02d; }
        .low { background: #f1f8e9; color: #689f38; }
        .approved { color: #2e7d32; font-weight: bold; }
        .declined { color: #d32f2f; font-weight: bold; }
        .grade {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 1.2em;
            margin: 10px 0;
        }
        .grade-a { background: #4caf50; color: white; }
        .grade-b { background: #8bc34a; color: white; }
        .grade-c { background: #ffc107; color: #333; }
        .grade-d { background: #ff9800; color: white; }
        .grade-f { background: #f44336; color: white; }
        hr { border: none; border-top: 1px solid #ecf0f1; margin: 30px 0; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th { background: #f8f9fa; font-weight: 600; }
        .timestamp { color: #7f8c8d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        ${report.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
                .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
                .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                .replace(/\`(.+?)\`/g, '<code>$1</code>')
                .replace(/^---$/gm, '<hr>')
                .replace(/✅/g, '<span class="approved">✅</span>')
                .replace(/❌/g, '<span class="declined">❌</span>')
                .replace(/Grade:\s*([A-F][+-]?)/g, (match: string, grade: string) => {
                    const gradeClass = 'grade-' + grade[0].toLowerCase();
                    return `<span class="grade ${gradeClass}">Grade: ${grade}</span>`;
                })
                .replace(/\n/g, '<br>\n')}
    </div>
</body>
</html>`;

    const htmlPath = path.join(outputDir, `real-data-report-${timestamp}.html`);
    fs.writeFileSync(htmlPath, htmlContent);
    console.log(`🌐 HTML report saved to: ${htmlPath}`);

    // Display summary
    console.log('\n📊 Report Summary:');
    console.log('================');
    
    // Extract key metrics from report
    const scoreMatch = report.match(/Overall Score:\s*([\d.]+)\/100/);
    const gradeMatch = report.match(/Grade:\s*([A-F][+-]?)/);
    const decisionMatch = report.match(/PR Decision:\s*([✅❌])\s*([A-Z]+)/);
    
    if (scoreMatch) console.log(`Score: ${scoreMatch[1]}/100`);
    if (gradeMatch) console.log(`Grade: ${gradeMatch[1]}`);
    if (decisionMatch) console.log(`Decision: ${decisionMatch[1]} ${decisionMatch[2]}`);

    // Check if our bug fixes are working
    console.log('\n🐛 Bug Fix Verification:');
    console.log('========================');
    
    // Check for model name (should not be mock)
    if (report.includes('mock/MOCK-MODEL')) {
      console.log('❌ BUG-001: Mock model name still appears');
    } else if (report.includes('Model Used:')) {
      const modelMatch = report.match(/Model Used:\s*([^\n]+)/);
      console.log(`✅ BUG-001: Correct model displayed: ${modelMatch?.[1] || 'Unknown'}`);
    }

    // Check for decimal precision
    const hasFloatingPointError = /\d+\.\d{10,}/.test(report);
    if (hasFloatingPointError) {
      console.log('❌ BUG-002: Floating point errors detected');
    } else {
      console.log('✅ BUG-002: No floating point errors detected');
    }

    return { mdPath, htmlPath, report };

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
runRealDataTest()
  .then(result => {
    console.log('\n✅ Real data test completed successfully!');
    console.log('\nReports available at:');
    console.log(`- Markdown: ${result.mdPath}`);
    console.log(`- HTML: ${result.htmlPath}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Real data test failed:', error);
    process.exit(1);
  });