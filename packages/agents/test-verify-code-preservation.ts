#!/usr/bin/env npx ts-node
/**
 * Test to verify code snippets are preserved through the pipeline
 */

import { DirectDeepWikiApiWithLocationV2 } from './src/standard/services/direct-deepwiki-api-with-location-v2';
import { PRAnalysisCategorizer } from './src/standard/services/pr-analysis-categorizer';
import { loadEnvironment } from './src/standard/utils/env-loader';

async function testCodePreservation() {
  console.log('🔍 Testing Code Snippet Preservation\n');
  console.log('=' .repeat(60) + '\n');
  
  loadEnvironment();
  
  const repositoryUrl = 'https://github.com/sinatra/sinatra';
  
  try {
    // Step 1: Analyze main branch
    console.log('📌 STEP 1: Analyzing main branch...\n');
    const deepwiki = new DirectDeepWikiApiWithLocationV2();
    
    const mainResult = await deepwiki.analyzeRepository(repositoryUrl, {
      branch: 'main',
      maxIterations: 1,
      useCache: false
    });
    
    const mainIssues = mainResult.issues || [];
    console.log(`✅ Found ${mainIssues.length} issues\n`);
    
    // Check code snippets BEFORE categorization
    console.log('🔍 BEFORE categorization:');
    mainIssues.slice(0, 3).forEach((issue, idx) => {
      console.log(`  Issue ${idx + 1}: ${issue.title}`);
      console.log(`    Has codeSnippet: ${!!issue.codeSnippet}`);
      if (issue.codeSnippet) {
        const preview = issue.codeSnippet.substring(0, 30).replace(/\n/g, ' ');
        console.log(`    Preview: "${preview}..."`);
      }
    });
    
    // Step 2: Analyze PR branch
    console.log('\n📌 STEP 2: Analyzing PR branch...\n');
    const prResult = await deepwiki.analyzeRepository(repositoryUrl, {
      branch: 'pull/1900/head',
      maxIterations: 1,
      mainBranchIssues: mainIssues,
      useCache: false
    });
    
    const prIssues = prResult.issues || [];
    console.log(`✅ Found ${prIssues.length} PR issues\n`);
    
    // Step 3: Categorize
    console.log('📌 STEP 3: Categorizing...\n');
    const categorizer = new PRAnalysisCategorizer();
    const categorized = categorizer.categorizeIssues(mainIssues, prIssues);
    
    // Check code snippets AFTER categorization
    console.log('🔍 AFTER categorization:');
    
    console.log('\n  New Issues:');
    (categorized.newIssues || []).slice(0, 2).forEach((item: any, idx) => {
      const issue = item.issue || item;
      console.log(`    Issue ${idx + 1}: ${issue.title}`);
      console.log(`      Has codeSnippet: ${!!issue.codeSnippet}`);
      console.log(`      Structure: ${typeof item} - ${Object.keys(item).slice(0, 5).join(', ')}`);
    });
    
    console.log('\n  Unchanged Issues:');
    (categorized.unchangedIssues || []).slice(0, 2).forEach((item: any, idx) => {
      const issue = item.issue || item;
      console.log(`    Issue ${idx + 1}: ${issue.title}`);
      console.log(`      Has codeSnippet: ${!!issue.codeSnippet}`);
      console.log(`      Structure: ${typeof item} - ${Object.keys(item).slice(0, 5).join(', ')}`);
    });
    
    // Step 4: Check what we're passing to report generator
    console.log('\n📌 STEP 4: Preparing for report generation...\n');
    
    const comparisonResult = {
      newIssues: (categorized.newIssues || []).map((item: any) => item.issue || item),
      unchangedIssues: (categorized.unchangedIssues || []).map((item: any) => item.issue || item),
      fixedIssues: (categorized.fixedIssues || []).map((item: any) => item.issue || item),
    };
    
    console.log('🔍 Final issues for report:');
    console.log(`  New Issues: ${comparisonResult.newIssues.length}`);
    comparisonResult.newIssues.slice(0, 2).forEach((issue, idx) => {
      console.log(`    Issue ${idx + 1}: Has codeSnippet: ${!!issue.codeSnippet}`);
    });
    
    console.log(`  Unchanged Issues: ${comparisonResult.unchangedIssues.length}`);
    comparisonResult.unchangedIssues.slice(0, 2).forEach((issue, idx) => {
      console.log(`    Issue ${idx + 1}: Has codeSnippet: ${!!issue.codeSnippet}`);
    });
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY:');
    
    const totalIssues = comparisonResult.newIssues.length + comparisonResult.unchangedIssues.length;
    const withSnippets = [...comparisonResult.newIssues, ...comparisonResult.unchangedIssues]
      .filter(i => !!i.codeSnippet).length;
    
    console.log(`  Total issues: ${totalIssues}`);
    console.log(`  With code snippets: ${withSnippets}`);
    console.log(`  Success rate: ${((withSnippets / totalIssues) * 100).toFixed(1)}%`);
    
    if (withSnippets < totalIssues * 0.5) {
      console.log('\n❌ CODE SNIPPETS ARE BEING LOST IN THE PIPELINE!');
      console.log('   The categorizer might be stripping the codeSnippet property.');
    } else {
      console.log('\n✅ Code snippets are preserved through the pipeline.');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testCodePreservation().catch(console.error);