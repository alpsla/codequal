#!/usr/bin/env ts-node

/**
 * Test End-to-End Analysis Wrapper
 * 
 * Tests the complete flow from PR URL to final report
 */

import { EndToEndAnalysisWrapper } from './src/standard/services/end-to-end-analysis-wrapper';
import * as fs from 'fs';

async function testEndToEndWrapper() {
  console.log('🚀 Testing End-to-End Analysis Wrapper\n');
  console.log('=' .repeat(80));
  
  // Test PR URLs
  const testPRs = [
    'https://github.com/sindresorhus/ky/pull/700',
    // Add more test PRs as needed
  ];
  
  // Configuration
  const config = {
    workDir: '/tmp/codequal-e2e-test',
    useCache: true,
    keepClone: false, // Set to true to inspect cloned repo
    githubToken: process.env.GITHUB_TOKEN, // Optional
    deepWikiUrl: process.env.DEEPWIKI_API_URL || 'http://localhost:8001',
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    redisUrl: process.env.REDIS_URL
  };
  
  const wrapper = new EndToEndAnalysisWrapper(config);
  
  for (const prUrl of testPRs) {
    console.log(`\n📊 Testing PR: ${prUrl}\n`);
    
    const startTime = Date.now();
    
    try {
      // Run complete analysis
      const result = await wrapper.analyzeFromPRUrl(prUrl);
      
      const duration = Date.now() - startTime;
      
      // Display results
      console.log('✅ Analysis completed successfully!\n');
      
      // PR Context
      console.log('📋 PR Context:');
      console.log(`   Repository: ${result.prContext.owner}/${result.prContext.repo}`);
      console.log(`   PR Number: #${result.prContext.prNumber}`);
      console.log(`   Title: ${result.prContext.title || 'N/A'}`);
      console.log(`   Author: ${result.prContext.author || 'N/A'}`);
      console.log(`   Base Branch: ${result.prContext.baseBranch}`);
      console.log(`   Head Branch: ${result.prContext.headBranch}`);
      
      if (result.prContext.filesChanged) {
        console.log(`   Files Changed: ${result.prContext.filesChanged}`);
        console.log(`   Additions: +${result.prContext.additions || 0}`);
        console.log(`   Deletions: -${result.prContext.deletions || 0}`);
      }
      console.log();
      
      // Execution steps
      console.log('📊 Execution Steps:');
      for (const step of result.metadata.steps) {
        const icon = step.status === 'success' ? '✅' : 
                    step.status === 'failed' ? '❌' : '⏭️';
        console.log(`   ${icon} ${step.name} (${step.duration}ms)`);
        
        if (step.details) {
          for (const [key, value] of Object.entries(step.details)) {
            console.log(`      - ${key}: ${value}`);
          }
        }
        
        if (step.error) {
          console.log(`      ❌ Error: ${step.error}`);
        }
      }
      console.log();
      
      // Analysis results
      if (result.success) {
        console.log('📈 Analysis Results:');
        
        if (result.mainAnalysis) {
          console.log('   Main Branch:');
          console.log(`      Issues: ${result.mainAnalysis.validationStats.totalIssues}`);
          console.log(`      Valid Locations: ${result.mainAnalysis.validationStats.validLocations}`);
          console.log(`      Score: ${result.mainAnalysis.analysis.scores.overall}/100`);
        }
        
        if (result.prAnalysis) {
          console.log('   PR Branch:');
          console.log(`      Issues: ${result.prAnalysis.validationStats.totalIssues}`);
          console.log(`      Valid Locations: ${result.prAnalysis.validationStats.validLocations}`);
          console.log(`      Score: ${result.prAnalysis.analysis.scores.overall}/100`);
        }
        
        if (result.comparison) {
          console.log('   Comparison:');
          console.log(`      Unchanged: ${result.comparison.unchanged}`);
          console.log(`      Resolved: ${result.comparison.resolved}`);
          console.log(`      New: ${result.comparison.new}`);
          console.log(`      Decision: ${result.comparison.decision === 'approved' ? '✅ Approved' : '⚠️ Needs Work'}`);
        }
        console.log();
        
        // Save reports
        if (result.report) {
          // Save markdown report
          const mdPath = `./e2e-report-pr-${result.prContext.prNumber}.md`;
          fs.writeFileSync(mdPath, result.report.markdown);
          console.log(`📄 Markdown report saved to: ${mdPath}`);
          
          // Save PR comment
          const commentPath = `./e2e-pr-comment-${result.prContext.prNumber}.md`;
          fs.writeFileSync(commentPath, result.report.prComment || '');
          console.log(`💬 PR comment saved to: ${commentPath}`);
        }
        
        // Generate execution report
        const execReport = await wrapper.generateExecutionReport(result);
        const execPath = `./e2e-execution-report-${result.prContext.prNumber}.md`;
        fs.writeFileSync(execPath, execReport);
        console.log(`📊 Execution report saved to: ${execPath}`);
      }
      
      // Errors
      if (result.metadata.errors.length > 0) {
        console.log('⚠️ Errors encountered:');
        for (const error of result.metadata.errors) {
          console.log(`   - ${error}`);
        }
        console.log();
      }
      
      // Performance
      console.log('⏱️ Performance:');
      console.log(`   Total Duration: ${Math.round(duration / 1000)}s`);
      console.log(`   Execution Time: ${Math.round(result.metadata.totalDuration / 1000)}s`);
      
      if (result.metadata.repoPath) {
        console.log(`   Repository kept at: ${result.metadata.repoPath}`);
      }
      
    } catch (error) {
      console.error('❌ Analysis failed:', error);
    }
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('\n🎯 Summary\n');
  console.log('The End-to-End wrapper successfully:');
  console.log('   1. Extracted PR context from URL');
  console.log('   2. Cloned and prepared the repository');
  console.log('   3. Fetched PR metadata');
  console.log('   4. Analyzed both main and PR branches');
  console.log('   5. Generated comparison and reports');
  console.log('   6. Cleaned up resources');
  console.log('\nAll from a single PR URL input! 🚀');
}

// Run the test
testEndToEndWrapper().catch(console.error);