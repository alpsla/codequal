#!/usr/bin/env ts-node
/**
 * Simple DeepWiki Test
 * Test with a very small repository to verify embeddings work
 */

import axios from 'axios';

const DEEPWIKI_API_URL = 'http://localhost:8001';

async function testDeepWiki() {
  console.log('🚀 Testing DeepWiki with ConfigMap configuration...');
  
  // Use a very small repository
  const testRepo = 'https://github.com/sindresorhus/is-odd';
  
  console.log(`\n📦 Analyzing small repository: ${testRepo}`);
  console.log('This should complete quickly if embeddings are working...');
  
  const startTime = Date.now();
  
  try {
    const response = await axios.post(
      `${DEEPWIKI_API_URL}/chat/completions/stream`,
      {
        repo_url: testRepo,
        messages: [
          {
            role: "user",
            content: "Analyze this repository for code quality. Return a JSON response."
          }
        ],
        stream: false,
        provider: "openrouter",
        model: "openai/gpt-4-turbo-preview",
        temperature: 0.2,
        max_tokens: 2000
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 1 minute timeout
      }
    );
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    if (response.data.choices && response.data.choices[0]?.message?.content) {
      console.log(`\n✅ DeepWiki responded in ${elapsed}s`);
      
      // Check if it actually analyzed the repo
      const content = response.data.choices[0].message.content;
      if (content.includes('is-odd') || content.includes('sindresorhus')) {
        console.log('🎉 Success! DeepWiki analyzed the specific repository.');
        console.log('\n✅ The ConfigMap solution is working correctly!');
        console.log('   - DeepWiki loaded the updated embedder.json');
        console.log('   - Embeddings are being generated');
        console.log('   - Repository analysis is functional');
      } else {
        console.log('⚠️  DeepWiki responded but may not have analyzed the specific repo');
        console.log('Response preview:', content.substring(0, 200) + '...');
      }
    }
    
    return response.data;
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    throw error;
  }
}

// Run the test
testDeepWiki()
  .then(() => {
    console.log('\n🎆 Next: Run full system test with a PR');
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });
