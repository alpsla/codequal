const axios = require('axios');

async function test() {
  console.log('🔍 Testing DeepWiki with repository URL...');
  
  const response = await axios.post(
    'http://localhost:8001/chat/completions/stream',
    {
      repo_url: 'https://github.com/sindresorhus/ky',
      messages: [{
        role: 'user',
        content: `Analyze this repository and find security, performance and code quality issues.
Return each issue in this format:
Title: [issue title]
Severity: [critical|high|medium|low]
Category: [security|performance|code-quality]
File: [exact file path from repository]
Line: [line number]
Description: [description]

Find issues in the actual TypeScript files in the source/ directory.`
      }],
      stream: false,
      provider: 'openrouter',
      model: 'openai/gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 2000
    },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000
    }
  );
  
  console.log('✅ Response received');
  console.log(response.data);
}

test().catch(console.error);
