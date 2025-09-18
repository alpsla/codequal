#!/usr/bin/env npx ts-node

/**
 * Minimal OpenRouter test with exact API format
 */

async function testMinimal() {
  const apiKey = 'sk-or-v1-218cd645b87710faaed445d916a29785a9518188fca7bf229fea4b87d0a974f32c27ca30ee51ebc3794c67f4a8f517e6b6a40aac692ca85446d153afaa4431';
  
  console.log('Testing with minimal request...\n');
  
  // Try exact format from OpenRouter docs
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'openai/gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello' }]
    })
  });
  
  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));
  
  const text = await response.text();
  console.log('\nResponse body:');
  console.log(text);
  
  try {
    const json = JSON.parse(text);
    console.log('\nParsed JSON:');
    console.log(JSON.stringify(json, null, 2));
  } catch (e) {
    console.log('Could not parse as JSON');
  }
}

testMinimal().catch(console.error);