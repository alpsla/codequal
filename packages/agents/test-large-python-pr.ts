#!/usr/bin/env npx ts-node

/**
 * Large Python/Django PR Test
 * Generates a comprehensive report for a large Python project PR
 * Uses dynamic model selection - NO HARDCODED MODELS
 */

import { ReportGeneratorV7EnhancedComplete } from './src/standard/comparison/report-generator-v7-enhanced-complete';
import { ComparisonResult } from './src/standard/types/analysis-types';
import * as fs from 'fs';
import * as path from 'path';

// Create comprehensive test data for a large Python/Django PR
const createLargePythonPRData = (): ComparisonResult => {
  return {
    success: true,
    newIssues: [
      // Critical Issues
      {
        id: 'PY-CRIT-001',
        severity: 'critical',
        category: 'security',
        message: 'SQL Injection in raw Django query',
        location: { file: 'apps/billing/views.py', line: 234 },
        impact: 'Direct database access vulnerability allowing arbitrary SQL execution',
        remediation: 'Use Django ORM or parameterized queries instead of string formatting'
      },
      {
        id: 'PY-CRIT-002',
        severity: 'critical',
        category: 'api-change',
        message: 'Breaking Change: REST API endpoint signature changed',
        location: { file: 'apps/api/v2/endpoints.py', line: 89 },
        impact: 'All mobile apps and third-party integrations will break',
        remediation: 'Add backward compatibility layer or version the endpoint'
      },
      {
        id: 'PY-CRIT-003',
        severity: 'critical',
        category: 'security',
        message: 'Exposed AWS credentials in settings file',
        location: { file: 'config/settings/production.py', line: 45 },
        impact: 'Full AWS account compromise possible',
        remediation: 'Use environment variables or AWS IAM roles'
      },
      // High Issues
      {
        id: 'PY-HIGH-001',
        severity: 'high',
        category: 'performance',
        message: 'N+1 query problem in Django ORM usage',
        location: { file: 'apps/products/models.py', line: 456 },
        impact: '500+ database queries per request on product listing',
        remediation: 'Use select_related() or prefetch_related()'
      },
      {
        id: 'PY-HIGH-002',
        severity: 'high',
        category: 'security',
        message: 'Missing CSRF protection on payment form',
        location: { file: 'apps/payments/forms.py', line: 123 },
        impact: 'Cross-site request forgery attacks possible',
        remediation: 'Add {% csrf_token %} to form template'
      },
      {
        id: 'PY-HIGH-003',
        severity: 'high',
        category: 'dependency',
        message: 'Django 2.2 is end-of-life with known vulnerabilities',
        location: { file: 'requirements.txt', line: 3 },
        impact: 'Multiple security vulnerabilities unpatched',
        remediation: 'Upgrade to Django 4.2 LTS'
      },
      {
        id: 'PY-HIGH-004',
        severity: 'high',
        category: 'architecture',
        message: 'Circular import between payment and order modules',
        location: { file: 'apps/orders/services.py', line: 15 },
        impact: 'Import errors and maintenance difficulties',
        remediation: 'Refactor to use dependency injection or events'
      },
      // Medium Issues
      {
        id: 'PY-MED-001',
        severity: 'medium',
        category: 'performance',
        message: 'Synchronous API call in request handler',
        location: { file: 'apps/integrations/stripe_client.py', line: 267 },
        impact: 'Request timeout risk for payment processing',
        remediation: 'Use Celery for async processing'
      },
      {
        id: 'PY-MED-002',
        severity: 'medium',
        category: 'code-quality',
        message: 'Complex function with cyclomatic complexity of 25',
        location: { file: 'apps/analytics/calculator.py', line: 189 },
        impact: 'Difficult to test and maintain',
        remediation: 'Break down into smaller functions'
      },
      {
        id: 'PY-MED-003',
        severity: 'medium',
        category: 'testing',
        message: 'No unit tests for payment processing logic',
        location: { file: 'apps/payments/processors.py', line: 1 },
        impact: 'Critical functionality untested',
        remediation: 'Add comprehensive test coverage'
      },
      {
        id: 'PY-MED-004',
        severity: 'medium',
        category: 'security',
        message: 'User input not sanitized in template',
        location: { file: 'templates/user/profile.html', line: 45 },
        impact: 'Potential XSS vulnerability',
        remediation: 'Use Django template escaping'
      },
      {
        id: 'PY-MED-005',
        severity: 'medium',
        category: 'architecture',
        message: 'Business logic in Django view instead of service layer',
        location: { file: 'apps/orders/views.py', line: 345 },
        impact: 'Violates separation of concerns',
        remediation: 'Move to service layer'
      },
      // Low Issues
      {
        id: 'PY-LOW-001',
        severity: 'low',
        category: 'code-quality',
        message: 'PEP 8 style violations',
        location: { file: 'apps/utils/helpers.py', line: 23 },
        impact: 'Code style inconsistency',
        remediation: 'Run black formatter'
      },
      {
        id: 'PY-LOW-002',
        severity: 'low',
        category: 'documentation',
        message: 'Missing docstrings in public methods',
        location: { file: 'apps/api/serializers.py', line: 67 },
        impact: 'Poor API documentation',
        remediation: 'Add comprehensive docstrings'
      },
      {
        id: 'PY-LOW-003',
        severity: 'low',
        category: 'performance',
        message: 'Using list comprehension where generator would be better',
        location: { file: 'apps/reports/generator.py', line: 234 },
        impact: 'Unnecessary memory usage',
        remediation: 'Use generator expression'
      }
    ],
    unchangedIssues: [
      // Existing repository issues of various severities
      {
        id: 'REPO-PY-CRIT-001',
        severity: 'critical',
        category: 'security',
        message: 'DEBUG = True in production settings',
        location: { file: 'config/settings/base.py', line: 28 }
      },
      {
        id: 'REPO-PY-CRIT-002',
        severity: 'critical',
        category: 'security',
        message: 'SECRET_KEY hardcoded in repository',
        location: { file: 'config/settings/common.py', line: 15 }
      },
      {
        id: 'REPO-PY-HIGH-001',
        severity: 'high',
        category: 'performance',
        message: 'Missing database indexes on foreign keys',
        location: { file: 'apps/products/migrations/0001_initial.py', line: 45 }
      },
      {
        id: 'REPO-PY-HIGH-002',
        severity: 'high',
        category: 'architecture',
        message: 'Monolithic app structure needs refactoring',
        location: { file: 'apps/core/models.py', line: 1234 }
      },
      {
        id: 'REPO-PY-HIGH-003',
        severity: 'high',
        category: 'dependencies',
        message: '47 outdated packages with security patches available',
        location: { file: 'requirements.txt', line: 1 }
      },
      {
        id: 'REPO-PY-MED-001',
        severity: 'medium',
        category: 'testing',
        message: 'Test coverage at 42% (target: 80%)',
        location: { file: '.coverage', line: 1 }
      },
      {
        id: 'REPO-PY-MED-002',
        severity: 'medium',
        category: 'performance',
        message: 'Redis cache not configured properly',
        location: { file: 'config/cache.py', line: 23 }
      },
      {
        id: 'REPO-PY-MED-003',
        severity: 'medium',
        category: 'code-quality',
        message: '35% code duplication across views',
        location: { file: 'apps/', line: 0 }
      },
      {
        id: 'REPO-PY-MED-004',
        severity: 'medium',
        category: 'documentation',
        message: 'API documentation outdated by 6 versions',
        location: { file: 'docs/api.md', line: 1 }
      },
      {
        id: 'REPO-PY-LOW-001',
        severity: 'low',
        category: 'code-quality',
        message: 'Inconsistent import ordering',
        location: { file: 'apps/', line: 0 }
      },
      {
        id: 'REPO-PY-LOW-002',
        severity: 'low',
        category: 'testing',
        message: 'Flaky tests in CI/CD pipeline',
        location: { file: 'tests/integration/test_payments.py', line: 156 }
      },
      {
        id: 'REPO-PY-LOW-003',
        severity: 'low',
        category: 'documentation',
        message: 'README missing setup instructions',
        location: { file: 'README.md', line: 1 }
      },
      {
        id: 'REPO-PY-LOW-004',
        severity: 'low',
        category: 'code-quality',
        message: 'TODO comments left in code',
        location: { file: 'apps/utils/validators.py', line: 89 }
      },
      {
        id: 'REPO-PY-LOW-005',
        severity: 'low',
        category: 'performance',
        message: 'Inefficient logger configuration',
        location: { file: 'config/logging.py', line: 45 }
      }
    ],
    resolvedIssues: [
      {
        id: 'FIXED-PY-001',
        severity: 'critical',
        category: 'security',
        message: 'Fixed: SQL injection in user search',
        location: { file: 'apps/users/search.py', line: 123 }
      },
      {
        id: 'FIXED-PY-002',
        severity: 'high',
        category: 'performance',
        message: 'Fixed: Memory leak in background task',
        location: { file: 'apps/tasks/workers.py', line: 456 }
      },
      {
        id: 'FIXED-PY-003',
        severity: 'high',
        category: 'security',
        message: 'Fixed: CORS misconfiguration',
        location: { file: 'config/cors.py', line: 12 }
      },
      {
        id: 'FIXED-PY-004',
        severity: 'medium',
        category: 'testing',
        message: 'Fixed: Added 150 unit tests',
        location: { file: 'tests/', line: 0 }
      },
      {
        id: 'FIXED-PY-005',
        severity: 'medium',
        category: 'documentation',
        message: 'Fixed: Updated API documentation',
        location: { file: 'docs/api/', line: 0 }
      }
    ],
    overallScore: 58,
    confidence: 91,
    // This is the correct structure - prMetadata at top level
    prMetadata: {
      id: 8934,
      title: 'Feature: Multi-tenant support and payment gateway integration',
      author: 'alex_kumar',
      repository_url: 'https://github.com/techcorp/django-saas-platform',
      number: 8934,
      filesChanged: 287,
      linesAdded: 8453,
      linesRemoved: 3421
    },
    scanDuration: 48.3
  } as any;
};

