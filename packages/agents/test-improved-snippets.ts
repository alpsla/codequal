/**
 * Test improved code snippet extraction
 */

import { DirectDeepWikiApiWithLocationV2 } from './src/standard/services/direct-deepwiki-api-with-location-v2';
import { loadEnvironment } from './src/standard/utils/env-loader';

async function testImprovedSnippets() {
  console.log('🔍 Testing Improved Code Snippet Extraction\n');
  console.log('=' .repeat(60) + '\n');
  
  loadEnvironment();
  
  const api = new DirectDeepWikiApiWithLocationV2();
  
  try {
    console.log('📌 Analyzing ky repository with improved snippet extraction...\n');
    
    const result = await api.analyzeRepository('https://github.com/sindresorhus/ky', {
      branch: 'main',
      maxIterations: 1,
      useCache: false
    });
    
    console.log(`📊 Analysis complete. Found ${result.issues.length} issues\n`);
    
    let realSnippets = 0;
    let fakeSnippets = 0;
    let noSnippets = 0;
    let realLocations = 0;
    
    console.log('🔍 Checking each issue:\n');
    console.log('-'.repeat(60));
    
    result.issues.slice(0, 5).forEach((issue: any, idx: number) => {
      console.log(`\nIssue ${idx + 1}: ${issue.title}`);
      
      // Check location
      const hasRealLocation = issue.location?.file && 
                             issue.location.file.includes('.ts') &&
                             !issue.location.file.includes('example');
      
      if (hasRealLocation) {
        realLocations++;
        console.log(`  ✅ Location: ${issue.location.file}:${issue.location.line}`);
      } else {
        console.log(`  ❌ Location: ${issue.location?.file || 'MISSING'} (likely fake)`);
      }
      
      // Check code snippet
      if (!issue.codeSnippet) {
        noSnippets++;
        console.log(`  ❌ Code: No snippet`);
      } else {
        const isFake = issue.codeSnippet.includes('example.com') ||
                       issue.codeSnippet.includes('http://example') ||
                       issue.codeSnippet.includes('yourVariable') ||
                       issue.codeSnippet.includes('// TODO') ||
                       issue.codeSnippet.includes('await ky(url)') || // Generic ky example
                       issue.codeSnippet.length < 10;
        
        if (isFake) {
          fakeSnippets++;
          console.log(`  ⚠️  Code: FAKE/GENERIC snippet detected`);
          console.log(`     "${issue.codeSnippet.substring(0, 50)}..."`);
        } else {
          realSnippets++;
          console.log(`  ✅ Code: Real snippet (${issue.codeSnippet.split('\n').length} lines)`);
          console.log(`     "${issue.codeSnippet.substring(0, 50)}..."`);
        }
      }
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('📈 Summary:');
    console.log(`  Total issues analyzed: ${Math.min(5, result.issues.length)}`);
    console.log(`  ✅ Real code snippets: ${realSnippets}`);
    console.log(`  ⚠️  Fake/generic snippets: ${fakeSnippets}`);
    console.log(`  ❌ Missing snippets: ${noSnippets}`);
    console.log(`  ✅ Real file locations: ${realLocations}`);
    
    const successRate = (realSnippets / Math.min(5, result.issues.length)) * 100;
    
    console.log(`\n🎯 Code Snippet Quality: ${successRate.toFixed(0)}%`);
    
    if (successRate >= 80) {
      console.log('   ✅ EXCELLENT: Most issues have real code snippets!');
    } else if (successRate >= 50) {
      console.log('   🟡 MODERATE: Some real snippets, but needs improvement');
    } else {
      console.log('   ❌ POOR: Most snippets are fake or missing');
      console.log('   → The CodeSnippetExtractor needs to search the actual repository');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testImprovedSnippets().catch(console.error);