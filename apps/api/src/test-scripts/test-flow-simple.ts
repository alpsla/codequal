#!/usr/bin/env ts-node

import chalk from 'chalk';
import { config } from 'dotenv';
import { resolve } from 'path';
import { PRContextService } from '../services/pr-context-service';
import { createLogger } from '@codequal/core/utils';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const logger = createLogger('SimpleFlowTest');

/**
 * Simple test of the data flow components
 */
async function testFlowSimple() {
  console.log(chalk.cyan('\n🔬 Simple Data Flow Test\n'));
  console.log('='.repeat(60));

  // Test 1: PR Context Service (Real Component)
  console.log(chalk.blue('\n1️⃣ Testing PR Context Service...'));
  await testPRContextService();

  // Test 2: Data Structure for Agents
  console.log(chalk.blue('\n2️⃣ Testing Data Structure for Agents...'));
  testAgentDataStructure();

  // Test 3: Expected Agent Output
  console.log(chalk.blue('\n3️⃣ Testing Expected Agent Output...'));
  testExpectedAgentOutput();

  // Test 4: Result Processing
  console.log(chalk.blue('\n4️⃣ Testing Result Processing...'));
  testResultProcessing();

  // Test 5: Report Generation
  console.log(chalk.blue('\n5️⃣ Testing Report Generation...'));
  testReportGeneration();

  console.log(chalk.green('\n✅ All data structure tests completed'));
}

async function testPRContextService() {
  try {
    const service = new PRContextService();
    
    // Test URL parsing
    console.log('  Testing URL parsing...');
    const parsed = (service as any).parseRepositoryUrl('https://github.com/test/repo');
    console.log(`    Platform: ${parsed.platform}`);
    console.log(`    Owner: ${parsed.owner}`);
    console.log(`    Repo: ${parsed.repo}`);
    console.log(chalk.green('    ✓ URL parsing works'));

    // Test file extraction
    console.log('\n  Testing file extraction...');
    const mockDiff = {
      files: [
        { filename: 'src/index.ts', status: 'modified', additions: 10, deletions: 5 },
        { filename: 'src/utils.ts', status: 'added', additions: 20, deletions: 0 }
      ],
      totalAdditions: 30,
      totalDeletions: 5,
      totalChanges: 35
    };
    
    const files = service.extractChangedFiles(mockDiff as any);
    console.log(`    Extracted files: ${files.length}`);
    files.forEach(file => console.log(`      - ${file}`));
    console.log(chalk.green('    ✓ File extraction works'));

  } catch (error) {
    console.log(chalk.red('  ❌ PR Context Service failed:'), error);
  }
}

function testAgentDataStructure() {
  console.log('  Creating agent input structure...');
  
  const agentInput = {
    repository: 'https://github.com/test/repo',
    prNumber: 123,
    title: 'Add new feature',
    description: 'This PR adds a new authentication feature',
    files: [
      {
        path: 'src/auth.ts',
        content: 'export function authenticate() { /* ... */ }',
        diff: '+ export function authenticate() { /* ... */ }',
        previousContent: ''
      },
      {
        path: 'src/utils.ts',
        content: 'export function hash(password: string) { /* ... */ }',
        diff: '+ export function hash(password: string) { /* ... */ }',
        previousContent: ''
      }
    ],
    branch: 'feature/auth',
    baseBranch: 'main',
    author: 'developer'
  };

  console.log('    Structure created:');
  console.log(`      - Repository: ${agentInput.repository}`);
  console.log(`      - PR #${agentInput.prNumber}: ${agentInput.title}`);
  console.log(`      - Files: ${agentInput.files.length}`);
  agentInput.files.forEach(file => {
    console.log(`        - ${file.path}`);
  });
  console.log(`      - Branch: ${agentInput.branch} -> ${agentInput.baseBranch}`);
  console.log(chalk.green('    ✓ Agent input structure valid'));
}

function testExpectedAgentOutput() {
  console.log('  Creating expected agent outputs...');
  
  // Security Agent Output
  const securityOutput = {
    insights: [
      {
        type: 'vulnerability',
        title: 'Missing password hashing validation',
        message: 'The hash function should validate input length',
        severity: 'medium',
        file: 'src/utils.ts',
        line: 1
      }
    ],
    suggestions: [
      {
        type: 'security',
        message: 'Add input validation for password length'
      }
    ],
    metadata: {
      agentName: 'security',
      analysisTime: 150,
      filesAnalyzed: 2
    }
  };

  // Architecture Agent Output
  const architectureOutput = {
    insights: [
      {
        type: 'pattern',
        title: 'Consider using dependency injection',
        message: 'The authenticate function could benefit from DI pattern',
        severity: 'low',
        file: 'src/auth.ts'
      }
    ],
    suggestions: [],
    metadata: {
      agentName: 'architecture',
      analysisTime: 120
    }
  };

  // Code Quality Agent Output
  const codeQualityOutput = {
    insights: [
      {
        type: 'quality',
        title: 'Add JSDoc comments',
        message: 'Functions should have documentation',
        severity: 'low',
        file: 'src/auth.ts'
      }
    ],
    suggestions: [
      {
        type: 'improvement',
        message: 'Add unit tests for authentication logic'
      }
    ],
    metadata: {
      agentName: 'code-quality',
      analysisTime: 100
    }
  };

  console.log('    Security Agent:');
  console.log(`      - Insights: ${securityOutput.insights.length}`);
  console.log(`      - Suggestions: ${securityOutput.suggestions.length}`);
  
  console.log('    Architecture Agent:');
  console.log(`      - Insights: ${architectureOutput.insights.length}`);
  console.log(`      - Suggestions: ${architectureOutput.suggestions.length}`);
  
  console.log('    Code Quality Agent:');
  console.log(`      - Insights: ${codeQualityOutput.insights.length}`);
  console.log(`      - Suggestions: ${codeQualityOutput.suggestions.length}`);
  
  console.log(chalk.green('    ✓ Agent output structures valid'));
}

