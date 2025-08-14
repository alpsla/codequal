#!/usr/bin/env npx ts-node

import { ReportGeneratorV7Fixed } from './src/standard/comparison/report-generator-v7-fixed';
import { identifyBreakingChanges } from './src/standard/comparison/report-fixes';

const testData = {
  mainBranchResult: {
    issues: [
      {
        id: 'existing-1',
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
        id: 'new-1',
        severity: 'critical',
        category: 'security',
        message: 'SQL injection vulnerability',
        location: { file: 'api/auth.ts', line: 45 }
      },
      {
        id: 'new-2',
        severity: 'high',
        category: 'api' as any,
        message: 'API response format changed',
        location: { file: 'api/v1/users.ts', line: 123 }
      },
      {
        id: 'new-3',
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

async function testBreakingChanges() {
  const generator = new ReportGeneratorV7Fixed();
  const report = await generator.generateReport(testData as any);
  
  // Check breaking changes section
  const breakingSection = report.substring(
    report.indexOf('## 6. Breaking Changes'),
    report.indexOf('## 7. Issues Resolved')
  );
  
  console.log('Breaking Changes Section:');
  console.log(breakingSection);
  console.log('\n');
  
  // Test the function directly
  const breakingChanges = identifyBreakingChanges(testData.featureBranchResult.issues as any);
  console.log('Breaking changes identified:', breakingChanges.length);
  console.log('SQL injection included?', breakingChanges.some((i: any) => i.message.includes('SQL')));
  console.log('API change included?', breakingChanges.some((i: any) => i.message.includes('API')));
}

testBreakingChanges().catch(console.error);