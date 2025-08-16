/**
 * Direct Comparison Agent Test with Real/Mock DeepWiki Data
 * 
 * This test validates the comparison agent flow:
 * - Using DeepWiki analysis results (real or mock)
 * - Comparison agent generating full report
 * - Validating complete report generation
 */

import { ComparisonAgent } from '../../../comparison/comparison-agent';
import { DeepWikiAnalysisResult } from '../../../types/analysis-types';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';

// Load environment variables
dotenv.config();

// Real PR for testing
const TEST_PR_URL = 'https://github.com/facebook/react/pull/31616';
const TEST_REPO_URL = 'https://github.com/facebook/react';
const TEST_PR_NUMBER = 31616;

// Check if we should use real DeepWiki
const USE_REAL_DEEPWIKI = process.env.USE_DEEPWIKI_MOCK === 'false';

// Create realistic mock DeepWiki result
function createRealisticDeepWikiResult(branch: string): DeepWikiAnalysisResult {
  const isMainBranch = branch === 'main';
  
  return {
    score: isMainBranch ? 75 : 82,
    issues: [
      {
        id: `${branch}-sec-001`,
        category: 'security' as const,
        severity: 'high' as const,
        location: {
          file: 'packages/react-reconciler/src/ReactFiberWorkLoop.js',
          line: 1247,
          column: 10
        },
        message: 'Potential race condition in concurrent rendering could lead to state corruption'
      },
      {
        id: `${branch}-perf-001`,
        category: 'performance' as const,
        severity: 'medium' as const,
        location: {
          file: 'packages/react-dom/src/client/ReactDOMHostConfig.js',
          line: 523,
          column: 5
        },
        message: 'Inefficient DOM manipulation in hydration path causing unnecessary reflows'
      },
      {
        id: `${branch}-arch-001`,
        category: 'architecture' as const,
        severity: 'medium' as const,
        location: {
          file: 'packages/react-reconciler/src/ReactFiberBeginWork.js',
          line: 892,
          column: 15
        },
        message: 'Component update logic has high cyclomatic complexity'
      },
      ...(isMainBranch ? [] : [
        {
          id: `${branch}-quality-001`,
          category: 'code-quality' as const,
          severity: 'low' as const,
          location: {
            file: 'packages/react/src/ReactHooks.js',
            line: 89,
            column: 12
          },
          message: 'Complex conditional logic could be simplified using early returns'
        },
        {
          id: `${branch}-deps-001`,
          category: 'dependencies' as const,
          severity: 'low' as const,
          location: {
            file: 'package.json',
            line: 45,
            column: 5
          },
          message: 'Development dependency "prettier" has a newer version available'
        }
      ])
    ],
    summary: `DeepWiki analysis of ${branch} branch completed. Found ${isMainBranch ? 3 : 5} issues requiring attention.`,
    metadata: {
      files_analyzed: 487,
      total_lines: 52341,
      scan_duration: 45000
    }
  };
}

// Call real DeepWiki API if available
async function getRealDeepWikiAnalysis(repoUrl: string, branch: string): Promise<DeepWikiAnalysisResult | null> {
  if (!USE_REAL_DEEPWIKI) {
    return null;
  }
  
  console.log(`🔍 Attempting real DeepWiki analysis for ${branch}...`);
  
  try {
    // Try calling the API service
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    const response = await fetch(`${apiUrl}/v1/internal/deepwiki/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': process.env.INTERNAL_API_KEY || 'test-key'
      },
      body: JSON.stringify({ repositoryUrl: repoUrl, branch })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Real DeepWiki analysis completed for ${branch}`);
      return result;
    }
  } catch (error) {
    console.log(`⚠️  Real DeepWiki not available: ${error}`);
  }
  
  return null;
}

// Save report to file
async function saveReport(report: string, filename: string): Promise<string> {
  const reportsDir = path.join(__dirname, '../../reports', 'comparison-agent');
  await fs.mkdir(reportsDir, { recursive: true });
  
  const filepath = path.join(reportsDir, filename);
  await fs.writeFile(filepath, report, 'utf-8');
  console.log(`📄 Report saved to: ${filepath}`);
  
  return filepath;
}

