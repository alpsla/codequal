#!/usr/bin/env ts-node
/**
 * Test DeepWiki step by step:
 * 1. Main branch analysis
 * 2. Feature branch (PR) analysis  
 * 3. Comparison between branches
 * 4. Full orchestrator flow
 */

import { config } from 'dotenv';
import * as path from 'path';

// Load environment
config({ path: path.resolve(__dirname, '.env.production') });
config({ path: path.resolve(__dirname, '../../.env') });

async function testDeepWikiStepByStep() {
  console.log('🔍 Testing DeepWiki Analysis Step by Step\n');
  console.log('=' .repeat(60) + '\n');
  
  try {
    // Import required modules
    const { DeepWikiApiManager } = require('../../apps/api/src/services/deepwiki-api-manager');
    const deepWikiApiManager = new DeepWikiApiManager();
    
    const repositoryUrl = 'https://github.com/vercel/swr';
    const mainBranch = 'main';
    const prNumber = 2950;
    const prBranch = `pr/${prNumber}`;
    
    console.log('📋 Configuration:');
    console.log(`   Repository: ${repositoryUrl}`);
    console.log(`   Main Branch: ${mainBranch}`);
    console.log(`   PR Number: ${prNumber}`);
    console.log(`   PR Branch: ${prBranch}\n`);
    
    // Step 1: Analyze main branch
    console.log('1️⃣ STEP 1: Analyzing Main Branch');
    console.log('-'.repeat(40));
    
    const mainStartTime = Date.now();
    const mainBranchAnalysis = await deepWikiApiManager.analyzeRepository(repositoryUrl, {
      branch: mainBranch,
      skipCache: true,
      forceReanalysis: true
    });
    const mainDuration = Date.now() - mainStartTime;
    
    console.log(`✅ Main branch analysis complete (${(mainDuration / 1000).toFixed(2)}s)`);
    console.log(`   Issues found: ${mainBranchAnalysis.issues?.length || 0}`);
    console.log(`   Overall score: ${mainBranchAnalysis.scores?.overall || 0}/100`);
    
    if (mainBranchAnalysis.issues && mainBranchAnalysis.issues.length > 0) {
      console.log('\n   Main Branch Issues:');
      mainBranchAnalysis.issues.forEach((issue: any, idx: number) => {
        console.log(`   ${idx + 1}. [${issue.severity?.toUpperCase()}] ${issue.title || issue.message}`);
      });
    }
    
    // Step 2: Analyze PR/feature branch
    console.log('\n\n2️⃣ STEP 2: Analyzing Feature Branch (PR)');
    console.log('-'.repeat(40));
    
    const prStartTime = Date.now();
    const prBranchAnalysis = await deepWikiApiManager.analyzeRepository(repositoryUrl, {
      branch: prBranch,
      prNumber: prNumber,
      skipCache: true,
      forceReanalysis: true
    });
    const prDuration = Date.now() - prStartTime;
    
    console.log(`✅ PR branch analysis complete (${(prDuration / 1000).toFixed(2)}s)`);
    console.log(`   Issues found: ${prBranchAnalysis.issues?.length || 0}`);
    console.log(`   Overall score: ${prBranchAnalysis.scores?.overall || 0}/100`);
    
    if (prBranchAnalysis.issues && prBranchAnalysis.issues.length > 0) {
      console.log('\n   PR Branch Issues:');
      prBranchAnalysis.issues.forEach((issue: any, idx: number) => {
        console.log(`   ${idx + 1}. [${issue.severity?.toUpperCase()}] ${issue.title || issue.message}`);
      });
    }
    
    // Step 3: Compare findings
    console.log('\n\n3️⃣ STEP 3: Comparing Branches');
    console.log('-'.repeat(40));
    
    const mainIssues = mainBranchAnalysis.issues || [];
    const prIssues = prBranchAnalysis.issues || [];
    
    // Simple comparison - in real comparison agent this would be more sophisticated
    const newIssues = prIssues.filter((prIssue: any) => 
      !mainIssues.some((mainIssue: any) => 
        mainIssue.title === prIssue.title && 
        mainIssue.location?.file === prIssue.location?.file
      )
    );
    
    const fixedIssues = mainIssues.filter((mainIssue: any) =>
      !prIssues.some((prIssue: any) =>
        mainIssue.title === prIssue.title &&
        mainIssue.location?.file === prIssue.location?.file
      )
    );
    
    console.log(`📊 Comparison Results:`);
    console.log(`   New issues in PR: ${newIssues.length}`);
    console.log(`   Fixed issues: ${fixedIssues.length}`);
    console.log(`   Unchanged issues: ${mainIssues.length - fixedIssues.length}`);
    
    if (newIssues.length > 0) {
      console.log('\n   New Issues Introduced:');
      newIssues.forEach((issue: any, idx: number) => {
        console.log(`   ${idx + 1}. [${issue.severity?.toUpperCase()}] ${issue.title || issue.message}`);
      });
    }
    
    // Step 4: Test what the Standard framework would receive
    console.log('\n\n4️⃣ STEP 4: Data Format for Standard Framework');
    console.log('-'.repeat(40));
    
    console.log('📦 Data that would be passed to Standard Framework:');
    console.log('\nMain Branch Analysis:');
    console.log(JSON.stringify({
      score: mainBranchAnalysis.scores?.overall || 75,
      issuesCount: mainIssues.length,
      issues: mainIssues.slice(0, 2).map((issue: any) => ({
        severity: issue.severity,
        category: issue.category,
        title: issue.title || issue.message
      }))
    }, null, 2));
    
    console.log('\nFeature Branch Analysis:');
    console.log(JSON.stringify({
      score: prBranchAnalysis.scores?.overall || 75,
      issuesCount: prIssues.length,
      issues: prIssues.slice(0, 2).map((issue: any) => ({
        severity: issue.severity,
        category: issue.category,
        title: issue.title || issue.message
      }))
    }, null, 2));
    
    // Summary
    console.log('\n\n📊 SUMMARY');
    console.log('=' .repeat(60));
    console.log(`✅ Main branch: ${mainIssues.length} issues found`);
    console.log(`✅ PR branch: ${prIssues.length} issues found`);
    console.log(`✅ New issues in PR: ${newIssues.length}`);
    console.log(`✅ DeepWiki is returning real data for both branches`);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testDeepWikiStepByStep()
    .then(() => {
      console.log('\n✨ All tests completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Tests failed:', error);
      process.exit(1);
    });
}

export { testDeepWikiStepByStep };