#!/usr/bin/env ts-node
/**
 * Simple test to verify DeepWiki is working with the correct embedding model
 */

import axios from 'axios';

const DEEPWIKI_API_URL = 'http://localhost:8001';

async function testDeepWiki() {
    console.log('🧪 Testing DeepWiki with text-embedding-3-large configuration\n');

    try {
        // Test 1: Check API health
        console.log('1. Checking API health...');
        const healthResponse = await axios.get(`${DEEPWIKI_API_URL}/health`).catch(() => null);
        if (healthResponse?.status === 200) {
            console.log('   ✅ API is healthy');
        } else {
            console.log('   ⚠️  API health check failed');
        }

        // Test 2: Analyze a small repository
        console.log('\n2. Analyzing small repository (sindresorhus/is-odd)...');
        const analysisPayload = {
            repo_url: 'https://github.com/sindresorhus/is-odd',
            messages: [{
                role: 'user',
                content: 'Analyze this repository for code quality issues'
            }],
            stream: false,
            provider: 'openrouter',
            model: 'openai/gpt-4-turbo-preview',
            temperature: 0.1,
            max_tokens: 2000
        };

        console.log('   Sending analysis request...');
        const startTime = Date.now();
        
        const response = await axios.post(
            `${DEEPWIKI_API_URL}/chat/completions/stream`,
            analysisPayload,
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 120000 // 2 minute timeout
            }
        );

        const duration = Date.now() - startTime;
        console.log(`   ✅ Analysis completed in ${(duration / 1000).toFixed(1)}s`);

        // Check the response
        if (response.data?.choices?.[0]?.message?.content) {
            const content = response.data.choices[0].message.content;
            console.log(`   📝 Response length: ${content.length} characters`);
            
            // Check if it mentions the actual code (not "0 files, 0 lines")
            if (content.includes('0 files') || content.includes('0 lines')) {
                console.log('   ❌ ERROR: DeepWiki returned "0 files, 0 lines" - embeddings not working!');
            } else if (content.includes('export') || content.includes('function') || content.includes('isOdd')) {
                console.log('   ✅ SUCCESS: DeepWiki analyzed actual code!');
                console.log('\n   Sample of analysis:');
                console.log('   ' + content.substring(0, 200) + '...');
            } else {
                console.log('   ⚠️  Unclear if analysis worked properly');
                console.log('   Response sample:', content.substring(0, 200));
            }
        }

        // Test 3: Check logs for model usage
        console.log('\n3. Check container logs for embedding model:');
        console.log('   Run: kubectl logs -n codequal-dev -l app=deepwiki --tail=50 | grep -E "(embedding|tokenizer|model)"');

    } catch (error: any) {
        console.error('❌ Test failed:', error.message);
        if (error.response?.data) {
            console.error('   Response:', JSON.stringify(error.response.data, null, 2));
        }
        console.log('\n💡 Make sure to run port forwarding first:');
        console.log('   kubectl port-forward -n codequal-dev svc/deepwiki-api 8001:8001');
    }
}

// Run the test
testDeepWiki().then(() => {
    console.log('\n✅ Test completed!');
}).catch(console.error);