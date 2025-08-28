/**
 * Test that we're extracting real code from the repository
 */

import { DirectDeepWikiApiWithLocationV2 } from './src/standard/services/direct-deepwiki-api-with-location-v2';
import { loadEnvironment } from './src/standard/utils/env-loader';

loadEnvironment();

async function testRealCodeExtraction() {
  console.log('🧪 Testing Real Code Extraction\n');
  
  const api = new DirectDeepWikiApiWithLocationV2();
  
  try {
    // Test with a small repository
    const result = await api.analyzeRepository('https://github.com/sindresorhus/ky', {
      maxIterations: 1, // Just one iteration for speed
      branch: 'main'
    });
    
    console.log('\n📊 Analysis Results:');
    console.log(`  Total issues: ${result.issues.length}`);
    
    // Check code snippets
    console.log('\n📝 Code Snippet Analysis:');
    
    let realCodeCount = 0;
    let fakeCodeCount = 0;
    let noCodeCount = 0;
    
    result.issues.slice(0, 5).forEach((issue, idx) => {
      console.log(`\n${idx + 1}. ${issue.title || issue.description}`);
      console.log(`   File: ${issue.location?.file || 'unknown'}`);
      console.log(`   Line: ${issue.location?.line || 'unknown'}`);
      
      if (issue.codeSnippet) {
        // Check if it's real code or fake
        const snippet = issue.codeSnippet;
        
        if (snippet.includes('[') || snippet.includes('not provided') || snippet.includes('REQUIRED')) {
          console.log(`   ❌ Fake/Missing: "${snippet.substring(0, 50)}..."`);
          fakeCodeCount++;
        } else if (snippet.includes('return') || snippet.includes('const') || snippet.includes('function') || 
                   snippet.includes('=') || snippet.includes('{') || snippet.includes('(')) {
          console.log(`   ✅ Real Code: "${snippet.substring(0, 80)}..."`);
          realCodeCount++;
          
          // Show context if available
          if (issue.codeContext) {
            console.log(`   📄 Context (${issue.codeContext.length} lines):`);
            issue.codeContext.slice(0, 3).forEach(line => {
              console.log(`      ${line.substring(0, 60)}`);
            });
          }
        } else {
          console.log(`   ⚠️ Unclear: "${snippet.substring(0, 50)}..."`);
          noCodeCount++;
        }
      } else {
        console.log(`   ❌ No code snippet`);
        noCodeCount++;
      }
    });
    
    console.log('\n📈 Summary:');
    console.log(`  Real code snippets: ${realCodeCount}`);
    console.log(`  Fake/placeholder: ${fakeCodeCount}`);
    console.log(`  Missing/unclear: ${noCodeCount}`);
    
    const successRate = (realCodeCount / Math.max(1, realCodeCount + fakeCodeCount + noCodeCount)) * 100;
    console.log(`  Success rate: ${successRate.toFixed(1)}%`);
    
    if (successRate > 50) {
      console.log('\n✅ Real code extraction is working!');
    } else {
      console.log('\n⚠️ Real code extraction needs improvement');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRealCodeExtraction().catch(console.error);