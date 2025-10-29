/**
 * Quick test to verify BUG #89 fix - AI issueDescription now appears in reports
 * Only runs Spring Boot scenario for speed
 */
import dotenv from 'dotenv';
dotenv.config();

import { V9IntegratedAnalyzer } from './src/two-branch/analyzers/v9-integrated-analyzer';
import { V9GroupedReportFormatter } from './src/two-branch/analyzers/v9-grouped-report-formatter';
import { ModelConfigResolver } from './src/standard/orchestrator/model-config-resolver';
import * as fs from 'fs';

const scenario = {
  name: 'Spring Boot',
  repoUrl: 'https://github.com/spring-projects/spring-petclinic',
  baseBranch: 'main',
  prBranch: 'pr-950',
  prNumber: 950,
};

async function testBug89Fix() {
  console.log(`\n🧪 Testing BUG #89 Fix: ${scenario.name}`);
  console.log('='.repeat(70));
  
  const analyzer = new V9IntegratedAnalyzer();
  const repoPath = `/tmp/spring-petclinic-pr${scenario.prNumber}`;
  
  // Analyze PR branch
  const result = await analyzer.analyzeRepository({
    repoUrl: scenario.repoUrl,
    baseBranch: scenario.baseBranch,
    prBranch: scenario.prBranch,
    prNumber: scenario.prNumber,
    language: 'java',
    repoPath,
    skipGitOperations: true
  });
  
  const modelConfigResolver = new ModelConfigResolver();
  const formatter = new V9GroupedReportFormatter(modelConfigResolver, 'java', 'medium');
  
  const metadata = {
    repository: 'spring-projects/spring-petclinic',
    repoUrl: scenario.repoUrl,
    repoPath,
    prNumber: scenario.prNumber,
    prTitle: `PR #${scenario.prNumber}`,
    branch: `pr-${scenario.prNumber}`,
    baseBranch: 'main',
    prAuthor: 'test-user',
    prAuthorEmail: 'test@example.com',
    organizationName: 'spring-projects',
    totalFiles: 100,
    totalLinesOfCode: 10000,
    filesModified: result.issues.length,
    linesAdded: 500,
    linesDeleted: 200,
    changedFiles: new Set(result.issues.map(i => i.file)).size,
    decision: 'PENDING' as const,
    timestamp: new Date().toISOString(),
    duration: 0
  };
  
  const report = await formatter.generateGroupedReport(result.issues, result.groups, metadata);
  
  // Save report
  const outputPath = `./test-outputs/bug89-fix-test-${Date.now()}.md`;
  fs.writeFileSync(outputPath, report);
  console.log(`\n✅ Report saved: ${outputPath}`);
  
  // Check if AI descriptions are present
  const hasAIDescriptions = report.includes('Why does this matter?') || 
                            report.includes('Common causes:') ||
                            report.includes('Business impact:');
  
  console.log(`\n🔍 BUG #89 Verification:`);
  console.log(`   AI-enriched descriptions present: ${hasAIDescriptions ? '✅ YES' : '❌ NO'}`);
  
  if (hasAIDescriptions) {
    console.log('\n🎉 BUG #89 FIX VERIFIED! AI descriptions are working!\n');
  } else {
    console.log('\n⚠️  AI descriptions not found in report. May need more investigation.\n');
  }
}

testBug89Fix().catch(console.error);
