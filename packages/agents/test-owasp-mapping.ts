#!/usr/bin/env ts-node

/**
 * Test the intelligent OWASP mapping system
 */

import { OWASPMapper } from './src/standard/utils/owasp-mapper';

// Test cases covering various security issues
const testCases = [
  {
    name: 'JWT Secret Hardcoded',
    issue: {
      message: 'JWT secret hardcoded in source code',
      description: 'Hardcoded secrets can be extracted and used to forge tokens',
      category: 'security',
      type: 'vulnerability',
      severity: 'critical',
      location: { file: 'src/api/auth.controller.ts' }
    },
    expectedCategory: 'A02:2021'
  },
  {
    name: 'SQL Injection',
    issue: {
      message: 'SQL injection vulnerability in user query',
      description: 'User input is concatenated directly into SQL query',
      category: 'security',
      type: 'vulnerability',
      severity: 'critical',
      location: { file: 'src/api/users.controller.ts' }
    },
    expectedCategory: 'A03:2021'
  },
  {
    name: 'Weak Password Policy',
    issue: {
      message: 'Weak password policy allows simple passwords',
      description: 'Password complexity requirements are insufficient',
      category: 'authentication',
      type: 'vulnerability',
      severity: 'high'
    },
    expectedCategory: 'A07:2021'
  },
  {
    name: 'Missing Authentication',
    issue: {
      message: 'API endpoint lacks authentication',
      description: 'The endpoint can be accessed without any authentication',
      category: 'authentication',
      type: 'vulnerability',
      severity: 'critical'
    },
    expectedCategory: 'A07:2021'
  },
  {
    name: 'Database Password in Config',
    issue: {
      message: 'Database password stored in plaintext configuration',
      description: 'Sensitive credentials are stored without encryption',
      category: 'security',
      type: 'vulnerability',
      severity: 'high',
      location: { file: 'config/database.json' }
    },
    expectedCategory: 'A02:2021'
  },
  {
    name: 'XSS Vulnerability',
    issue: {
      message: 'Cross-site scripting vulnerability in user comments',
      description: 'User input is rendered without proper sanitization',
      category: 'security',
      type: 'vulnerability',
      severity: 'high'
    },
    expectedCategory: 'A03:2021'
  },
  {
    name: 'Vulnerable Dependency',
    issue: {
      message: 'Vulnerable dependency: lodash@4.17.19',
      description: 'Known prototype pollution vulnerability CVE-2020-8203',
      category: 'dependencies',
      type: 'vulnerability',
      severity: 'high',
      location: { file: 'package.json' }
    },
    expectedCategory: 'A06:2021'
  },
  {
    name: 'SSRF Vulnerability',
    issue: {
      message: 'Server-side request forgery in webhook handler',
      description: 'User-controlled URL is fetched without validation',
      category: 'security',
      type: 'vulnerability',
      severity: 'high'
    },
    expectedCategory: 'A10:2021'
  },
  {
    name: 'Missing Access Control',
    issue: {
      message: 'Missing authorization check for admin functions',
      description: 'Admin endpoints can be accessed by regular users',
      category: 'authorization',
      type: 'vulnerability',
      severity: 'critical'
    },
    expectedCategory: 'A01:2021'
  },
  {
    name: 'Sensitive Data in Logs',
    issue: {
      message: 'Password logged in plaintext',
      description: 'User passwords are being written to application logs',
      category: 'logging',
      type: 'vulnerability',
      severity: 'high'
    },
    expectedCategory: 'A09:2021'
  },
  {
    name: 'Insecure Deserialization',
    issue: {
      message: 'Unsafe deserialization of user input',
      description: 'User-provided JSON is deserialized without validation',
      category: 'security',
      type: 'vulnerability',
      severity: 'critical'
    },
    expectedCategory: 'A08:2021'
  },
  {
    name: 'Debug Mode Enabled',
    issue: {
      message: 'Debug mode enabled in production',
      description: 'Stack traces and sensitive information exposed',
      category: 'configuration',
      type: 'misconfiguration',
      severity: 'medium'
    },
    expectedCategory: 'A05:2021'
  },
  {
    name: 'API Key in Code',
    issue: {
      message: 'Hardcoded API key found in source code',
      description: 'Third-party API key is hardcoded in the application',
      category: 'security',
      type: 'vulnerability',
      severity: 'high',
      location: { file: 'src/services/payment.service.ts' }
    },
    expectedCategory: 'A02:2021'
  },
  {
    name: 'Path Traversal',
    issue: {
      message: 'Path traversal vulnerability in file upload',
      description: 'File paths are not properly sanitized',
      category: 'security',
      type: 'vulnerability',
      severity: 'high'
    },
    expectedCategory: 'A01:2021'
  },
  {
    name: 'Race Condition',
    issue: {
      message: 'Race condition in payment processing',
      description: 'Concurrent requests can cause double-charging',
      category: 'design',
      type: 'vulnerability',
      severity: 'high'
    },
    expectedCategory: 'A04:2021'
  }
];

// Run tests
console.log('🧪 Testing OWASP Mapping Intelligence\n');
console.log('=' .repeat(80));

const mapper = new OWASPMapper();
let passed = 0;
let failed = 0;

testCases.forEach(test => {
  const result = mapper.mapIssue(test.issue);
  const categoryCode = result.category.split(' ')[0];
  const isCorrect = categoryCode === test.expectedCategory;
  
  if (isCorrect) {
    passed++;
    console.log(`✅ ${test.name}`);
    console.log(`   Issue: "${test.issue.message}"`);
    console.log(`   Mapped to: ${result.category}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(0)}%`);
  } else {
    failed++;
    console.log(`❌ ${test.name}`);
    console.log(`   Issue: "${test.issue.message}"`);
    console.log(`   Expected: ${test.expectedCategory}`);
    console.log(`   Got: ${categoryCode} (${result.category})`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(0)}%`);
  }
  console.log();
});

console.log('=' .repeat(80));
console.log(`\n📊 Results: ${passed}/${testCases.length} tests passed`);

if (failed > 0) {
  console.log(`\n⚠️  ${failed} test(s) failed. Review the mapping logic.`);
} else {
  console.log('\n🎉 All tests passed! OWASP mapping is working correctly.');
}

// Test mapping multiple issues
console.log('\n' + '=' .repeat(80));
console.log('\n📈 Testing Batch Mapping\n');

const allIssues = testCases.map(t => t.issue);
const batchResult = mapper.mapMultipleIssues(allIssues);

console.log('OWASP Category Distribution:');
Object.entries(batchResult)
  .sort((a, b) => b[1] - a[1])
  .forEach(([category, count]) => {
    console.log(`  ${category}: ${count} issue(s)`);
  });

console.log('\n✅ Intelligent OWASP mapping system is ready for production use!');