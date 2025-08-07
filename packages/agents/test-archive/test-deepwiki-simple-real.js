#!/usr/bin/env node

// Simple test with real DeepWiki API
const { deepWikiApiManager } = require('../../apps/api/dist/services/deepwiki-api-manager.js');

console.log('Simple test with real DeepWiki API...\n');

process.env.USE_DEEPWIKI_MOCK = 'false';
process.env.DEEPWIKI_API_KEY = process.env.DEEPWIKI_API_KEY || 'test-key';

async function test() {
  try {
    console.log('Testing main branch...');
    const mainResult = await deepWikiApiManager.analyzeRepository(
      'https://github.com/expressjs/express',
      { branch: 'main' }
    );
    
    console.log('\nMain branch results:');
    console.log('- Total issues:', mainResult.issues?.length || 0);
    console.log('- Issue IDs:', mainResult.issues?.map(i => i.id).join(', ') || 'none');
    console.log('- Severities:', mainResult.issues?.map(i => i.severity).join(', ') || 'none');
    
    console.log('\nTesting PR branch...');
    const prResult = await deepWikiApiManager.analyzeRepository(
      'https://github.com/expressjs/express',
      { branch: 'pr/123' }
    );
    
    console.log('\nPR branch results:');
    console.log('- Total issues:', prResult.issues?.length || 0);
    console.log('- Issue IDs:', prResult.issues?.map(i => i.id).join(', ') || 'none');
    console.log('- Severities:', prResult.issues?.map(i => i.severity).join(', ') || 'none');
    
    // Compare
    const mainIds = new Set(mainResult.issues?.map(i => i.id) || []);
    const prIds = new Set(prResult.issues?.map(i => i.id) || []);
    
    console.log('\n=== COMPARISON ===');
    console.log('Issues in main but not PR (resolved):', 
      [...mainIds].filter(id => !prIds.has(id)).length);
    console.log('Issues in PR but not main (new):', 
      [...prIds].filter(id => !mainIds.has(id)).length);
    console.log('Issues in both (unchanged):', 
      [...mainIds].filter(id => prIds.has(id)).length);
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  setTimeout(() => process.exit(0), 2000);
}

test();