// Main test execution
async function runComparisonAgentTest(): Promise<void> {
  console.log('🧪 Starting Comparison Agent test with PR analysis...');
  console.log('=' .repeat(60) + '\n');
  
  try {
    // Step 1: Get DeepWiki analysis (real or mock)
    console.log('1️⃣ Getting DeepWiki analysis for both branches...');
    
    let mainBranchAnalysis = await getRealDeepWikiAnalysis(TEST_REPO_URL, 'main');
    let featureBranchAnalysis = await getRealDeepWikiAnalysis(TEST_REPO_URL, `pr/${TEST_PR_NUMBER}`);
    
    // Use realistic mocks if real DeepWiki not available
    if (!mainBranchAnalysis) {
      console.log('📦 Using realistic mock for main branch');
      mainBranchAnalysis = createRealisticDeepWikiResult('main');
    }
    
    if (!featureBranchAnalysis) {
      console.log('📦 Using realistic mock for feature branch');
      featureBranchAnalysis = createRealisticDeepWikiResult('feature');
    }
    
    console.log('\n📊 Analysis Summary:');
    console.log(`Main branch: ${mainBranchAnalysis.issues.length} issues, score: ${mainBranchAnalysis.score}`);
    console.log(`Feature branch: ${featureBranchAnalysis.issues.length} issues, score: ${featureBranchAnalysis.score}\n`);
    
    // Step 2: Create comparison agent
    console.log('2️⃣ Creating comparison agent...');
    const logger = {
      debug: (msg: string, data?: any) => console.log(`[DEBUG] ${msg}`, data || ''),
      info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
      warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
      error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || '')
    };
    
    const comparisonAgent = new ComparisonAgent(logger);
    
    // Initialize agent
    await comparisonAgent.initialize({
      language: 'javascript',
      sizeCategory: 'large',
      role: 'comparison',
      prompt: `You are an expert code comparison analyst for the React repository.
Focus on:
- Security vulnerabilities and their impact
- Performance regressions or improvements
- Code quality changes
- Architectural decisions
Provide actionable recommendations for the PR author.`
    });
    
    console.log('✅ Comparison agent initialized\n');
    
    // Step 3: Execute comparison
    console.log('3️⃣ Executing comparison analysis...');
    const startTime = Date.now();
    
    const result = await comparisonAgent.analyze({
      mainBranchAnalysis,
      featureBranchAnalysis,
      prMetadata: {
        id: `pr-${TEST_PR_NUMBER}`,
        number: TEST_PR_NUMBER,
        title: 'Fix: Suspend while recovering from hydration errors',
        author: 'acdlite',
        repository_url: TEST_PR_URL,
        created_at: new Date().toISOString(),
        linesAdded: 150,
        linesRemoved: 50
      },
      generateReport: true
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ Comparison completed in ${(duration / 1000).toFixed(2)}s\n`);
    
    // Step 4: Validate results
    console.log('4️⃣ Validating results...');
    
    if (!result.success) {
      throw new Error('Comparison agent returned unsuccessful result');
    }
    
    if (!result.report && !result.prComment) {
      throw new Error('No report or PR comment generated');
    }
    
    if (!result.comparison) {
      throw new Error('No comparison data in result');
    }
    
    console.log('✅ All validations passed\n');
    
    // Step 5: Display results
    console.log('📊 Comparison Results:');
    console.log('=' .repeat(60));
    console.log(`Success: ${result.success}`);
    console.log(`Report Generated: ${result.report ? 'Yes' : 'No'}`);
    console.log(`PR Comment Generated: ${result.prComment ? 'Yes' : 'No'}`);
    
    if (result.comparison) {
      console.log(`\nIssue Analysis:`);
      console.log(`- New Issues: ${result.comparison.newIssues?.length || 0}`);
      console.log(`- Resolved Issues: ${result.comparison.resolvedIssues?.length || 0}`);
      console.log(`- Modified Issues: ${result.comparison.modifiedIssues?.length || 0}`);
      
      if (result.comparison.newIssues && result.comparison.newIssues.length > 0) {
        console.log('\nNew Issues Introduced:');
        result.comparison.newIssues.forEach(issue => {
          try {
            console.log(`  - [${issue.severity?.toUpperCase() || 'UNKNOWN'}] ${issue.category || 'unknown'}: ${issue.message || 'No message'}`);
            if (issue.location) {
              console.log(`    Location: ${issue.location.file || 'unknown'}:${issue.location.line || 0}`);
            }
          } catch (e) {
            console.log(`  - Error displaying issue: ${JSON.stringify(issue)}`);
          }
        });
      }
      
      if (result.comparison.resolvedIssues && result.comparison.resolvedIssues.length > 0) {
        console.log('\nIssues Resolved:');
        result.comparison.resolvedIssues.forEach(issue => {
          try {
            console.log(`  - [${issue.severity?.toUpperCase() || 'UNKNOWN'}] ${issue.category || 'unknown'}: ${issue.message || 'No message'}`);
          } catch (e) {
            console.log(`  - Error displaying issue: ${JSON.stringify(issue)}`);
          }
        });
      }
    }
    
    if (result.metadata) {
      console.log(`\nMetadata:`);
      console.log(`- Agent Version: ${result.metadata.agentVersion || 'N/A'}`);
      console.log(`- Model Used: ${result.metadata.modelUsed || 'N/A'}`);
      console.log(`- Format: ${result.metadata.format || 'N/A'}`);
    }
    
    // Display and save reports
    if (result.report) {
      console.log('\n📄 Full Report Preview (first 1500 chars):');
      console.log('=' .repeat(60));
      console.log(result.report.substring(0, 1500) + '...\n');
      
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const reportFile = await saveReport(result.report, `pr-${TEST_PR_NUMBER}-report-${timestamp}.md`);
      console.log(`✅ Full markdown report saved to: ${reportFile}`);
    }
    
    if (result.prComment) {
      console.log('\n💬 PR Comment:');
      console.log('=' .repeat(60));
      console.log(result.prComment);
      console.log('=' .repeat(60));
      
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const commentFile = await saveReport(result.prComment, `pr-${TEST_PR_NUMBER}-comment-${timestamp}.md`);
      console.log(`\n✅ PR comment saved to: ${commentFile}`);
    }
    
    console.log('\n✨ Comparison agent test completed successfully!');
    console.log('✅ Verified: Comparison agent generates complete report and sends it back');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  runComparisonAgentTest().then(() => {
    console.log('\n✅ Test execution completed successfully');
    process.exit(0);
  }).catch((error) => {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  });
}

// Export for Jest
if (typeof describe !== 'undefined') {
  describe('Comparison Agent Real Flow Test', () => {
    it('should generate complete report from DeepWiki analysis', async () => {
      await runComparisonAgentTest();
    }, 120000); // 2 minute timeout
  });
}

export { runComparisonAgentTest };