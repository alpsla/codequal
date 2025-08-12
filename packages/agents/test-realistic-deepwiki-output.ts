#!/usr/bin/env npx ts-node

/**
 * Test with Realistic DeepWiki-like Output
 * This simulates real DeepWiki analysis with proper issue descriptions,
 * impacts, and recommendations
 */

import { ReportGeneratorV7EnhancedComplete } from './src/standard/comparison/report-generator-v7-enhanced-complete';
import { ComparisonResult } from './src/standard/types/analysis-types';
import * as fs from 'fs';
import * as path from 'path';

// Realistic issue templates based on DeepWiki output
const DEEPWIKI_ISSUE_TEMPLATES = {
  security: {
    critical: [
      {
        message: 'SQL Injection vulnerability in user authentication',
        impact: 'Allows attackers to bypass authentication and access sensitive data',
        remediation: 'Use parameterized queries or prepared statements',
        evidence: 'Direct string concatenation in SQL query construction'
      },
      {
        message: 'Hardcoded API keys exposed in source code',
        impact: 'Third-party service credentials can be compromised',
        remediation: 'Move credentials to environment variables or secure vault',
        evidence: 'API key found in configuration file'
      }
    ],
    high: [
      {
        message: 'Missing CSRF protection on state-changing endpoints',
        impact: 'Enables cross-site request forgery attacks',
        remediation: 'Implement CSRF tokens for all POST/PUT/DELETE requests',
        evidence: 'No CSRF middleware detected on mutation endpoints'
      },
      {
        message: 'Insecure direct object references in API endpoints',
        impact: 'Users can access resources belonging to other users',
        remediation: 'Implement proper authorization checks',
        evidence: 'User ID taken directly from request without validation'
      }
    ],
    medium: [
      {
        message: 'Sensitive data logged in production logs',
        impact: 'PII and sensitive information exposed in log files',
        remediation: 'Implement log sanitization and masking',
        evidence: 'Password and credit card data found in console.log statements'
      },
      {
        message: 'Missing rate limiting on authentication endpoints',
        impact: 'Susceptible to brute force attacks',
        remediation: 'Add rate limiting middleware to auth routes',
        evidence: 'No rate limiting detected on /login endpoint'
      }
    ]
  },
  performance: {
    high: [
      {
        message: 'N+1 query problem in data fetching logic',
        impact: 'Database queries scale linearly with result set size',
        remediation: 'Use eager loading or batch queries',
        evidence: 'Loop contains database query execution'
      },
      {
        message: 'Missing database indexes on frequently queried columns',
        impact: '10x slower query performance on large tables',
        remediation: 'Add indexes to foreign key columns',
        evidence: 'EXPLAIN PLAN shows full table scan'
      }
    ],
    medium: [
      {
        message: 'Synchronous blocking operations in request handler',
        impact: 'Reduces throughput and increases latency',
        remediation: 'Convert to async/await pattern',
        evidence: 'Synchronous file I/O detected in request path'
      },
      {
        message: 'Large bundle size due to unoptimized imports',
        impact: 'Slow initial page load times',
        remediation: 'Implement code splitting and lazy loading',
        evidence: 'Bundle analysis shows 2MB+ JavaScript payload'
      }
    ]
  },
  codeQuality: {
    medium: [
      {
        message: 'Cyclomatic complexity exceeds threshold in payment processing',
        impact: 'Difficult to maintain and test, prone to bugs',
        remediation: 'Refactor into smaller, focused functions',
        evidence: 'Function has 15+ conditional branches'
      },
      {
        message: 'Duplicated business logic across multiple services',
        impact: 'Inconsistent behavior and maintenance overhead',
        remediation: 'Extract shared logic to common module',
        evidence: '80% code similarity detected between modules'
      }
    ],
    low: [
      {
        message: 'Missing error handling in async operations',
        impact: 'Unhandled promise rejections can crash the application',
        remediation: 'Add try-catch blocks or .catch() handlers',
        evidence: 'Async function without error handling'
      },
      {
        message: 'Inconsistent naming conventions across codebase',
        impact: 'Reduces code readability and maintainability',
        remediation: 'Adopt and enforce consistent naming standards',
        evidence: 'Mixed camelCase and snake_case in same module'
      }
    ]
  }
};

function createRealisticIssue(
  severity: string,
  category: string,
  index: number,
  resolved: boolean = false
): any {
  const templates = DEEPWIKI_ISSUE_TEMPLATES[category]?.[severity] || [];
  const template = templates[index % templates.length] || {
    message: `${severity} ${category} issue`,
    impact: 'Potential issue in codebase',
    remediation: 'Review and fix the issue',
    evidence: 'Issue detected by analysis'
  };
  
  return {
    id: `${resolved ? 'resolved' : 'new'}-${category}-${severity}-${index}`,
    severity,
    category,
    message: template.message,
    impact: template.impact,
    remediation: template.remediation,
    evidence: template.evidence,
    location: {
      file: `src/${category}/${resolved ? 'fixed' : 'issues'}/module${index}.ts`,
      line: Math.floor(Math.random() * 500) + 1,
      column: Math.floor(Math.random() * 80) + 1
    },
    // Add DeepWiki-specific fields
    confidence: Math.floor(Math.random() * 20) + 80, // 80-100%
    falsePositiveRate: Math.random() * 0.1, // 0-10%
    estimatedFixTime: severity === 'critical' ? '4h' : severity === 'high' ? '2h' : '1h'
  };
}

