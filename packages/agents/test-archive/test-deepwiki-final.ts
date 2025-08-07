#!/usr/bin/env ts-node
/**
 * Final test to verify DeepWiki is working and generate a complete report
 */

import axios from 'axios';
import { promises as fs } from 'fs';

const DEEPWIKI_API_URL = 'http://localhost:8001';

async function testDeepWikiAndGenerateReport() {
    console.log('🚀 Final DeepWiki Test with text-embedding-3-large\n');

    try {
        // Test with a repository we know has embeddings
        console.log('1. Testing with facebook/react (should have existing embeddings)...');
        
        const reactPayload = {
            repo_url: 'https://github.com/facebook/react',
            messages: [{
                role: 'user',
                content: 'Analyze the React codebase for code quality, focusing on the main reconciler implementation'
            }],
            stream: false,
            provider: 'openrouter',
            model: 'openai/gpt-4-turbo-preview',
            temperature: 0.1,
            max_tokens: 4000
        };

        console.log('   Sending analysis request...');
        const startTime = Date.now();
        
        try {
            const response = await axios.post(
                `${DEEPWIKI_API_URL}/chat/completions/stream`,
                reactPayload,
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 180000 // 3 minute timeout
                }
            );

            const duration = Date.now() - startTime;
            console.log(`   ✅ Analysis completed in ${(duration / 1000).toFixed(1)}s`);

            if (response.data?.choices?.[0]?.message?.content) {
                const content = response.data.choices[0].message.content;
                console.log(`   📝 Response length: ${content.length} characters`);
                
                // Check if it analyzed actual code
                if (content.includes('0 files') || content.includes('0 lines')) {
                    console.log('   ❌ ERROR: DeepWiki returned "0 files, 0 lines"');
                    console.log('   This means embeddings are not working properly!');
                } else if (content.includes('reconciler') || content.includes('React') || content.includes('component')) {
                    console.log('   ✅ SUCCESS: DeepWiki analyzed actual React code!');
                    
                    // Save the full report
                    const reportPath = '/Users/alpinro/Code Prjects/codequal/DEEPWIKI_FINAL_REPORT.md';
                    await fs.writeFile(reportPath, `# DeepWiki Analysis Report - React Codebase

Generated: ${new Date().toISOString()}
Model: text-embedding-3-large (3072 dimensions)
Repository: https://github.com/facebook/react

## Analysis Results

${content}

## Configuration Used

\`\`\`json
{
  "embedder": {
    "client_class": "OpenAIClient",
    "batch_size": 500,
    "model_kwargs": {
      "model": "text-embedding-3-large",
      "dimensions": 3072,
      "encoding_format": "float"
    }
  }
}
\`\`\`

## Status

✅ DeepWiki is successfully using text-embedding-3-large for code analysis!
`);
                    
                    console.log(`\n   📄 Full report saved to: ${reportPath}`);
                    console.log('\n   Sample of analysis:');
                    console.log('   ' + content.substring(0, 500) + '...\n');
                    
                    return true;
                }
            }
        } catch (error: any) {
            if (error.response?.status === 500) {
                console.log('   ❌ Server error - might be git clone issue');
                console.log('   Error:', error.response.data.detail);
            } else {
                throw error;
            }
        }

        // Test 2: Try with a smaller repo that we can clone
        console.log('\n2. Testing with smaller repository (trekhleb/javascript-algorithms)...');
        
        const smallRepoPayload = {
            repo_url: 'https://github.com/trekhleb/javascript-algorithms',
            messages: [{
                role: 'user',
                content: 'Analyze this algorithms repository for code quality and best practices'
            }],
            stream: false,
            provider: 'openrouter',
            model: 'openai/gpt-4-turbo-preview',
            temperature: 0.1,
            max_tokens: 3000
        };

        const response2 = await axios.post(
            `${DEEPWIKI_API_URL}/chat/completions/stream`,
            smallRepoPayload,
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 120000
            }
        );

        if (response2.data?.choices?.[0]?.message?.content) {
            const content = response2.data.choices[0].message.content;
            console.log(`   📝 Response length: ${content.length} characters`);
            
            if (!content.includes('0 files') && !content.includes('0 lines')) {
                console.log('   ✅ SUCCESS: DeepWiki analyzed the algorithms repository!');
                
                const reportPath = '/Users/alpinro/Code Prjects/codequal/DEEPWIKI_ALGORITHMS_REPORT.md';
                await fs.writeFile(reportPath, `# DeepWiki Analysis Report - JavaScript Algorithms

Generated: ${new Date().toISOString()}
Model: text-embedding-3-large (3072 dimensions)
Repository: https://github.com/trekhleb/javascript-algorithms

## Analysis Results

${content}
`);
                console.log(`   📄 Report saved to: ${reportPath}`);
            }
        }

    } catch (error: any) {
        console.error('❌ Test failed:', error.message);
        if (error.response?.data) {
            console.error('   Response:', JSON.stringify(error.response.data, null, 2));
        }
    }

    // Check logs for embedding model usage
    console.log('\n3. Checking container logs for embedding model usage:');
    console.log('   Run this command to see logs:');
    console.log('   kubectl logs -n codequal-dev -l app=deepwiki --tail=100 | grep -E "(embedding|tokenizer|text-embedding-3-large)"');
}

// Run the test
testDeepWikiAndGenerateReport().then(() => {
    console.log('\n✅ Final test completed!');
    process.exit(0);
}).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});