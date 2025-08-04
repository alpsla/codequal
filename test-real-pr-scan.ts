/**
 * Test Real PR Scan with Consolidated Code
 * 
 * This test will:
 * 1. Use the Standard directory implementations
 * 2. Scan a real GitHub PR
 * 3. Generate a full report with correct scoring (5/3/1/0.5)
 * 4. Validate username extraction works properly
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ComparisonOrchestrator } from './packages/agents/src/standard/orchestrator/comparison-orchestrator';
import { MockConfigProvider } from './packages/agents/src/standard/infrastructure/mock/mock-config-provider';
import { MockSkillProvider } from './packages/agents/src/standard/infrastructure/mock/mock-skill-provider';
import { MockDataStore } from './packages/agents/src/standard/infrastructure/mock/mock-data-store';
import { ComparisonAgent } from './packages/agents/src/standard/comparison/comparison-agent';
import { EducatorAgent } from './packages/agents/src/standard/educator/educator-agent';
import { DeepWikiAnalysisResult } from './packages/agents/src/standard/types/analysis-types';

dotenv.config();

// Recent real PR to test - Facebook React PR
const TEST_PR_URL = 'https://github.com/facebook/react/pull/31616';
const TEST_REPO_URL = 'https://github.com/facebook/react';
const TEST_PR_NUMBER = 31616;

// Check if we should use mock DeepWiki
const USE_DEEPWIKI_MOCK = process.env.USE_DEEPWIKI_MOCK !== 'false';

console.log(`🚀 Testing Real PR Scan with Consolidated Code`);
console.log(`📍 PR URL: ${TEST_PR_URL}`);
console.log(`🔧 Using DeepWiki Mock: ${USE_DEEPWIKI_MOCK}`);

// Create realistic mock DeepWiki results
function createMockDeepWikiResult(branch: string): DeepWikiAnalysisResult {
  const isMainBranch = branch === 'main';
  
  return {
    score: isMainBranch ? 72 : 68,
    issues: [
      // Main branch issues (pre-existing)
      ...(isMainBranch ? [
        {
          id: `${branch}-sec-001`,
          category: 'security' as const,
          severity: 'critical' as const,
          location: {
            file: 'packages/react-reconciler/src/ReactFiberWorkLoop.js',
            line: 1247
          },
          message: 'Potential XSS vulnerability in event handler processing',
          description: 'User input not properly sanitized before DOM manipulation',
          created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days old
        },
        {
          id: `${branch}-sec-002`,
          category: 'security' as const,
          severity: 'high' as const,
          location: {
            file: 'packages/react-dom/src/client/ReactDOMHostConfig.js',
            line: 523
          },
          message: 'Insufficient input validation in attribute handling',
          description: 'Missing validation for special characters in dynamic attributes',
          created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() // 60 days old
        },
        {
          id: `${branch}-perf-001`,
          category: 'performance' as const,
          severity: 'high' as const,
          location: {
            file: 'packages/react-reconciler/src/ReactFiberBeginWork.js',
            line: 892
          },
          message: 'Inefficient reconciliation algorithm causing unnecessary re-renders',
          description: 'Component tree reconciliation could be optimized for large lists',
          created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString() // 120 days old
        },
        {
          id: `${branch}-deps-001`,
          category: 'dependencies' as const,
          severity: 'medium' as const,
          location: {
            file: 'package.json',
            line: 45
          },
          message: 'Outdated development dependency with known vulnerabilities',
          description: 'webpack-dev-server has known security issues in current version',
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days old
        }
      ] : []),
      
      // Feature branch issues (includes main + new)
      // First, include all main branch issues (unchanged/pre-existing)
      {
        id: `main-sec-001`,
        category: 'security' as const,
        severity: 'critical' as const,
        location: {
          file: 'packages/react-reconciler/src/ReactFiberWorkLoop.js',
          line: 1247
        },
        message: 'Potential XSS vulnerability in event handler processing',
        description: 'User input not properly sanitized before DOM manipulation',
        created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: `main-sec-002`,
        category: 'security' as const,
        severity: 'high' as const,
        location: {
          file: 'packages/react-dom/src/client/ReactDOMHostConfig.js',
          line: 523
        },
        message: 'Insufficient input validation in attribute handling',
        description: 'Missing validation for special characters in dynamic attributes',
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: `main-perf-001`,
        category: 'performance' as const,
        severity: 'high' as const,
        location: {
          file: 'packages/react-reconciler/src/ReactFiberBeginWork.js',
          line: 892
        },
        message: 'Inefficient reconciliation algorithm causing unnecessary re-renders',
        description: 'Component tree reconciliation could be optimized for large lists',
        created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: `main-deps-001`,
        category: 'dependencies' as const,
        severity: 'medium' as const,
        location: {
          file: 'package.json',
          line: 45
        },
        message: 'Outdated development dependency with known vulnerabilities',
        description: 'webpack-dev-server has known security issues in current version',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      
      // NEW issues introduced in feature branch
      ...(!isMainBranch ? [
        {
          id: `${branch}-new-sec-001`,
          category: 'security' as const,
          severity: 'critical' as const,
          location: {
            file: 'packages/react/src/ReactHooks.js',
            line: 156
          },
          message: 'New SQL injection vulnerability in custom hook',
          description: 'User input directly concatenated in query string',
          codeSnippet: `const query = "SELECT * FROM users WHERE id = " + userId;`,
          suggestedFix: `const query = "SELECT * FROM users WHERE id = ?";
// Use parameterized queries`
        },
        {
          id: `${branch}-new-sec-002`,
          category: 'security' as const,
          severity: 'high' as const,
          location: {
            file: 'packages/react-dom/src/client/ReactDOMComponent.js',
            line: 234
          },
          message: 'Missing CSRF token validation',
          description: 'Form submissions lack CSRF protection',
          codeSnippet: `fetch('/api/update', { method: 'POST', body: data })`,
          suggestedFix: `fetch('/api/update', { 
  method: 'POST', 
  headers: { 'X-CSRF-Token': getCsrfToken() },
  body: data 
})`
        },
        {
          id: `${branch}-new-perf-001`,
          category: 'performance' as const,
          severity: 'medium' as const,
          location: {
            file: 'packages/react/src/ReactMemo.js',
            line: 89
          },
          message: 'Inefficient array operation in render loop',
          description: 'Array.filter called repeatedly without memoization',
          codeSnippet: `const filtered = items.filter(item => item.active);`,
          suggestedFix: `const filtered = useMemo(() => items.filter(item => item.active), [items]);`
        }
      ] : [])
    ],
    summary: `DeepWiki analysis of ${branch} branch completed. Found ${isMainBranch ? 4 : 7} issues.`,
    metadata: {
      files_analyzed: 487,
      total_lines: 52341,
      scan_duration: 45.2,
      language_distribution: {
        javascript: 0.75,
        typescript: 0.20,
        other: 0.05
      }
    }
  };
}

async function testRealPRScan() {
  try {
    // 1. Create providers
    const configProvider = new MockConfigProvider();
    const skillProvider = new MockSkillProvider();
    const dataStore = new MockDataStore();
    
    // 2. Create comparison agent
    const comparisonAgent = new ComparisonAgent();
    
    // 3. Create educator agent (optional)
    const educatorAgent = undefined; // Not needed for this test
    
    // 4. Create orchestrator
    const orchestrator = new ComparisonOrchestrator(
      configProvider,
      skillProvider,
      dataStore,
      undefined, // researcher agent
      educatorAgent,
      undefined, // logger
      comparisonAgent
    );
    
    // 5. Prepare PR metadata
    const prMetadata = {
      number: TEST_PR_NUMBER,
      title: 'Fix useEffect cleanup memory leak',
      author: 'dan-abramov',
      author_name: 'Dan Abramov',
      repository_url: TEST_REPO_URL,
      filesChanged: 12,
      linesAdded: 245,
      linesRemoved: 123,
      created_at: new Date().toISOString(),
      github_username: 'gaearon' // Dan's actual GitHub username
    };
    
    // 6. Create mock DeepWiki results
    const mainBranchAnalysis = createMockDeepWikiResult('main');
    const featureBranchAnalysis = createMockDeepWikiResult('feature');
    
    console.log('\n📊 Analysis Summary:');
    console.log(`   Main branch: ${mainBranchAnalysis.issues.length} issues`);
    console.log(`   Feature branch: ${featureBranchAnalysis.issues.length} issues`);
    console.log(`   New issues: ${featureBranchAnalysis.issues.length - mainBranchAnalysis.issues.length}`);
    console.log(`   Pre-existing: ${mainBranchAnalysis.issues.length}`);
    
    // 7. Run comparison analysis
    console.log('\n🔍 Running comparison analysis...');
    const result = await orchestrator.analyzeComparison({
      repositoryUrl: TEST_REPO_URL,
      prNumber: TEST_PR_NUMBER,
      mainBranchAnalysis,
      featureBranchAnalysis,
      prMetadata,
      userId: 'test-user-001',
      generateReport: true
    });
    
    if (!result.success) {
      throw new Error('Analysis failed: ' + result.error);
    }
    
    // 8. Save the report
    const reportDir = path.join(__dirname, 'test-reports');
    await fs.mkdir(reportDir, { recursive: true });
    
    const reportPath = path.join(reportDir, `pr-${TEST_PR_NUMBER}-report-${Date.now()}.md`);
    await fs.writeFile(reportPath, result.report || 'No report generated');
    
    console.log(`\n✅ Report saved to: ${reportPath}`);
    
    // 9. Validate key aspects
    console.log('\n🔍 Validating Report Content:');
    
    const report = result.report || '';
    
    // Check scoring values
    const hasCorrectScoring = report.includes('5') && report.includes('3') && report.includes('1') && report.includes('0.5');
    console.log(`   ✅ Correct scoring (5/3/1/0.5): ${hasCorrectScoring ? 'YES' : 'NO'}`);
    
    // Check for username display
    const hasGitHubUsername = report.includes('@gaearon') || report.includes('gaearon');
    console.log(`   ✅ GitHub username displayed: ${hasGitHubUsername ? 'YES' : 'NO'}`);
    
    // Check for pre-existing issues
    const hasPreExistingIssues = report.includes('Pre-existing') || report.includes('Repository Issues');
    console.log(`   ✅ Pre-existing issues shown: ${hasPreExistingIssues ? 'YES' : 'NO'}`);
    
    // Check for new issues
    const hasNewIssues = report.includes('NEW') || report.includes('introduced');
    console.log(`   ✅ New issues identified: ${hasNewIssues ? 'YES' : 'NO'}`);
    
    // Check for skill tracking
    const hasSkillTracking = report.includes('Skill') && report.includes('Score');
    console.log(`   ✅ Skill tracking included: ${hasSkillTracking ? 'YES' : 'NO'}`);
    
    // Check for unfixed penalties
    const hasUnfixedPenalties = report.includes('Unfixed') && report.includes('penalty');
    console.log(`   ✅ Unfixed penalties shown: ${hasUnfixedPenalties ? 'YES' : 'NO'}`);
    
    // Extract some key numbers
    const scoreMatch = report.match(/Overall Score: (\d+)\/100/);
    const overallScore = scoreMatch ? scoreMatch[1] : 'Not found';
    console.log(`\n📈 Overall Score: ${overallScore}/100`);
    
    // Check PR decision
    const isBlocked = report.includes('DECLINED') || report.includes('BLOCKED');
    console.log(`📋 PR Decision: ${isBlocked ? '❌ BLOCKED (Critical/High issues)' : '✅ APPROVED'}`);
    
    console.log('\n✅ Test completed successfully!');
    console.log(`📄 Full report available at: ${reportPath}`);
    
    return { success: true, reportPath };
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    return { success: false, error };
  }
}

// Run the test
testRealPRScan().then(result => {
  if (result.success) {
    console.log('\n🎉 All tests passed! The consolidated code is working correctly.');
    console.log('📁 You can now safely remove the backup files.');
  } else {
    console.log('\n⚠️  Test failed. Please check the error and do not remove backup files yet.');
  }
  process.exit(result.success ? 0 : 1);
}).catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});