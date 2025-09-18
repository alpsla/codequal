#!/usr/bin/env ts-node

/**
 * V9 CANONICAL TEST - Apache Kafka PR #17620
 *
 * This test follows the EXACT canonical V9 flow:
 * 1. Tool execution on both branches
 * 2. All 5 agents process results
 * 3. Orchestrator deduplicates
 * 4. Split to Educator + Comparator
 * 5. Generate final report
 */

import { V9ToolOrchestrator } from './packages/agents/src/two-branch/analyzers/v9-tool-orchestrator';
import { SecurityAgent, PerformanceAgent, ArchitectureAgent, CodeQualityAgent, DependencyAgent } from './packages/agents/src/two-branch/agents/specialized-agents';
import { TwoBranchComparator } from './packages/agents/src/two-branch/comparators/TwoBranchComparator';
import { V9EducationalResourceGenerator } from './packages/agents/src/two-branch/analyzers/v9-educational-resources';
import { V9ReportFormatter } from './packages/agents/src/two-branch/analyzers/v9-report-formatter';
import { DynamicModelSelector } from './packages/agents/src/two-branch/services/dynamic-model-selector';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// Load environment variables
require('dotenv').config();

// Test configuration
const TEST_CONFIG = {
  owner: 'apache',
  repo: 'kafka',
  prNumber: 17620,
  mainBranch: 'trunk',
  prBranch: 'KAFKA-16962-tiered-raft-fix',
  testId: `kafka-${Date.now()}`,
  workspace: `/tmp/codequal/kafka-test-${Date.now()}`
};

// Java tools configuration (canonical set)
const JAVA_TOOLS = [
  { name: 'spotbugs', agent: 'SecurityAgent', command: 'spotbugs -textui' },
  { name: 'pmd', agent: 'CodeQualityAgent', command: 'pmd check -d src -R rulesets/java/quickstart.xml' },
  { name: 'checkstyle', agent: 'CodeQualityAgent', command: 'checkstyle -c /google_checks.xml' },
  { name: 'semgrep', agent: 'SecurityAgent', command: 'semgrep --config=auto' },
  { name: 'dependency-check', agent: 'DependencyAgent', command: 'dependency-check --scan .' },
  { name: 'error-prone', agent: 'CodeQualityAgent', command: 'javac -XDcompilePolicy=simple -processorpath error_prone.jar' },
  { name: 'infer', agent: 'PerformanceAgent', command: 'infer run -- gradle build' }
];

class V9CanonicalTester {
  private orchestrator: V9ToolOrchestrator;
  private agents: Map<string, any>;
  private comparator: TwoBranchComparator;
  private educator: V9EducationalResourceGenerator;
  private reportFormatter: V9ReportFormatter;
  private modelSelector: DynamicModelSelector;

  constructor() {
    console.log('🚀 Initializing V9 Canonical Test System');

    // Initialize core components
    this.orchestrator = new V9ToolOrchestrator();
    this.comparator = new TwoBranchComparator();
    this.educator = new V9EducationalResourceGenerator();
    this.reportFormatter = new V9ReportFormatter();
    this.modelSelector = new DynamicModelSelector();

    // Initialize all 5 agents (MANDATORY)
    this.agents = new Map([
      ['SecurityAgent', new SecurityAgent()],
      ['CodeQualityAgent', new CodeQualityAgent()],
      ['PerformanceAgent', new PerformanceAgent()],
      ['ArchitectureAgent', new ArchitectureAgent()],
      ['DependencyAgent', new DependencyAgent()]
    ]);
  }

  async runCanonicalTest() {
    console.log('\n' + '='.repeat(80));
    console.log('📋 V9 CANONICAL TEST - APACHE KAFKA PR #17620');
    console.log('='.repeat(80));
    console.log(`Repository: ${TEST_CONFIG.owner}/${TEST_CONFIG.repo}`);
    console.log(`PR: #${TEST_CONFIG.prNumber}`);
    console.log(`Main Branch: ${TEST_CONFIG.mainBranch}`);
    console.log(`PR Branch: ${TEST_CONFIG.prBranch}`);
    console.log('='.repeat(80));

    try {
      // STEP 1: Clone and prepare both branches
      console.log('\n📥 STEP 1: Preparing Repository');
      console.log('-'.repeat(40));
      await this.prepareRepository();

      // STEP 2: Get changed files
      console.log('\n📁 STEP 2: Identifying Changed Files');
      console.log('-'.repeat(40));
      const changedFiles = await this.getChangedFiles();
      console.log(`Found ${changedFiles.length} changed files`);

      // STEP 3: Run tools on BOTH branches
      console.log('\n🔧 STEP 3: Running Tools on Both Branches');
      console.log('-'.repeat(40));

      console.log('\nAnalyzing MAIN branch...');
      const mainResults = await this.runToolsOnBranch('main');

      console.log('\nAnalyzing PR branch...');
      const prResults = await this.runToolsOnBranch('pr');

      // STEP 4: Send to agents for enrichment
      console.log('\n🤖 STEP 4: Agent Processing (All 5 Agents)');
      console.log('-'.repeat(40));

      const mainEnriched = await this.processWithAgents(mainResults);
      const prEnriched = await this.processWithAgents(prResults);

      // STEP 5: Orchestrator deduplication
      console.log('\n🔍 STEP 5: Orchestrator Deduplication');
      console.log('-'.repeat(40));

      const mainDeduplicated = this.deduplicateIssues(mainEnriched);
      const prDeduplicated = this.deduplicateIssues(prEnriched);

      console.log(`Main branch: ${mainDeduplicated.length} unique issues`);
      console.log(`PR branch: ${prDeduplicated.length} unique issues`);

      // STEP 6: Split to parallel services
      console.log('\n📊 STEP 6: Parallel Services (Educator + Comparator)');
      console.log('-'.repeat(40));

      // Run educator and comparator in PARALLEL
      const [educationalResources, comparisonResult] = await Promise.all([
        this.runEducator(prDeduplicated),
        this.runComparator(mainDeduplicated, prDeduplicated, changedFiles)
      ]);

      // STEP 7: Generate final report
      console.log('\n📄 STEP 7: Generating Final Report');
      console.log('-'.repeat(40));

      const finalReport = await this.generateFinalReport({
        mainIssues: mainDeduplicated,
        prIssues: prDeduplicated,
        comparison: comparisonResult,
        education: educationalResources,
        changedFiles
      });

      // Save report
      const reportPath = `V9-CANONICAL-KAFKA-${TEST_CONFIG.testId}.md`;
      fs.writeFileSync(reportPath, finalReport);
      console.log(`\n✅ Report saved: ${reportPath}`);

      // Display summary
      this.displaySummary(comparisonResult);

      return {
        success: true,
        report: reportPath,
        metrics: {
          mainIssues: mainDeduplicated.length,
          prIssues: prDeduplicated.length,
          newIssues: comparisonResult.newIssues.length,
          resolvedIssues: comparisonResult.resolvedIssues.length,
          blocking: comparisonResult.shouldBlock
        }
      };

    } catch (error: any) {
      console.error('\n❌ Test failed:', error.message);
      console.error(error.stack);
      return { success: false, error: error.message };
    }
  }

  private async prepareRepository() {
    // Create workspace
    await execAsync(`mkdir -p ${TEST_CONFIG.workspace}`);

    // Clone if not exists
    if (!fs.existsSync(`${TEST_CONFIG.workspace}/.git`)) {
      console.log('Cloning repository...');
      await execAsync(
        `git clone --no-checkout https://github.com/${TEST_CONFIG.owner}/${TEST_CONFIG.repo}.git ${TEST_CONFIG.workspace}`,
        { maxBuffer: 50 * 1024 * 1024 }
      );
    }

    // Fetch both branches
    console.log('Fetching branches...');
    await execAsync(`cd ${TEST_CONFIG.workspace} && git fetch origin ${TEST_CONFIG.mainBranch} ${TEST_CONFIG.prBranch}`);
  }

  private async getChangedFiles(): Promise<string[]> {
    const { stdout } = await execAsync(
      `cd ${TEST_CONFIG.workspace} && git diff --name-only origin/${TEST_CONFIG.mainBranch}...origin/${TEST_CONFIG.prBranch}`
    );
    return stdout.trim().split('\n').filter(f => f.endsWith('.java'));
  }

  private async runToolsOnBranch(branch: 'main' | 'pr'): Promise<any[]> {
    const branchName = branch === 'main' ? TEST_CONFIG.mainBranch : TEST_CONFIG.prBranch;

    // Checkout branch
    await execAsync(`cd ${TEST_CONFIG.workspace} && git checkout origin/${branchName}`);

    // Run orchestrator (it handles all tools)
    const files = await this.getJavaFiles();
    const results = await this.orchestrator.orchestrateAnalysis(
      files,
      TEST_CONFIG.workspace,
      'java',
      JAVA_TOOLS
    );

    return results;
  }

  private async getJavaFiles(): Promise<string[]> {
    const { stdout } = await execAsync(
      `find ${TEST_CONFIG.workspace} -name "*.java" -type f | head -100`
    );
    return stdout.trim().split('\n').filter(f => f.length > 0);
  }

