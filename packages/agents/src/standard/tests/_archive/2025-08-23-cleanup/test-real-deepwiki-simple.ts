#!/usr/bin/env npx ts-node
/**
 * Simple test for real DeepWiki analysis
 * Based on manual-pr-validator.ts but with optimizations
 */

import { ComparisonAgent } from './src/standard/comparison/comparison-agent';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runRealDeepWikiAnalysis() {
  console.log('🚀 Starting real DeepWiki analysis (simple)...\n');

  // Override environment to disable location clarification
  process.env.DISABLE_LOCATION_CLARIFICATION = 'true';
  process.env.DEEPWIKI_TIMEOUT = '60000';
  process.env.MAX_ITERATIONS = '3';
  process.env.MIN_ITERATIONS = '2';

  // Create agent with real DeepWiki
  const agent = new ComparisonAgent();

  // Test with a simple, small repo
  const testRepo = 'https://github.com/sindresorhus/is-odd';
  const prNumber = 1;

  console.log(`📦 Testing with: ${testRepo} PR #${prNumber}`);
  console.log('⚙️ Configuration:');
  console.log('  - USE_DEEPWIKI_MOCK:', process.env.USE_DEEPWIKI_MOCK);
  console.log('  - DEEPWIKI_API_URL:', process.env.DEEPWIKI_API_URL);
  console.log('  - Location clarification: DISABLED');
  console.log('  - Timeout: 60 seconds');
  console.log('  - Max iterations: 3\n');

  const startTime = Date.now();
  
  try {
    console.log('🔄 Starting analysis...');
    
    // Run the actual analysis
    const input = {
      repository: testRepo,
      prNumber,
      baseBranch: 'main',
      featureBranch: `pull/${prNumber}/head`
    };

    const result = await agent.analyze(input);

    const duration = Date.now() - startTime;
    console.log('\n✅ Analysis completed!');
    console.log(`⏱️ Duration: ${(duration / 1000).toFixed(1)}s`);
    
    // Log issues found
    const prIssues = result.prIssues || [];
    const unchangedIssues = result.unchangedIssues || [];
    
    console.log(`📊 PR Issues: ${prIssues.length}`);
    console.log(`📊 Repository Issues: ${unchangedIssues.length}`);
    console.log(`🔄 Iterations: ${result.analysisMetrics?.iterations || 'N/A'}`);
    console.log(`🤖 Model used: ${result.modelUsed || 'unknown'}`);

    // Display issues summary
    if (prIssues.length > 0) {
      console.log('\n📋 PR Issues Summary:');
      const issuesBySeverity = prIssues.reduce((acc: any, issue: any) => {
        acc[issue.severity] = (acc[issue.severity] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(issuesBySeverity).forEach(([severity, count]) => {
        console.log(`  - ${severity}: ${count}`);
      });

      // Show first few issues with locations
      console.log('\n🔍 Sample PR Issues:');
      prIssues.slice(0, 3).forEach((issue: any, idx: number) => {
        console.log(`  ${idx + 1}. ${issue.title || issue.message}`);
        console.log(`     File: ${issue.location?.file || 'unknown'}`);
        console.log(`     Line: ${issue.location?.line || 'unknown'}`);
        console.log(`     Severity: ${issue.severity}`);
        console.log(`     Type: ${issue.type || 'unknown'}`);
      });
    }

    // Check for location issues
    const unknownLocations = prIssues.filter((issue: any) => 
      !issue.location?.file || issue.location.file === 'unknown'
    );
    
    if (unknownLocations.length > 0) {
      console.log(`\n⚠️ Warning: ${unknownLocations.length} issues have unknown locations`);
    }

    // Generate report
    console.log('\n📝 Generating report...');
    const reportGenerator = new ReportGeneratorV8Final();
    
    // Add PR metadata
    const prMetadata = {
      prNumber,
      title: 'Test PR Analysis',
      author: 'test-user',
      branch: `pull/${prNumber}/head`,
      baseBranch: 'main',
      filesChanged: result.filesChanged || 0,
      additions: result.additions || 0,
      deletions: result.deletions || 0,
      url: `${testRepo}/pull/${prNumber}`,
      testCoverage: result.testCoverage || 'Not measured'
    };

    // Enhance result with metadata
    const enhancedResult = {
      ...result,
      prMetadata,
      modelUsed: result.modelUsed || 'openai/gpt-4o-mini',
      aiModel: result.modelUsed || 'openai/gpt-4o-mini',
      scanDuration: `${(duration / 1000).toFixed(1)}s`,
      analysisMetrics: result.analysisMetrics || {
        iterations: 3,
        completeness: 100,
        memoryUsed: 256 * 1024 * 1024,
        cacheHit: false,
        averageIterations: 3
      }
    };

    const report = reportGenerator.generateReport(enhancedResult);
    
    // Convert markdown to HTML
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Real DeepWiki Analysis Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1, h2, h3 { color: #2c3e50; }
        h1 { border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { margin-top: 30px; border-bottom: 1px solid #ecf0f1; padding-bottom: 5px; }
        pre {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
        code {
            background: #f8f9fa;
            padding: 2px 5px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        .critical { color: #e74c3c; font-weight: bold; }
        .high { color: #e67e22; font-weight: bold; }
        .medium { color: #f39c12; }
        .low { color: #95a5a6; }
        .metric-box {
            background: #ecf0f1;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th { background: #3498db; color: white; }
        tr:hover { background: #f5f5f5; }
        .success { color: #27ae60; }
        .warning { color: #f39c12; }
        .error { color: #e74c3c; }
    </style>
</head>
<body>
    <div class="container">
        ${report.split('\n').map(line => {
            if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
            if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
            if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`;
            if (line.startsWith('```')) return '<pre>';
            if (line === '```') return '</pre>';
            if (line.includes('Critical')) return `<span class="critical">${line}</span>`;
            if (line.includes('High')) return `<span class="high">${line}</span>`;
            if (line.includes('Medium')) return `<span class="medium">${line}</span>`;
            if (line.includes('Low')) return `<span class="low">${line}</span>`;
            return line ? `<p>${line}</p>` : '<br>';
        }).join('\n')}
    </div>
</body>
</html>`;
    
    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(__dirname, 'reports', `real-deepwiki-${timestamp}.html`);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, htmlContent);
    
    console.log(`\n✅ Report saved to: ${reportPath}`);
    
    // Open in browser
    console.log('🌐 Opening report in browser...');
    await execAsync(`open "${reportPath}"`);

    // Save raw results for debugging
    const dataPath = reportPath.replace('.html', '.json');
    fs.writeFileSync(dataPath, JSON.stringify(enhancedResult, null, 2));
    console.log(`📊 Raw data saved to: ${dataPath}`);

  } catch (error: any) {
    console.error('\n❌ Analysis failed:', error.message);
    
    if (error.response) {
      console.error('Response:', error.response.data || error.response);
    }
    
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }

    // Save error details
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const errorPath = path.join(__dirname, 'reports', `error-${timestamp}.json`);
    fs.mkdirSync(path.dirname(errorPath), { recursive: true });
    fs.writeFileSync(errorPath, JSON.stringify({
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
      timestamp: new Date().toISOString()
    }, null, 2));
    
    console.log(`\n📄 Error details saved to: ${errorPath}`);
  }
}

// Run the test
runRealDeepWikiAnalysis().catch(console.error);