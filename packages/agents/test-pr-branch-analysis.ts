import axios from 'axios';

async function testPRBranchAnalysis() {
  console.log('🔍 Testing PR branch analysis...\n');
  
  const testCases = [
    {
      repo: 'https://github.com/sindresorhus/ky',
      branch: 'pull/700/head',
      name: 'ky PR #700'
    },
    {
      repo: 'https://github.com/vercel/swr', 
      branch: 'pull/2950/head',
      name: 'swr PR #2950'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 Testing ${testCase.name} (branch: ${testCase.branch})...`);
    console.log('=' .repeat(80));
    
    try {
      const response = await axios.post(
        'http://localhost:8001/chat/completions/stream',
        {
          repo_url: testCase.repo,
          messages: [{
            role: 'user',
            content: `Analyze the repository ${testCase.repo} (branch: ${testCase.branch}) for code quality issues.

For EACH issue found, provide:
1. **Title**: Brief description
2. File: exact/path/to/file.ts, Line: number
3. Severity: critical/high/medium/low
4. Description: What's wrong and why it matters
5. Code snippet showing the problem
6. Recommendation: How to fix it

Find at least 3 issues in the code.`
          }],
          stream: false,
          provider: 'openrouter',
          model: 'openai/gpt-4o-mini',
          temperature: 0.1,
          max_tokens: 3000
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 45000
        }
      );
      
      const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      
      console.log('✅ Response received');
      console.log('Response length:', content.length);
      console.log('\nFirst 1000 chars of response:');
      console.log(content.substring(0, 1000));
      
      // Check if it's the "can't access" message
      if (content.includes("can't analyze") || content.includes("can't access") || content.includes("cannot access")) {
        console.log('\n❌ DeepWiki cannot access this branch!');
      } else {
        // Count issues
        const issueMatches = content.match(/\d+\.\s+\*\*[^*]+\*\*/g);
        console.log(`\n✅ Found ${issueMatches ? issueMatches.length : 0} issues in response`);
      }
      
    } catch (error: any) {
      console.error(`❌ Error for ${testCase.name}:`, error.message);
    }
  }
}

testPRBranchAnalysis();