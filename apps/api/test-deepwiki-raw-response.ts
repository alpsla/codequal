#!/usr/bin/env npx ts-node
/**
 * Test script to examine raw DeepWiki response
 */

import { deepWikiApiManager } from './src/services/deepwiki-api-manager';

async function testDeepWikiRawResponse() {
  console.log('🔍 Testing DeepWiki to examine raw response data\n');
  
  try {
    // Use a small repository for faster testing
    const repositoryUrl = 'https://github.com/sindresorhus/is-odd';
    const branch = 'main';
    
    console.log(`📦 Repository: ${repositoryUrl}`);
    console.log(`🌿 Branch: ${branch}`);
    console.log('⏳ Starting DeepWiki analysis...\n');
    
    const startTime = Date.now();
    
    // Run the analysis
    const result = await deepWikiApiManager.analyzeRepository(repositoryUrl, {
      branch,
      skipCache: true // Force fresh analysis
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Analysis completed in ${duration} seconds\n`);
    
    // Display summary
    console.log('📊 Analysis Summary:');
    console.log(`- Total issues found: ${result.issues.length}`);
    
    if (result.issues.length === 0) {
      console.log('\n⚠️  No issues found. Let\'s try a different repository with known issues...\n');
      
      // Try a repository that's more likely to have issues
      const repoWithIssues = 'https://github.com/vercel/swr';
      console.log(`📦 Trying repository: ${repoWithIssues}`);
      console.log('⏳ Starting analysis...\n');
      
      const result2 = await deepWikiApiManager.analyzeRepository(repoWithIssues, {
        branch: 'main',
        skipCache: false // Use cache if available for faster response
      });
      
      console.log(`✅ Analysis completed\n`);
      console.log('📊 Analysis Summary:');
      console.log(`- Total issues found: ${result2.issues.length}`);
      
      if (result2.issues.length > 0) {
        examineIssues(result2.issues);
      }
    } else {
      examineIssues(result.issues);
    }
    
  } catch (error) {
    console.error('❌ Error during analysis:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
  }
}

function examineIssues(issues: any[]) {
  console.log('\n🔎 Examining raw issue data from DeepWiki:\n');
  
  // Take first 3 issues for detailed examination
  const issuesToExamine = issues.slice(0, 3);
  
  issuesToExamine.forEach((issue, index) => {
    console.log(`════════════════════════════════════════════════════════`);
    console.log(`Issue ${index + 1}: ${issue.title || issue.message || issue.description}`);
    console.log(`════════════════════════════════════════════════════════`);
    
    console.log('\n📋 All fields in the issue object:');
    Object.keys(issue).forEach(key => {
      const value = issue[key];
      if (typeof value === 'string' && value.length > 100) {
        console.log(`  ${key}: "${value.substring(0, 100)}..."`);
      } else if (typeof value === 'object') {
        console.log(`  ${key}:`, JSON.stringify(value, null, 2).split('\n').map((line, i) => i === 0 ? line : '    ' + line).join('\n'));
      } else {
        console.log(`  ${key}: ${value}`);
      }
    });
    
    console.log('\n🔍 Key Field Analysis:');
    console.log(`  ✓ Has title: ${!!issue.title}`);
    console.log(`  ✓ Has description: ${!!issue.description}`);
    console.log(`  ✓ Has message: ${!!issue.message}`);
    console.log(`  ✓ Has location: ${!!issue.location}`);
    console.log(`  ✓ Has severity: ${!!issue.severity}`);
    console.log(`  ✓ Has category: ${!!issue.category}`);
    console.log(`  ✓ Has codeSnippet: ${!!issue.codeSnippet}`);
    console.log(`  ✓ Has problematicCode: ${!!issue.problematicCode}`);
    console.log(`  ✓ Has suggestion: ${!!issue.suggestion}`);
    console.log(`  ✓ Has remediation: ${!!issue.remediation}`);
    console.log(`  ✓ Has recommendation: ${!!issue.recommendation}`);
    console.log(`  ✓ Has suggestedFix: ${!!issue.suggestedFix}`);
    
    // Show any code-related fields
    if (issue.codeSnippet || issue.problematicCode) {
      console.log('\n📝 Problematic Code (from DeepWiki):');
      console.log(issue.codeSnippet || issue.problematicCode);
    }
    
    if (issue.suggestion || issue.remediation || issue.recommendation || issue.suggestedFix) {
      console.log('\n💡 Suggested Fix (from DeepWiki):');
      console.log(issue.suggestion || issue.remediation || issue.recommendation || issue.suggestedFix);
    }
    
    console.log('');
  });
}

// Run the test
testDeepWikiRawResponse().catch(console.error);