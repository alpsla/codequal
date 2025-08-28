#!/usr/bin/env ts-node

/**
 * Test Fix Suggestions with Real DeepWiki
 */

import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import { DeepWikiApiWrapper } from './src/standard/services/deepwiki-api-wrapper';
import { DeepWikiRealAPI } from './src/standard/infrastructure/deepwiki/deepwiki-real-api';

async function testRealDeepWikiFixes() {
  console.log('🚀 Testing Fix Suggestions with Real DeepWiki\n');
  
  // Initialize real DeepWiki API
  const deepWikiAPI = new DeepWikiRealAPI({
    apiUrl: process.env.DEEPWIKI_API_URL || 'http://localhost:8001',
    apiKey: process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f'
  });
  
  const deepwiki = new DeepWikiApiWrapper();
  deepwiki.registerDeepWikiAPI(deepWikiAPI);
  
  const generator = new ReportGeneratorV8Final();
  
  try {
    // Test with a small repository for speed
    console.log('📡 Analyzing repository: sindresorhus/is-odd');
    console.log('   Mode: Real DeepWiki (USE_DEEPWIKI_MOCK=false)\n');
    
    // Analyze main branch
    console.log('🔍 Analyzing main branch...');
    const mainResult = await deepwiki.analyzeRepository('https://github.com/sindresorhus/is-odd', { branch: 'main' });
    console.log(`   Found ${mainResult.issues.length} issues\n`);
    
    // Show first few issues
    console.log('📋 Sample Issues:');
    mainResult.issues.slice(0, 3).forEach((issue: any, i) => {
      console.log(`   ${i + 1}. ${issue.title || issue.description}`);
      console.log(`      Severity: ${issue.severity} | Category: ${issue.category}`);
      console.log(`      Location: ${issue.location?.file || 'unknown'}:${issue.location?.line || '?'}`);
    });
    
    // Generate report with fixes
    console.log('\n🔧 Generating fix suggestions...');
    const comparisonResult: any = {
      success: true,
      prIssues: mainResult.issues,
      mainIssues: [],
      addedIssues: mainResult.issues,
      fixedIssues: [],
      unchangedIssues: [],
      persistentIssues: [],
      newIssues: mainResult.issues.map((i: any) => ({...i, message: i.description})),
      resolvedIssues: [],
      changedIssues: []
    };
    
    const report = await generator.generateReport(comparisonResult);
    
    // Check for fixes
    let templatesFound = 0;
    let aiFallbackFound = 0;
    
    mainResult.issues.forEach((issue: any) => {
      const title = issue.title || issue.description;
      if (report.includes(title)) {
        if (report.includes('OPTION A:') && report.includes(title)) {
          templatesFound++;
        } else if (report.includes('ai-fallback') && report.includes(title)) {
          aiFallbackFound++;
        }
      }
    });
    
    console.log('\n📊 Fix Coverage Results:');
    console.log(`   Total Issues: ${mainResult.issues.length}`);
    console.log(`   Template Fixes: ${templatesFound}`);
    console.log(`   AI Fallback: ${aiFallbackFound}`);
    console.log(`   Coverage: ${Math.round((templatesFound + aiFallbackFound) / mainResult.issues.length * 100)}%`);
    
    // Save report
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `test-reports/real-deepwiki-fixes-${timestamp}.md`;
    fs.writeFileSync(reportPath, report);
    console.log(`\n📝 Full report saved to: ${reportPath}`);
    
    // Show success
    const hasTemplateFixes = templatesFound > 0;
    const hasAIFixes = aiFallbackFound > 0;
    
    console.log('\n✅ Test Results:');
    console.log(`   DeepWiki Integration: ✅`);
    console.log(`   Template Fixes: ${hasTemplateFixes ? '✅' : '❌'}`);
    console.log(`   AI Fallback: ${hasAIFixes || templatesFound === mainResult.issues.length ? '✅' : '❌'}`);
    
    const success = mainResult.issues.length > 0 && (templatesFound > 0 || aiFallbackFound > 0);
    console.log(`\n${success ? '✅' : '❌'} Overall: ${success ? 'PASSED' : 'FAILED'}`);
    
    return success;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

testRealDeepWikiFixes().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});