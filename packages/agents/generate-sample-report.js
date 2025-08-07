#!/usr/bin/env node

/**
 * Generate Sample Comprehensive Report with Mock Data
 * This will show the full report format matching critical-pr-report.md
 */

const { ComparisonAgent } = require('./dist/standard/comparison/comparison-agent');
const { generateEnhancedMockAnalysis } = require('../api/dist/services/deepwiki-mock-enhanced');
const fs = require('fs');
const path = require('path');

// Simple logger
const logger = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
  error: (msg, data) => console.error(`[ERROR] ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
  debug: () => {}
};

async function generateSampleReport() {
  try {
    console.log('=== Generating Sample Comprehensive Report ===\n');
    
    const comparisonAgent = new ComparisonAgent(logger);
    
    // Initialize with configuration
    await comparisonAgent.initialize({
      language: 'typescript',
      complexity: 'high',
      performance: 'balanced',
      rolePrompt: 'You are an expert code reviewer focused on security, performance, and best practices.'
    });
    
    // Generate mock analyses for main and PR branches
    const repoUrl = 'https://github.com/techcorp/payment-processor';
    
    // Get main branch mock data
    const mainMockData = generateEnhancedMockAnalysis(repoUrl, { branch: 'main' });
    const mainAnalysis = {
      issues: mainMockData.vulnerabilities.map(v => ({
        id: v.id,
        severity: v.severity.toLowerCase(),
        category: v.category.toLowerCase().replace(' ', '-'),
        type: 'vulnerability',
        message: v.title,
        title: v.title,
        description: v.impact,
        location: v.location,
        codeSnippet: v.evidence?.snippet,
        suggestedFix: v.remediation.steps.join('\n'),
        metadata: {
          cwe: v.cwe?.id,
          cvss: v.cvss,
          remediation: v.remediation
        }
      })),
      scores: mainMockData.scores || {
        overall: 74,
        security: 75,
        performance: 80,
        maintainability: 78,
        testing: 82
      }
    };
    
    // Get PR branch mock data (will have different issues)
    const prMockData = generateEnhancedMockAnalysis(repoUrl, { branch: 'pr/3842' });
    const prAnalysis = {
      issues: prMockData.vulnerabilities.map(v => ({
        id: v.id,
        severity: v.severity.toLowerCase(),
        category: v.category.toLowerCase().replace(' ', '-'),
        type: 'vulnerability',
        message: v.title,
        title: v.title,
        description: v.impact,
        location: v.location,
        codeSnippet: v.evidence?.snippet,
        suggestedFix: v.remediation.steps.join('\n'),
        metadata: {
          cwe: v.cwe?.id,
          cvss: v.cvss,
          remediation: v.remediation
        }
      })),
      scores: prMockData.scores || {
        overall: 68,
        security: 71,
        performance: 65,
        maintainability: 76,
        testing: 71
      }
    };
    
    console.log(`Main branch: ${mainAnalysis.issues.length} issues`);
    console.log(`PR branch: ${prAnalysis.issues.length} issues`);
    
    // Run comprehensive comparison
    console.log('\nGenerating comprehensive report...');
    const result = await comparisonAgent.analyze({
      mainBranchAnalysis: mainAnalysis,
      featureBranchAnalysis: prAnalysis,
      prMetadata: {
        number: 3842,
        title: 'Major refactor: Microservices migration Phase 1',
        description: 'This PR implements Phase 1 of our microservices migration strategy',
        author: 'Sarah Chen',
        created_at: new Date().toISOString(),
        repository_url: repoUrl,
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
        }
      },
      historicalIssues: [
        { id: 'HIST-001', severity: 'critical', category: 'security', fixed: false, age: '6 months' },
        { id: 'HIST-002', severity: 'high', category: 'performance', fixed: false, age: '4 months' },
        { id: 'HIST-003', severity: 'critical', category: 'security', fixed: false, age: '3 months' },
        { id: 'HIST-004', severity: 'high', category: 'dependencies', fixed: false, age: '12 months' },
        { id: 'HIST-005', severity: 'medium', category: 'code-quality', fixed: false, age: '9 months' }
      ],
      generateReport: true
    });
    
    if (result.report) {
      // Save the report
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = path.join(__dirname, `SAMPLE-COMPREHENSIVE-REPORT-${timestamp}.md`);
      
      fs.writeFileSync(reportPath, result.report);
      console.log(`\n✅ Report saved to: ${reportPath}`);
      
      // Also save a copy with a simple name for easy access
      const simpleReportPath = path.join(__dirname, 'FINAL-COMPREHENSIVE-REPORT.md');
      fs.writeFileSync(simpleReportPath, result.report);
      console.log(`✅ Also saved as: FINAL-COMPREHENSIVE-REPORT.md`);
      
      // Display statistics
      const lines = result.report.split('\n');
      console.log(`\nReport Statistics:`);
      console.log(`- Total lines: ${lines.length}`);
      console.log(`- Total characters: ${result.report.length}`);
      
      // Show which issues were detected
      console.log(`\nIssue Analysis:`);
      console.log(`- Resolved issues: ${result.summary?.totalResolved || 0}`);
      console.log(`- New issues: ${result.summary?.totalNew || 0}`);
      console.log(`- Modified issues: ${result.summary?.totalModified || 0}`);
      console.log(`- Unchanged issues: ${result.summary?.totalUnchanged || 0}`);
      
      // Display first 100 lines for preview
      console.log('\n=== Report Preview (First 100 lines) ===\n');
      console.log(lines.slice(0, 100).join('\n'));
      console.log('\n... [Full report saved to file]');
      
      return result.report;
    } else {
      console.log('❌ No report generated');
      return null;
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return null;
  }
}

// Run the generator
console.log('Generating comprehensive PR analysis report with mock data...\n');
generateSampleReport().then(() => {
  console.log('\n✅ Report generation complete!');
  console.log('Please review FINAL-COMPREHENSIVE-REPORT.md');
  process.exit(0);
});