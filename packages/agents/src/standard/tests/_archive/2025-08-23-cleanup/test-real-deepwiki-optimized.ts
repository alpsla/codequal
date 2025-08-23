#!/usr/bin/env npx ts-node
/**
 * Test real DeepWiki analysis with optimizations to avoid timeouts
 * - Disables location clarification
 * - Uses shorter timeout
 * - Tests with smaller repo
 */

import { DeepWikiApiWrapper } from './src/standard/services/deepwiki-api-wrapper';
import { AdaptiveDeepWikiAnalyzer } from './src/standard/comparison/adaptive-deepwiki-analyzer';
import { UnifiedAIParser } from './src/standard/services/unified-ai-parser';
import { ComparisonOrchestrator } from './src/standard/comparison';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runRealDeepWikiAnalysis() {
  console.log('🚀 Starting real DeepWiki analysis (optimized)...\n');

  // Initialize services
  const deepWikiService = new DeepWikiApiWrapper();
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Create analyzer with location clarification disabled
  const analyzer = new AdaptiveDeepWikiAnalyzer(
    deepWikiService,
    {
      disableLocationClarification: true,  // Skip AI location clarification
      timeout: 60000,  // 60 second timeout
      maxIterations: 3,  // Limit iterations
      minIterations: 2,  // Minimum 2 iterations
    }
  );

  // Create parser with disabled location enhancement
  const parser = new UnifiedAIParser({
    enableLocationEnhancement: false,
    enableSmartParsing: true,
    timeout: 30000
  });

  // Create orchestrator
  const orchestrator = new ComparisonOrchestrator(
    analyzer,
    parser,
    supabase
  );

  // Test with a simple, small repo that should work
  const testRepo = 'https://github.com/sindresorhus/is-odd';
  const prNumber = 1; // Small PR

  console.log(`📦 Testing with: ${testRepo} PR #${prNumber}`);
  console.log('⚙️ Configuration:');
  console.log('  - Location clarification: DISABLED');
  console.log('  - Timeout: 60 seconds');
  console.log('  - Max iterations: 3');
  console.log('  - Min iterations: 2\n');

  const startTime = Date.now();
  
  try {
    // Get PR metadata first
    const prUrl = `${testRepo}/pull/${prNumber}`;
    const prMetadata = {
      prNumber,
      title: 'Test PR',
      author: 'test-user',
      branch: 'feature-branch',
      baseBranch: 'main',
      filesChanged: 2,
      additions: 10,
      deletions: 5,
      url: prUrl,
      testCoverage: 'Not measured'
    };

    console.log('🔄 Starting analysis...');
    
    // Run the actual analysis
    const result = await orchestrator.analyzePullRequest(
      testRepo,
      prNumber,
      'main',
      `pull/${prNumber}/head`
    );

    console.log('\n✅ Analysis completed!');
    console.log(`⏱️ Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    console.log(`📊 Issues found: ${result.comparison.prIssues?.length || 0}`);
    console.log(`🔄 Iterations: ${result.comparison.analysisMetrics?.iterations || 'N/A'}`);
    console.log(`🤖 Model used: ${result.comparison.modelUsed || 'unknown'}`);

    // Display issues summary
    if (result.comparison.prIssues && result.comparison.prIssues.length > 0) {
      console.log('\n📋 Issues Summary:');
      const issuesBySeverity = result.comparison.prIssues.reduce((acc: any, issue: any) => {
        acc[issue.severity] = (acc[issue.severity] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(issuesBySeverity).forEach(([severity, count]) => {
        console.log(`  - ${severity}: ${count}`);
      });

      // Show first few issues with locations
      console.log('\n🔍 Sample Issues:');
      result.comparison.prIssues.slice(0, 3).forEach((issue: any, idx: number) => {
        console.log(`  ${idx + 1}. ${issue.title || issue.message}`);
        console.log(`     File: ${issue.location?.file || 'unknown'}`);
        console.log(`     Line: ${issue.location?.line || 'unknown'}`);
        console.log(`     Severity: ${issue.severity}`);
      });
    }

    // Generate report
    console.log('\n📝 Generating report...');
    const reportGenerator = new ReportGeneratorV8Final();
    
    // Enhance result with metadata
    const enhancedResult = {
      ...result.comparison,
      prMetadata,
      modelUsed: result.comparison.modelUsed || 'openai/gpt-4o-mini',
      aiModel: result.comparison.modelUsed || 'openai/gpt-4o-mini',
      scanDuration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`
    };

    const htmlReport = await reportGenerator.generateHTMLReport(enhancedResult);
    
    // Save report
    const reportPath = path.join(__dirname, 'reports', `real-deepwiki-${Date.now()}.html`);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, htmlReport);
    
    console.log(`\n✅ Report saved to: ${reportPath}`);
    
    // Open in browser
    console.log('🌐 Opening report in browser...');
    await execAsync(`open "${reportPath}"`);

    // Save raw results for debugging
    const dataPath = reportPath.replace('.html', '.json');
    fs.writeFileSync(dataPath, JSON.stringify(result, null, 2));
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
    const errorPath = path.join(__dirname, 'reports', `error-${Date.now()}.json`);
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