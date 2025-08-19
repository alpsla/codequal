/**
 * Test script to trace where location data is lost
 */

import { AdaptiveDeepWikiAnalyzer } from './src/standard/deepwiki/services/adaptive-deepwiki-analyzer';
import { ComparisonAgent } from './src/standard/comparison/comparison-agent';

async function testLocationPreservation() {
  console.log('🔍 Testing Location Data Preservation...\n');
  
  // Step 1: Test AdaptiveDeepWikiAnalyzer
  const analyzer = new AdaptiveDeepWikiAnalyzer({} as any, {} as any);
  
  // Test fallback parse with sample DeepWiki response
  const sampleResponse = `
- **File Path: test/stream.ts**
  - **Line 14**: The createHttpTestServer function is called with bodyParser: false
  
- **File Path: test/hooks.ts**
  - **Line 1**: There is a potential issue with error handling
  
File Path: test/retry.ts
Line 42: The test for "only on defined status codes" may not account for all cases
`;

  const parsed = (analyzer as any).fallbackParse(sampleResponse);
  
  console.log('📊 Parsed Result from AdaptiveDeepWikiAnalyzer:');
  console.log('Issues found:', parsed.issues.length);
  
  if (parsed.issues.length > 0) {
    console.log('\nFirst issue structure:');
    console.log(JSON.stringify(parsed.issues[0], null, 2));
    
    console.log('\nLocation data check:');
    parsed.issues.forEach((issue: any, idx: number) => {
      console.log(`Issue ${idx + 1}:`);
      console.log(`  - File: ${issue.file || 'MISSING'}`);
      console.log(`  - Line: ${issue.line || 'MISSING'}`);
      console.log(`  - Title: ${issue.title?.substring(0, 50)}...`);
    });
  }
  
  // Step 2: Test ComparisonAgent preservation
  const agent = new ComparisonAgent();
  await agent.initialize({ language: 'typescript', complexity: 'medium' });
  
  // Create mock analysis with location data
  const mockAnalysis = {
    issues: [
      {
        title: 'Test Issue 1',
        severity: 'high',
        category: 'security',
        file: 'test/file1.ts',
        line: 10,
        message: 'Security vulnerability'
      },
      {
        title: 'Test Issue 2',
        severity: 'medium',
        category: 'performance',
        file: 'test/file2.ts',
        line: 20,
        message: 'Performance issue'
      }
    ],
    scores: { overall: 75 }
  };
  
  console.log('\n📊 Testing ComparisonAgent:');
  console.log('Input issues with locations:', mockAnalysis.issues.length);
  
  const result = await agent.analyze({
    mainBranchAnalysis: { issues: [], scores: { overall: 80 } } as any,
    featureBranchAnalysis: mockAnalysis as any,
    generateReport: false
  });
  
  console.log('\nComparison result:');
  console.log('New issues:', result.comparison.newIssues?.length);
  
  if (result.comparison.newIssues && result.comparison.newIssues.length > 0) {
    console.log('\nFirst new issue structure:');
    const firstIssue = result.comparison.newIssues[0];
    console.log(JSON.stringify(firstIssue, null, 2));
    
    console.log('\nLocation preservation check:');
    result.comparison.newIssues.forEach((issue: any, idx: number) => {
      console.log(`Issue ${idx + 1}:`);
      console.log(`  - File: ${issue.file || 'MISSING'}`);
      console.log(`  - Line: ${issue.line || 'MISSING'}`);
      console.log(`  - Location: ${issue.location ? 'Present' : 'MISSING'}`);
    });
  }
}

testLocationPreservation().catch(console.error);