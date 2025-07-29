/**
 * Test DeepWiki Dual Branch Analysis
 * Validates if we can run DeepWiki on both main and feature branches
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

interface TestResult {
  success: boolean;
  mainBranchTime?: number;
  featureBranchTime?: number;
  error?: string;
  reports?: {
    main?: any;
    feature?: any;
  };
}

async function testDualBranchAnalysis(prUrl: string): Promise<TestResult> {
  console.log('🧪 Testing DeepWiki Dual Branch Analysis');
  console.log(`📍 PR URL: ${prUrl}\n`);
  
  // Parse PR URL
  const urlMatch = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!urlMatch) {
    return { success: false, error: 'Invalid GitHub PR URL format' };
  }
  
  const [, owner, repo, prNumber] = urlMatch;
  const repoUrl = `https://github.com/${owner}/${repo}`;
  const testDir = `/tmp/deepwiki-dual-test-${Date.now()}`;
  
  try {
    // Step 1: Clone repository
    console.log('📁 Step 1: Cloning repository...');
    await execAsync(`git clone ${repoUrl} ${testDir}`);
    console.log(`  ✅ Cloned to: ${testDir}`);
    
    // Step 2: Get default branch
    const { stdout: defaultBranch } = await execAsync(
      `cd ${testDir} && git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'`
    );
    const mainBranch = defaultBranch.trim() || 'master';
    console.log(`  ✅ Default branch: ${mainBranch}`);
    
    // Step 3: Run DeepWiki on main branch
    console.log('\n🔍 Step 3: Running DeepWiki on main branch...');
    const mainStartTime = Date.now();
    
    // TODO: Replace with actual DeepWiki API call
    // For now, simulate with a mock
    console.log('  ⚠️  DeepWiki API not yet integrated - using mock');
    const mainReport = {
      branch: mainBranch,
      timestamp: new Date().toISOString(),
      analysis: {
        security: { score: 8.5, issues: 12 },
        codeQuality: { score: 7.2, issues: 45 },
        architecture: { score: 9.1, patterns: ['MVC', 'Singleton'] }
      }
    };
    
    const mainBranchTime = Date.now() - mainStartTime;
    console.log(`  ✅ Main branch analysis completed in ${mainBranchTime}ms`);
    
    // Step 4: Fetch and checkout feature branch
    console.log('\n🔄 Step 4: Switching to feature branch...');
    await execAsync(`cd ${testDir} && git fetch origin pull/${prNumber}/head:pr-${prNumber}`);
    await execAsync(`cd ${testDir} && git checkout pr-${prNumber}`);
    console.log(`  ✅ Switched to PR branch: pr-${prNumber}`);
    
    // Step 5: Run DeepWiki on feature branch
    console.log('\n🔍 Step 5: Running DeepWiki on feature branch...');
    const featureStartTime = Date.now();
    
    // TODO: Replace with actual DeepWiki API call
    const featureReport = {
      branch: `pr-${prNumber}`,
      timestamp: new Date().toISOString(),
      analysis: {
        security: { score: 8.2, issues: 14 }, // Worse than main
        codeQuality: { score: 7.5, issues: 42 }, // Better than main
        architecture: { score: 9.0, patterns: ['MVC', 'Singleton', 'Observer'] } // Added pattern
      }
    };
    
    const featureBranchTime = Date.now() - featureStartTime;
    console.log(`  ✅ Feature branch analysis completed in ${featureBranchTime}ms`);
    
    // Step 6: Compare results
    console.log('\n📊 Step 6: Comparing results...');
    console.log('\n  Main Branch:');
    console.log(`    Security: ${mainReport.analysis.security.score} (${mainReport.analysis.security.issues} issues)`);
    console.log(`    Code Quality: ${mainReport.analysis.codeQuality.score} (${mainReport.analysis.codeQuality.issues} issues)`);
    
    console.log('\n  Feature Branch:');
    console.log(`    Security: ${featureReport.analysis.security.score} (${featureReport.analysis.security.issues} issues)`);
    console.log(`    Code Quality: ${featureReport.analysis.codeQuality.score} (${featureReport.analysis.codeQuality.issues} issues)`);
    
    console.log('\n  Changes:');
    console.log(`    Security: ${featureReport.analysis.security.score - mainReport.analysis.security.score > 0 ? '✅' : '❌'} ${(featureReport.analysis.security.score - mainReport.analysis.security.score).toFixed(1)}`);
    console.log(`    Code Quality: ${featureReport.analysis.codeQuality.score - mainReport.analysis.codeQuality.score > 0 ? '✅' : '❌'} ${(featureReport.analysis.codeQuality.score - mainReport.analysis.codeQuality.score).toFixed(1)}`);
    console.log(`    New Issues: ${featureReport.analysis.security.issues - mainReport.analysis.security.issues}`);
    
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
    
    return {
      success: true,
      mainBranchTime,
      featureBranchTime,
      reports: {
        main: mainReport,
        feature: featureReport
      }
    };
    
  } catch (error: any) {
    console.error('❌ Test failed:', error);
    
    // Cleanup on error
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Test with DeepWiki chat simulation
async function testDeepWikiChat(mainReport: any, featureReport: any) {
  console.log('\n\n🤖 Testing DeepWiki Chat Capabilities...\n');
  
  // Simulate chat questions
  const questions = [
    "What security issues were introduced in this PR?",
    "Are there any architectural regressions?",
    "What's the overall risk level of these changes?",
    "What testing should be prioritized?"
  ];
  
  console.log('📝 Simulated Chat Session:\n');
  
  for (const question of questions) {
    console.log(`Q: ${question}`);
    
    // Simulate intelligent response based on diff
    if (question.includes("security")) {
      const newIssues = featureReport.analysis.security.issues - mainReport.analysis.security.issues;
      console.log(`A: This PR introduces ${newIssues} new security issues. The security score decreased from ${mainReport.analysis.security.score} to ${featureReport.analysis.security.score}.\n`);
    } else if (question.includes("architectural")) {
      const newPatterns = featureReport.analysis.architecture.patterns.filter(
        (p: string) => !mainReport.analysis.architecture.patterns.includes(p)
      );
      console.log(`A: The PR introduces ${newPatterns.length} new architectural patterns: ${newPatterns.join(', ')}. Architecture score changed from ${mainReport.analysis.architecture.score} to ${featureReport.analysis.architecture.score}.\n`);
    } else if (question.includes("risk level")) {
      const securityDelta = featureReport.analysis.security.score - mainReport.analysis.security.score;
      const risk = securityDelta < -0.5 ? "HIGH" : securityDelta < 0 ? "MEDIUM" : "LOW";
      console.log(`A: Based on the security score decrease and new issues introduced, the risk level is ${risk}.\n`);
    } else if (question.includes("testing")) {
      console.log(`A: Focus testing on:\n   1. Security vulnerabilities (${featureReport.analysis.security.issues - mainReport.analysis.security.issues} new issues)\n   2. New architectural patterns\n   3. Areas with decreased code quality scores\n`);
    }
  }
}

// Main execution
const prUrl = process.argv[2] || 'https://github.com/expressjs/express/pull/5500';

testDualBranchAnalysis(prUrl)
  .then(async (result) => {
    if (result.success && result.reports) {
      console.log('\n✅ Dual branch analysis test completed successfully!');
      console.log(`\n⏱️  Performance:`);
      console.log(`  Main branch: ${result.mainBranchTime}ms`);
      console.log(`  Feature branch: ${result.featureBranchTime}ms`);
      console.log(`  Total: ${(result.mainBranchTime! + result.featureBranchTime!) / 1000}s`);
      
      // Test chat capabilities
      await testDeepWikiChat(result.reports.main, result.reports.feature);
      
      console.log('\n💡 Next Steps:');
      console.log('  1. Integrate actual DeepWiki API');
      console.log('  2. Implement Vector DB storage for reports');
      console.log('  3. Build chat integration');
      console.log('  4. Create diff analysis logic');
    } else {
      console.log('\n❌ Test failed:', result.error);
    }
  })
  .catch((error) => {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  });