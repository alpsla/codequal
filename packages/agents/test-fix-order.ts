import { FixSuggestionAgentV2 } from './dist/standard/services/fix-suggestion-agent-v2';
import { Issue } from './dist/standard/types/analysis-types';

async function testFixOrder() {
  const agent = new FixSuggestionAgentV2();
  
  // Test issue that should match a template
  const sqlInjectionIssue: Issue = {
    id: 'test-1',
    title: 'SQL injection vulnerability in query',
    message: 'Direct string concatenation in SQL query',
    description: 'Direct string concatenation in SQL query',
    severity: 'critical',
    category: 'security',
    location: {
      file: 'api/users.js',
      line: 45
    },
    codeSnippet: 'const query = "SELECT * FROM users WHERE id = " + userId;'
  };
  
  // Test issue that won't match templates well  
  const customIssue: Issue = {
    id: 'test-2', 
    title: 'Custom performance issue with complex logic',
    message: 'Complex performance logic not implemented correctly',
    description: 'Complex validation logic not implemented correctly',
    severity: 'high',
    category: 'performance',
    location: {
      file: 'services/calculator.js',
      line: 100
    },
    codeSnippet: 'function calculateDiscount(price, customerType) { return price * 0.1; }'
  };
  
  console.log('Testing fix generation order...\n');
  console.log('1. Testing SQL injection (should use template):');
  const fixes1 = await agent.generateFixes([sqlInjectionIssue]);
  if (fixes1.length > 0) {
    console.log('   ✅ Got fix, template used:', fixes1[0].templateUsed || 'none');
    console.log('   Preview:', fixes1[0].fixedCode.substring(0, 100) + '...');
  }
  
  console.log('\n2. Testing custom issue (should try template first):');
  const fixes2 = await agent.generateFixes([customIssue]);
  if (fixes2.length > 0) {
    console.log('   ✅ Got fix, template used:', fixes2[0].templateUsed || 'none');
    console.log('   Preview:', fixes2[0].fixedCode.substring(0, 100) + '...');
  }
  
  console.log('\n✅ Fix order test complete!');
}

testFixOrder().catch(console.error);
