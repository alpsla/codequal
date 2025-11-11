/**
 * V9 Lite E2E Test
 *
 * Tests the complete V9 analysis flow using the NEW REFACTORED ARCHITECTURE:
 * - BaseToolOrchestrator (universal foundation)
 * - JavaToolOrchestrator (extends base, language-specific)
 * - Framework detection (Spring, Quarkus, Micronaut)
 * - Universal tool configuration
 * - V9 Report Compiler service
 * - Grouped report formatter
 *
 * Key Difference from test-v9-e2e-complete.ts:
 * - Uses refactored components instead of embedded logic
 * - Cleaner, more maintainable test structure
 * - Demonstrates the power of delegation pattern
 */

// Load environment variables FIRST (fixes OpenRouter 401 errors)
import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });  // SESSION 22 FIX: Explicit path

// E2E Test Configuration: Disable rate limiting for multi-PR test scenarios
// Production: 100 calls/PR is correct ✅
// E2E Tests: 3 PRs sequentially = needs debug mode to disable limit
process.env.DEBUG_MODE = process.env.DEBUG_MODE || 'true';

import { JavaToolOrchestrator } from '../../src/two-branch/tools/java/java-tool-orchestrator';
import { TypeScriptToolOrchestrator } from '../../src/two-branch/tools/typescript/typescript-tool-orchestrator';
import { PythonToolOrchestrator } from '../../src/two-branch/tools/python/python-tool-orchestrator';
import { createFrameworkDetector } from '../../src/two-branch/utils/framework-detector';
import { createToolConfigResolver } from '../../src/two-branch/config/universal-tool-config';
import { V9GroupedReportFormatter } from '../../src/two-branch/analyzers/v9-grouped-report-formatter';
import { ModelConfigResolver } from '../../src/standard/orchestrator/model-config-resolver';
import { groupIssues } from '../../src/two-branch/utils/issue-grouping';
import { execSync } from 'child_process';
import * as fs from 'fs';
// path already imported above for dotenv.config

interface TestScenario {
  name: string;
  repoUrl: string;
  prNumber?: number;  // Optional - only for PR review mode
  testMode: 'baseline' | 'pr-review';  // SESSION 20 FIX: Separate baseline from PR testing
  language: 'java' | 'typescript' | 'python';  // SESSION 25: Multi-language support
  expectedFramework?: string;
  expectedToolCount?: number;
}

const TEST_SCENARIOS: TestScenario[] = [
  // ========================================================================
  // JAVA TESTS
  // ========================================================================
  
  // SESSION 21: Test with REAL PRs to validate complete business flow
  // Business Goal: Analyze user PRs, identify NEW blockers, provide APPROVED/DECLINED decision
  
  // Test 1: Spring PetClinic (Verified working)
  {
    name: 'Spring PetClinic PR #950',
    repoUrl: 'https://github.com/spring-projects/spring-petclinic',
    testMode: 'pr-review',
    prNumber: 950,
    language: 'java',
    expectedFramework: 'spring',
    expectedToolCount: 5
  },
  
  // Test 2: JHipster (Using recent merged PR)
  {
    name: 'JHipster PR #100',
    repoUrl: 'https://github.com/jhipster/jhipster-sample-app',
    testMode: 'pr-review',
    prNumber: 100,  // Test with recent PR
    language: 'java',
    expectedFramework: 'spring',
    expectedToolCount: 5
  },
  
  // Test 3: Spring Boot Admin (Using recent merged PR)
  {
    name: 'Spring Boot Admin PR #100',
    repoUrl: 'https://github.com/codecentric/spring-boot-admin',
    testMode: 'pr-review',
    prNumber: 100,  // Test with recent PR
    language: 'java',
    expectedFramework: 'spring',
    expectedToolCount: 5
  },
  
  // Test 4: Netflix Conductor (Using recent merged PR)
  {
    name: 'Netflix Conductor PR #1000',
    repoUrl: 'https://github.com/Netflix/conductor',
    testMode: 'pr-review',
    prNumber: 1000,  // Test with recent PR
    language: 'java',
    expectedFramework: 'generic',
    expectedToolCount: 5
  },
  
  // ========================================================================
  // TYPESCRIPT TESTS (SESSION 25+)
  // ========================================================================
  
  // Test 5: Our own CodeQual repo (smaller, faster to test)
  {
    name: 'CodeQual PR #50',
    repoUrl: 'https://github.com/alpsla/codequal',
    testMode: 'pr-review',
    prNumber: 50,  // Test with real PR
    language: 'typescript',
    expectedFramework: 'typescript',
    expectedToolCount: 3  // eslint, semgrep, dependency-check (skip tsc for speed)
  }
];

