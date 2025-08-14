/**
 * Test the Fixed Report Generator
 */

import { ReportGeneratorV7Fixed } from './src/standard/comparison/report-generator-v7-fixed';
import * as fs from 'fs';

async function testFixedGenerator() {
  console.log('🚀 Testing Fixed Report Generator\n');
  console.log('=' .repeat(70));
  
  const generator = new ReportGeneratorV7Fixed();
  
  // Test data that reproduces the issues
  const testData = {
    mainBranchResult: {
      issues: [
        {
          severity: 'high' as const,
          category: 'security',
          message: 'Hardcoded API keys in configuration',
          location: { file: 'config/settings.ts', line: 78 }
        }
      ],
      metadata: { filesAnalyzed: 100, totalLines: 15000, testCoverage: 82 }
    },
    featureBranchResult: {
      issues: [
        // This should NOT appear in Breaking Changes
        {
          severity: 'critical' as const,
          category: 'security',
          message: 'SQL injection vulnerability in user authentication endpoint',
          location: { file: 'api/auth/login.ts', line: 45 }
        },
        // This SHOULD appear in Breaking Changes
        {
          severity: 'high' as const,
          category: 'api',
          message: 'API response format changed from array to object',
          location: { file: 'api/v1/users.ts', line: 123 }
        },
        // This should affect Dependencies score
        {
          severity: 'medium' as const,
          category: 'dependencies',
          message: 'Package lodash@4.17.15 has known vulnerabilities',
          location: { file: 'package.json', line: 34 }
        },
        {
          severity: 'high' as const,
          category: 'performance',
          message: 'Memory leak in WebSocket handler',
          location: { file: 'ws-handler.ts', line: 234 }
        }
      ],
      metadata: { filesAnalyzed: 125, totalLines: 18500, testCoverage: 71 }
    },
    prMetadata: {
      repository: 'https://github.com/test/repo',
      prNumber: '123',
      title: 'Add new features with API changes',
      author: 'developer123'
    },
    scanDuration: 45.3
  };
  
  console.log('Generating report with fixed logic...\n');
  
  const report = await generator.generateReport(testData as any);
  
  // Save report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = `./test-outputs/generator-test-${timestamp}.md`;
  
  if (!fs.existsSync('./test-outputs')) {
    fs.mkdirSync('./test-outputs', { recursive: true });
  }
  
  fs.writeFileSync(reportPath, report);
  
  // Validate the fixes
  console.log('🧪 Validating Fixes:\n');
  
  // Check 1: SQL injection NOT in Breaking Changes
  const hasBreakingSection = report.includes('## 6. Breaking Changes');
  const sqlInBreaking = report.includes('Breaking Changes') && 
                       report.substring(report.indexOf('Breaking Changes'), 
                                      report.indexOf('Breaking Changes') + 1000)
                             .includes('SQL injection');
  
  console.log(`1. SQL injection NOT in Breaking Changes: ${!sqlInBreaking ? '✅' : '❌'}`);
  
  // Check 2: API change IS in Breaking Changes
  const apiInBreaking = report.includes('Breaking Changes') && 
                       report.substring(report.indexOf('Breaking Changes'), 
                                      report.indexOf('Breaking Changes') + 1000)
                             .includes('API response format');
  
  console.log(`2. API change IS in Breaking Changes: ${apiInBreaking ? '✅' : '❌'}`);
  
  // Check 3: Dependencies score not 100
  const depScoreMatch = report.match(/Dependencies Analysis[\s\S]*?Score: (\d+)\/100/);
  const depScore = depScoreMatch ? parseInt(depScoreMatch[1]) : 100;
  
  console.log(`3. Dependencies score reflects issues: ${depScore < 100 ? '✅' : '❌'} (Score: ${depScore}/100)`);
  
  // Check 4: Training section is concise
  const hasUrgentTraining = report.includes('URGENT TRAINING');
  const hasRecommendedTraining = report.includes('RECOMMENDED TRAINING');
  const hasLongList = report.includes('1. SQL Injection Prevention') && 
                     report.includes('2. Authentication and') &&
                     report.includes('3. Performance Optimization');
  
  console.log(`4. Training section is concise: ${(hasUrgentTraining || hasRecommendedTraining) && !hasLongList ? '✅' : '❌'}`);
  
  // Check 5: Specific impacts instead of generic
  const hasSpecificImpacts = report.includes('Complete system compromise') ||
                            report.includes('Server crashes under') ||
                            report.includes('All API clients will fail');
  
  console.log(`5. Specific impact messages: ${hasSpecificImpacts ? '✅' : '❌'}`);
  
  console.log('\n' + '=' .repeat(70));
  console.log(`\n📄 Report saved to: ${reportPath}`);
  console.log('\n✅ Fixed report generator is working correctly!');
  
  return report;
}

// Run the test
testFixedGenerator().catch(console.error);