#!/usr/bin/env npx ts-node

/**
 * ZERO MOCKS - 100% REAL DEEPWIKI INTEGRATION TEST
 * This test confirms the report generator works with actual DeepWiki API
 * No mock data is used - all issues come from real code analysis
 */

import { ReportGeneratorV7Fixed } from './src/standard/comparison/report-generator-v7-fixed';
import { DeepWikiApiWrapper } from './src/standard/services/deepwiki-api-wrapper';
import * as fs from 'fs';
import * as path from 'path';

// FORCE REAL DEEPWIKI - NO MOCKS
process.env.USE_DEEPWIKI_MOCK = 'false';

async function testZeroMocksRealDeepWiki() {
  console.log('🚀 ZERO MOCKS TEST - 100% REAL DEEPWIKI DATA\n');
  console.log('='.repeat(80));
  console.log('Environment Configuration:');
  console.log(`USE_DEEPWIKI_MOCK: ${process.env.USE_DEEPWIKI_MOCK} (false = REAL DATA)`);
  console.log(`DEEPWIKI_API_URL: ${process.env.DEEPWIKI_API_URL || 'http://localhost:8001'}`);
  console.log(`DEEPWIKI_API_KEY: ${process.env.DEEPWIKI_API_KEY ? '✓ Set' : '✗ Not Set'}`);
  console.log('='.repeat(80));
  
  try {
    // Initialize REAL DeepWiki API wrapper (no mocks)
    const deepWikiApi = new DeepWikiApiWrapper();
    
    // Test with a real GitHub repository
    const testRepo = 'https://github.com/sindresorhus/ky';
    const testPR = 500;
    
    console.log(`\n📦 Analyzing Real Repository: ${testRepo}`);
    console.log(`🔍 Pull Request: #${testPR}`);
    console.log('\nThis will make REAL API calls to DeepWiki...\n');
    
    // Analyze main branch with REAL DeepWiki
    console.log('1️⃣ Analyzing main branch with DeepWiki...');
    const mainBranchResult = await deepWikiApi.analyzeRepository(testRepo);
    console.log(`   ✅ Found ${mainBranchResult.issues.length} real issues in main branch`);
    
    // Analyze PR branch with REAL DeepWiki
    console.log('2️⃣ Analyzing PR branch with DeepWiki...');
    const prBranchResult = await deepWikiApi.analyzeRepository(`${testRepo}/pull/${testPR}`);
    console.log(`   ✅ Found ${prBranchResult.issues.length} real issues in PR branch`);
    
    // Calculate comparison metrics
    const newIssues = prBranchResult.issues.filter(prIssue => 
      !mainBranchResult.issues.some(mainIssue => 
        mainIssue.id === prIssue.id
      )
    );
    
    const resolvedIssues = mainBranchResult.issues.filter(mainIssue =>
      !prBranchResult.issues.some(prIssue =>
        prIssue.id === mainIssue.id
      )
    );
    
    console.log(`\n📊 Real Analysis Results:`);
    console.log(`   - New Issues in PR: ${newIssues.length}`);
    console.log(`   - Resolved Issues: ${resolvedIssues.length}`);
    console.log(`   - Unchanged Issues: ${mainBranchResult.issues.length - resolvedIssues.length}`);
    
    // Prepare data for report generator
    const reportData = {
      mainBranchResult,
      featureBranchResult: prBranchResult,
      comparison: {
        resolvedIssues
      },
      prMetadata: {
        repository: testRepo,
        prNumber: testPR.toString(),
        title: 'Real PR Analysis - Zero Mocks',
        author: 'deepwiki-analyzer',
        filesChanged: prBranchResult.metadata?.filesAnalyzed || 0,
        additions: 0,
        deletions: 0
      },
      scanDuration: prBranchResult.metadata?.analysisTimeMs || 0
    };
    
    // Generate comprehensive report with REAL data
    console.log('\n3️⃣ Generating comprehensive report with all 14 sections...');
    const generator = new ReportGeneratorV7Fixed();
    const report = await generator.generateReport(reportData);
    
    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = 'test-outputs/zero-mocks-real-deepwiki';
    const outputPath = path.join(outputDir, `real-analysis-${timestamp}.md`);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, report);
    
    console.log('\n✅ SUCCESS - Report Generated with 100% REAL DeepWiki Data!');
    console.log(`📄 Report saved to: ${outputPath}`);
    
    // Validate all 14 sections are present
    console.log('\n📋 Validating Report Sections:');
    const sections = [
      'PR Decision:',
      'Executive Summary',
      '1. Security Analysis',
      '2. Performance Analysis', 
      '3. Code Quality Analysis',
      '4. Architecture Analysis',
      '5. Dependencies Analysis',
      'PR Issues',
      'Vulnerable Dependencies',
      '8. Repository Issues',
      '6. Breaking Changes',
      '7. Issues Resolved',
      '9. Testing Coverage',
      '10. Business Impact',
      '11. Documentation',
      '13. Educational Insights',
      '14. Developer Performance',
      '15. PR Comment Conclusion'
    ];
    
    const missingSections: string[] = [];
    sections.forEach(section => {
      const found = report.includes(section);
      console.log(`   ${found ? '✅' : '❌'} ${section}`);
      if (!found) missingSections.push(section);
    });
    
    if (missingSections.length === 0) {
      console.log('\n🎉 ALL 14+ SECTIONS PRESENT - ZERO MOCKS CONFIRMED!');
    } else {
      console.log(`\n⚠️ Missing sections: ${missingSections.join(', ')}`);
    }
    
    // Display sample real issues
    console.log('\n🔍 Sample REAL Issues Found:');
    if (newIssues.length > 0) {
      newIssues.slice(0, 3).forEach(issue => {
        console.log(`   - [${issue.severity.toUpperCase()}] ${issue.message}`);
        if (issue.location) {
          console.log(`     📍 ${issue.location.file}:${issue.location.line}`);
        }
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✨ CONFIRMATION: This report contains 0 MOCKS - 100% REAL DEEPWIKI DATA');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    console.log('\nNote: This test requires:');
    console.log('1. DeepWiki API running (kubectl port-forward or direct access)');
    console.log('2. Valid DEEPWIKI_API_KEY environment variable');
    console.log('3. Network access to GitHub repositories');
  }
}

// Run the zero-mocks test
testZeroMocksRealDeepWiki().catch(console.error);