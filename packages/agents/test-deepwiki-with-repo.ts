import axios from 'axios';

async function testDeepWikiWithRepo() {
  console.log('🔍 Testing DeepWiki with repository in prompt...\n');
  
  const repoUrl = 'https://github.com/sindresorhus/ky';
  
  try {
    // Test 1: With repo_url in body
    console.log('Test 1: Using repo_url field');
    const response1 = await axios.post(
      'http://localhost:8001/chat/completions/stream',
      {
        repo_url: repoUrl,
        messages: [{
          role: 'user',
          content: 'Analyze this repository for code quality issues. Find at least 3 issues.'
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 2000
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );
    
    console.log('Response 1 (first 500 chars):');
    const content1 = typeof response1.data === 'string' ? response1.data : JSON.stringify(response1.data);
    console.log(content1.substring(0, 500));
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Test 2: With repository URL embedded in the prompt
    console.log('Test 2: Repository URL in prompt content');
    const response2 = await axios.post(
      'http://localhost:8001/chat/completions/stream',
      {
        messages: [{
          role: 'user',
          content: `Analyze the repository at ${repoUrl} for code quality issues.
Find at least 3 issues with:
- Issue title
- Severity (critical/high/medium/low)  
- File path
- Line number if possible`
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 2000
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );
    
    console.log('Response 2 (first 500 chars):');
    const content2 = typeof response2.data === 'string' ? response2.data : JSON.stringify(response2.data);
    console.log(content2.substring(0, 500));
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testDeepWikiWithRepo();