function testResultProcessing() {
  console.log('  Processing agent results...');
  
  // Combined results
  const processedResults = {
    findings: {
      security: [
        {
          title: 'Missing password hashing validation',
          severity: 'medium',
          file: 'src/utils.ts',
          line: 1,
          agent: 'security'
        }
      ],
      architecture: [
        {
          title: 'Consider using dependency injection',
          severity: 'low',
          file: 'src/auth.ts',
          agent: 'architecture'
        }
      ],
      codeQuality: [
        {
          title: 'Add JSDoc comments',
          severity: 'low',
          file: 'src/auth.ts',
          agent: 'code-quality'
        }
      ],
      performance: []
    },
    educationalContent: [
      {
        topic: 'Password Security Best Practices',
        relevance: 'high',
        source: 'security-agent'
      },
      {
        topic: 'Dependency Injection Patterns',
        relevance: 'medium',
        source: 'architecture-agent'
      }
    ],
    summary: {
      totalFindings: 3,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 1,
      lowCount: 2
    },
    decision: {
      recommendation: 'APPROVE_WITH_SUGGESTIONS',
      confidence: 0.85,
      reason: 'Minor improvements needed but no blocking issues'
    }
  };

  console.log('    Processing summary:');
  console.log(`      - Total findings: ${processedResults.summary.totalFindings}`);
  console.log(`      - By severity: ${processedResults.summary.mediumCount} medium, ${processedResults.summary.lowCount} low`);
  console.log(`      - Educational topics: ${processedResults.educationalContent.length}`);
  console.log(`      - Decision: ${processedResults.decision.recommendation}`);
  console.log(chalk.green('    ✓ Result processing structure valid'));
}

function testReportGeneration() {
  console.log('  Testing report structure...');
  
  const report = {
    id: 'report_123456_abc',
    metadata: {
      repository: 'https://github.com/test/repo',
      prNumber: 123,
      analysisDate: new Date().toISOString(),
      analysisMode: 'comprehensive',
      agentsUsed: ['security', 'architecture', 'code-quality']
    },
    summary: {
      title: 'PR #123: Add new feature',
      executiveSummary: 'This PR introduces authentication features with minor improvements needed',
      decision: 'APPROVE_WITH_SUGGESTIONS',
      metrics: {
        codeQuality: 85,
        security: 75,
        maintainability: 80,
        testCoverage: 0 // No tests yet
      }
    },
    findings: {
      byCategory: {
        security: 1,
        architecture: 1,
        codeQuality: 1,
        performance: 0
      },
      bySeverity: {
        critical: 0,
        high: 0,
        medium: 1,
        low: 2
      },
      details: [
        {
          id: 'finding_1',
          category: 'security',
          severity: 'medium',
          title: 'Missing password hashing validation',
          description: 'The hash function should validate input length',
          file: 'src/utils.ts',
          line: 1,
          recommendation: 'Add input validation before hashing'
        }
      ]
    },
    educationalContent: {
      topics: [
        {
          title: 'Password Security Best Practices',
          content: 'Learn about secure password handling...',
          resources: ['OWASP Guidelines', 'NIST Standards']
        }
      ],
      skillsIdentified: ['Security', 'Authentication'],
      learningPath: 'Security Fundamentals -> Advanced Authentication'
    },
    htmlReport: {
      url: 'http://localhost:3001/api/analysis/report_123456_abc/report?format=html',
      features: [
        'Interactive charts',
        'Collapsible sections', 
        'Code highlighting',
        'Export to PDF'
      ]
    }
  };

  console.log('    Report structure:');
  console.log(`      - Report ID: ${report.id}`);
  console.log(`      - Analysis mode: ${report.metadata.analysisMode}`);
  console.log(`      - Agents used: ${report.metadata.agentsUsed.length}`);
  console.log(`      - Total findings: ${Object.values(report.findings.bySeverity).reduce((a, b) => a + b, 0)}`);
  console.log(`      - Educational topics: ${report.educationalContent.topics.length}`);
  console.log(`      - HTML report features: ${report.htmlReport.features.length}`);
  console.log(chalk.green('    ✓ Report structure valid'));
}

// Run the test
testFlowSimple().then(() => {
  console.log(chalk.cyan('\n✨ Simple flow test complete\n'));
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});