async function generateRealisticReport() {
  console.log('🚀 Generating Realistic DeepWiki-style Report\n');
  console.log('=' .repeat(80));
  
  const generator = new ReportGeneratorV7EnhancedComplete();
  
  // Create realistic issue distribution
  const newIssues = [
    // Critical security issues
    createRealisticIssue('critical', 'security', 0),
    
    // High severity issues
    createRealisticIssue('high', 'security', 0),
    createRealisticIssue('high', 'performance', 0),
    
    // Medium severity issues
    createRealisticIssue('medium', 'security', 0),
    createRealisticIssue('medium', 'performance', 0),
    createRealisticIssue('medium', 'codeQuality', 0),
    createRealisticIssue('medium', 'codeQuality', 1),
    
    // Low severity issues
    createRealisticIssue('low', 'codeQuality', 0),
    createRealisticIssue('low', 'codeQuality', 1),
    createRealisticIssue('low', 'performance', 0)
  ];
  
  // Add resolved issues to show positive scoring
  const resolvedIssues = [
    createRealisticIssue('critical', 'security', 0, true),
    createRealisticIssue('high', 'performance', 0, true),
    createRealisticIssue('medium', 'codeQuality', 0, true)
  ];
  
  // Add a breaking change
  newIssues.push({
    id: 'breaking-api-1',
    severity: 'high',
    category: 'architecture',
    message: 'Breaking API change: Removed deprecated authentication endpoint',
    impact: 'Clients using /api/v1/auth will fail',
    remediation: 'Update clients to use /api/v2/auth',
    evidence: 'Endpoint /api/v1/auth removed in commit abc123',
    location: {
      file: 'src/routes/auth.ts',
      line: 45
    },
    isBreakingChange: true
  });
  
  const comparisonResult: ComparisonResult = {
    success: true,
    decision: 'NEEDS_REVIEW',
    newIssues,
    resolvedIssues,
    unchangedIssues: [
      createRealisticIssue('medium', 'security', 1),
      createRealisticIssue('low', 'codeQuality', 2)
    ],
    prMetadata: {
      repository_url: 'https://github.com/enterprise/payment-service',
      number: 1234,
      author: 'senior_developer',
      title: 'Feature: Add new payment processing system',
      description: 'Implements new payment gateway integration with improved error handling',
      filesChanged: 45,
      linesAdded: 2500,
      linesRemoved: 800,
      testCoverage: 68,
      languages: ['TypeScript', 'JavaScript'],
      frameworks: ['Express', 'React'],
      commits: 12
    },
    mainMetadata: {
      testCoverage: 75,
      complexity: 120,
      maintainabilityIndex: 65
    },
    overallScore: 62,
    confidence: 88,
    scanDuration: 45,
    // Add DeepWiki-specific metadata
    deepwikiAnalysis: {
      model: 'gpt-4-turbo',
      provider: 'openrouter',
      tokensUsed: 15000,
      costEstimate: 0.15,
      analysisDepth: 'comprehensive',
      includesArchitecturalReview: true,
      includesSecurityAudit: true,
      includesPerformanceProfile: true
    }
  } as any;
  
  console.log(`\n📊 Issue Summary:`);
  console.log(`   New Issues: ${newIssues.length}`);
  console.log(`   - Critical: ${newIssues.filter(i => i.severity === 'critical').length}`);
  console.log(`   - High: ${newIssues.filter(i => i.severity === 'high').length}`);
  console.log(`   - Medium: ${newIssues.filter(i => i.severity === 'medium').length}`);
  console.log(`   - Low: ${newIssues.filter(i => i.severity === 'low').length}`);
  console.log(`   Resolved Issues: ${resolvedIssues.length}`);
  console.log(`   Breaking Changes: ${newIssues.filter(i => i.isBreakingChange).length}`);
  
  console.log('\n⏳ Generating report...');
  const report = await generator.generateReport(comparisonResult);
  
  // Save the report
  const reportsDir = path.join(__dirname, 'validation-reports', 'realistic-deepwiki');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = `realistic-report-${timestamp}.md`;
  const filepath = path.join(reportsDir, filename);
  fs.writeFileSync(filepath, report);
  
  console.log(`\n✅ Report generated successfully!`);
  console.log(`📁 Saved to: ${filepath}`);
  
  // Validate key sections
  console.log('\n🔍 Validating Report Sections:');
  const hasArchitecture = report.includes('Architecture Analysis');
  const hasBreakingChanges = report.includes('Breaking Change');
  const hasBusinessImpact = report.includes('Business Impact Analysis');
  const hasRealisticMessages = !report.includes('severity new issue 1');
  const hasProperImpacts = report.includes('SQL Injection') || report.includes('N+1 query');
  
  console.log(`   ✅ Architecture Analysis: ${hasArchitecture ? 'Present' : 'Missing'}`);
  console.log(`   ✅ Breaking Changes: ${hasBreakingChanges ? 'Present' : 'Missing'}`);
  console.log(`   ✅ Business Impact: ${hasBusinessImpact ? 'Present' : 'Missing'}`);
  console.log(`   ✅ Realistic Messages: ${hasRealisticMessages ? 'Yes' : 'No'}`);
  console.log(`   ✅ Proper Impacts: ${hasProperImpacts ? 'Yes' : 'No'}`);
  
  console.log('\n' + '=' .repeat(80));
  console.log('📋 Report generation complete!\n');
}

// Run the test
generateRealisticReport().catch(console.error);