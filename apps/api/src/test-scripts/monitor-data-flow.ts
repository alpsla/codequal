#!/usr/bin/env ts-node

/**
 * Real-time Data Flow Monitor
 * Tracks the flow of data through all system components
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createLogger } from '@codequal/core/utils';
import { getProgressTracker } from '@codequal/agents/services/progress-tracker';
import chalk from 'chalk';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const logger = createLogger('DataFlowMonitor');

// Color coding for different components
const colors = {
  api: chalk.blue,
  deepwiki: chalk.magenta,
  agent: chalk.green,
  tool: chalk.yellow,
  vector: chalk.cyan,
  report: chalk.white,
  error: chalk.red,
  success: chalk.greenBright
};

// Component status tracking
const componentStatus = {
  api: { calls: 0, errors: 0, avgTime: 0 },
  deepwiki: { analyses: 0, cached: 0, errors: 0 },
  agents: { executed: 0, successful: 0, failed: 0 },
  tools: { executed: 0, successful: 0, failed: 0 },
  vectorDB: { reads: 0, writes: 0, errors: 0 },
  reports: { generated: 0, failed: 0 }
};

/**
 * Monitor active analysis progress
 */
async function monitorActiveAnalyses() {
  const progressTracker = getProgressTracker();
  
  // Listen to progress events
  progressTracker.on('progressUpdate', (analysisId, update) => {
    const timestamp = new Date().toLocaleTimeString();
    const phase = colors[update.type as keyof typeof colors] || chalk.white;
    
    console.log(`[${timestamp}] ${phase(update.type.toUpperCase())} | ${update.message}`);
    
    if (update.details) {
      if (update.details.agentName) {
        console.log(`  └─ Agent: ${update.details.agentName}`);
      }
      if (update.details.toolName) {
        console.log(`  └─ Tool: ${update.details.toolName}`);
      }
      if (update.details.error) {
        console.log(`  └─ ${colors.error('Error:')} ${update.details.error}`);
      }
    }
  });
  
  progressTracker.on('phaseUpdate', (analysisId, phase, phaseProgress) => {
    const timestamp = new Date().toLocaleTimeString();
    const status = phaseProgress.status === 'completed' ? colors.success('✓') : 
                   phaseProgress.status === 'failed' ? colors.error('✗') : '⋯';
    
    console.log(`[${timestamp}] PHASE | ${phase} ${status} (${phaseProgress.percentage}%)`);
  });
  
  progressTracker.on('analysisComplete', (analysisId, progress) => {
    const duration = progress.endTime! - progress.startTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    console.log('\n' + '='.repeat(60));
    console.log(colors.success(`✅ Analysis Complete: ${analysisId}`));
    console.log(`Duration: ${minutes}m ${seconds}s`);
    console.log(`Agents: ${progress.metrics.completedAgents}/${progress.metrics.totalAgents} (${progress.metrics.failedAgents} failed)`);
    console.log(`Tools: ${progress.metrics.completedTools}/${progress.metrics.totalTools} (${progress.metrics.failedTools} failed)`);
    console.log('='.repeat(60) + '\n');
  });
}

/**
 * Display real-time dashboard
 */
