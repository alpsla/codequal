#!/usr/bin/env ts-node
/**
 * Generate a complete V8 HTML report for validation
 */

import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import * as fs from 'fs';
import * as path from 'path';

async function generateV8Report() {
  console.log('🎯 Generating V8 Analysis Report...');
  
  const v8Generator = new ReportGeneratorV8Final();
  
  // Comprehensive mock data that represents a real PR analysis
  const analysisData = {
    repositoryUrl: 'https://github.com/sindresorhus/ky',
    prNumber: 700,
    prTitle: 'Add retry mechanism with jitter for failed requests',
    prAuthor: 'sindresorhus',
    prDescription: 'Implements exponential backoff with jitter to prevent thundering herd problem in retry logic',
    branch: 'refs/pull/700/head',
    mainBranchFindings: [
      // Security Issues
      {
        id: 'SEC-001',
        type: 'security',
        category: 'security',
        severity: 'high',
        title: 'Missing input validation in request handler',
        description: 'The request handler accepts user input without proper validation, potentially allowing injection attacks',
        file: 'source/core/Ky.ts',
        line: 145,
        column: 12,
        impact: 'Could allow malicious payloads to be processed, leading to XSS or injection vulnerabilities',
        recommendation: 'Implement comprehensive input validation using a schema validator like Zod',
        confidence: 0.92,
        tool: 'deepwiki',
        ruleId: 'CWE-20'
      },
      {
        id: 'SEC-002',
        type: 'security',
        category: 'security',
        severity: 'medium',
        title: 'Sensitive data in error messages',
        description: 'Error responses may leak sensitive information about the system',
        file: 'source/errors.ts',
        line: 78,
        column: 8,
        impact: 'Information disclosure that could aid attackers',
        recommendation: 'Sanitize error messages before sending to clients',
        confidence: 0.85,
        tool: 'deepwiki',
        ruleId: 'CWE-209'
      },
      // Performance Issues
      {
        id: 'PERF-001',
        type: 'performance',
        category: 'performance',
        severity: 'high',
        title: 'Inefficient retry logic causing delays',
        description: 'Current retry mechanism uses pure exponential backoff without jitter, causing synchronized retries',
        file: 'source/utils/retry.ts',
        line: 23,
        column: 4,
        impact: 'Can cause thundering herd problem under high load',
        recommendation: 'Add jitter to exponential backoff algorithm',
        confidence: 0.88,
        tool: 'deepwiki'
      },
      {
        id: 'PERF-002',
        type: 'performance',
        category: 'performance',
        severity: 'medium',
        title: 'Unnecessary object cloning in hot path',
        description: 'Deep cloning of request options on every retry attempt',
        file: 'source/core/options.ts',
        line: 156,
        column: 15,
        impact: 'Increased memory usage and CPU cycles',
        recommendation: 'Use shallow clone or immutable updates',
        confidence: 0.79,
        tool: 'deepwiki'
      },
      // Code Quality Issues
      {
        id: 'QUAL-001',
        type: 'code-quality',
        category: 'code-quality',
        severity: 'medium',
        title: 'Complex function exceeds cognitive complexity threshold',
        description: 'Function normalizeRequestOptions has cyclomatic complexity of 15',
        file: 'source/core/constants.ts',
        line: 8,
        column: 0,
        impact: 'Difficult to maintain and test, prone to bugs',
        recommendation: 'Refactor into smaller, focused functions',
        confidence: 0.95,
        tool: 'deepwiki'
      },
      {
        id: 'QUAL-002',
        type: 'code-quality',
        category: 'code-quality',
        severity: 'low',
        title: 'Magic numbers without constants',
        description: 'Hardcoded timeout values should be defined as named constants',
        file: 'source/utils/timeout.ts',
        line: 34,
        column: 20,
        impact: 'Reduces code readability and maintainability',
        recommendation: 'Define constants like DEFAULT_TIMEOUT_MS',
        confidence: 0.91,
        tool: 'deepwiki'
      },
      // Dependency Issues
      {
        id: 'DEPS-001',
        type: 'dependencies',
        category: 'dependencies',
        severity: 'low',
        title: 'Outdated test dependency',
        description: 'jest is 2 major versions behind latest',
        file: 'package.json',
        line: 45,
        column: 5,
        impact: 'Missing latest features and security patches',
        recommendation: 'Update to jest@29',
        confidence: 0.87,
        tool: 'deepwiki'
      }
    ],
    prBranchFindings: [
      // Fixed issue (not in PR)
      // PERF-001 is fixed
      
      // Remaining issues
      {
        id: 'SEC-001',
        type: 'security',
        category: 'security',
        severity: 'high',
        title: 'Missing input validation in request handler',
        description: 'The request handler accepts user input without proper validation, potentially allowing injection attacks',
        file: 'source/core/Ky.ts',
        line: 145,
        column: 12,
        impact: 'Could allow malicious payloads to be processed, leading to XSS or injection vulnerabilities',
        recommendation: 'Implement comprehensive input validation using a schema validator like Zod',
        confidence: 0.92,
        tool: 'deepwiki',
        ruleId: 'CWE-20'
      },
      {
        id: 'SEC-002',
        type: 'security',
        category: 'security',
        severity: 'medium',
        title: 'Sensitive data in error messages',
        description: 'Error responses may leak sensitive information about the system',
        file: 'source/errors.ts',
        line: 78,
        column: 8,
        impact: 'Information disclosure that could aid attackers',
        recommendation: 'Sanitize error messages before sending to clients',
        confidence: 0.85,
        tool: 'deepwiki',
        ruleId: 'CWE-209'
      },
      {
        id: 'PERF-002',
        type: 'performance',
        category: 'performance',
        severity: 'medium',
        title: 'Unnecessary object cloning in hot path',
        description: 'Deep cloning of request options on every retry attempt',
        file: 'source/core/options.ts',
        line: 156,
        column: 15,
        impact: 'Increased memory usage and CPU cycles',
        recommendation: 'Use shallow clone or immutable updates',
        confidence: 0.79,
        tool: 'deepwiki'
      },
      {
        id: 'QUAL-001',
        type: 'code-quality',
        category: 'code-quality',
        severity: 'medium',
        title: 'Complex function exceeds cognitive complexity threshold',
        description: 'Function normalizeRequestOptions has cyclomatic complexity of 15',
        file: 'source/core/constants.ts',
        line: 8,
        column: 0,
        impact: 'Difficult to maintain and test, prone to bugs',
        recommendation: 'Refactor into smaller, focused functions',
        confidence: 0.95,
        tool: 'deepwiki'
      },
      {
        id: 'QUAL-002',
        type: 'code-quality',
        category: 'code-quality',
        severity: 'low',
        title: 'Magic numbers without constants',
        description: 'Hardcoded timeout values should be defined as named constants',
        file: 'source/utils/timeout.ts',
        line: 34,
        column: 20,
        impact: 'Reduces code readability and maintainability',
        recommendation: 'Define constants like DEFAULT_TIMEOUT_MS',
        confidence: 0.91,
        tool: 'deepwiki'
      },
      // New issues introduced in PR
      {
        id: 'QUAL-003',
        type: 'code-quality',
        category: 'code-quality',
        severity: 'medium',
        title: 'Missing error handling in new retry logic',
        description: 'New retry mechanism does not handle all error cases',
        file: 'source/utils/retry.ts',
        line: 67,
        column: 8,
        impact: 'Could cause unhandled promise rejections',
        recommendation: 'Add try-catch blocks and proper error propagation',
        confidence: 0.83,
        tool: 'deepwiki'
      },
      {
        id: 'DEPS-001',
        type: 'dependencies',
        category: 'dependencies',
        severity: 'low',
        title: 'Outdated test dependency',
        description: 'jest is 2 major versions behind latest',
        file: 'package.json',
        line: 45,
        column: 5,
        impact: 'Missing latest features and security patches',
        recommendation: 'Update to jest@29',
        confidence: 0.87,
        tool: 'deepwiki'
      },
      {
        id: 'DEPS-002',
        type: 'dependencies',
        category: 'dependencies',
        severity: 'medium',
        title: 'Package lock file not updated',
        description: 'package.json modified but package-lock.json not committed',
        file: 'package.json',
        line: 34,
        column: 3,
        impact: 'Could cause version conflicts in CI/CD',
        recommendation: 'Run npm install and commit the lock file',
        confidence: 0.94,
        tool: 'deepwiki'
      },
      // Test Coverage
      {
        id: 'TEST-001',
        type: 'testing',
        category: 'code-quality',
        severity: 'medium',
        title: 'Insufficient test coverage for retry logic',
        description: 'New retry mechanism lacks comprehensive test cases',
        file: 'source/utils/retry.ts',
        line: 45,
        column: 0,
        impact: 'Bugs may go undetected in edge cases',
        recommendation: 'Add unit tests for retry with jitter',
        confidence: 0.89,
        tool: 'deepwiki'
      }
    ],
    models: {
      deepwiki: 'openai/gpt-4o-mini',
      orchestrator: 'openai/gpt-4o-mini',
      comparison: 'openai/gpt-4o',
      educator: 'openai/gpt-3.5-turbo',
      reporter: 'openai/gpt-4o'
    }
  };
  
  // Generate V8 report (which includes HTML)
  const report = await v8Generator.generateReport(analysisData);
  
  // The report already contains the HTML
  const html = report.html || report;
  
  // Save the report
  const reportPath = path.join(__dirname, 'v8-pr-analysis-report.html');
  fs.writeFileSync(reportPath, html);
  
  console.log('✅ V8 Report generated successfully!');
  console.log('📄 Report saved to:', reportPath);
  
  // Save report data if it's an object with data
  if (typeof report === 'object' && report.data) {
    const jsonPath = path.join(__dirname, 'v8-pr-analysis-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report.data, null, 2));
    console.log('📊 JSON data saved to:', jsonPath);
  }
  
  return reportPath;
}

// Run the generator
generateV8Report()
  .then(path => {
    console.log('\n🎉 Report generation complete!');
    console.log('Opening in browser...');
    require('child_process').execSync(`open "${path}"`);
  })
  .catch(error => {
    console.error('❌ Error generating report:', error);
    process.exit(1);
  });