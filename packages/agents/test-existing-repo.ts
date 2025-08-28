#!/usr/bin/env ts-node

/**
 * Test with EXISTING repository - sindresorhus/ky
 * This repository definitely exists (verified with GitHub API)
 */

import { SmartIterativeDeepWikiApi } from './dist/standard/services/smart-iterative-deepwiki-api';
import { ReportGeneratorV8Final } from './dist/standard/comparison/report-generator-v8-final';
import * as fs from 'fs';

async function testExistingRepo() {
  console.log('🎯 Testing with CONFIRMED EXISTING Repository');
  console.log('📦 Repository: sindresorhus/ky');
  console.log('✅ Verified: Returns HTTP 200 from GitHub API');
  console.log('🔧 Mode: USE_DEEPWIKI_MOCK=' + process.env.USE_DEEPWIKI_MOCK);
  console.log('');
  
  try {
    // Initialize services
    const deepwikiApi = new SmartIterativeDeepWikiApi();
    const reportGenerator = new ReportGeneratorV8Final();
    
    // Test 1: Analyze main branch
    console.log('📊 Step 1: Analyzing main branch...');
    const startTime = Date.now();
    
    const result = await deepwikiApi.analyzeRepository('https://github.com/sindresorhus/ky', {
      branch: 'main',
      maxIterations: 5,
      confidenceThreshold: 0.7
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('');
    console.log('✅ Analysis Complete!');
    console.log('⏱️  Duration: ' + duration + ' seconds');
    console.log('📋 Issues found: ' + result.issues.length);
    
    // Analyze issue quality
    if (result.issues.length > 0) {
      const withLocation = result.issues.filter(i => 
        i.location && i.location.file && i.location.file !== 'Unknown location'
      );
      const withUnknown = result.issues.filter(i => 
        !i.location || i.location.file === 'Unknown location'
      );
      
      console.log('');
      console.log('🔍 Issue Quality Analysis:');
      console.log('├─ Total issues: ' + result.issues.length);
      console.log('├─ With valid location: ' + withLocation.length);
      console.log('├─ With unknown location: ' + withUnknown.length);
      console.log('└─ Location quality: ' + 
        (withLocation.length / result.issues.length * 100).toFixed(1) + '%');
      
      // Show first 3 issues
      console.log('');
      console.log('📝 Sample Issues:');
      result.issues.slice(0, 3).forEach((issue, i) => {
        console.log('');
        console.log(`[${i + 1}] ${issue.title}`);
        console.log('   Severity: ' + issue.severity);
        console.log('   Category: ' + issue.category);
        console.log('   Location: ' + (issue.location ? 
          `${issue.location.file}:${issue.location.line || '?'}` : 'Unknown'));
        if (issue.description) {
          console.log('   Description: ' + 
            issue.description.substring(0, 100) + 
            (issue.description.length > 100 ? '...' : ''));
        }
      });
      
      // Generate report
      console.log('');
      console.log('📄 Generating V8 Report...');
      const report = await reportGenerator.generateReport({
        metadata: {
          repositoryUrl: 'https://github.com/sindresorhus/ky',
          prNumber: 0,
          prTitle: 'Main Branch Analysis',
          prAuthor: 'System',
          targetBranch: 'main'
        },
        mainIssues: [],
        prIssues: result.issues,
        newIssues: result.issues,
        fixedIssues: [],
        unchangedIssues: []
      });
      
      // Save report
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = `existing-repo-report-${timestamp}.md`;
      fs.writeFileSync(reportPath, report);
      console.log('✅ Report saved to: ' + reportPath);
      
      // Save raw data for debugging
      const rawPath = `existing-repo-raw-${timestamp}.json`;
      fs.writeFileSync(rawPath, JSON.stringify(result, null, 2));
      console.log('💾 Raw data saved to: ' + rawPath);
      
    } else {
      console.log('');
      console.log('⚠️  No issues found!');
      console.log('This could indicate:');
      console.log('1. DeepWiki is not analyzing properly');
      console.log('2. All issues are being filtered out');
      console.log('3. The repository is perfect (unlikely)');
    }
    
    // Summary
    console.log('');
    console.log('=' . repeat(50));
    console.log('📊 SUMMARY');
    console.log('=' . repeat(50));
    console.log('Repository: sindresorhus/ky (EXISTS ✅)');
    console.log('Issues Found: ' + result.issues.length);
    console.log('Analysis Time: ' + duration + 's');
    console.log('DeepWiki Mode: ' + (process.env.USE_DEEPWIKI_MOCK === 'true' ? 'MOCK' : 'REAL'));
    
    return {
      success: true,
      issueCount: result.issues.length
    };
    
  } catch (error: any) {
    console.error('');
    console.error('❌ Test Failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('');
      console.error('🔧 Fix: Run port forwarding:');
      console.error('kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001');
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testExistingRepo().then(result => {
  process.exit(result.success ? 0 : 1);
});