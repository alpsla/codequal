/**
 * Direct test of comparison agent without orchestrator
 */

import { ComparisonAgent } from '../../../comparison/comparison-agent';
import { DeepWikiAnalysisResult } from '../../../types/analysis-types';

// Create mock DeepWiki results
function createMockResult(branch: string): DeepWikiAnalysisResult {
  const isMain = branch === 'main';
  return {
    score: isMain ? 75 : 82,
    issues: [
      {
        id: `${branch}-1`,
        category: 'security' as const,
        severity: 'high' as const,
        location: { file: 'test.js', line: 10, column: 5 },
        message: 'Security issue in ' + branch
      },
      ...(isMain ? [] : [{
        id: `${branch}-2`,
        category: 'performance' as const,
        severity: 'medium' as const,
        location: { file: 'test2.js', line: 20, column: 10 },
        message: 'New performance issue'
      }])
    ],
    summary: `Analysis of ${branch}`,
    metadata: { files_analyzed: 10, total_lines: 1000, scan_duration: 1000 }
  };
}

async function test() {
  console.log('Testing comparison agent...\n');
  
  const logger = {
    debug: (m: string, d?: any) => console.log('[DEBUG]', m, d || ''),
    info: (m: string, d?: any) => console.log('[INFO]', m, d || ''),
    warn: (m: string, d?: any) => console.log('[WARN]', m, d || ''),
    error: (m: string, d?: any) => console.log('[ERROR]', m, d || '')
  };
  
  const agent = new ComparisonAgent(logger);
  
  await agent.initialize({
    language: 'javascript',
    sizeCategory: 'medium',
    role: 'comparison',
    prompt: 'Analyze the differences'
  });
  
  const result = await agent.analyze({
    mainBranchAnalysis: createMockResult('main'),
    featureBranchAnalysis: createMockResult('feature'),
    prMetadata: {
      id: 'pr-123',
      number: 123,
      title: 'Test PR',
      author: 'test',
      repository_url: 'https://github.com/test/repo',
      created_at: new Date().toISOString(),
      linesAdded: 100,
      linesRemoved: 50
    },
    generateReport: true
  });
  
  console.log('\nResult structure:');
  console.log('- success:', result.success);
  console.log('- report:', result.report ? 'Yes' : 'No');
  console.log('- prComment:', result.prComment ? 'Yes' : 'No');
  console.log('- comparison:', result.comparison ? 'Yes' : 'No');
  
  if (result.comparison) {
    console.log('\nComparison details:');
    console.log('- newIssues:', JSON.stringify(result.comparison.newIssues, null, 2));
    console.log('- resolvedIssues:', JSON.stringify(result.comparison.resolvedIssues, null, 2));
  }
  
  if (result.report) {
    console.log('\nReport preview:');
    console.log(result.report.substring(0, 500) + '...');
  }
}

test().catch(console.error);