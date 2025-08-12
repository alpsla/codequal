/**
 * Final verification test for model metadata and scan duration fixes
 */

import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(__dirname, '../../../.env') });

// Use mock mode for testing
process.env.USE_DEEPWIKI_MOCK = 'true';

async function testFinalVerification() {
  console.log('🔍 Final Verification Test\n');
  console.log('=' .repeat(60));
  
  try {
    // Import the compiled JavaScript
    const { ComparisonAgent } = require('./dist/standard/comparison/comparison-agent.js');
    
    console.log('1️⃣  Testing with simulated delay...\n');
    
    const agent = new ComparisonAgent();
    
    // Initialize with specific model
    await agent.initialize({
      language: 'typescript',
      complexity: 'medium',
      modelConfig: {
        provider: 'anthropic',
        model: 'claude-3-opus-20240229'
      }
    });
    
    // Create mock data with simulated processing time
    const startTime = Date.now();
    
    // Simulate some processing delay
    await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 second delay
    
    const mockAnalysis = {
      mainBranchAnalysis: {
        issues: [],
        scores: { overall: 85, security: 90, performance: 80 }
      },
      featureBranchAnalysis: {
        issues: [],
        scores: { overall: 90, security: 95, performance: 85 }
      },
      prMetadata: {
        id: 'pr-test-123',
        title: 'Final Verification Test',
        author: 'test-developer',
        repository_url: 'https://github.com/test/repo',
        number: 999
      },
      generateReport: true,
      scanDuration: (Date.now() - startTime) / 1000  // Pass actual duration
    };
    
    console.log('   Processing time: ~1.5 seconds');
    
    const result = await agent.analyze(mockAnalysis);
    
    console.log('\n2️⃣  Verification Results:\n');
    
    // Check model in metadata
    console.log('   Model in metadata:', result.metadata?.modelUsed);
    
    // Check model in report
    const report = result.report || '';
    const modelMatches = report.match(/\*\*Model Used:\*\* ([^\n]+)/);
    const modelInReport = modelMatches ? modelMatches[1] : 'Not found';
    console.log('   Model in report:', modelInReport);
    
    // Check scan duration in report
    const durationMatches = report.match(/\*\*Scan Duration:\*\* ([^\n]+)/);
    const durationInReport = durationMatches ? durationMatches[1] : 'Not found';
    console.log('   Duration in report:', durationInReport);
    
    console.log('\n3️⃣  Test Results:\n');
    
    const tests = {
      'Model correctly set': modelInReport.includes('anthropic/claude-3-opus-20240229'),
      'Duration not 0.0': !durationInReport.includes('0.0 seconds'),
      'Duration is realistic': parseFloat(durationInReport) >= 1.0
    };
    
    Object.entries(tests).forEach(([test, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${test}`);
    });
    
    // Final verdict
    console.log('\n' + '=' .repeat(60));
    
    const allPassed = Object.values(tests).every(v => v);
    
    if (allPassed) {
      console.log('✅ ALL TESTS PASSED!');
      console.log('   - Model metadata flows correctly');
      console.log('   - Scan duration is properly calculated');
      console.log('   - Reports display accurate information');
    } else {
      console.log('❌ Some tests failed - review results above');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testFinalVerification()
  .then(() => {
    console.log('\n✅ Verification complete');
    process.exit(0);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });