/**
 * Test Monitoring Integration with Supabase/Grafana
 * Verifies that metrics are being collected and sent properly
 */

import { preprocessingExecutor } from '../integration/preprocessing-executor';
import { AnalysisContext, AgentRole } from '../core/interfaces';
import { metricsReporter } from '../monitoring/supabase-metrics-reporter';
import { toolRegistry } from '../core/registry';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

// Import some tools for testing
import { SemgrepMCPAdapter } from '../adapters/mcp/semgrep-mcp';
import { tavilyMCPEnhanced } from '../adapters/mcp/tavily-mcp-enhanced';
import { ESLintDirectAdapter } from '../adapters/direct/eslint-direct';

const execAsync = promisify(exec);

// Mock metrics collector to verify calls
class MetricsCollector {
  private metrics: any[] = [];
  
  collectMetric(type: string, data: any): void {
    this.metrics.push({ type, data, timestamp: new Date() });
    console.log(`📊 Metric collected [${type}]:`, JSON.stringify(data, null, 2));
  }
  
  getMetrics(): any[] {
    return this.metrics;
  }
  
  getSummary(): Record<string, any> {
    const summary: Record<string, any> = {
      totalMetrics: this.metrics.length,
      byType: {},
      toolExecutions: [],
      tavilyUsage: [],
      preprocessingPhases: []
    };
    
    this.metrics.forEach(metric => {
      summary.byType[metric.type] = (summary.byType[metric.type] || 0) + 1;
      
      if (metric.data.tool_id) {
        summary.toolExecutions.push({
          tool: metric.data.tool_id,
          role: metric.data.agent_role,
          success: metric.data.success,
          time: metric.data.execution_time_ms,
          findings: metric.data.findings_count
        });
      }
      
      if (metric.data.cost_usd) {
        summary.tavilyUsage.push({
          role: metric.data.agent_role,
          queries: metric.data.queries_performed,
          cost: metric.data.cost_usd
        });
      }
      
      if (metric.data.phase) {
        summary.preprocessingPhases.push({
          phase: metric.data.phase,
          duration: metric.data.duration_ms,
          success: metric.data.success
        });
      }
    });
    
    return summary;
  }
}

