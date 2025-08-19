/**
 * Test improved fallback parser with real DeepWiki
 */

import { AdaptiveDeepWikiAnalyzer } from './src/standard/deepwiki/services/adaptive-deepwiki-analyzer';

async function testImprovedParser() {
  console.log('🔍 Testing Improved Fallback Parser\n');
  
  const analyzer = new AdaptiveDeepWikiAnalyzer(
    'http://localhost:8001',
    'dw-key-e48329b6c05b4a36a18d65af21ac3c2f'
  );
  
  // Test with sample responses that match DeepWiki patterns
  const testResponses = [
    // Pattern 1: Simple format
    `Issues found in the repository:
    
1. **Security vulnerability in authentication**
   File: src/auth/login.ts, Line: 45
   The password is not properly hashed before storage
   
2. **Performance issue in data processing**
   File: src/utils/processor.js Line: 128
   Inefficient loop causing O(n²) complexity
   
3. **Memory leak in event handlers**
   test/handlers.test.ts:67 - Event listeners not properly cleaned up`,
   
    // Pattern 2: Markdown format
    `## Code Issues

**File Path: src/components/Button.tsx**
**Line 23**: Missing prop validation for onClick handler

**File Path: lib/api/client.js**
**Line 156**: Potential XSS vulnerability in user input

File: test/integration.test.js
Line 89: Test uses hardcoded values instead of fixtures`,

    // Pattern 3: Mixed format
    `Analysis Results:

- \`src/index.ts\` 
  Line 12: Unused import statement
  
- src/config.js:45 - Configuration values should be validated

Issues:
1. File: utils/validator.ts, Line: 78, Issue: Input validation missing for email field`
  ];
  
  console.log('Testing with sample responses...\n');
  
  testResponses.forEach((response, idx) => {
    console.log(`\n=== Test Response ${idx + 1} ===`);
    const result = (analyzer as any).fallbackParse(response);
    
    console.log(`Found ${result.issues.length} issues:`);
    result.issues.forEach((issue: any, i: number) => {
      console.log(`  ${i + 1}. ${issue.title}`);
      console.log(`     File: ${issue.file || 'MISSING'}`);
      console.log(`     Line: ${issue.line || 'MISSING'}`);
      console.log(`     Severity: ${issue.severity}`);
      console.log(`     Category: ${issue.category}`);
    });
  });
  
  // Now test with real DeepWiki if available
  console.log('\n\n=== Testing with Real DeepWiki ===\n');
  
  try {
    const result = await analyzer.analyzeWithGapFilling(
      'https://github.com/sindresorhus/ky',
      'main'
    );
    
    console.log(`Analysis complete in ${result.totalDuration}ms`);
    console.log(`Completeness: ${result.completeness}%`);
    console.log(`Total iterations: ${result.iterations.length}`);
    console.log(`Issues found: ${result.finalResult.issues?.length || 0}`);
    
    if (result.finalResult.issues && result.finalResult.issues.length > 0) {
      console.log('\nFirst 5 issues with locations:');
      result.finalResult.issues.slice(0, 5).forEach((issue: any, idx: number) => {
        console.log(`\n${idx + 1}. ${issue.title || issue.description?.substring(0, 50)}`);
        console.log(`   File: ${issue.file || 'NOT EXTRACTED'}`);
        console.log(`   Line: ${issue.line || 'NOT EXTRACTED'}`);
        console.log(`   Severity: ${issue.severity}`);
        console.log(`   Category: ${issue.category}`);
      });
      
      // Statistics
      const withFile = result.finalResult.issues.filter((i: any) => i.file).length;
      const withLine = result.finalResult.issues.filter((i: any) => i.line).length;
      
      console.log('\n📊 Location Extraction Statistics:');
      console.log(`   Issues with file path: ${withFile}/${result.finalResult.issues.length} (${Math.round(withFile * 100 / result.finalResult.issues.length)}%)`);
      console.log(`   Issues with line number: ${withLine}/${result.finalResult.issues.length} (${Math.round(withLine * 100 / result.finalResult.issues.length)}%)`);
    }
    
  } catch (error: any) {
    console.error('Error calling DeepWiki:', error.message);
    
    // Test with mock response
    console.log('\nTesting with mock DeepWiki response...');
    const mockResponse = `Based on my analysis of the repository, here are the key issues:

1. **Potential Security Issue**
   File: src/index.ts, Line: 234
   The request headers are not properly sanitized before processing

2. **Performance Bottleneck**
   File: src/utils/retry.ts Line: 89
   Exponential backoff calculation could cause integer overflow

3. **Code Quality Issue**
   test/main.test.js:156 - Test assertions are too generic

Test coverage is approximately 78%.
The repository has 12 contributors.`;

    const result = (analyzer as any).fallbackParse(mockResponse);
    console.log(`\nParsed ${result.issues.length} issues from mock response`);
    result.issues.forEach((issue: any, idx: number) => {
      console.log(`${idx + 1}. File: ${issue.file || 'MISSING'}, Line: ${issue.line || 'MISSING'}`);
    });
  }
}

testImprovedParser().catch(console.error);