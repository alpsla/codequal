const axios = require('axios');

async function test() {
  const prompt = `Analyze the repository https://github.com/sindresorhus/ky (branch: main) for code quality issues.

Title: Missing error handling in HTTP client
Severity: high
Category: best-practice
File: source/index.ts
Line: 256
Code snippet: const response = await fetch(request);
Description: No try-catch block around fetch call could cause unhandled rejections.`;

  const response = await axios.post(
    'http://localhost:8001/chat/completions/stream',
    {
      repo_url: 'https://github.com/sindresorhus/ky',
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      provider: 'openrouter',
      model: 'openai/gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 2000
    },
    { timeout: 30000 }
  );
  
  console.log('Response:', response.data);
}

test().catch(console.error);