async function runMonitoringTest() {
  console.log('🔍 Monitoring Integration Test\n');
  console.log('=' .repeat(60) + '\n');
  
  const collector = new MetricsCollector();
  
  // Intercept metrics reporter calls
  const originalReportTool = metricsReporter.reportToolExecution;
  const originalReportPhase = metricsReporter.reportPreprocessingPhase;
  const originalReportTavily = metricsReporter.reportTavilyUsage;
  
  metricsReporter.reportToolExecution = async (...args) => {
    collector.collectMetric('tool_execution', {
      tool_id: args[0],
      tool_type: args[1],
      agent_role: args[2],
      repository_id: args[3],
      pr_number: args[4],
      ...args[5],
      ...args[6]
    });
    return originalReportTool.apply(metricsReporter, args);
  };
  
  metricsReporter.reportPreprocessingPhase = async (...args) => {
    collector.collectMetric('preprocessing_phase', {
      repository_id: args[0],
      pr_number: args[1],
      phase: args[2],
      duration_ms: args[3],
      success: args[4],
      metadata: args[5],
      error_message: args[6]
    });
    return originalReportPhase.apply(metricsReporter, args);
  };
  
  metricsReporter.reportTavilyUsage = async (...args) => {
    collector.collectMetric('tavily_usage', {
      repository_id: args[0],
      pr_number: args[1],
      agent_role: args[2],
      queries_performed: args[3],
      cost_usd: args[3] * 0.001, // $0.001 per query
      response_time_ms: args[4]
    });
    return originalReportTavily.apply(metricsReporter, args);
  };
  
  // Setup test repository
  const testRepoPath = '/tmp/monitoring-test-repo';
  await setupTestRepository(testRepoPath);
  
  // Register tools
  console.log('📦 Registering tools...\n');
  await toolRegistry.register(new SemgrepMCPAdapter());
  await toolRegistry.register(tavilyMCPEnhanced);
  await toolRegistry.register(new ESLintDirectAdapter());
  
  // Create test context
  const context: AnalysisContext = {
    agentRole: 'security',
    pr: {
      prNumber: 1234,
      title: 'Monitoring test PR',
      description: 'Testing monitoring integration',
      baseBranch: 'main',
      targetBranch: 'feature/monitoring-test',
      author: 'test-user',
      files: [],
      commits: []
    },
    repository: {
      name: 'monitoring-test-repo',
      owner: 'codequal',
      languages: ['javascript'],
      frameworks: ['express'],
      primaryLanguage: 'javascript',
      clonedPath: testRepoPath
    },
    userContext: {
      userId: 'test-user-123',
      organizationId: 'test-org',
      permissions: ['read', 'write']
    }
  };
  
  try {
    console.log('🚀 Running preprocessing with monitoring...\n');
    
    // Execute preprocessing
    await preprocessingExecutor.executePreprocessing(context);
    
    // Wait a bit for async metrics
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Flush any pending metrics
    await metricsReporter.flushBatch();
    
    // Display results
    console.log('\n\n📊 MONITORING RESULTS\n');
    console.log('=' .repeat(60) + '\n');
    
    const summary = collector.getSummary();
    
    console.log('📈 Metrics Summary:');
    console.log(`  Total metrics collected: ${summary.totalMetrics}`);
    console.log(`  Metric types: ${JSON.stringify(summary.byType, null, 2)}\n`);
    
    console.log('⚡ Tool Executions:');
    summary.toolExecutions.forEach((exec: any, idx: number) => {
      console.log(`  ${idx + 1}. ${exec.tool} (${exec.role})`);
      console.log(`     Success: ${exec.success ? '✅' : '❌'}`);
      console.log(`     Time: ${exec.time}ms`);
      console.log(`     Findings: ${exec.findings}`);
    });
    
    console.log('\n💰 Tavily API Usage:');
    const totalTavilyCost = summary.tavilyUsage.reduce((sum: number, usage: any) => sum + usage.cost, 0);
    summary.tavilyUsage.forEach((usage: any) => {
      console.log(`  ${usage.role}: ${usage.queries} queries ($${usage.cost.toFixed(3)})`);
    });
    console.log(`  Total cost: $${totalTavilyCost.toFixed(3)}`);
    
    console.log('\n⏱️  Preprocessing Phases:');
    summary.preprocessingPhases.forEach((phase: any) => {
      console.log(`  ${phase.phase}: ${phase.duration}ms ${phase.success ? '✅' : '❌'}`);
    });
    
    // Check Supabase connection
    console.log('\n🔌 Checking Supabase connection:');
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      console.log('  ✅ Supabase credentials configured');
      console.log(`  URL: ${process.env.SUPABASE_URL}`);
      
      // Get dashboard URL
      const dashboardUrl = metricsReporter.getGrafanaDashboardUrl(context.repository.name);
      console.log(`\n📊 Grafana Dashboard: ${dashboardUrl}`);
    } else {
      console.log('  ⚠️  Supabase credentials not configured');
      console.log('  Set SUPABASE_URL and SUPABASE_KEY environment variables');
    }
    
    console.log('\n✅ Monitoring integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Restore original methods
    metricsReporter.reportToolExecution = originalReportTool;
    metricsReporter.reportPreprocessingPhase = originalReportPhase;
    metricsReporter.reportTavilyUsage = originalReportTavily;
    
    // Cleanup
    await cleanup(testRepoPath);
  }
}

async function setupTestRepository(repoPath: string): Promise<void> {
  await fs.rm(repoPath, { recursive: true, force: true });
  await fs.mkdir(repoPath, { recursive: true });
  
  await execAsync('git init', { cwd: repoPath });
  await execAsync('git config user.email "test@example.com"', { cwd: repoPath });
  await execAsync('git config user.name "Test User"', { cwd: repoPath });
  
  // Create base file
  await fs.writeFile(
    path.join(repoPath, 'index.js'),
    'console.log("Hello");',
    'utf-8'
  );
  
  await execAsync('git add .', { cwd: repoPath });
  await execAsync('git commit -m "Initial"', { cwd: repoPath });
  await execAsync('git branch -M main', { cwd: repoPath });
  
  // Create feature branch
  await execAsync('git checkout -b feature/monitoring-test', { cwd: repoPath });
  
  await fs.writeFile(
    path.join(repoPath, 'auth.js'),
    `
function authenticate(user, pass) {
  // Security issue: plain text
  if (user === 'admin' && pass === 'password') {
    return true;
  }
  return false;
}
    `,
    'utf-8'
  );
  
  await execAsync('git add .', { cwd: repoPath });
  await execAsync('git commit -m "Add auth"', { cwd: repoPath });
}

async function cleanup(repoPath: string): Promise<void> {
  try {
    await fs.rm(repoPath, { recursive: true, force: true });
  } catch (error) {
    console.warn('Cleanup warning:', error);
  }
}

// Run the test
runMonitoringTest().catch(console.error);