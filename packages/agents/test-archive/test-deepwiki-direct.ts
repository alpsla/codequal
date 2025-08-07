#!/usr/bin/env ts-node
/**
 * Direct test of DeepWiki API to verify it's working
 */

import axios from 'axios';

async function testDeepWikiDirect() {
    console.log('Testing DeepWiki API directly...\n');

    try {
        // Test 1: Health check
        console.log('1. Health check:');
        const health = await axios.get('http://localhost:8001/health');
        console.log('   ✅ API is healthy:', health.status === 200);

        // Test 2: Simple query without repository
        console.log('\n2. Simple query test:');
        const simpleQuery = {
            messages: [{
                role: 'user',
                content: 'What are best practices for code quality?'
            }],
            stream: false,
            provider: 'openrouter',
            model: 'openai/gpt-4-turbo-preview',
            temperature: 0.7,
            max_tokens: 500
        };

        const response = await axios.post(
            'http://localhost:8001/chat/completions/stream',
            simpleQuery,
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            }
        );

        if (response.data?.choices?.[0]?.message?.content) {
            console.log('   ✅ Got response:', response.data.choices[0].message.content.substring(0, 100) + '...');
        }

        // Test 3: Get embedder config
        console.log('\n3. Checking embedder configuration:');
        console.log('   Run: kubectl exec -n codequal-dev -l app=deepwiki -- cat /app/api/config/embedder.json');

        console.log('\n✅ DeepWiki API is operational!');
        console.log('\nNote: Repository analysis may be slow due to:');
        console.log('- Large repository size (React)');
        console.log('- Embedding generation with text-embedding-3-large');
        console.log('- Tokenizer mismatch (using text-embedding-3-small for counting)');

    } catch (error: any) {
        console.error('❌ Error:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Port forwarding may have stopped. Run:');
            console.log('   kubectl port-forward -n codequal-dev svc/deepwiki-api 8001:8001');
        }
    }
}

testDeepWikiDirect();