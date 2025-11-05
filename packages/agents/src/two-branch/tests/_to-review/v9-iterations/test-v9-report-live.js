#!/usr/bin/env node

/**
 * V9 Live Report Generation Test
 * Generates a complete report for review and issue identification
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../../../../.env') });
const fs = require('fs');
const path = require('path');

async function generateLiveV9Report() {
  console.log('🚀 V9 LIVE REPORT GENERATION');
  console.log('=' .repeat(70));
  console.log('Generating complete report for issue review\n');

  try {
    // Import V9 components
    const { V9ReportFormatterFinal } = require('../../../dist/two-branch/analyzers/v9-report-formatter-final');
    const { V9ScoringCalculator } = require('../../../dist/two-branch/analyzers/v9-scoring-calculator');

    // Create realistic test data
    const mockAnalysisResult = {
      decision: 'rejected',
      confidence: 0.85,
      reason: 'Critical security vulnerabilities detected',
      qualityScore: 68.5,
      grade: 'D',

      newIssues: [
        {
          id: 'sec-001',
          type: 'security',
          severity: 'critical',
          category: 'Security',
          status: 'open',
          title: 'SQL Injection vulnerability',
          description: 'SQL Injection vulnerability detected - user input is concatenated directly into SQL query',
          file: 'src/main/java/kafka/server/KafkaServer.java',
          line: 145,
          message: 'SQL Injection vulnerability detected',
          tool: 'semgrep',
          agent: 'SecurityAgent',
          toolCategory: 'security'
        },
        {
          id: 'sec-002',
          type: 'security',
          severity: 'high',
          category: 'Security',
          status: 'open',
          title: 'Hardcoded credentials',
          description: 'Hardcoded credentials found in source code',
          file: 'src/main/java/kafka/auth/AuthHandler.java',
          line: 89,
          message: 'Hardcoded credentials found',
          tool: 'semgrep',
          agent: 'SecurityAgent',
          toolCategory: 'security'
        },
        {
          id: 'qual-001',
          type: 'quality',
          severity: 'medium',
          category: 'Quality',
          status: 'open',
          title: 'High method complexity',
          description: 'Method complexity is 25 (threshold is 10)',
          file: 'src/main/java/kafka/utils/Utils.java',
          line: 234,
          message: 'Method complexity is 25 (threshold is 10)',
          tool: 'pmd',
          agent: 'QualityAgent',
          toolCategory: 'quality'
        },
        {
          id: 'perf-001',
          type: 'performance',
          severity: 'medium',
          category: 'Performance',
          status: 'open',
          title: 'Inefficient string concatenation',
          description: 'Inefficient string concatenation in loop - use StringBuilder',
          file: 'src/main/java/kafka/log/LogManager.java',
          line: 567,
          message: 'Inefficient string concatenation in loop',
          tool: 'spotbugs',
          agent: 'PerformanceAgent',
          toolCategory: 'performance'
        }
      ],

      existingIssues: [
        {
          id: 'qual-002',
          type: 'quality',
          severity: 'low',
          category: 'Quality',
          status: 'open',
          title: 'Missing Javadoc',
          description: 'Missing Javadoc comment for public method',
          file: 'src/test/java/kafka/TestUtils.java',
          line: 123,
          message: 'Missing Javadoc',
          tool: 'checkstyle',
          agent: 'QualityAgent',
          toolCategory: 'style'
        }
      ],

      resolvedIssues: [
        {
          id: 'bug-001',
          type: 'bug',
          severity: 'high',
          category: 'Quality',
          status: 'resolved',
          title: 'Null pointer dereference',
          description: 'Potential null pointer dereference fixed',
          file: 'src/main/java/kafka/network/SocketServer.java',
          line: 890,
          message: 'Null pointer dereference',
          tool: 'spotbugs',
          agent: 'QualityAgent',
          toolCategory: 'quality'
        }
      ],

      blockingIssues: [
        {
          id: 'sec-001',
          type: 'security',
          severity: 'critical',
          category: 'Security',
          status: 'open',
          title: 'SQL Injection vulnerability',
          description: 'SQL Injection vulnerability detected - user input is concatenated directly into SQL query',
          file: 'src/main/java/kafka/server/KafkaServer.java',
          line: 145,
          message: 'SQL Injection vulnerability detected',
          tool: 'semgrep',
          agent: 'SecurityAgent',
          toolCategory: 'security'
        }
      ],

      backlogIssues: [],
      modifiedFiles: [
        'src/main/java/kafka/server/KafkaServer.java',
        'src/main/java/kafka/auth/AuthHandler.java',
        'src/main/java/kafka/utils/Utils.java',
        'src/main/java/kafka/log/LogManager.java'
      ],

      businessImpact: {
        riskLevel: 'high',
        recommendation: 'Block deployment - critical security issues',
        estimatedDebt: '12 hours',
        deploymentReadiness: 'not_ready',
        securityPosture: 'vulnerable',
        performanceImpact: 'moderate',
        maintainabilityImpact: 'low',
        suggestedActions: [
          'Fix SQL injection vulnerability immediately',
          'Remove hardcoded credentials',
          'Refactor complex methods'
        ],
        financialImpact: {
          fixCost: '$2,400',
          exploitCost: '$50,000+',
          roi: '2083%'
        },
        futureRisk: 'Critical',
        estimatedCost: 2400,
        estimatedTimeSavings: 96,
        riskMitigation: [
          'Implement parameterized queries',
          'Use secrets management system',
          'Add security scanning to CI/CD'
        ],
        riskMatrix: [
          { category: 'Security', blocking: 1, backlog: 0, score: 10 },
          { category: 'Quality', blocking: 0, backlog: 2, score: 4 },
          { category: 'Performance', blocking: 0, backlog: 1, score: 2 }
        ]
      },

      skillScore: {
        overall: 72,
        security: 45,
        performance: 78,
        maintainability: 82,
        testing: 75,
        documentation: 68,
        developer: 'contributor',
        score: 72,
        trend: 'improving',
        categories: {
          security: 45,
          performance: 78,
          maintainability: 82,
          testing: 75,
          documentation: 68
        },
        trends: {
          improving: ['testing', 'documentation'],
          declining: ['security'],
          stable: ['performance', 'maintainability']
        },
        recommendations: [
          'Security training recommended',
          'Good performance practices observed'
        ]
      },

      educationalResources: [
        {
          issueType: 'SQL Injection',
          title: 'Preventing SQL Injection in Java',
          url: 'https://owasp.org/sql-injection',
          description: 'Learn about parameterized queries',
          difficulty: 'intermediate',
          estimatedTime: '30 minutes',
          category: 'security'
        }
      ],

      metadata: {
        analyzedAt: new Date().toISOString(),
        analyzer: 'V9',
        repoUrl: 'https://github.com/apache/kafka',
        executionTime: 225000,
        repository: 'apache/kafka',
        prNumber: 17620,
        prTitle: 'KAFKA-17620: Fix consumer group rebalancing',
        branch: 'feature/KAFKA-17620',
        baseBranch: 'trunk',
        prAuthor: 'contributor',
        prAuthorEmail: 'contributor@apache.org',
        repoOwner: 'apache',
        organizationName: 'Apache Software Foundation',
        totalLinesOfCode: 850000,
        linesAdded: 245,
        linesDeleted: 89,
        linesModified: 334,
        filesModified: 4,
        totalFiles: 5432,
        languageBreakdown: {
          java: 85,
          scala: 10,
          python: 3,
          shell: 2
        },
        totalDuration: 225000,
        cloneTime: 45000,
        analysisTime: 170000,
        reportGenerationTime: 10000,
        agentsUsed: [
          {
            agentName: 'SecurityAgent',
            executionTime: 45000,
            issuesFound: 2,
            filesAnalyzed: 1200,
            tokensUsed: 15000,
            modelUsed: {
              provider: 'anthropic',
              model: 'claude-3-haiku',
              temperature: 0.3
            },
            cost: 0.45,
            status: 'completed'
          }
        ],
        toolsUsed: [
          {
            toolName: 'semgrep',
            executionTime: 35000,
            filesScanned: 5432,
            issuesFound: 2,
            exitCode: 0,
            stdout: 'Found 2 security issues',
            stderr: ''
          }
        ],
        totalCost: 1.64,
        costBreakdown: {
          aiModels: 0.89,
          infrastructure: 0.65,
          tools: 0.10
        },
        estimatedMonthlyCost: 328.00,
        analyzerVersion: '9.0.0',
        smartFileSelection: true,
        maxFilesAnalyzed: 5432,
        startTime: new Date(Date.now() - 225000).toISOString(),
        endTime: new Date().toISOString()
      }
    };

    // Generate the report
    const formatter = new V9ReportFormatterFinal();
    const report = await formatter.generateCompleteReport(mockAnalysisResult, mockAnalysisResult.metadata);

    // Save the report
    const timestamp = Date.now();
    const reportPath = path.join(__dirname, `v9-live-report-${timestamp}.md`);
    fs.writeFileSync(reportPath, report);

    console.log('✅ Report generated successfully');
    console.log(`📁 Saved to: ${reportPath}`);
    console.log('\n📊 Report Preview:');
    console.log('=' .repeat(70));
    console.log(report.substring(0, 2000) + '...\n');

    // Also generate JSON version for inspection
    const jsonReport = {
      timestamp: new Date().toISOString(),
      result: mockAnalysisResult,
      reportLength: report.length,
      sections: report.split('\n## ').length - 1,
      issues: {
        new: mockAnalysisResult.newIssues.length,
        existing: mockAnalysisResult.existingIssues.length,
        resolved: mockAnalysisResult.resolvedIssues.length,
        blocking: mockAnalysisResult.blockingIssues.length
      },
      score: {
        quality: mockAnalysisResult.qualityScore,
        grade: mockAnalysisResult.grade,
        decision: mockAnalysisResult.decision
      }
    };

    const jsonPath = path.join(__dirname, `v9-live-report-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
    console.log(`📁 JSON saved to: ${jsonPath}`);

    return { report, jsonReport };

  } catch (error) {
    console.error('❌ Error generating report:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  generateLiveV9Report().catch(console.error);
}

module.exports = { generateLiveV9Report };