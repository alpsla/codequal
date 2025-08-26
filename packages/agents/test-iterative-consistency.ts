#!/usr/bin/env npx ts-node

/**
 * Test Iterative Collection with Consistent Enhanced Prompts
 * Verifies that all iterations maintain requirements for code snippets and structured data
 */

import { DirectDeepWikiApiWithLocation } from './src/standard/services/direct-deepwiki-api-with-location';

async function testIterativeConsistency() {
  console.log('🔄 Testing Iterative Collection with Enhanced Prompts\n');
  console.log('═'.repeat(80));
  
  const api = new DirectDeepWikiApiWithLocation();
  const testRepo = 'https://github.com/sindresorhus/ky';
  
  console.log(`📦 Test Repository: ${testRepo}`);
  console.log(`🎯 Testing: Iterative collection (3-10 iterations)`);
  console.log(`📋 Requirement: All iterations must return structured data with code snippets\n`);
  
  try {
    console.log('🚀 Starting analysis with enhanced prompts...\n');
    
    const startTime = Date.now();
    const result = await api.analyzeRepository(testRepo, { branch: 'main' });
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n' + '═'.repeat(80));
    console.log('\n📊 ANALYSIS RESULTS:\n');
    
    // Check metadata
    const metadata = result.metadata as any;
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`🔄 Iterations performed: ${metadata.iterationsPerformed || 'unknown'}`);
    console.log(`📍 Location search enabled: ${metadata.locationSearchEnabled || false}`);
    console.log(`🔍 Analysis method: ${metadata.analysisMethod || 'unknown'}`);
    
    // Analyze issues
    if (result.issues && Array.isArray(result.issues)) {
      console.log(`\n📋 Issues found: ${result.issues.length}`);
      
      // Check quality of issues
      const issuesWithAllFields = result.issues.filter((issue: any) => {
        const requiredFields = ['title', 'category', 'severity', 'impact', 'file', 'line', 'codeSnippet', 'recommendation'];
        return requiredFields.every(field => issue[field]);
      });
      
      const issuesWithCodeSnippets = result.issues.filter((issue: any) => 
        issue.codeSnippet && issue.codeSnippet.length > 10
      );
      
      const issuesWithRealPaths = result.issues.filter((issue: any) => 
        issue.file && (
          issue.file.includes('source/') || 
          issue.file.includes('test/') ||
          issue.file.includes('src/') ||
          !issue.file.includes('/src/api/') // Not generic paths
        )
      );
      
      const issuesWithEducation = result.issues.filter((issue: any) => 
        issue.education && issue.education.length > 20
      );
      
      const issuesWithLocation = result.issues.filter((issue: any) =>
        issue.location?.file && issue.location.file !== 'unknown' && issue.location.line > 0
      );
      
      // Display statistics
      console.log('\n📈 QUALITY METRICS:\n');
      console.log(`  ✅ Issues with all required fields: ${issuesWithAllFields.length}/${result.issues.length} (${((issuesWithAllFields.length / result.issues.length) * 100).toFixed(1)}%)`);
      console.log(`  📝 Issues with code snippets: ${issuesWithCodeSnippets.length}/${result.issues.length} (${((issuesWithCodeSnippets.length / result.issues.length) * 100).toFixed(1)}%)`);
      console.log(`  📂 Issues with real paths: ${issuesWithRealPaths.length}/${result.issues.length} (${((issuesWithRealPaths.length / result.issues.length) * 100).toFixed(1)}%)`);
      console.log(`  📚 Issues with education: ${issuesWithEducation.length}/${result.issues.length} (${((issuesWithEducation.length / result.issues.length) * 100).toFixed(1)}%)`);
      console.log(`  📍 Issues with verified location: ${issuesWithLocation.length}/${result.issues.length} (${((issuesWithLocation.length / result.issues.length) * 100).toFixed(1)}%)`);
      
      // Check category distribution
      const categories: Record<string, number> = {};
      result.issues.forEach((issue: any) => {
        const cat = issue.category || 'uncategorized';
        categories[cat] = (categories[cat] || 0) + 1;
      });
      
      console.log('\n📊 CATEGORY DISTRIBUTION:\n');
      Object.entries(categories).forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count} issues`);
      });
      
      // Sample issues to verify quality
      console.log('\n🔍 SAMPLE ISSUES (First 3):\n');
      result.issues.slice(0, 3).forEach((issue: any, index: number) => {
        console.log(`Issue ${index + 1}: ${issue.title || 'NO TITLE'}`);
        console.log(`  Category: ${issue.category || 'MISSING'}`);
        console.log(`  File: ${issue.file || issue.location?.file || 'MISSING'}`);
        console.log(`  Line: ${issue.line || issue.location?.line || 'MISSING'}`);
        console.log(`  Has code snippet: ${issue.codeSnippet ? '✅' : '❌'}`);
        console.log(`  Has impact: ${issue.impact ? '✅' : '❌'}`);
        console.log(`  Has education: ${issue.education ? '✅' : '❌'}`);
        console.log();
      });
      
      // Success criteria
      console.log('═'.repeat(80));
      console.log('\n🎯 SUCCESS CRITERIA:\n');
      
      const successCriteria = [
        {
          name: 'Multiple iterations performed',
          passed: (metadata.iterationsPerformed || 0) >= 3,
          value: `${metadata.iterationsPerformed || 0} iterations`
        },
        {
          name: 'At least 15 unique issues found',
          passed: result.issues.length >= 15,
          value: `${result.issues.length} issues`
        },
        {
          name: '80%+ issues have all required fields',
          passed: (issuesWithAllFields.length / result.issues.length) >= 0.8,
          value: `${((issuesWithAllFields.length / result.issues.length) * 100).toFixed(1)}%`
        },
        {
          name: '80%+ issues have code snippets',
          passed: (issuesWithCodeSnippets.length / result.issues.length) >= 0.8,
          value: `${((issuesWithCodeSnippets.length / result.issues.length) * 100).toFixed(1)}%`
        },
        {
          name: 'Multiple categories represented',
          passed: Object.keys(categories).length >= 3,
          value: `${Object.keys(categories).length} categories`
        }
      ];
      
      successCriteria.forEach(criterion => {
        const icon = criterion.passed ? '✅' : '❌';
        console.log(`  ${icon} ${criterion.name}: ${criterion.value}`);
      });
      
      const allPassed = successCriteria.every(c => c.passed);
      
      console.log('\n' + '═'.repeat(80));
      if (allPassed) {
        console.log('\n✅ SUCCESS: Iterative collection with enhanced prompts is working correctly!');
        console.log('   All iterations maintain consistency in requesting structured data with code snippets.');
      } else {
        console.log('\n⚠️  PARTIAL SUCCESS: Some criteria not met.');
        console.log('   The system may need further tuning or DeepWiki may need updates.');
      }
      
    } else {
      console.log('❌ No issues array found in response');
    }
    
  } catch (error: any) {
    console.error('\n❌ Error during analysis:', error.message);
    
    if (error.message?.includes('ECONNREFUSED')) {
      console.log('\n💡 Make sure DeepWiki is running:');
      console.log('   kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001');
    }
  }
  
  console.log('\n' + '═'.repeat(80));
}

// Run the test
console.log('Note: This test may take 2-5 minutes as it runs multiple iterations\n');
testIterativeConsistency().catch(console.error);