async function generateLargePythonReport() {
  console.log('🐍 Generating Large Python/Django PR Report...\n');
  console.log('=' .repeat(60) + '\n');
  
  // Create validation data
  const comparisonData = createLargePythonPRData();
  
  // Show PR statistics
  console.log('📊 PR Statistics:');
  console.log(`   Repository: ${comparisonData.prMetadata?.repository_url}`);
  console.log(`   PR #${comparisonData.prMetadata?.number}: ${comparisonData.prMetadata?.title}`);
  console.log(`   Author: @${comparisonData.prMetadata?.author}`);
  console.log(`   Files Changed: ${comparisonData.prMetadata?.filesChanged}`);
  console.log(`   Lines: +${comparisonData.prMetadata?.linesAdded} / -${comparisonData.prMetadata?.linesRemoved}`);
  console.log(`   Total Issues: ${comparisonData.newIssues?.length || 0} new, ${comparisonData.unchangedIssues?.length || 0} existing\n`);
  
  // Show issue breakdown
  console.log('🔍 Issue Breakdown:');
  console.log('   New Issues:');
  const newByLevel = {
    critical: comparisonData.newIssues?.filter(i => i.severity === 'critical').length || 0,
    high: comparisonData.newIssues?.filter(i => i.severity === 'high').length || 0,
    medium: comparisonData.newIssues?.filter(i => i.severity === 'medium').length || 0,
    low: comparisonData.newIssues?.filter(i => i.severity === 'low').length || 0
  };
  console.log(`     🔴 Critical: ${newByLevel.critical}`);
  console.log(`     🟠 High: ${newByLevel.high}`);
  console.log(`     🟡 Medium: ${newByLevel.medium}`);
  console.log(`     🟢 Low: ${newByLevel.low}`);
  
  console.log('   Existing Repository Issues:');
  const existingByLevel = {
    critical: comparisonData.unchangedIssues?.filter(i => i.severity === 'critical').length || 0,
    high: comparisonData.unchangedIssues?.filter(i => i.severity === 'high').length || 0,
    medium: comparisonData.unchangedIssues?.filter(i => i.severity === 'medium').length || 0,
    low: comparisonData.unchangedIssues?.filter(i => i.severity === 'low').length || 0
  };
  console.log(`     🔴 Critical: ${existingByLevel.critical}`);
  console.log(`     🟠 High: ${existingByLevel.high}`);
  console.log(`     🟡 Medium: ${existingByLevel.medium}`);
  console.log(`     🟢 Low: ${existingByLevel.low}\n`);
  
  // Initialize report generator
  const generator = new ReportGeneratorV7EnhancedComplete();
  
  // Generate report
  console.log('📝 Generating comprehensive report...');
  console.log('📌 NOTE: Using dynamic model selection from Supabase (not hardcoded)');
  const report = generator.generateReport(comparisonData);
  
  // Save report
  const reportsDir = path.join(__dirname, 'validation-reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const reportPath = path.join(reportsDir, `python-django-pr-${timestamp}.md`);
  
  fs.writeFileSync(reportPath, report);
  
  console.log('\n✅ Report generated successfully!');
  console.log(`📄 Report saved to: ${reportPath}\n`);
  
  // Validate all bug fixes are present
  console.log('🐛 Validating Bug Fixes in Report:');
  console.log('─'.repeat(50));
  
  const validations = [
    {
      name: 'BUG-005: Repository Issues',
      check: report.includes('Repository Issues (NOT BLOCKING)') && 
             report.includes('DEBUG = True in production') &&
             report.includes('Critical Repository Issues') &&
             report.includes('High Repository Issues') &&
             report.includes('Medium Repository Issues') &&
             report.includes('Low Repository Issues')
    },
    {
      name: 'BUG-006: Realistic Scoring',
      check: !report.includes(': 100/100') || report.includes('baseline')
    },
    {
      name: 'BUG-007: Architecture Visualization',
      check: report.includes('SYSTEM ARCHITECTURE') && 
             report.includes('┌─────') &&
             report.includes('Module Structure')
    },
    {
      name: 'BUG-008: Breaking Changes',
      check: report.includes('Breaking Changes') && 
             report.includes('REST API endpoint signature changed') &&
             report.includes('Migration Guide')
    },
    {
      name: 'BUG-009: Line Numbers',
      check: report.includes(':234') && // SQL injection line
             report.includes(':89') &&  // API endpoint line
             report.includes(':456')    // N+1 query line
    },
    {
      name: 'Scoring Consistency',
      check: report.includes('Critical | -20') &&
             report.includes('High | -10') &&
             report.includes('Medium | -5') &&
             report.includes('Low | -2')
    }
  ];
  
  validations.forEach(v => {
    console.log(`${v.check ? '✅' : '❌'} ${v.name}: ${v.check ? 'VERIFIED' : 'MISSING'}`);
  });
  
  console.log('─'.repeat(50));
  
  const allValid = validations.every(v => v.check);
  if (allValid) {
    console.log('\n🎉 All bug fixes verified in Python/Django report!\n');
  } else {
    console.log('\n⚠️ Some validations failed. Check the report.\n');
  }
  
  // Show key metrics from report
  console.log('📈 Key Report Metrics:');
  const scoreMatch = report.match(/\*\*Overall Score: (\d+)\/100/);
  const gradeMatch = report.match(/Grade: ([A-F][+-]?)/);
  const decisionMatch = report.match(/PR Decision: ([✅❌].*)/);
  
  if (scoreMatch) console.log(`   Overall Score: ${scoreMatch[1]}/100`);
  if (gradeMatch) console.log(`   Grade: ${gradeMatch[1]}`);
  if (decisionMatch) console.log(`   Decision: ${decisionMatch[1].substring(0, 50)}...`);
  
  // Calculate score impact
  const criticalImpact = (newByLevel.critical * 20) + (existingByLevel.critical * 20);
  const highImpact = (newByLevel.high * 10) + (existingByLevel.high * 10);
  const mediumImpact = (newByLevel.medium * 5) + (existingByLevel.medium * 5);
  const lowImpact = (newByLevel.low * 2) + (existingByLevel.low * 2);
  const totalImpact = criticalImpact + highImpact + mediumImpact + lowImpact;
  
  console.log(`\n   Score Impact Breakdown:`);
  console.log(`     Critical issues: -${criticalImpact} points`);
  console.log(`     High issues: -${highImpact} points`);
  console.log(`     Medium issues: -${mediumImpact} points`);
  console.log(`     Low issues: -${lowImpact} points`);
  console.log(`     Total Impact: -${totalImpact} points\n`);
  
  console.log('📋 Report Preview (Breaking Changes Section):');
  console.log('─'.repeat(50));
  
  // Extract and show breaking changes section
  const breakingStart = report.indexOf('## 6. Breaking Changes');
  const breakingEnd = report.indexOf('---', breakingStart + 10);
  if (breakingStart > -1 && breakingEnd > -1) {
    const breakingSection = report.substring(breakingStart, breakingEnd);
    const lines = breakingSection.split('\n').slice(0, 30);
    console.log(lines.join('\n'));
    console.log('... (section truncated)\n');
  }
  
  console.log('✨ Large Python/Django PR report generation complete!');
  console.log('📌 Model used: Dynamically selected from Supabase (not hardcoded)\n');
}

// Run the generator
if (require.main === module) {
  generateLargePythonReport().catch(console.error);
}