import { UnifiedAIParser } from './src/standard/deepwiki/services/unified-ai-parser';

// Sample DeepWiki response that causes parsing issues
const sampleResponse = `1. **Missing AbortController Check for Fetch**: No compatibility check for \`AbortController\`
   File: source/core/Ky.ts, Line: 5
   Code Snippet: \`\`\`
   protected abortController?: AbortController;
   \`\`\`
   Recommendation: Before using \`AbortController\`, add a feature detection check to ensure compatibility with older browsers or environments that do not support \`AbortController\`.
   Severity: medium

2. **Default Export of Main Module**: Use of default export in the main module
   File: source/index.ts, Line: 20
   Code Snippet: \`\`\`
   export default ky;
   \`\`\`
   Recommendation: Consider using named exports for better tree shaking and clearer import statements.
   Severity: low

3. **No Input Validation on Request Options**: Request options not validated
   File: source/core/Ky.ts, Line: 125
   Code Snippet: \`\`\`
   constructor(input: Input, options?: Options) {
     this._input = input;
   \`\`\`
   Recommendation: Add validation for critical options like timeout, retries, and hooks.
   Severity: medium`;

async function testFallbackParsing() {
  console.log('🔍 Testing fallback model parsing with sample DeepWiki response\n');
  
  // Set up environment for fallback mode
  process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'test-key';
  
  const parser = new UnifiedAIParser();
  
  try {
    console.log('Input response length:', sampleResponse.length);
    console.log('First 100 chars:', sampleResponse.substring(0, 100));
    
    // Try to parse with fallback handling
    const config = {
      language: 'typescript',
      framework: 'node',
      repositorySize: 'medium' as const,
      complexity: 'medium' as const,
      useAI: true
    };
    const result = await parser.parseDeepWikiResponse(sampleResponse, config);
    
    console.log('\n✅ Parsing successful!');
    console.log('Issues found:', (result as any).issues?.length || 0);
    
    // Show first issue
    if ((result as any).issues?.length > 0) {
      console.log('\nFirst issue:');
      console.log(JSON.stringify((result as any).issues[0], null, 2));
    }
    
  } catch (error: any) {
    console.error('\n❌ Parsing failed:', error.message);
    
    // Try simple regex-based fallback
    console.log('\n🔧 Attempting regex-based fallback parsing...');
    
    const issues: any[] = [];
    const regex = /(\d+)\.\s+\*\*([^*]+)\*\*:([^\n]+)\n\s+File:\s+([^,]+),\s+Line:\s+(\d+)/g;
    let match;
    
    while ((match = regex.exec(sampleResponse)) !== null) {
      issues.push({
        id: `issue-${match[1]}`,
        title: match[2],
        description: match[3].trim(),
        location: {
          file: match[4],
          line: parseInt(match[5])
        },
        severity: 'medium' // Default since we need to extract it separately
      });
    }
    
    console.log('Regex fallback found', issues.length, 'issues');
    if (issues.length > 0) {
      console.log('First issue from regex:');
      console.log(JSON.stringify(issues[0], null, 2));
    }
  }
}

testFallbackParsing().catch(console.error);