/**
 * Debug DeepWiki Issue Data
 * This script checks what issues DeepWiki is actually returning
 */

require('dotenv').config();

const { DeepWikiService } = require('./packages/agents/dist/standard/services/deepwiki-service');

const TEST_REPO_URL = 'https://github.com/vercel/swr';

async function debugDeepWiki() {
  try {
    // Create logger
    const logger = {
      info: (...args) => console.log('[DeepWikiService]', ...args),
      error: (...args) => console.error('[DeepWikiService]', ...args),
      warn: (...args) => console.warn('[DeepWikiService]', ...args),
      debug: (...args) => console.log('[DeepWikiService]', ...args)
    };
    
    // Create DeepWiki service
    const deepWikiService = new DeepWikiService(logger);
    
    // Test connection
    console.log('🔍 Testing DeepWiki connection...');
    const healthCheck = await fetch(`${process.env.DEEPWIKI_API_URL}/health`);
    console.log('✅ DeepWiki health:', healthCheck.ok ? 'OK' : 'Failed');
    
    // Analyze main branch
    console.log('\n🔍 Analyzing main branch...');
    const mainResult = await deepWikiService.analyzeRepository(
      TEST_REPO_URL,
      'main',
      null
    );
    
    console.log('\n📊 Main Branch Analysis Result:');
    console.log('Total issues:', mainResult.issues.length);
    console.log('Score:', mainResult.score);
    
    if (mainResult.issues.length > 0) {
      console.log('\n📋 Issues Found:');
      mainResult.issues.forEach((issue, idx) => {
        console.log(`\nIssue ${idx + 1}:`);
        console.log('  ID:', issue.id);
        console.log('  Severity:', issue.severity);
        console.log('  Category:', issue.category);
        console.log('  Message:', issue.message);
        console.log('  Location:', issue.location);
        console.log('  Description:', issue.description?.substring(0, 100) + '...');
      });
    }
    
    // Also check the raw DeepWiki API response
    console.log('\n🔍 Checking raw DeepWiki API response...');
    const apiResponse = await fetch(`${process.env.DEEPWIKI_API_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.DEEPWIKI_API_KEY
      },
      body: JSON.stringify({
        repository_url: TEST_REPO_URL,
        branch: 'main'
      })
    });
    
    if (apiResponse.ok) {
      const rawData = await apiResponse.json();
      console.log('\n📦 Raw API Response:');
      console.log('Status:', rawData.status);
      console.log('Issues count:', rawData.issues?.length || 0);
      console.log('Score:', rawData.score);
      
      if (rawData.issues && rawData.issues.length > 0) {
        console.log('\nRaw issue example:');
        console.log(JSON.stringify(rawData.issues[0], null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugDeepWiki();