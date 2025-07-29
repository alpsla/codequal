/**
 * Real PR Analysis Test
 * Tests the complete data flow with an actual GitHub PR
 * Tracks time spent per tool and data storage
 */

// Load environment variables FIRST before any other imports
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { preprocessingExecutor } from '../integration/preprocessing-executor';
import { AnalysisContext, AgentRole } from '../core/interfaces';
import { metricsReporter } from '../monitoring/supabase-metrics-reporter';
import { toolRegistry } from '../core/registry';
import { agentToolAwareness } from '../integration/agent-tool-awareness';
import { parallelToolExecutor } from '../integration/parallel-tool-executor';
import { toolResultsAggregator } from '../integration/tool-results-aggregator';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

// Import all tools
import { SemgrepMCPAdapter } from '../adapters/mcp/semgrep-mcp';
import { tavilyMCPEnhanced } from '../adapters/mcp/tavily-mcp-enhanced';
import { ESLintDirectAdapter } from '../adapters/direct/eslint-direct';
import { SerenaMCPAdapter } from '../adapters/mcp/serena-mcp';
import { GitMCPAdapter } from '../adapters/mcp/missing-mcp-tools';
import { SonarJSDirectAdapter } from '../adapters/direct/sonarjs-direct';
import { DependencyCruiserDirectAdapter } from '../adapters/direct/dependency-cruiser-direct';
import { MadgeDirectAdapter } from '../adapters/direct/madge-direct';
import { NpmAuditDirectAdapter } from '../adapters/direct/npm-audit-direct';
import { LicenseCheckerDirectAdapter } from '../adapters/direct/license-checker-direct';

const execAsync = promisify(exec);

// Ensure we have the necessary tokens
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

// Update metrics reporter with correct key
process.env.SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface ToolMetrics {
  toolId: string;
  toolType: 'mcp' | 'direct';
  roles: string[];
  executionTimeMs: number;
  findingsCount: number;
  criticalFindings: number;
  success: boolean;
  error?: string;
}

class MetricsAnalyzer {
  private toolMetrics: ToolMetrics[] = [];
  private phaseTimings: Map<string, number> = new Map();
  private startTime: number = Date.now();
  
  recordToolExecution(metric: ToolMetrics): void {
    this.toolMetrics.push(metric);
  }
  
  recordPhase(phase: string, duration: number): void {
    this.phaseTimings.set(phase, duration);
  }
  
  generateReport(): void {
    console.log('\n\n📊 DETAILED METRICS ANALYSIS');
    console.log('=' .repeat(80) + '\n');
    
    // Total execution time
    const totalTime = Date.now() - this.startTime;
    console.log(`⏱️  Total Execution Time: ${(totalTime / 1000).toFixed(2)}s\n`);
    
    // Phase breakdown
    console.log('📈 Phase Breakdown:');
    let phaseTotal = 0;
    for (const [phase, duration] of this.phaseTimings) {
      const percentage = ((duration / totalTime) * 100).toFixed(1);
      console.log(`  ${phase}: ${duration}ms (${percentage}%)`);
      phaseTotal += duration;
    }
    const overhead = totalTime - phaseTotal;
    console.log(`  Overhead: ${overhead}ms (${((overhead / totalTime) * 100).toFixed(1)}%)\n`);
    
    // Tool performance analysis
    console.log('🔧 Tool Performance Analysis:');
    console.log('  ' + '-'.repeat(76));
    console.log('  Tool ID                    Type    Roles    Time(ms)  Findings  Success');
    console.log('  ' + '-'.repeat(76));
    
    // Sort by execution time
    const sortedMetrics = [...this.toolMetrics].sort((a, b) => b.executionTimeMs - a.executionTimeMs);
    
    for (const metric of sortedMetrics) {
      const toolId = metric.toolId.padEnd(25);
      const type = metric.toolType.padEnd(7);
      const roles = metric.roles.length.toString().padEnd(8);
      const time = metric.executionTimeMs.toString().padEnd(10);
      const findings = metric.findingsCount.toString().padEnd(10);
      const success = metric.success ? '✅' : '❌';
      
      console.log(`  ${toolId} ${type} ${roles} ${time} ${findings} ${success}`);
      if (metric.error) {
        console.log(`    Error: ${metric.error}`);
      }
    }
    
    // Summary statistics
    console.log('\n📊 Summary Statistics:');
    const totalTools = this.toolMetrics.length;
    const successfulTools = this.toolMetrics.filter(m => m.success).length;
    const totalFindings = this.toolMetrics.reduce((sum, m) => sum + m.findingsCount, 0);
    const totalCritical = this.toolMetrics.reduce((sum, m) => sum + m.criticalFindings, 0);
    const avgExecutionTime = this.toolMetrics.reduce((sum, m) => sum + m.executionTimeMs, 0) / totalTools;
    
    console.log(`  Total tools executed: ${totalTools}`);
    console.log(`  Successful executions: ${successfulTools} (${((successfulTools/totalTools)*100).toFixed(1)}%)`);
    console.log(`  Total findings: ${totalFindings}`);
    console.log(`  Critical findings: ${totalCritical}`);
    console.log(`  Average tool execution time: ${avgExecutionTime.toFixed(0)}ms`);
    
    // Tool recommendations
    console.log('\n💡 Optimization Recommendations:');
    const slowTools = sortedMetrics.filter(m => m.executionTimeMs > 1000);
    if (slowTools.length > 0) {
      console.log('  Consider optimizing or removing these slow tools:');
      slowTools.forEach(tool => {
        console.log(`    - ${tool.toolId}: ${tool.executionTimeMs}ms`);
      });
    }
    
    const lowValueTools = this.toolMetrics.filter(m => m.findingsCount === 0 && m.executionTimeMs > 500);
    if (lowValueTools.length > 0) {
      console.log('\n  Tools with no findings but high execution time:');
      lowValueTools.forEach(tool => {
        console.log(`    - ${tool.toolId}: ${tool.executionTimeMs}ms`);
      });
    }
  }
}

async function analyzeRealPR(prUrl: string) {
  console.log('🚀 Real PR Analysis Test');
  console.log(`📍 Analyzing: ${prUrl}\n`);
  
  const analyzer = new MetricsAnalyzer();
  
  // Parse PR URL
  const urlMatch = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!urlMatch) {
    throw new Error('Invalid GitHub PR URL format');
  }
  
  const [, owner, repo, prNumber] = urlMatch;
  const repoUrl = `https://github.com/${owner}/${repo}`;
  
  // Clone repository
  const cloneStart = Date.now();
  console.log('📁 Step 1: Cloning repository...');
  const clonePath = `/tmp/real-pr-test-${Date.now()}`;
  
  // Store original method for restoration
  const originalReportTool = metricsReporter.reportToolExecution;
  
  try {
    await execAsync(`git clone ${repoUrl} ${clonePath}`);
    console.log(`  ✅ Cloned to: ${clonePath}`);
    
    // Fetch PR info
    await execAsync(`cd ${clonePath} && git fetch origin pull/${prNumber}/head:pr-${prNumber}`);
    await execAsync(`cd ${clonePath} && git checkout pr-${prNumber}`);
    
    // Detect default branch
    const { stdout: defaultBranch } = await execAsync(
      `cd ${clonePath} && git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'`
    );
    const baseBranch = defaultBranch.trim() || 'master';
    console.log(`  ✅ Default branch: ${baseBranch}`);
    
    analyzer.recordPhase('Repository Clone', Date.now() - cloneStart);
    
    // Register all tools
    const toolRegStart = Date.now();
    console.log('\n📦 Step 2: Registering tools...');
    
    const tools = [
      new SemgrepMCPAdapter(),
      tavilyMCPEnhanced,
      new ESLintDirectAdapter(),
      new SerenaMCPAdapter(),
      new GitMCPAdapter(),
      new SonarJSDirectAdapter(),
      new DependencyCruiserDirectAdapter(),
      new MadgeDirectAdapter(),
      new NpmAuditDirectAdapter(),
      new LicenseCheckerDirectAdapter()
    ];
    
    for (const tool of tools) {
      await toolRegistry.register(tool);
      console.log(`  ✅ Registered: ${tool.id}`);
    }
    
    analyzer.recordPhase('Tool Registration', Date.now() - toolRegStart);
    
    // Create analysis context
    const context: AnalysisContext = {
      agentRole: 'security',
      pr: {
        prNumber: parseInt(prNumber),
        title: `PR #${prNumber}`,
        description: 'Real PR analysis',
        baseBranch: baseBranch,
        targetBranch: `pr-${prNumber}`,
        author: 'unknown',
        files: [],
        commits: []
      },
      repository: {
        name: repo,
        owner: owner,
        languages: [],
        frameworks: [],
        clonedPath: clonePath
      },
      userContext: {
        userId: 'test-real-pr',
        organizationId: 'codequal',
        permissions: ['read', 'write']
      }
    };
    
    // Monitor tool executions
    metricsReporter.reportToolExecution = async (toolId, toolType, agentRole, repository, prNum, result, additional) => {
      analyzer.recordToolExecution({
        toolId,
        toolType,
        roles: [agentRole],
        executionTimeMs: result.executionTime,
        findingsCount: result.findings?.length || 0,
        criticalFindings: result.findings?.filter(f => f.severity === 'critical').length || 0,
        success: result.success,
        error: result.error?.message
      });
      
      return originalReportTool.call(
        metricsReporter,
        toolId,
        toolType,
        agentRole,
        repository,
        prNum,
        result,
        additional
      );
    };
    
    // Run preprocessing
    const preprocessStart = Date.now();
    console.log('\n⚡ Step 3: Running preprocessing pipeline...\n');
    
    await preprocessingExecutor.executePreprocessing(context);
    
    analyzer.recordPhase('Preprocessing Pipeline', Date.now() - preprocessStart);
    
    // Wait for metrics to be sent
    await new Promise(resolve => setTimeout(resolve, 2000));
    await metricsReporter.flushBatch();
    
    // Check Vector DB storage
    console.log('\n💾 Step 4: Checking Vector DB Storage...\n');
    
    // Try to retrieve stored data
    const roles: AgentRole[] = ['security', 'codeQuality', 'dependency', 'performance', 'architecture'];
    
    for (const role of roles) {
      const toolContext = await toolResultsAggregator.getToolContextForAgent(
        repo,
        parseInt(prNumber),
        role
      );
      
      if (toolContext) {
        console.log(`  ${role}:`);
        console.log(`    Chunks stored: ${toolContext.chunks.length}`);
        console.log(`    Total findings: ${toolContext.aggregatedMetrics.totalFindings}`);
        console.log(`    Tools executed: ${toolContext.aggregatedMetrics.toolsExecuted.join(', ')}`);
      }
    }
    
    // Generate performance report
    analyzer.generateReport();
    
    // Show Grafana dashboard URL
    console.log('\n📊 Monitoring Dashboard:');
    console.log(`  Grafana: ${metricsReporter.getGrafanaDashboardUrl(repo)}`);
    console.log(`  Supabase: ${process.env.SUPABASE_URL}`);
    
    // Cleanup
    await fs.rm(clonePath, { recursive: true, force: true });
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    throw error;
  } finally {
    // Restore original method
    metricsReporter.reportToolExecution = originalReportTool;
  }
}

// Example PR URLs to test with
const examplePRs = [
  'https://github.com/microsoft/vscode/pull/180000',  // Large PR
  'https://github.com/facebook/react/pull/27000',      // Medium PR
  'https://github.com/vercel/next.js/pull/50000'       // Small PR
];

// Get PR URL from command line or use default
const prUrl = process.argv[2] || 'https://github.com/nodejs/node/pull/50000';

// Run the analysis
analyzeRealPR(prUrl)
  .then(() => {
    console.log('\n✅ Analysis completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Analysis failed:', error);
    process.exit(1);
  });