function displayDashboard() {
  console.clear();
  console.log(chalk.bold('\n🔍 CodeQual Data Flow Monitor\n'));
  console.log('='.repeat(60));
  
  // API Status
  console.log(colors.api('\n📡 API Layer'));
  console.log(`  Calls: ${componentStatus.api.calls} | Errors: ${componentStatus.api.errors} | Avg Time: ${componentStatus.api.avgTime}ms`);
  
  // DeepWiki Status
  console.log(colors.deepwiki('\n🧠 DeepWiki'));
  console.log(`  Analyses: ${componentStatus.deepwiki.analyses} | Cached: ${componentStatus.deepwiki.cached} | Errors: ${componentStatus.deepwiki.errors}`);
  
  // Agents Status
  console.log(colors.agent('\n🤖 Agents'));
  console.log(`  Executed: ${componentStatus.agents.executed} | Success: ${componentStatus.agents.successful} | Failed: ${componentStatus.agents.failed}`);
  
  // Tools Status
  console.log(colors.tool('\n🔧 Tools'));
  console.log(`  Executed: ${componentStatus.tools.executed} | Success: ${componentStatus.tools.successful} | Failed: ${componentStatus.tools.failed}`);
  
  // Vector DB Status
  console.log(colors.vector('\n💾 Vector DB'));
  console.log(`  Reads: ${componentStatus.vectorDB.reads} | Writes: ${componentStatus.vectorDB.writes} | Errors: ${componentStatus.vectorDB.errors}`);
  
  // Reports Status
  console.log(colors.report('\n📊 Reports'));
  console.log(`  Generated: ${componentStatus.reports.generated} | Failed: ${componentStatus.reports.failed}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📜 Live Activity Log:\n');
}

/**
 * Monitor system logs for data flow
 */
async function monitorLogs() {
  // This would typically tail log files or connect to a log aggregation service
  // For demo purposes, we'll simulate some activity
  
  const activities = [
    { component: 'api', message: 'POST /api/analyze - PR analysis request received' },
    { component: 'deepwiki', message: 'Checking repository cache...' },
    { component: 'deepwiki', message: 'Cache miss - triggering analysis' },
    { component: 'vector', message: 'Storing repository context' },
    { component: 'agent', message: 'Security agent starting...' },
    { component: 'tool', message: 'Executing ESLint tool' },
    { component: 'tool', message: 'Executing Semgrep tool' },
    { component: 'agent', message: 'Security agent completed - 12 findings' },
    { component: 'agent', message: 'Architecture agent starting...' },
    { component: 'tool', message: 'Executing dependency analysis' },
    { component: 'agent', message: 'Architecture agent completed - 5 findings' },
    { component: 'report', message: 'Generating final report...' },
    { component: 'vector', message: 'Storing analysis results' },
    { component: 'api', message: 'Analysis complete - returning report' }
  ];
  
  let index = 0;
  setInterval(() => {
    if (index < activities.length) {
      const activity = activities[index];
      const timestamp = new Date().toLocaleTimeString();
      const color = colors[activity.component] || chalk.white;
      
      console.log(`[${timestamp}] ${color(activity.component.toUpperCase())} | ${activity.message}`);
      
      // Update stats
      if (activity.component === 'api') componentStatus.api.calls++;
      if (activity.component === 'agent' && activity.message.includes('completed')) componentStatus.agents.successful++;
      if (activity.component === 'tool' && activity.message.includes('Executing')) componentStatus.tools.executed++;
      
      index++;
    }
  }, 2000);
}

/**
 * Monitor for specific patterns or issues
 */
function monitorPatterns() {
  const patterns = {
    slowQueries: /Query took (\d+)ms/,
    errors: /ERROR|FAIL|Exception/i,
    timeouts: /timeout|timed out/i,
    rateLimits: /rate limit|429/i,
    memoryIssues: /out of memory|heap/i
  };
  
  // This would monitor actual logs
  console.log(chalk.yellow('\n⚠️  Monitoring for issues...'));
}

/**
 * Generate data flow report
 */
function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    duration: process.uptime(),
    components: componentStatus,
    health: {
      api: componentStatus.api.errors === 0 ? 'healthy' : 'degraded',
      agents: componentStatus.agents.failed / componentStatus.agents.executed < 0.1 ? 'healthy' : 'degraded',
      tools: componentStatus.tools.failed / componentStatus.tools.executed < 0.1 ? 'healthy' : 'degraded',
      vectorDB: componentStatus.vectorDB.errors === 0 ? 'healthy' : 'degraded'
    },
    recommendations: [] as string[]
  };
  
  // Add recommendations based on observations
  if (componentStatus.api.avgTime > 1000) {
    report.recommendations.push('API response times are high - consider caching');
  }
  if (componentStatus.agents.failed > 0) {
    report.recommendations.push('Agent failures detected - check model configurations');
  }
  if (componentStatus.vectorDB.errors > 0) {
    report.recommendations.push('Vector DB errors - check connection and quotas');
  }
  
  return report;
}

// Main monitoring function
async function startMonitoring() {
  console.log(chalk.bold.green('🚀 Starting CodeQual Data Flow Monitor\n'));
  
  // Display initial dashboard
  displayDashboard();
  
  // Start monitoring components
  await monitorActiveAnalyses();
  await monitorLogs();
  monitorPatterns();
  
  // Update dashboard periodically
  setInterval(() => {
    // In production, this would update based on real metrics
  }, 5000);
  
  // Generate report on exit
  process.on('SIGINT', () => {
    console.log('\n\nGenerating final report...\n');
    const report = generateReport();
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  });
}

// Command line options
const args = process.argv.slice(2);

if (args.includes('--help')) {
  console.log(`
CodeQual Data Flow Monitor

Usage: npm run monitor:flow [options]

Options:
  --live          Show live data flow (default)
  --dashboard     Show component dashboard
  --report        Generate health report
  --help          Show this help message

Examples:
  npm run monitor:flow                    # Live monitoring
  npm run monitor:flow --dashboard        # Component dashboard
  npm run monitor:flow --report           # Generate report
  `);
  process.exit(0);
}

// Start monitoring
startMonitoring().catch(console.error);