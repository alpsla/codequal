import axios from 'axios';
import fs from 'fs';

async function captureDeepWikiResponse() {
  console.log('📝 Capturing DeepWiki responses for format analysis...\n');
  
  const testCases = [
    {
      repo: 'https://github.com/sindresorhus/ky',
      name: 'ky'
    },
    {
      repo: 'https://github.com/vercel/swr',
      name: 'swr'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n🔍 Testing ${testCase.name}...`);
    
    try {
      const response = await axios.post(
        'http://localhost:8001/chat/completions/stream',
        {
          repo_url: testCase.repo,
          messages: [{
            role: 'user',
            content: `Analyze this repository for code quality issues, bugs, and improvements.
Find at least 5 issues with the following information for each:
- Issue title/description
- Severity (critical/high/medium/low)
- File path and line number
- Specific code problem
- Recommendation for fixing

Format each issue clearly with all the above information.`
          }],
          stream: false,
          provider: 'openrouter',
          model: 'openai/gpt-4o-mini',
          temperature: 0.1,
          max_tokens: 4000
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );
      
      const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      
      // Save to file
      const filename = `deepwiki-response-${testCase.name}.txt`;
      fs.writeFileSync(filename, content);
      console.log(`✅ Saved response to ${filename}`);
      
      // Show preview
      console.log(`📄 Response preview (first 800 chars):`);
      console.log(content.substring(0, 800));
      console.log('\n' + '='.repeat(80));
      
    } catch (error: any) {
      console.error(`❌ Error for ${testCase.name}:`, error.message);
    }
  }
}

captureDeepWikiResponse();