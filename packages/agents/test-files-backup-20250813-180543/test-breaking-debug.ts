#!/usr/bin/env npx ts-node

import { ReportGeneratorV7Fixed } from './src/standard/comparison/report-generator-v7-fixed';

const testData = {
  mainBranchResult: {
    issues: [
      {
        severity: 'high',
        category: 'security',
        message: 'Existing security issue',
        location: { file: 'existing.ts', line: 10 }
      }
    ]
  },
  featureBranchResult: {
    issues: [
      {
        severity: 'critical',
        category: 'security',
        message: 'SQL injection vulnerability',
        location: { file: 'api/auth.ts', line: 45 }
      },
      {
        severity: 'high',
        category: 'api' as any,
        message: 'API response format changed',
        location: { file: 'api/v1/users.ts', line: 123 }
      },
      {
        severity: 'medium',
        category: 'dependencies',
        message: 'Vulnerable dependency detected',
        location: { file: 'package.json', line: 34 }
      }
    ]
  },
  prMetadata: {
    repository: 'test-repo',
    prNumber: '123',
    title: 'Test PR',
    author: 'test-user'
  },
  scanDuration: 30
};

async function testBreaking() {
  const generator = new ReportGeneratorV7Fixed();
  const report = await generator.generateReport(testData as any);
  
  const breakingStart = report.indexOf('## 6. Breaking Changes');
  const breakingEnd = report.indexOf('## 7. Issues Resolved');
  
  console.log('Breaking start index:', breakingStart);
  console.log('Breaking end index:', breakingEnd);
  
  if (breakingStart >= 0 && breakingEnd > breakingStart) {
    const breakingSection = report.substring(breakingStart, breakingEnd);
    console.log('Breaking section length:', breakingSection.length);
    console.log('Breaking section:\n', breakingSection);
    console.log('\nContains "sql injection"?', breakingSection.toLowerCase().includes('sql injection'));
    console.log('Contains "api response"?', breakingSection.toLowerCase().includes('api response'));
  } else {
    console.log('Could not extract breaking section');
    console.log('Full report sections:');
    const sections = report.match(/## \d+\. [^\n]+/g);
    console.log(sections);
  }
}

testBreaking().catch(console.error);