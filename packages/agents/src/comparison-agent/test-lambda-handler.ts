/**
 * Direct test of the Lambda handler without serverless framework
 */

import { handler } from './comparison-agent';

// Test event mimicking API Gateway
const testEvent = {
  body: JSON.stringify({
    mainBranchReport: {
      overall_score: 70,
      issues: [
        {
          id: 'SEC-001',
          title: 'SQL Injection',
          severity: 'critical',
          category: 'security',
          file_path: 'src/db.ts',
          line_number: 45,
          description: 'SQL injection vulnerability',
          code_snippet: 'query(`SELECT * FROM users WHERE id = ${id}`)',
          recommendation: 'Use parameterized queries'
        },
        {
          id: 'PERF-001',
          title: 'N+1 Query',
          severity: 'high',
          category: 'performance',
          file_path: 'src/api.ts',
          line_number: 100,
          description: 'Multiple queries in loop',
          recommendation: 'Batch queries'
        }
      ],
      metadata: {
        repository: 'test/repo',
        branch: 'main',
        commit: 'abc123',
        analysis_date: '2025-01-30',
        model_used: 'gpt-4o-mini'
      }
    },
    featureBranchReport: {
      overall_score: 78,
      issues: [
        {
          id: 'PERF-001',
          title: 'N+1 Query',
          severity: 'high',
          category: 'performance',
          file_path: 'src/api.ts',
          line_number: 100,
          description: 'Multiple queries in loop',
          recommendation: 'Batch queries'
        }
      ],
      metadata: {
        repository: 'test/repo',
        branch: 'feature/fix-security',
        commit: 'def456',
        analysis_date: '2025-01-30',
        model_used: 'gpt-4o-mini'
      }
    },
    prMetadata: {
      pr_number: 123,
      pr_title: 'Fix security issues',
      files_changed: ['src/db.ts'],
      lines_added: 50,
      lines_removed: 25,
      author_id: 'user-123',
      author_skills: {
        security: 60,
        performance: 70,
        quality: 65
      }
    }
  }),
  headers: {
    'Content-Type': 'application/json'
  },
  httpMethod: 'POST',
  path: '/compare'
};

// Mock context
const context = {
  callbackWaitsForEmptyEventLoop: true,
  functionName: 'compareReports',
  functionVersion: '$LATEST',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789:function:compareReports',
  memoryLimitInMB: '128',
  awsRequestId: 'test-request-id',
  logGroupName: '/aws/lambda/compareReports',
  logStreamName: '2025/01/30/[$LATEST]test',
  getRemainingTimeInMillis: () => 30000,
  done: () => { /* no-op */ },
  fail: () => { /* no-op */ },
  succeed: () => { /* no-op */ }
};

async function runTest() {
  console.log('🧪 Testing Lambda Handler Directly\n');
  console.log('📋 Test Scenario:');
  console.log('  - Main branch: 2 issues (1 critical security, 1 high performance)');
  console.log('  - Feature branch: 1 issue (performance remains)');
  console.log('  - Expected: Security issue fixed\n');

  try {
    console.log('🚀 Invoking handler...');
    const result = await handler(
      testEvent as any,
      {} as any, // context
      {} as any  // callback
    );
    
    console.log('\n📊 Lambda Response:');
    console.log(`  Status Code: ${result.statusCode}`);
    
    if (result.statusCode === 200) {
      const body = JSON.parse(result.body);
      console.log('\n✅ Analysis Results:');
      console.log(`  - Fixed issues: ${body.fixed_issues.length}`);
      console.log(`  - New issues: ${body.new_issues.length}`);
      console.log(`  - Repository score: ${body.scoring.repository_score.overall_score}`);
      console.log(`  - Score change: ${body.final_report.pr_impact.score_change > 0 ? '+' : ''}${body.final_report.pr_impact.score_change}`);
      console.log(`  - PR Decision: ${body.pr_decision.should_block ? '🚫 BLOCKED' : '✅ APPROVED'}`);
      
      if (body.scoring.skill_improvements) {
        console.log('\n👤 Skill Improvements:');
        Object.entries(body.scoring.skill_improvements.skill_changes).forEach(([skill, change]: [string, any]) => {
          const arrow = change.change > 0 ? '📈' : change.change < 0 ? '📉' : '➡️';
          console.log(`  ${arrow} ${skill}: ${change.previous_level} → ${change.new_level} (${change.change > 0 ? '+' : ''}${change.change})`);
        });
      }
      
      console.log('\n📝 Top Insights:');
      body.insights.slice(0, 3).forEach((insight: string) => {
        console.log(`  • ${insight}`);
      });
    } else {
      console.log('\n❌ Error Response:');
      console.log(result.body);
    }
  } catch (error) {
    console.error('\n❌ Handler Error:', error);
  }
  
  console.log('\n✅ Test completed!');
}

// Run the test
if (require.main === module) {
  runTest().catch(console.error);
}