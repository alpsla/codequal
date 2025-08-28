/**
 * Test if DeepWiki is analyzing real code or returning placeholders
 */

import axios from 'axios';
import { loadEnvironment } from './src/standard/utils/env-loader';

async function testDeepWikiRealCode() {
  console.log('🔍 Testing DeepWiki Real Code Analysis\n');
  console.log('=' .repeat(60) + '\n');
  
  loadEnvironment();
  
  const deepwikiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
  
  // Ask for specific known code from ky repository
  const prompt = `Analyze the ky repository (https://github.com/sindresorhus/ky).

Look SPECIFICALLY at the file: source/core/Ky.ts

Find any issues in the Ky class implementation and return:
1. The EXACT code from the actual file (not examples)
2. The EXACT file path (should be .ts files, not .js)
3. The EXACT line numbers

Return in this format:
Issue: [description]
File: source/core/Ky.ts
Line: [exact line number]
Code:
\`\`\`typescript
[EXACT CODE FROM THE FILE - must match what's in the repository]
\`\`\`

CRITICAL: The code MUST be from the actual repository, not example code!`;

  try {
    console.log('📡 Calling DeepWiki with specific file request...\n');
    
    const response = await axios.post(
      `${deepwikiUrl}/chat/completions/stream`,
      {
        repo_url: 'https://github.com/sindresorhus/ky',
        messages: [{
          role: 'user',
          content: prompt
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
    
    const responseText = typeof response.data === 'string' ? 
                        response.data : 
                        JSON.stringify(response.data, null, 2);
    
    console.log('📝 DeepWiki Response:');
    console.log('-'.repeat(60));
    console.log(responseText.substring(0, 1500));
    console.log('-'.repeat(60) + '\n');
    
    // Check for red flags
    console.log('🚨 Quality Check:');
    console.log('-'.repeat(60));
    
    const hasJsFiles = responseText.includes('.js');
    const hasTsFiles = responseText.includes('.ts');
    const hasExampleCom = responseText.includes('example.com');
    const hasSourceCore = responseText.includes('source/core');
    const hasPlaceholderCode = responseText.includes('// TODO') || 
                               responseText.includes('// code here') ||
                               responseText.includes('yourVariable');
    
    if (hasJsFiles && !hasTsFiles) {
      console.log('❌ WRONG FILE TYPES: DeepWiki returned .js files but ky uses .ts!');
    } else if (hasTsFiles) {
      console.log('✅ Correct file types (.ts)');
    }
    
    if (hasExampleCom) {
      console.log('❌ PLACEHOLDER URLs: Found "example.com" - not real code!');
    } else {
      console.log('✅ No obvious placeholder URLs');
    }
    
    if (hasSourceCore) {
      console.log('✅ Found correct path structure (source/core)');
    } else {
      console.log('⚠️  Missing expected path structure');
    }
    
    if (hasPlaceholderCode) {
      console.log('❌ PLACEHOLDER CODE: Found TODO/placeholder comments');
    } else {
      console.log('✅ No obvious placeholder code');
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('💡 CONCLUSION:');
    
    if (hasJsFiles && !hasTsFiles && hasExampleCom) {
      console.log('🔴 DeepWiki is NOT analyzing the real repository!');
      console.log('   It\'s returning generic examples instead of actual code.');
      console.log('   This needs to be fixed in the DeepWiki service itself.');
    } else if (hasTsFiles && hasSourceCore && !hasPlaceholderCode) {
      console.log('🟢 DeepWiki appears to be analyzing real code!');
    } else {
      console.log('🟡 DeepWiki results are questionable - mix of real and fake.');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testDeepWikiRealCode().catch(console.error);