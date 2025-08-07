#!/usr/bin/env ts-node
/**
 * Test the Comparison Agent directly with real DeepWiki data
 */

import { config } from 'dotenv';
import * as path from 'path';

// Load environment
config({ path: path.resolve(__dirname, '.env.production') });
config({ path: path.resolve(__dirname, '../../.env') });

// Mock DeepWiki results based on our real test
const mockMainBranchAnalysis = {
  score: 65,
  issues: [
    {
      id: 'main-1',
      category: 'security' as const,
      severity: 'high' as const,
      location: {
        file: 'examples/basic/pages/api/data.js',
        line: 10,
        column: 5
      },
      message: 'Unrestricted Fetch from External Sources'
    },
    {
      id: 'main-2',
      category: 'performance' as const,
      severity: 'medium' as const,
      location: {
        file: 'examples/suspense/pages/api/data.js',
        line: 15,
        column: 3
      },
      message: 'Slow API Response Due to Fixed Delay'
    }
  ],
  summary: 'Main branch analysis: 2 issues found',
  metadata: {
    files_analyzed: 15,
    total_lines: 500,
    scan_duration: 11850
  }
};

const mockFeatureBranchAnalysis = {
  score: 75,
  issues: [
    {
      id: 'pr-1',
      category: 'security' as const,
      severity: 'medium' as const,
      location: {
        file: 'examples/suspense-global/pages/api/data.ts',
        line: 20,
        column: 10
      },
      message: 'Insecure Fetch Usage'
    },
    {
      id: 'pr-2',
      category: 'security' as const,
      severity: 'low' as const,
      location: {
        file: 'Multiple Files',
        line: 0,
        column: 0
      },
      message: 'Insecure Timeout Handling'
    }
  ],
  summary: 'PR branch analysis: 2 issues found',
  metadata: {
    files_analyzed: 15,
    total_lines: 1200,
    scan_duration: 15300
  }
};

async function testComparisonAgentDirectly() {
  console.log('🔍 Testing Comparison Agent with Real DeepWiki Data\n');
  console.log('=' .repeat(60) + '\n');
  
  try {
    // Import the comparison agent
    const { ComparisonAgent } = require('./src/standard/comparison/comparison-agent');
    
    // Create logger
    const logger = {
      debug: (msg: string, data?: any) => console.log(`[DEBUG] ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
      info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
      warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
      error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data ? JSON.stringify(data, null, 2) : '')
    };
    
    // Create comparison agent
    const comparisonAgent = new ComparisonAgent(logger);
    
    // Prepare request
    const comparisonRequest = {
      mainBranchAnalysis: mockMainBranchAnalysis,
      featureBranchAnalysis: mockFeatureBranchAnalysis,
      prMetadata: {
        id: 'pr-2950',
        number: 2950,
        title: 'Test PR with real DeepWiki data',
        author: 'test-user',
        repository_url: 'https://github.com/vercel/swr',
        created_at: new Date().toISOString(),
        linesAdded: 700,
        linesRemoved: 200
      }
    };
    
    console.log('📊 Input Data Summary:');
    console.log(`   Main branch: ${mockMainBranchAnalysis.issues.length} issues (score: ${mockMainBranchAnalysis.score}/100)`);
    console.log(`   PR branch: ${mockFeatureBranchAnalysis.issues.length} issues (score: ${mockFeatureBranchAnalysis.score}/100)\n`);
    
    console.log('🔄 Running comparison...\n');
    
    // Run comparison
    const startTime = Date.now();
    const result = await comparisonAgent.analyze(comparisonRequest);
    const duration = Date.now() - startTime;
    
    console.log(`\n✅ Comparison completed in ${duration}ms\n`);
    
    // Log full result for debugging
    console.log('🔍 Full Result Structure:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n');
    
    // Display results
    console.log('📋 Comparison Results:');
    console.log('=' .repeat(40));
    console.log(`   Success: ${result.success}`);
    console.log(`   Has comparison: ${!!result.comparison}`);
    
    if (result.comparison) {
      console.log(`   New issues: ${result.comparison.newIssues?.length || 0}`);
      console.log(`   Fixed issues: ${result.comparison.fixedIssues?.length || 0}`);
      console.log(`   Unchanged issues: ${result.comparison.unfixedIssues?.length || 0}`);
    } else {
      console.log('   ❌ No comparison data in result!');
    }
    
    console.log(`   Decision: ${result.decision || 'N/A'}`);
    console.log(`   Confidence: ${result.confidence || 0}`);
    
    if (result.comparison) {
      if (result.comparison.newIssues && result.comparison.newIssues.length > 0) {
        console.log('\n🆕 New Issues:');
        result.comparison.newIssues.forEach((issue: any, idx: number) => {
          console.log(`   ${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.title}`);
          console.log(`      Category: ${issue.category}`);
          console.log(`      File: ${issue.location?.file}`);
        });
      }
      
      if (result.comparison.fixedIssues && result.comparison.fixedIssues.length > 0) {
        console.log('\n✅ Fixed Issues:');
        result.comparison.fixedIssues.forEach((issue: any, idx: number) => {
          console.log(`   ${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.title}`);
        });
      }
      
      if (result.comparison.unfixedIssues && result.comparison.unfixedIssues.length > 0) {
        console.log('\n⚠️  Unchanged Issues:');
        result.comparison.unfixedIssues.forEach((issue: any, idx: number) => {
          console.log(`   ${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.title}`);
        });
      }
      
      console.log('\n📝 Summary:');
      console.log(result.comparison.summary || 'No summary available');
    }
    
    // Check if report would show findings
    const totalNewIssues = result.comparison?.newIssues?.length || 0;
    const totalFixedIssues = result.comparison?.fixedIssues?.length || 0;
    const totalUnchangedIssues = result.comparison?.unfixedIssues?.length || 0;
    
    console.log('\n🎯 Final Check:');
    if (totalNewIssues === 0 && totalFixedIssues === 0 && totalUnchangedIssues === 0) {
      console.log('❌ ERROR: Comparison agent returned 0 findings despite having input data!');
    } else {
      console.log('✅ SUCCESS: Comparison agent correctly processed the findings!');
      console.log(`   Total findings that would appear in report: ${totalNewIssues + totalUnchangedIssues}`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testComparisonAgentDirectly()
    .then(() => {
      console.log('\n✨ Test completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

export { testComparisonAgentDirectly };