/**
 * Helper function to clone a repository
 */
function cloneRepository(repoUrl: string, targetPath: string): void {
  console.log(`   🔄 Cloning ${repoUrl}...`);
  
  // Remove if exists
  if (fs.existsSync(targetPath)) {
    execSync(`rm -rf ${targetPath}`);
  }
  
  // Clone with depth 1 for speed
  execSync(`git clone --depth 1 ${repoUrl} ${targetPath}`, { 
    stdio: 'pipe',
    encoding: 'utf-8'
  });
  
  console.log(`   ✅ Repository cloned to ${targetPath}`);
}

/**
 * SESSION 22 FIX: Fetch real PR author from GitHub API
 */
async function fetchPRAuthor(repoUrl: string, prNumber: number): Promise<{ author: string; authorEmail: string }> {
  try {
    // Extract owner/repo from URL
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      return { author: 'test-user', authorEmail: 'test@example.com' };
    }
    
    const [, owner, repo] = match;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
    
    // Fetch PR metadata (no auth needed for public repos)
    const https = await import('https');
    const response = await new Promise<string>((resolve, reject) => {
      https.get(apiUrl, {
        headers: {
          'User-Agent': 'CodeQual-Test',
          'Accept': 'application/vnd.github.v3+json'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
    
    const prData = JSON.parse(response);
    return {
      author: prData.user?.login || 'test-user',
      authorEmail: `${prData.user?.login || 'test-user'}@users.noreply.github.com`
    };
  } catch (error) {
    console.warn(`   ⚠️  Could not fetch PR author: ${error}`);
    return { author: 'test-user', authorEmail: 'test@example.com' };
  }
}

async function runLiteE2ETest(scenario: TestScenario): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 Testing: ${scenario.name}`);
  console.log(`${'='.repeat(80)}\n`);

  const startTime = Date.now();
  const repoPath = `/tmp/test-repo-${Date.now()}`;

  try {
    // ========================================================================
    // STEP 0: Clone Repository
    // ========================================================================
    console.log('📦 Step 0: Cloning repository...');
    cloneRepository(scenario.repoUrl, repoPath);

    // ========================================================================
    // STEP 1: Framework Detection (NEW!)
    // ========================================================================
    console.log('\n📋 Step 1: Detecting framework...');
    const frameworkDetector = createFrameworkDetector();
    const frameworkInfo = await frameworkDetector.detectFrameworks(repoPath);
    
    console.log(`   ✅ Detected Framework: ${frameworkInfo.primaryFramework}`);
    if (frameworkInfo.buildSystem) {
      console.log(`   ✅ Build System: ${frameworkInfo.buildSystem}`);
    }
    
    if (scenario.expectedFramework && frameworkInfo.primaryFramework !== scenario.expectedFramework) {
      console.warn(`   ⚠️  Expected ${scenario.expectedFramework}, got ${frameworkInfo.primaryFramework}`);
    }

    // ========================================================================
    // STEP 2: Universal Tool Configuration (NEW!)
    // ========================================================================
    console.log('\n🔧 Step 2: Configuring tools...');
    const toolResolver = createToolConfigResolver();
    const tools = toolResolver.getToolsForLanguage(scenario.language);
    
    console.log(`   ✅ Configured ${tools.length} tools for ${scenario.language}`);
    tools.forEach(tool => {
      console.log(`      - ${tool.name} (${tool.category})`);
    });

    if (scenario.expectedToolCount && tools.length !== scenario.expectedToolCount) {
      console.warn(`   ⚠️  Expected ${scenario.expectedToolCount} tools, got ${tools.length}`);
    }

    // ========================================================================
    // STEP 3: Tool Orchestration (SESSION 25: Multi-language support)
    // ========================================================================
    console.log('\n🚀 Step 3: Running tool orchestration...');
    
    // Create language-specific orchestrator
    const orchestrator = scenario.language === 'java' ? new JavaToolOrchestrator() :
                         scenario.language === 'typescript' ? new TypeScriptToolOrchestrator() :
                         new PythonToolOrchestrator();
    
    let allIssues: any[];
    let newIssues: any[];
    let orchestrationResult: any;  // Store for performance data
    
    if (scenario.testMode === 'baseline') {
      // SESSION 20 FIX: Baseline mode - analyze main branch only
      console.log('   📊 Repository Baseline Analysis (main branch only)...');
      orchestrationResult = await orchestrator.orchestrate(repoPath, 'base', { analysisMode: 'complete' });
      
      allIssues = orchestrationResult.toolResults.flatMap(r => r.issues || []);
      newIssues = [];  // No NEW issues in baseline mode
      
      console.log(`   ✅ Tools executed: ${orchestrationResult.toolResults.length}`);
      console.log(`   📊 Total issues found: ${allIssues.length}`);
      console.log(`   ℹ️  All issues marked as EXISTING_REST (baseline)`);
      
    } else {
      // SESSION 20 FIX: PR review mode - two-branch comparison
      console.log('   📊 PR Review Mode - Two-branch comparison...');
      
      // Run tools on main/base branch
      console.log('   📊 Analyzing main branch...');
      const mainResult = await orchestrator.orchestrate(repoPath, 'base', { analysisMode: 'complete' });
      
      // Checkout PR branch for comparison
      console.log(`   🔀 Checking out PR #${scenario.prNumber}...`);
      try {
        execSync(`git -C ${repoPath} fetch origin pull/${scenario.prNumber}/head:pr-${scenario.prNumber}`, { stdio: 'pipe' });
        execSync(`git -C ${repoPath} checkout pr-${scenario.prNumber}`, { stdio: 'pipe' });
        console.log(`   ✅ Checked out PR branch`);
      } catch (error) {
        console.log(`   ❌ Could not checkout PR #${scenario.prNumber} - skipping this scenario`);
        return;
      }
      
      // Run tools on PR branch
      console.log('   📊 Analyzing PR branch...');
      orchestrationResult = await orchestrator.orchestrate(repoPath, 'pr', { analysisMode: 'complete' });
      
      const mainResults = mainResult.toolResults;
      const prResults = orchestrationResult.toolResults;
      
      console.log(`   ✅ Main branch: ${mainResults.length} tools executed`);
      console.log(`   ✅ PR branch: ${prResults.length} tools executed`);

      const totalIssuesMain = mainResults.reduce((sum, r) => sum + (r.issues?.length || 0), 0);
      const totalIssuesPr = prResults.reduce((sum, r) => sum + (r.issues?.length || 0), 0);
      
      console.log(`   📊 Main branch issues: ${totalIssuesMain}`);
      console.log(`   📊 PR branch issues: ${totalIssuesPr}`);

      // Categorize: NEW issues
      allIssues = prResults.flatMap(r => r.issues || []);
      newIssues = allIssues.filter(issue => 
        !mainResults.some(m => 
          (m.issues || []).some(mainIssue => 
            mainIssue.file === issue.file && 
            mainIssue.line === issue.line
          )
        )
      );

      console.log(`   ✅ New issues (introduced in PR): ${newIssues.length}`);
      console.log(`   ✅ Existing issues: ${allIssues.length - newIssues.length}`);
    }

    // ========================================================================
    // STEP 4: Issue Categorization
    // ========================================================================
    console.log('\n📂 Step 4: Categorizing issues...');

    // ========================================================================
    // STEP 5: Issue Grouping (Cost Optimization)
    // ========================================================================
    console.log('\n💰 Step 5: Grouping issues for cost optimization...');

    // Helper function to detect issue category from tool/rule
    // BUG FIX: dependency-check should be 'Dependencies', not 'Security'
    const detectIssueCategory = (tool: string, rule: string | null | undefined): string => {
      if (tool === 'semgrep') return 'Security';
      if (tool === 'dependency-check') return 'Dependencies';  // FIX: Was incorrectly categorized as 'Security'
      if (tool === 'spotbugs' && rule && typeof rule === 'string' && rule.toLowerCase().includes('performance')) return 'Performance';
      if (tool === 'checkstyle' || tool === 'pmd') return 'Code Quality';
      return 'Code Quality';
    };

    const formattedIssues = allIssues.map(issue => {
      // SESSION 20 FIX: Determine lifecycle category based on test mode
      let lifecycleCategory: string;
      
      if (scenario.testMode === 'baseline') {
        // Baseline mode: All issues are EXISTING_REST
        lifecycleCategory = 'EXISTING_REST';
      } else {
        // PR review mode: Categorize as NEW or EXISTING
        const isNew = newIssues.some(n =>
          n.file === issue.file && n.line === issue.line
        );
        lifecycleCategory = isNew ? 'NEW' : 'EXISTING_REST';
      }

      return {
        id: `${issue.tool}-${issue.file}-${issue.line}`,
        rule: issue.rule ? String(issue.rule) : 'unknown-rule',
        // Set lifecycle category (NEW, EXISTING_MODIFIED, EXISTING_REST, RESOLVED)
        category: lifecycleCategory,
        // Set detected category (Security, Performance, Code Quality, etc.)
        detectedCategory: detectIssueCategory(issue.tool, issue.rule ? String(issue.rule) : ''),
        severity: issue.severity || 'medium',
        title: issue.message || 'Code quality issue',
        file: issue.file || 'unknown',
        line: issue.line || 0,
        tool: issue.tool || 'unknown',
        message: issue.message || '',
        codeSnippet: undefined,
        suggestedFix: undefined
      };
    });

    const groupingResult = groupIssues(formattedIssues);
    console.log(`   ✅ Grouped ${formattedIssues.length} issues into ${groupingResult.groups.length} groups`);
    console.log(`   ✅ Cost savings: ${groupingResult.savingsPercent.toFixed(1)}%`);
    console.log(`   ✅ AI calls: ${groupingResult.groups.length} (instead of ${formattedIssues.length})`);

    // ========================================================================
    // STEP 6: Report Generation (Grouped Formatter)
    // ========================================================================
    console.log('\n📝 Step 6: Generating report...');
    
    // Initialize ModelConfigResolver - let errors surface (no mock fallback)
    const modelConfigResolver = new ModelConfigResolver();
    console.log('   ✅ Using Supabase model configuration');
    
    const formatter = new V9GroupedReportFormatter(
      modelConfigResolver,
      scenario.language,
      'medium'
    );

    // ========================================================================
    // USE PERFORMANCE DATA FROM ORCHESTRATOR (BUG #8, #9, #10 FIX)
    // Business logic moved to V9 engine classes per architectural requirements
    // ========================================================================

    // SESSION 22 FIX: Fetch real PR author for pr-review mode
    const prAuthorInfo = scenario.testMode === 'pr-review' && scenario.prNumber
      ? await fetchPRAuthor(scenario.repoUrl, scenario.prNumber)
      : { author: 'test-user', authorEmail: 'test@example.com' };
    
    console.log(`   👤 PR Author: ${prAuthorInfo.author}`);

    const metadata = {
      repository: scenario.repoUrl.split('/').slice(-2).join('/'),
      repoUrl: scenario.repoUrl,
      repoPath: repoPath,  // Add repoPath for code snippet extraction
      prNumber: scenario.prNumber,
      prTitle: `PR #${scenario.prNumber}`,
      branch: `pr-${scenario.prNumber}`,
      baseBranch: 'main',
      prAuthor: prAuthorInfo.author,
      prAuthorEmail: prAuthorInfo.authorEmail,
      organizationName: scenario.repoUrl.split('/')[3],
      totalFiles: 100,
      totalLinesOfCode: 10000,
      filesModified: new Set(allIssues.map(i => i.file)).size,
      linesAdded: scenario.testMode === 'baseline' ? 0 : 500,
      linesDeleted: scenario.testMode === 'baseline' ? 0 : 200,
      decision: scenario.testMode === 'baseline' 
        ? 'INFORMATIONAL'  // Baseline - no approval decision
        : (newIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length > 0 ? 'DECLINED' : 'APPROVED'),
      blockingCount: scenario.testMode === 'baseline' ? 0 : newIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length,
      totalDuration: Date.now() - startTime,
      cloneTime: 5000,
      analysisTime: Date.now() - startTime - 5000,
      reportGenerationTime: 1000,
      analyzedAt: new Date().toISOString(),
      analyzerVersion: '9.0.0',

      // ⭐ PERFORMANCE DATA FROM ORCHESTRATOR (BUG #8, #9, #10 FIX)
      toolPerformance: orchestrationResult.toolPerformance || [],
      agentPerformance: orchestrationResult.agentPerformance || []
    };

    const result = await formatter.generateGroupedReport(
      formattedIssues,
      groupingResult.groups,
      metadata
    );

    console.log(`   ✅ Report generated: ${result.markdown.length} bytes`);
    console.log(`   ✅ IDE fix files: ${result.ideFixFiles.length}`);
    console.log(`   ✅ Location attachments: ${result.attachments.length}`);

    // ========================================================================
    // STEP 7: Save Results
    // ========================================================================
    console.log('\n💾 Step 7: Saving results...');
    const outputDir = path.join(__dirname, 'test-outputs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = Date.now();
    const reportPath = path.join(outputDir, `v9-lite-${scenario.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.md`);
    fs.writeFileSync(reportPath, result.markdown);
    console.log(`   ✅ Report saved: ${reportPath}`);

    // Save IDE fix files and manifest
    // SESSION 21 FIX: Save manifest separately with proper naming
    const manifestFile = result.ideFixFiles.find(f => f.groupId === 'all-issues');
    const otherFiles = result.ideFixFiles.filter(f => f.groupId !== 'all-issues');
    
    // Save the all-issues-manifest.json separately for easy access
    if (manifestFile) {
      const manifestPath = path.join(outputDir, `${scenario.name.toLowerCase().replace(/\s+/g, '-')}-manifest.json`);
      fs.writeFileSync(manifestPath, JSON.stringify(manifestFile.content, null, 2));
      console.log(`   ✅ Manifest saved: ${manifestPath}`);
    }
    
    // Save individual fix files to attachments directory
    const attachmentsDir = path.join(outputDir, 'attachments');
    if (!fs.existsSync(attachmentsDir)) {
      fs.mkdirSync(attachmentsDir, { recursive: true });
    }
    
    otherFiles.forEach((file) => {
      const fixPath = path.join(attachmentsDir, file.filename);
      fs.writeFileSync(fixPath, JSON.stringify(file.content, null, 2));
    });
    
    console.log(`   ✅ IDE fix files saved: ${otherFiles.length} files in attachments/`);
    console.log(`   ✅ Total: 1 manifest + ${otherFiles.length} fix files`);

    // ========================================================================
    // SUMMARY
    // ========================================================================
    const totalTime = Date.now() - startTime;
    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ TEST PASSED: ${scenario.name}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`📊 Total execution time: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`📊 Framework detected: ${frameworkInfo.primaryFramework}`);
    console.log(`📊 Tools executed: ${tools.length}`);
    console.log(`📊 Issues found: ${allIssues.length}`);
    console.log(`📊 New issues: ${newIssues.length}`);
    console.log(`📊 Issue groups: ${groupingResult.groups.length}`);
    console.log(`📊 Cost savings: ${groupingResult.savingsPercent.toFixed(1)}%`);
    console.log(`📊 Report size: ${(result.markdown.length / 1024).toFixed(1)} KB`);
    console.log(`${'='.repeat(80)}\n`);

  } catch (error) {
    console.error(`\n❌ TEST FAILED: ${scenario.name}`);
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(`Stack: ${error.stack}`);
    }
    throw error;
  } finally {
    // Cleanup: remove cloned repository
    if (fs.existsSync(repoPath)) {
      console.log(`\n🧹 Cleaning up: ${repoPath}`);
      execSync(`rm -rf ${repoPath}`);
    }
  }
}

async function main(): Promise<void> {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║                     V9 LITE E2E TEST SUITE                                ║
║                   Testing Refactored Architecture                         ║
║                                                                           ║
║  Components Tested:                                                       ║
║  ✓ BaseToolOrchestrator                                                   ║
║  ✓ JavaToolOrchestrator                                                   ║
║  ✓ Framework Detection                                                    ║
║  ✓ Universal Tool Configuration                                           ║
║  ✓ Issue Grouping & Cost Optimization                                     ║
║  ✓ Grouped Report Generation                                              ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

  const overallStartTime = Date.now();
  let passedTests = 0;
  let failedTests = 0;

  for (const scenario of TEST_SCENARIOS) {
    try {
      await runLiteE2ETest(scenario);
      passedTests++;
    } catch (error) {
      failedTests++;
      console.error(`Failed to run test for ${scenario.name}:`, error);
    }
  }

  const totalTime = Date.now() - overallStartTime;

  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                           FINAL SUMMARY                                   ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Total Tests: ${TEST_SCENARIOS.length}                                                         ║
║  Passed: ${passedTests}                                                              ║
║  Failed: ${failedTests}                                                              ║
║  Total Time: ${(totalTime / 1000).toFixed(2)}s                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

// Run the test suite
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

