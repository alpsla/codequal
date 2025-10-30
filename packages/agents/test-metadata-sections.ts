#!/usr/bin/env ts-node
/**
 * Quick test to verify metadata sections (agent performance, tool performance, cost analysis)
 * appear in reports when flags are enabled.
 */

import { V9GroupedReportFormatter } from './src/two-branch/analyzers/v9-grouped-report-formatter';
import type { EnrichedIssue } from './src/two-branch/analyzers/v9-grouped-report-formatter';
import * as fs from 'fs';
import * as path from 'path';

console.log('='.repeat(80));
console.log('Testing Metadata Sections in V9 Grouped Report');
console.log('='.repeat(80));
console.log();

// Create mock issues
const mockIssues: EnrichedIssue[] = [
  {
    file: 'src/Example.java',
    rule: 'UnusedPrivateMethod',
    tool: 'pmd',
    severity: 'high',
    message: 'Unused private method detected',
    line: 42,
    category: 'NEW',
    detectedCategory: 'Code Quality',
    fixSuggestion: {
      fix: 'Remove the unused method or mark it as deprecated',
      correctedCode: '// Method removed',
      explanation: 'Unused methods increase code complexity',
      bestPractices: ['Keep code clean', 'Remove dead code']
    }
  },
  {
    file: 'src/Security.java',
    rule: 'HardcodedPassword',
    tool: 'semgrep',
    severity: 'critical',
    message: 'Hardcoded password detected',
    line: 10,
    category: 'NEW',
    detectedCategory: 'Security',
    fixSuggestion: {
      fix: 'Use environment variables for sensitive data',
      correctedCode: 'String password = System.getenv("DB_PASSWORD");',
      explanation: 'Hardcoded credentials are a security risk'
    }
  }
];

// Create mock groups (must match IssueGroup interface from issue-grouping.ts)
const mockGroups = [
  {
    rule: 'UnusedPrivateMethod',
    tool: 'pmd',
    severity: 'high',
    description: 'Private method is never called',
    category: 'Code Quality',
    detectedCategory: 'Code Quality',
    count: 1,
    examples: [
      {
        file: 'src/Example.java',
        line: 42,
        snippet: 'private void unusedMethod() { }'
      }
    ],
    aiAnalyzed: true,
    costSaved: 0.003,
    fixSuggestion: {
      fix: 'Remove the unused method or mark it as deprecated',
      correctedCode: '// Method removed',
      explanation: 'Unused methods increase code complexity',
      bestPractices: ['Keep code clean', 'Remove dead code']
    }
  },
  {
    rule: 'HardcodedPassword',
    tool: 'semgrep',
    severity: 'critical',
    description: 'Hardcoded credentials detected',
    category: 'Security',
    detectedCategory: 'Security',
    count: 1,
    examples: [
      {
        file: 'src/Security.java',
        line: 10,
        snippet: 'String password = "admin123";'
      }
    ],
    aiAnalyzed: true,
    costSaved: 0.003,
    fixSuggestion: {
      fix: 'Use environment variables for sensitive data',
      correctedCode: 'String password = System.getenv("DB_PASSWORD");',
      explanation: 'Hardcoded credentials are a security risk'
    }
  }
];

