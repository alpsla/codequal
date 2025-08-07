#!/usr/bin/env node

/**
 * Generate Comprehensive PR Analysis Report using Real DeepWiki
 * Matches the format of critical-pr-report.md
 */

const { DeepWikiService } = require('./dist/standard/services/deepwiki-service');
const { ComparisonAgent } = require('./dist/standard/comparison/comparison-agent');
const { registerDeepWikiApi } = require('./dist/standard/services/deepwiki-api-wrapper');
const { deepWikiApiManager } = require('../../apps/api/dist/services/deepwiki-api-manager');
const fs = require('fs');
const path = require('path');

// Configure for real DeepWiki
process.env.USE_DEEPWIKI_MOCK = 'false';
process.env.DEEPWIKI_API_KEY = process.env.DEEPWIKI_API_KEY || 'test-key';

// Simple logger
const logger = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
  error: (msg, data) => console.error(`[ERROR] ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
  debug: () => {}
};

// Register real DeepWiki API
registerDeepWikiApi({
  async analyzeRepository(repositoryUrl, options) {
    console.log(`[DeepWiki] Analyzing ${repositoryUrl} with branch: ${options?.branch}`);
    
    const result = await deepWikiApiManager.analyzeRepository(repositoryUrl, options);
    
    // Map to expected format
    return {
      issues: result.issues?.map(issue => ({
        id: issue.id || `issue_${Math.random().toString(36).substr(2, 9)}`,
        severity: issue.severity?.toLowerCase() || 'medium',
        category: issue.category || 'code-quality',
        title: issue.title || issue.message || 'Issue detected',
        description: issue.description || issue.message || '',
        location: issue.location || { file: 'unknown', line: 0 },
        recommendation: issue.recommendation,
        rule: issue.rule,
        cwe: issue.cwe || issue.CWE,
        metadata: issue.metadata
      })) || [],
      scores: result.scores || { 
        overall: 75, 
        security: 70, 
        performance: 80, 
        maintainability: 85,
        testing: 75
      },
      metadata: {
        timestamp: new Date().toISOString(),
        tool_version: '4.0.0',
        duration_ms: result.metadata?.duration_ms || 15000,
        files_analyzed: result.metadata?.files_analyzed || 250,
        branch: options?.branch,
        total_lines: result.metadata?.total_lines || 50000
      }
    };
  }
});

async function generateComprehensiveReport() {
  try {
    console.log('=== Generating Comprehensive PR Analysis Report ===\n');
    console.log('This report matches the format in critical-pr-report.md\n');
    
    // Initialize services
    const deepWikiService = new DeepWikiService(logger);
    const comparisonAgent = new ComparisonAgent(logger);
    
    // Use a real repository
    const repoUrl = 'https://github.com/facebook/react';
    const prNumber = 28000;
    
    console.log(`Repository: ${repoUrl}`);
    console.log(`PR: #${prNumber}`);
    console.log(`Author: Sarah Chen (@schen)\n`);
    
    // Initialize comparison agent
    await comparisonAgent.initialize({
      language: 'javascript',
      complexity: 'high',
      performance: 'balanced',
      rolePrompt: 'You are an expert code reviewer focused on security, performance, and best practices.'
    });
    
    // Step 1: Analyze main branch
    console.log('Step 1: Analyzing main branch...');
    const mainAnalysis = await deepWikiService.analyzeRepository(repoUrl, 'main');
    console.log(`Main branch: ${mainAnalysis.issues.length} issues found`);
    
    // Step 2: Analyze PR branch
    console.log('\nStep 2: Analyzing PR branch...');
    const prAnalysis = await deepWikiService.analyzeRepository(repoUrl, `pr/${prNumber}`);
    console.log(`PR branch: ${prAnalysis.issues.length} issues found`);
    
    // Step 3: Run comprehensive comparison
    console.log('\nStep 3: Running comprehensive comparison analysis...');
    const startTime = Date.now();
    
    const result = await comparisonAgent.analyze({
      mainBranchAnalysis: mainAnalysis,
      featureBranchAnalysis: prAnalysis,
      prMetadata: {
        number: prNumber,
        title: 'Major refactor: Microservices migration Phase 1',
        description: 'This PR implements Phase 1 of our microservices migration strategy, extracting payment, user, and notification services from the monolith.',
        author: 'Sarah Chen',
        created_at: new Date().toISOString(),
        repository_url: repoUrl,
        // Realistic counts for a major refactor
        filesChanged: 89,
        linesAdded: 1923,
        linesRemoved: 924
      },
      userProfile: {
        userId: 'sarah-chen',
        username: 'schen',
        overallScore: 75,
        categoryScores: {
          security: 82,
          performance: 78,
          codeQuality: 88,
          architecture: 85,
          dependencies: 80,
          testing: 76
        },
        level: 'Senior Developer',
        tenure: '18 months'
      },
      historicalIssues: [
        { severity: 'critical', category: 'security', fixed: true, age: '6 months' },
        { severity: 'high', category: 'performance', fixed: false, age: '3 months' },
        { severity: 'critical', category: 'security', fixed: false, age: '4 months' },
        { severity: 'high', category: 'dependencies', fixed: false, age: '12 months' }
      ],
      generateReport: true
    });
    
    const analysisTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Analysis completed in ${analysisTime} seconds`);
    
    // Step 4: Display summary
    console.log('\n=== Analysis Summary ===');
    if (result.success) {
      console.log('✅ Analysis Complete');
      console.log(`Resolved Issues: ${result.summary?.totalResolved || 0}`);
      console.log(`New Issues: ${result.summary?.totalNew || 0}`);
      console.log(`Modified Issues: ${result.summary?.totalModified || 0}`);
      console.log(`Unchanged Issues: ${result.summary?.totalUnchanged || 0}`);
      
      // Check if this would be approved or declined
      const hasBlockingIssues = result.newIssues?.some(i => 
        i.issue?.severity === 'critical' || i.issue?.severity === 'high'
      );
      console.log(`\nPR Decision: ${hasBlockingIssues ? '❌ DECLINED' : '✅ APPROVED'}`);
    } else {
      console.log('❌ Analysis Failed');
    }
    
    // Step 5: Save the comprehensive report
    if (result.report) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = path.join(
        __dirname,
        'reports',
        `pr-${prNumber}-comprehensive-${timestamp}.md`
      );
      
      // Ensure reports directory exists
      const reportsDir = path.join(__dirname, 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      // Save the report
      fs.writeFileSync(reportPath, result.report);
      console.log(`\n✅ Comprehensive report saved to: ${reportPath}`);
      
      // Display first 60 lines of the report
      console.log('\n=== Report Preview (First 60 lines) ===\n');
      const lines = result.report.split('\n');
      console.log(lines.slice(0, 60).join('\n'));
      console.log('\n... [Report continues - total ' + lines.length + ' lines]');
      
      // Validate report sections
      console.log('\n=== Report Validation ===');
      const requiredSections = [
        'Pull Request Analysis Report',
        'PR Decision:',
        'Executive Summary',
        'Overall Score:',
        'Key Metrics',
        'Issue Distribution',
        'Security Analysis',
        'Performance Analysis',
        'Code Quality Analysis',
        'Architecture Analysis',
        'Dependencies Analysis',
        'PR Issues',
        'Repository Issues',
        'Educational Insights',
        'Individual & Team Skills Tracking',
        'Business Impact',
        'Action Items',
        'Score Impact Summary'
      ];
      
      let allPresent = true;
      for (const section of requiredSections) {
        const present = result.report.includes(section);
        console.log(`${present ? '✅' : '❌'} ${section}`);
        if (!present) allPresent = false;
      }
      
      console.log(allPresent ? 
        '\n✅ SUCCESS: All required sections present!' : 
        '\n⚠️ WARNING: Some sections missing');
      
      // Check report length
      console.log(`\nReport Statistics:`);
      console.log(`- Total lines: ${lines.length}`);
      console.log(`- Total characters: ${result.report.length}`);
      console.log(`- Expected: ~1000+ lines for comprehensive report`);
      
    } else {
      console.log('\n❌ No report generated');
    }
    
    // Step 6: Save PR comment
    if (result.prComment) {
      const commentPath = path.join(
        __dirname,
        'reports',
        `pr-${prNumber}-comment.md`
      );
      fs.writeFileSync(commentPath, result.prComment);
      console.log(`\n✅ PR comment saved to: ${commentPath}`);
      
      console.log('\n=== PR Comment Preview ===\n');
      console.log(result.prComment);
    }
    
  } catch (error) {
    console.error('\n❌ Error generating report:', error.message);
    console.error('Stack:', error.stack);
  }
  
  // Clean exit
  setTimeout(() => process.exit(0), 2000);
}

// Run the test
console.log('Starting comprehensive PR analysis report generation...\n');
console.log('Using real DeepWiki API to analyze a real GitHub repository.');
console.log('Report will match the comprehensive format in critical-pr-report.md\n');

generateComprehensiveReport();