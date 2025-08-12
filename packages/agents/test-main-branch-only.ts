#!/usr/bin/env ts-node

const { DeepWikiApiWrapper, registerDeepWikiApi } = require('./dist/standard/services/deepwiki-api-wrapper.js');
const { registerRealDeepWikiApi } = require('./dist/standard/services/register-deepwiki.js');
const { writeFileSync } = require('fs');

async function testMainBranchOnly() {
  console.log('🔍 Testing main branch only DeepWiki analysis...\n');
  
  // Use real DeepWiki
  process.env.USE_DEEPWIKI_MOCK = 'false';
  process.env.DEEPWIKI_API_KEY = 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
  process.env.DEEPWIKI_API_URL = 'http://localhost:8001';
  
  // Register the real DeepWiki API
  await registerRealDeepWikiApi();
  
  const manager = new DeepWikiApiWrapper();
  
  try {
    console.log('📊 Analyzing main branch of sindresorhus/ky...');
    const result = await manager.analyzeRepository('https://github.com/sindresorhus/ky', {
      branch: 'main'
    });
    
    console.log('\n✅ Analysis Complete!');
    console.log('=====================================\n');
    
    // Display issues summary
    if (result.issues && result.issues.length > 0) {
      console.log(`📋 Total Issues Found: ${result.issues.length}\n`);
      
      // Count by severity
      const severityCount: Record<string, number> = {};
      result.issues.forEach((issue: any) => {
        const severity = issue.severity || 'unknown';
        severityCount[severity] = (severityCount[severity] || 0) + 1;
      });
      
      console.log('Issue Severity Distribution:');
      Object.entries(severityCount).forEach(([severity, count]) => {
        console.log(`  ${severity.toUpperCase()}: ${count}`);
      });
      
      // Show first few issues as examples
      console.log('\n📝 Sample Issues:');
      result.issues.slice(0, 5).forEach((issue: any, idx: number) => {
        console.log(`\n${idx + 1}. ${issue.title || 'Untitled Issue'}`);
        console.log(`   Severity: ${issue.severity}`);
        console.log(`   Category: ${issue.category || 'N/A'}`);
        console.log(`   File: ${issue.file || 'N/A'}`);
        console.log(`   Line: ${issue.line || 'N/A'}`);
        if (issue.description) {
          console.log(`   Description: ${issue.description.substring(0, 100)}...`);
        }
      });
    } else {
      console.log('❌ No issues found or issues array is empty');
    }
    
    // Display scores
    if (result.scores) {
      console.log('\n📊 Scores:');
      console.log(JSON.stringify(result.scores, null, 2));
    }
    
    // Save full result for inspection
    const fileName = `main-branch-analysis-${Date.now()}.json`;
    writeFileSync(fileName, JSON.stringify(result, null, 2));
    console.log(`\n💾 Full result saved to: ${fileName}`);
    
  } catch (error) {
    console.error('❌ Error during analysis:', error);
  }
}

testMainBranchOnly().catch(console.error);