#!/usr/bin/env npx ts-node

/**
 * Session Setup Script for DeepWiki Integration
 * 
 * RUN THIS FIRST in every new session to ensure DeepWiki works correctly!
 * 
 * Usage:
 *   npx ts-node setup-deepwiki-for-session.ts
 */

import { DirectDeepWikiApi } from './src/standard/services/direct-deepwiki-api';
import { registerDeepWikiApi } from './src/standard/services/deepwiki-api-wrapper';
import { UnifiedAnalysisWrapper } from './src/standard/services/unified-analysis-wrapper';
import axios from 'axios';

async function setupDeepWikiForSession() {
  console.log('🚀 Setting up DeepWiki for this session...\n');
  
  // Step 1: Check DeepWiki is accessible
  console.log('1️⃣ Checking DeepWiki accessibility...');
  try {
    const response = await axios.get('http://localhost:8001/health', { timeout: 5000 });
    console.log('   ✅ DeepWiki is accessible at http://localhost:8001');
  } catch (error) {
    console.error('   ❌ DeepWiki not accessible!');
    console.error('   Please run: kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001');
    process.exit(1);
  }
  
  // Step 2: Register DirectDeepWikiApi
  console.log('\n2️⃣ Registering DirectDeepWikiApi...');
  const directApi = new DirectDeepWikiApi();
  registerDeepWikiApi(directApi);
  console.log('   ✅ DirectDeepWikiApi registered globally');
  
  // Step 3: Test with a simple repository
  console.log('\n3️⃣ Testing DeepWiki integration...');
  const wrapper = new UnifiedAnalysisWrapper();
  
  try {
    console.log('   Running test analysis on sindresorhus/is-odd...');
    const result = await wrapper.analyzeRepository('https://github.com/sindresorhus/is-odd', {
      validateLocations: false, // Skip validation for speed
      requireMinConfidence: 0,  // Accept all issues for testing
      maxClarificationAttempts: 0,
      useDeepWikiMock: false
    });
    
    if (result.success && result.analysis) {
      console.log(`   ✅ DeepWiki integration working! Found ${result.analysis.issues?.length || 0} issues`);
    } else {
      console.log('   ⚠️ DeepWiki returned no data - may need to check API');
    }
  } catch (error) {
    console.error('   ❌ DeepWiki test failed:', error);
    console.log('   This might be normal if DeepWiki is warming up. Try running your tests anyway.');
  }
  
  // Step 4: Create session marker file
  console.log('\n4️⃣ Creating session marker...');
  const fs = require('fs');
  const sessionInfo = {
    setupTime: new Date().toISOString(),
    deepwikiUrl: process.env.DEEPWIKI_API_URL || 'http://localhost:8001',
    useMock: process.env.USE_DEEPWIKI_MOCK || 'false',
    sessionId: Math.random().toString(36).substring(7)
  };
  
  fs.writeFileSync('.deepwiki-session.json', JSON.stringify(sessionInfo, null, 2));
  console.log('   ✅ Session marker created: .deepwiki-session.json');
  
  // Step 5: Display summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ DeepWiki Session Setup Complete!');
  console.log('='.repeat(60));
  console.log('\n📋 Quick Test Commands:\n');
  console.log('  # Test V8 Report Generator:');
  console.log('  npx ts-node test-v8-validation.ts\n');
  console.log('  # Run Bug Fix Validation:');
  console.log('  npx ts-node test-v8-bug-fixes-validation.ts\n');
  console.log('  # Run Performance Tests:');
  console.log('  npx ts-node src/standard/tests/regression/multi-language-performance.test.ts\n');
  console.log('💡 TIP: If tests show 0 issues, check:');
  console.log('  1. Location validation confidence threshold (set to 0 to see all)');
  console.log('  2. USE_DEEPWIKI_MOCK environment variable (should be false for real data)');
  console.log('  3. DeepWiki is actually returning data (check with curl)');
  
  return true;
}

// Run if executed directly
if (require.main === module) {
  setupDeepWikiForSession()
    .then(() => {
      console.log('\n✅ Ready to run tests!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Setup failed:', error);
      process.exit(1);
    });
}

export { setupDeepWikiForSession };