// Create metadata WITH agent and tool performance data
const metadata = {
  repository: 'test-org/test-repo',
  repoUrl: 'https://github.com/test-org/test-repo',
  prNumber: 123,
  prTitle: 'Test PR for metadata sections',
  branch: 'feature/test',
  baseBranch: 'main',
  prAuthor: 'test-user',
  prAuthorEmail: 'test@example.com',
  organizationName: 'test-org',
  totalFiles: 50,
  totalLinesOfCode: 5000,
  filesModified: 5,
  linesAdded: 100,
  linesDeleted: 50,
  decision: 'DECLINED' as const,
  blockingCount: 2,
  totalDuration: 45000,
  cloneTime: 5000,
  analysisTime: 35000,
  reportGenerationTime: 5000,
  analyzedAt: new Date().toISOString(),
  analyzerVersion: '9.0.0',

  // ⭐ KEY: Agent Performance Data
  agentPerformance: [
    {
      name: 'Security Agent',
      filesAnalyzed: 25,
      issuesFound: 1,
      duration: 8000,
      cost: 0.0234
    },
    {
      name: 'Code Quality Agent',
      filesAnalyzed: 50,
      issuesFound: 1,
      duration: 12000,
      cost: 0.0156
    },
    {
      name: 'Performance Agent',
      filesAnalyzed: 15,
      issuesFound: 0,
      duration: 6000,
      cost: 0.0089
    },
    {
      name: 'Architecture Agent',
      filesAnalyzed: 30,
      issuesFound: 0,
      duration: 9000,
      cost: 0.0124
    },
    {
      name: 'Dependency Agent',
      filesAnalyzed: 10,
      issuesFound: 0,
      duration: 5000,
      cost: 0.0067
    }
  ],

  // ⭐ KEY: Tool Performance Data
  toolPerformance: [
    {
      tool: 'pmd',
      filesScanned: 50,
      issuesFound: 1,
      duration: 14500
    },
    {
      tool: 'semgrep',
      filesScanned: 50,
      issuesFound: 1,
      duration: 18600
    },
    {
      tool: 'checkstyle',
      filesScanned: 50,
      issuesFound: 0,
      duration: 12300
    },
    {
      tool: 'dependency-check',
      filesScanned: 10,
      issuesFound: 0,
      duration: 8900
    },
    {
      tool: 'spotbugs',
      filesScanned: 30,
      issuesFound: 0,
      duration: 21500
    }
  ]
};

async function runTest() {
  try {
    console.log('✓ Creating V9GroupedReportFormatter instance...');
    const formatter = new V9GroupedReportFormatter();

    console.log('✓ Generating report with agent and tool performance data...');
    const result = await formatter.generateGroupedReport(
      mockIssues,
      mockGroups,
      metadata
    );

    console.log(`✓ Report generated: ${(result.markdown.length / 1024).toFixed(1)} KB`);
    console.log();

    // Check for metadata sections
    console.log('Checking for metadata sections in report:');
    console.log('-'.repeat(80));

    const hasAgentPerformance = result.markdown.includes('### Agent Performance');
    const hasToolPerformance = result.markdown.includes('### Tool Performance');
    const hasCostAnalysis = result.markdown.includes('### Cost & Efficiency Analysis');

    console.log(`✓ Agent Performance section: ${hasAgentPerformance ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`✓ Tool Performance section: ${hasToolPerformance ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`✓ Cost & Efficiency Analysis section: ${hasCostAnalysis ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log();

    // Extract and display the metadata sections
    if (hasAgentPerformance || hasToolPerformance || hasCostAnalysis) {
      console.log('='.repeat(80));
      console.log('📊 METADATA SECTIONS PREVIEW');
      console.log('='.repeat(80));
      console.log();

      // Extract the metadata section
      const metadataStart = result.markdown.indexOf('### Agent Performance');
      const footerStart = result.markdown.indexOf('---\n\n*Generated by CodeQual');

      if (metadataStart > -1 && footerStart > -1) {
        const metadataSections = result.markdown.substring(metadataStart, footerStart);
        console.log(metadataSections);
      }
    }

    // Save full report
    const outputDir = path.join(__dirname, 'test-outputs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const reportPath = path.join(outputDir, `metadata-test-report-${Date.now()}.md`);
    fs.writeFileSync(reportPath, result.markdown);

    console.log();
    console.log('='.repeat(80));
    console.log(`✅ Full report saved to: ${reportPath}`);
    console.log('='.repeat(80));

    // Test summary
    const allSectionsPresent = hasAgentPerformance && hasToolPerformance && hasCostAnalysis;
    if (allSectionsPresent) {
      console.log();
      console.log('🎉 SUCCESS: All metadata sections are working correctly!');
      console.log('   - BUG #9 FIX ✅: Agent Performance tracking enabled');
      console.log('   - BUG #8 FIX ✅: Tool Performance tracking enabled');
      console.log('   - BUG #10 FIX ✅: Cost & Efficiency Analysis enabled');
    } else {
      console.log();
      console.log('⚠️  WARNING: Some metadata sections are missing!');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

runTest();
