import { FixSuggestionAgentV2 } from './dist/standard/services/fix-suggestion-agent-v2';
import { Issue } from './dist/standard/types/analysis-types';

async function testNoFixBehavior() {
  const agent = new FixSuggestionAgentV2();
  
  // Test issue that matches a template (should get a fix)
  const matchingIssue: Issue = {
    id: 'test-1',
    title: 'SQL injection vulnerability detected',
    message: 'Direct SQL concatenation found',
    severity: 'critical',
    category: 'security',
    location: { file: 'api.js', line: 10 },
    codeSnippet: 'const query = "SELECT * FROM users WHERE id = " + userId;'
  };
  
  // Test issue that won't match any template (should return null)
  const unmatchedIssue: Issue = {
    id: 'test-2', 
    title: 'Complex domain-specific business logic violation',
    message: 'The quarterly revenue calculation does not account for regional tax variations',
    severity: 'high',
    category: 'code-quality',
    location: { file: 'revenue.js', line: 200 },
    codeSnippet: 'function calculateRevenue(sales, region) { return sales * 1.1; }'
  };
  
  console.log('Testing fix generation behavior:\n');
  
  // Test matching issue
  console.log('1. SQL injection issue (should generate fix):');
  const fixes1 = await agent.generateFixes([matchingIssue]);
  if (fixes1.length > 0) {
    console.log('   ✅ Fix generated successfully');
    console.log('   Template used:', fixes1[0].templateUsed);
  } else {
    console.log('   ❌ No fix generated (unexpected)');
  }
  
  // Test unmatched issue
  console.log('\n2. Complex business logic issue (should return no fix):');
  const fixes2 = await agent.generateFixes([unmatchedIssue]);
  if (fixes2.length === 0) {
    console.log('   ✅ Correctly returned no fix (as expected)');
  } else {
    console.log('   ❌ Generated fix when it shouldn\'t have:', fixes2[0].templateUsed);
  }
  
  console.log('\n✅ Test complete!');
}

testNoFixBehavior().catch(console.error);
