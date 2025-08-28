import { DirectDeepWikiApiWithLocation } from './src/standard/services/direct-deepwiki-api-with-location';

async function testSnippetExtraction() {
  console.log('Testing code snippet extraction...\n');
  
  // Test with mock mode ON
  process.env.USE_DEEPWIKI_MOCK = 'true';
  console.log('USE_DEEPWIKI_MOCK:', process.env.USE_DEEPWIKI_MOCK);
  
  const client = new DirectDeepWikiApiWithLocation();
  
  // Create mock DeepWiki response with actual code snippets
  const mockResponse = `
UNCHANGED ISSUES (still exist in PR):
1. Issue: Potential denial of service due to unbounded request retries
   Status: UNCHANGED
   Severity: high
   Category: performance
   File path: index.ts
   Line number: 125
   Code snippet: if (this.retryCount < this.maxRetries) { ... }

2. Issue: Lack of input validation for URL parameters
   Status: UNCHANGED
   Severity: high
   Category: security
   File path: src/index.ts
   Line number: 56
   Code snippet: const response = await fetch(url);

NEW ISSUES (introduced by PR):
3. Issue: Hardcoded API endpoint without configuration option
   Status: NEW
   Severity: medium
   Category: code-quality
   File path: src/constants.ts
   Line number: 12
   Code snippet: const API_URL = 'https://api.example.com';
`;

  // Test parsing with the mock response
  const parsed = (client as any).parseDeepWikiPRResponse(mockResponse, [
    {
      title: 'Potential denial of service due to unbounded request retries',
      severity: 'high',
      category: 'performance',
      location: { file: 'index.ts', line: 125 }
    },
    {
      title: 'Lack of input validation for URL parameters',
      severity: 'high', 
      category: 'security',
      location: { file: 'src/index.ts', line: 56 }
    }
  ]);
  
  console.log('\n=== Parsed Issues ===');
  console.log(JSON.stringify(parsed, null, 2));
  
  // Check what codeSnippets we got
  console.log('\n=== Code Snippets Check ===');
  parsed.issues?.forEach((issue: any, idx: number) => {
    console.log(`Issue ${idx + 1}: "${issue.title}"`);
    console.log(`  Code Snippet: ${issue.codeSnippet || 'MISSING'}`);
  });
}

testSnippetExtraction().catch(console.error);