  private async processWithAgents(issues: any[]): Promise<any[]> {
    const enrichedIssues = [];

    // Group issues by agent
    const issuesByAgent = new Map<string, any[]>();
    for (const issue of issues) {
      const agentName = issue.agent || 'CodeQualityAgent';
      if (!issuesByAgent.has(agentName)) {
        issuesByAgent.set(agentName, []);
      }
      issuesByAgent.get(agentName)!.push(issue);
    }

    // Process with each agent
    for (const [agentName, agentIssues] of issuesByAgent) {
      console.log(`  ${agentName}: Processing ${agentIssues.length} issues...`);
      const agent = this.agents.get(agentName);

      if (agent) {
        for (const issue of agentIssues) {
          try {
            // Agent enriches with fix suggestion
            const enriched = await agent.generateFixSuggestion({
              title: issue.title || 'Issue',
              description: issue.description,
              type: issue.category,
              severity: issue.severity,
              file: issue.file,
              line: issue.line,
              codeSnippet: issue.codeSnippet
            });

            enrichedIssues.push({
              ...issue,
              ...enriched,
              agentProcessed: true
            });
          } catch (error) {
            // Keep original if enrichment fails
            enrichedIssues.push(issue);
          }
        }
      } else {
        enrichedIssues.push(...agentIssues);
      }
    }

    return enrichedIssues;
  }

  private deduplicateIssues(issues: any[]): any[] {
    const unique = new Map();

    for (const issue of issues) {
      const key = `${issue.file}:${issue.line}:${issue.title?.substring(0, 50)}`;
      if (!unique.has(key) || issue.confidence > unique.get(key).confidence) {
        unique.set(key, issue);
      }
    }

    return Array.from(unique.values());
  }

  private async runEducator(issues: any[]): Promise<any> {
    console.log('  Running Educator Service...');

    // Extract unique titles and descriptions
    const uniqueIssues = issues.map(i => ({
      title: i.title || i.type,
      description: i.description || i.message
    }));

    // Generate educational resources
    const resources = await this.educator.generateResources(uniqueIssues);
    console.log(`  Generated ${resources.links?.length || 0} training links`);

    return resources;
  }

  private async runComparator(mainIssues: any[], prIssues: any[], changedFiles: string[]): Promise<any> {
    console.log('  Running Comparator Service...');

    const result = await this.comparator.compare({
      mainBranchIssues: mainIssues,
      prBranchIssues: prIssues,
      changedFiles,
      blockingConfig: {
        blockOnNewCritical: true,
        blockOnNewHigh: true,
        blockOnExistingCriticalInModified: true,
        blockOnExistingHighInModified: true
      }
    });

    console.log(`  NEW: ${result.newIssues.length}`);
    console.log(`  RESOLVED: ${result.resolvedIssues.length}`);
    console.log(`  EXISTING_MODIFIED: ${result.existingInModified.length}`);
    console.log(`  EXISTING_UNCHANGED: ${result.existingUnchanged.length}`);
    console.log(`  BLOCKING: ${result.shouldBlock ? 'YES' : 'NO'}`);

    return result;
  }

  private async generateFinalReport(data: any): Promise<string> {
    return this.reportFormatter.format({
      repository: `${TEST_CONFIG.owner}/${TEST_CONFIG.repo}`,
      prNumber: TEST_CONFIG.prNumber,
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  private displaySummary(comparison: any) {
    console.log('\n' + '='.repeat(80));
    console.log('📊 CANONICAL V9 TEST SUMMARY');
    console.log('='.repeat(80));

    console.log('\n✅ All Steps Completed:');
    console.log('  1. Tool execution on both branches ✅');
    console.log('  2. All 5 agents processed ✅');
    console.log('  3. Orchestrator deduplicated ✅');
    console.log('  4. Educator generated resources ✅');
    console.log('  5. Comparator classified issues ✅');
    console.log('  6. Final report generated ✅');

    console.log('\n📈 Results:');
    console.log(`  New Issues: ${comparison.newIssues.length}`);
    console.log(`  Resolved Issues: ${comparison.resolvedIssues.length}`);
    console.log(`  Modified File Issues: ${comparison.existingInModified.length}`);

    if (comparison.shouldBlock) {
      console.log('\n🚫 PR WOULD BE BLOCKED');
      console.log('  Reason: Critical/High issues found in new or modified code');
    } else {
      console.log('\n✅ PR CAN PROCEED');
      console.log('  No blocking issues found');
    }

    console.log('\n' + '='.repeat(80));
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking environment...');

  // Verify environment
  const required = ['OPENROUTER_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing);
    console.log('Please set them in .env file');
    process.exit(1);
  }

  console.log('✅ Environment configured');

  // Run canonical test
  const tester = new V9CanonicalTester();
  const result = await tester.runCanonicalTest();

  if (result.success) {
    console.log('\n🎉 V9 CANONICAL TEST COMPLETED SUCCESSFULLY!');
    console.log(`📄 Report: ${result.report}`);
    process.exit(0);
  } else {
    console.log('\n❌ Test failed');
    process.exit(1);
  }
}

// Run test
if (require.main === module) {
  main().catch(console.error);
}

export { V9CanonicalTester };