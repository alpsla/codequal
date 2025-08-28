/**
 * Test Unified DeepWiki Parser
 * 
 * Tests all format variations to ensure BUG-083 and BUG-072 are fixed
 */

import { UnifiedDeepWikiParser } from './src/standard/services/unified-deepwiki-parser';

// Test different response formats
const testFormats = {
  // Format 1: JSON (already parsed)
  json: {
    issues: [
      {
        title: 'Security vulnerability in authentication',
        severity: 'critical',
        location: { file: 'src/auth.ts', line: 45 },
        description: 'SQL injection vulnerability'
      }
    ]
  },
  
  // Format 2: Issue blocks
  issueBlocks: `Issue: Security vulnerability in authentication
Severity: critical
Category: security
File: src/auth.ts
Line: 45
Code snippet: \`\`\`
const query = "SELECT * FROM users WHERE id = " + userId;
\`\`\`
Suggestion: Use parameterized queries

Issue: Performance issue in data processing
Severity: medium
File path: src/processor.ts
Line number: 120
Description: Nested loops causing O(n²) complexity`,
  
  // Format 3: Numbered list
  numberedList: `1. **Security Issue**: SQL injection vulnerability in src/auth.ts at line 45
   The code directly concatenates user input into SQL query
   
2. **Performance Problem**: Inefficient algorithm in src/processor.ts:120
   Nested loops cause O(n²) time complexity
   
3. **Code Quality**: Missing error handling in src/api.ts`,
  
  // Format 4: Bullet points
  bulletPoints: `- Critical security issue: XSS vulnerability in templates/index.html (line 23)
- High priority bug: Null pointer exception possible in src/handler.ts at line 89
- Medium: Unused imports in src/utils.ts should be removed`,
  
  // Format 5: Template format
  templateFormat: `TYPE: security
FILE: src/auth.ts
LINE: 45
MESSAGE: SQL injection vulnerability
SEVERITY: critical

TYPE: performance  
FILE: src/processor.ts
LINE: 120
MESSAGE: Inefficient nested loops
SEVERITY: medium`,
  
  // Format 6: Markdown sections
  markdownFormat: `## Security Vulnerability

Found a critical SQL injection issue in File: \`src/auth.ts\` at Line: 45

The code directly concatenates user input without sanitization.

### Performance Issue

In \`src/processor.ts\`:120 there's an inefficient nested loop structure.`,
  
  // Format 7: Mixed/prose format
  proseFormat: `Analysis complete. Found several issues:

In the file src/auth.ts, there's a critical security vulnerability on line 45 where SQL injection is possible.

Additionally, src/processor.ts has performance problems at line 120 due to nested loops.

The src/api.ts file lacks proper error handling which could lead to unhandled exceptions.`,
  
  // Format 8: DeepWiki actual response (from logs)
  deepwikiActual: `Issue: Potential denial of service due to lack of request timeout handling
Severity: high
Category: performance
File: source/core/constants.ts
Line: 16

Issue: Missing input validation for URLs
Severity: high  
Category: security
File: source/core/constants.ts
Line: 18`,
  
  // Format 9: JSON string
  jsonString: JSON.stringify({
    issues: [
      {
        id: 'issue-1',
        title: 'Type safety issue',
        severity: 'medium',
        category: 'code-quality',
        location: { file: 'index.d.ts', line: 10 },
        codeSnippet: 'export type Options = any;'
      }
    ]
  })
};

async function testParser() {
  const parser = new UnifiedDeepWikiParser();
  console.log('🧪 Testing Unified DeepWiki Parser\n');
  console.log('=' .repeat(60));
  
  let totalTests = 0;
  let passedTests = 0;
  
  for (const [formatName, testData] of Object.entries(testFormats)) {
    totalTests++;
    console.log(`\n📝 Testing format: ${formatName}`);
    console.log('-'.repeat(40));
    
    try {
      const result = parser.parse(testData);
      
      if (result.issues.length > 0) {
        console.log(`✅ Successfully parsed ${result.issues.length} issues`);
        console.log(`   Format detected: ${result.format}`);
        console.log(`   Parse time: ${result.parseTime}ms`);
        
        // Show first issue as example
        const firstIssue = result.issues[0];
        console.log(`   Example issue:`);
        console.log(`     Title: ${firstIssue.title}`);
        console.log(`     Severity: ${firstIssue.severity}`);
        console.log(`     Location: ${firstIssue.location.file}:${firstIssue.location.line}`);
        console.log(`     Category: ${firstIssue.category}`);
        
        if (result.warnings) {
          console.log(`   ⚠️ Warnings: ${result.warnings.length}`);
        }
        
        // Validate key fields
        let valid = true;
        for (const issue of result.issues) {
          if (!issue.title || !issue.location?.file) {
            console.log(`   ❌ Invalid issue: missing required fields`);
            valid = false;
            break;
          }
          if (!['critical', 'high', 'medium', 'low'].includes(issue.severity)) {
            console.log(`   ❌ Invalid severity: ${issue.severity}`);
            valid = false;
            break;
          }
        }
        
        if (valid) {
          passedTests++;
          console.log(`   ✅ All issues valid`);
        }
      } else {
        console.log(`❌ Failed to parse - no issues extracted`);
      }
      
    } catch (error) {
      console.log(`❌ Parser error: ${error}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Test Results: ${passedTests}/${totalTests} formats parsed successfully`);
  
  if (passedTests === totalTests) {
    console.log('✅ All format tests passed! BUG-083 and BUG-072 are fixed.');
  } else {
    console.log(`⚠️ ${totalTests - passedTests} format(s) failed to parse correctly.`);
  }
  
  // Test edge cases
  console.log('\n📋 Testing edge cases...');
  testEdgeCases(parser);
}

function testEdgeCases(parser: UnifiedDeepWikiParser) {
  const edgeCases = [
    { name: 'Empty response', data: '' },
    { name: 'Null response', data: null },
    { name: 'Undefined response', data: undefined },
    { name: 'Empty object', data: {} },
    { name: 'Empty array', data: [] },
    { name: 'Invalid JSON string', data: '{invalid json}' },
    { name: 'Plain text without issues', data: 'No issues found in the codebase.' },
    { name: 'Malformed issue', data: 'Issue: Missing file location\nSeverity: high' }
  ];
  
  for (const testCase of edgeCases) {
    try {
      const result = parser.parse(testCase.data);
      console.log(`  ${testCase.name}: ${result.issues.length} issues (${result.format})`);
    } catch (error) {
      console.log(`  ${testCase.name}: Error - ${error}`);
    }
  }
}

// Run tests
testParser().catch(console.error);