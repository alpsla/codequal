#!/usr/bin/env npx ts-node

/**
 * Test Enhanced Prompts with Direct DeepWiki
 * Verifies that DeepWiki returns code snippets and structured data
 */

import axios from 'axios';
import { ENHANCED_COMPREHENSIVE_PROMPT } from './src/standard/deepwiki/prompts/enhanced-comprehensive-prompt';

async function testEnhancedPrompts() {
  console.log('🧪 Testing Enhanced DeepWiki Prompts\n');
  console.log('═'.repeat(80));
  
  const deepwikiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
  const deepwikiKey = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
  
  console.log(`📡 DeepWiki URL: ${deepwikiUrl}`);
  console.log(`🔑 Using API Key: ${deepwikiKey.substring(0, 10)}...`);
  console.log('📦 Test Repository: sindresorhus/ky\n');
  
  try {
    console.log('📨 Sending request with enhanced prompt...\n');
    
    const response = await axios.post(
      `${deepwikiUrl}/chat/completions/stream`,
      {
        repo_url: 'https://github.com/sindresorhus/ky',
        messages: [{
          role: 'user',
          content: ENHANCED_COMPREHENSIVE_PROMPT + `

CRITICAL: For testing purposes, find at least 3 real issues with:
1. ACTUAL file paths from the ky repository (like "source/index.ts", "test/retry.ts")
2. REAL code snippets from those files
3. EXACT line numbers
4. All required fields: category, severity, impact, education

Return ONLY these 3 issues in JSON format.`
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: 'json' }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepwikiKey}`
        },
        timeout: 60000
      }
    );
    
    console.log('✅ Response received!\n');
    console.log('═'.repeat(80));
    
    // Parse response
    let data: any;
    if (typeof response.data === 'string') {
      console.log('📝 Response is text, attempting to parse...');
      try {
        // Try to extract JSON from the response
        const jsonMatch = response.data.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          data = JSON.parse(jsonMatch[0]);
        } else {
          console.log('❌ No JSON found in response');
          console.log('Raw response:', response.data.substring(0, 500));
          return;
        }
      } catch (e) {
        console.log('❌ Failed to parse JSON from response');
        console.log('Raw response:', response.data.substring(0, 500));
        return;
      }
    } else {
      data = response.data;
    }
    
    // Analyze the response
    console.log('\n📊 ANALYSIS OF RESPONSE:\n');
    
    if (data.issues && Array.isArray(data.issues)) {
      console.log(`✅ Found ${data.issues.length} issues\n`);
      
      data.issues.slice(0, 3).forEach((issue: any, index: number) => {
        console.log(`Issue ${index + 1}:`);
        console.log('─'.repeat(40));
        
        // Check required fields
        const requiredFields = ['title', 'category', 'severity', 'impact', 'file', 'line', 'codeSnippet', 'recommendation', 'education'];
        const missingFields = requiredFields.filter(field => !issue[field]);
        
        if (missingFields.length === 0) {
          console.log('✅ All required fields present!');
        } else {
          console.log(`❌ Missing fields: ${missingFields.join(', ')}`);
        }
        
        // Display issue details
        console.log(`  Title: ${issue.title || 'MISSING'}`);
        console.log(`  Category: ${issue.category || 'MISSING'}`);
        console.log(`  Severity: ${issue.severity || 'MISSING'}`);
        console.log(`  File: ${issue.file || 'MISSING'}`);
        console.log(`  Line: ${issue.line || 'MISSING'}`);
        
        // Check if file path looks real
        if (issue.file) {
          const looksReal = !issue.file.includes('/src/') && 
                           !issue.file.includes('example') &&
                           (issue.file.includes('source/') || issue.file.includes('test/'));
          console.log(`  File looks real: ${looksReal ? '✅' : '❌'}`);
        }
        
        // Check if code snippet exists
        if (issue.codeSnippet) {
          console.log(`  Code snippet: ✅ (${issue.codeSnippet.length} chars)`);
          console.log(`  First line: ${issue.codeSnippet.split('\n')[0].substring(0, 50)}...`);
        } else {
          console.log(`  Code snippet: ❌ MISSING`);
        }
        
        // Check impact and education
        if (issue.impact) {
          console.log(`  Impact: ✅ (${issue.impact.length} chars)`);
        } else {
          console.log(`  Impact: ❌ MISSING`);
        }
        
        if (issue.education) {
          console.log(`  Education: ✅ (${issue.education.length} chars)`);
        } else {
          console.log(`  Education: ❌ MISSING`);
        }
        
        console.log();
      });
      
      // Summary
      console.log('═'.repeat(80));
      console.log('\n📈 SUMMARY:\n');
      
      const issuesWithAllFields = data.issues.filter((issue: any) => {
        const requiredFields = ['title', 'category', 'severity', 'impact', 'file', 'line', 'codeSnippet', 'recommendation', 'education'];
        return requiredFields.every(field => issue[field]);
      });
      
      const issuesWithRealPaths = data.issues.filter((issue: any) => 
        issue.file && (issue.file.includes('source/') || issue.file.includes('test/'))
      );
      
      const issuesWithCodeSnippets = data.issues.filter((issue: any) => 
        issue.codeSnippet && issue.codeSnippet.length > 10
      );
      
      console.log(`  Total issues: ${data.issues.length}`);
      console.log(`  Issues with all required fields: ${issuesWithAllFields.length}`);
      console.log(`  Issues with real-looking paths: ${issuesWithRealPaths.length}`);
      console.log(`  Issues with code snippets: ${issuesWithCodeSnippets.length}`);
      
      if (issuesWithAllFields.length === data.issues.length && 
          issuesWithRealPaths.length > 0 &&
          issuesWithCodeSnippets.length === data.issues.length) {
        console.log('\n✅ SUCCESS: Enhanced prompts are working correctly!');
      } else {
        console.log('\n⚠️  PARTIAL SUCCESS: DeepWiki returned some required data but not all');
        console.log('   The prompts may need further refinement or DeepWiki may need updates');
      }
      
    } else {
      console.log('❌ No issues array found in response');
      console.log('Response structure:', Object.keys(data));
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure DeepWiki is running:');
      console.log('   kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001');
    }
  }
}

// Run the test
testEnhancedPrompts().catch(console.error);