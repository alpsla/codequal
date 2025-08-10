#!/usr/bin/env npx ts-node
/**
 * Test script to examine DeepWiki evidence field
 */

import { deepWikiApiManager } from './src/services/deepwiki-api-manager';

async function testDeepWikiEvidence() {
  console.log('🔍 Testing DeepWiki evidence field\n');
  
  try {
    // Use cached analysis for faster response
    const repositoryUrl = 'https://github.com/vercel/swr';
    
    console.log(`📦 Repository: ${repositoryUrl}`);
    console.log('⏳ Getting analysis (using cache)...\n');
    
    const result = await deepWikiApiManager.analyzeRepository(repositoryUrl, {
      branch: 'main',
      skipCache: false
    });
    
    console.log(`✅ Got ${result.issues.length} issues\n`);
    
    // Look specifically at evidence field
    console.log('🔎 Examining evidence field structure:\n');
    
    result.issues.slice(0, 3).forEach((issue, index) => {
      console.log(`Issue ${index + 1}: ${issue.message}`);
      console.log('─'.repeat(60));
      
      // Check for evidence field
      if (issue.evidence) {
        console.log('✅ Has evidence field');
        console.log('Evidence structure:', JSON.stringify(issue.evidence, null, 2));
        
        if (issue.evidence.snippet) {
          console.log('\n📝 Code snippet from evidence.snippet:');
          console.log(issue.evidence.snippet);
        }
      } else {
        console.log('❌ No evidence field');
      }
      
      // Check for remediation field  
      if (issue.remediation) {
        console.log('\n💡 Remediation provided:');
        if (typeof issue.remediation === 'object') {
          console.log('- Immediate:', issue.remediation.immediate);
          if (issue.remediation.steps) {
            console.log('- Steps:', issue.remediation.steps.join('\n  '));
          }
        } else {
          console.log(issue.remediation);
        }
      }
      
      console.log('\n');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testDeepWikiEvidence().catch(console.error);