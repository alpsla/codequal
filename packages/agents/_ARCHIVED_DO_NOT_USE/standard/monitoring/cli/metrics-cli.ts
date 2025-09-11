#!/usr/bin/env node
/**
 * Metrics CLI
 * Command-line interface for viewing CodeQual performance metrics
 */

import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import Table from 'cli-table3';
import { program } from 'commander';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
const envPath = path.resolve(__dirname, '../../../../../../.env');
dotenv.config({ path: envPath });

console.log('Env path:', envPath);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');

// Initialize Supabase
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables. Please check your .env file.');
  console.error('Expected path:', envPath);
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Colors for different metrics
const colors = {
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.blue,
  dim: chalk.dim,
  bold: chalk.bold
};

/**
 * Display summary metrics
 */
async function showSummary(timeRange = '1h') {
  console.log(colors.bold('\n📊 CodeQual Performance Metrics\n'));
  
  const startTime = getStartTime(timeRange);
  
  // Fetch recent activities
  const { data: activities, error } = await supabase
    .from('agent_activity')
    .select('*')
    .gte('timestamp', startTime.getTime())
    .order('timestamp', { ascending: false });
  
  if (error) {
    console.error(colors.error('Failed to fetch metrics from Supabase'));
    return;
  }
  
  const total = activities?.length || 0;
  const successful = activities?.filter(a => a.success).length || 0;
  const failed = total - successful;
  const successRate = total > 0 ? (successful / total) * 100 : 0;
  
  const totalCost = activities?.reduce((sum, a) => sum + (a.cost || 0), 0) || 0;
  const totalTokens = activities?.reduce((sum, a) => 
    sum + (a.input_tokens || 0) + (a.output_tokens || 0), 0) || 0;
  
  const avgDuration = total > 0
    ? activities?.reduce((sum, a) => sum + (a.duration_ms || 0), 0)! / total
    : 0;
  
  // Create summary table
  const summaryTable = new Table({
    head: ['Metric', 'Value'],
    colWidths: [25, 20],
    style: { head: ['cyan'] }
  });
  
  summaryTable.push(
    ['Time Range', timeRange],
    ['Total Operations', total.toString()],
    ['Successful', colors.success(successful.toString())],
    ['Failed', failed > 0 ? colors.error(failed.toString()) : '0'],
    ['Success Rate', formatSuccessRate(successRate)],
    ['Avg Response Time', `${avgDuration.toFixed(0)}ms`],
    ['Total Tokens Used', totalTokens.toLocaleString()],
    ['Total Cost', colors.bold(`$${totalCost.toFixed(2)}`)]
  );
  
  console.log(summaryTable.toString());
}

/**
 * Display agent-specific metrics
 */
async function showAgents(timeRange = '1h') {
  console.log(colors.bold('\n🤖 Agent Performance\n'));
  
  const startTime = getStartTime(timeRange);
  
  const { data: activities, error } = await supabase
    .from('agent_activity')
    .select('*')
    .gte('timestamp', startTime.getTime());
  
  if (error) {
    console.error(colors.error('Failed to fetch agent metrics'));
    return;
  }
  
  // Aggregate by agent
  const agentMetrics: Record<string, any> = {};
  
  activities?.forEach(activity => {
    const agent = activity.agent_role;
    if (!agentMetrics[agent]) {
      agentMetrics[agent] = {
        operations: 0,
        successful: 0,
        totalDuration: 0,
        totalTokens: 0,
        totalCost: 0,
        primaryCount: 0,
        fallbackCount: 0
      };
    }
    
    agentMetrics[agent].operations++;
    if (activity.success) agentMetrics[agent].successful++;
    agentMetrics[agent].totalDuration += activity.duration_ms || 0;
    agentMetrics[agent].totalTokens += (activity.input_tokens || 0) + (activity.output_tokens || 0);
    agentMetrics[agent].totalCost += activity.cost || 0;
    
    if (activity.is_fallback) {
      agentMetrics[agent].fallbackCount++;
    } else {
      agentMetrics[agent].primaryCount++;
    }
  });
  
  // Create agents table
  const agentTable = new Table({
    head: ['Agent', 'Ops', 'Success %', 'Avg Time', 'Tokens', 'Cost', 'Fallback %'],
    colWidths: [20, 8, 12, 12, 12, 10, 12],
    style: { head: ['cyan'] }
  });
  
  Object.entries(agentMetrics).forEach(([agent, metrics]) => {
    const successRate = metrics.operations > 0 
      ? (metrics.successful / metrics.operations) * 100 
      : 0;
    const avgTime = metrics.operations > 0 
      ? metrics.totalDuration / metrics.operations 
      : 0;
    const fallbackRate = metrics.operations > 0
      ? (metrics.fallbackCount / metrics.operations) * 100
      : 0;
    
    agentTable.push([
      agent,
      metrics.operations.toString(),
      formatSuccessRate(successRate),
      `${avgTime.toFixed(0)}ms`,
      formatNumber(metrics.totalTokens),
      `$${metrics.totalCost.toFixed(2)}`,
      formatFallbackRate(fallbackRate)
    ]);
  });
  
  console.log(agentTable.toString());
}

/**
 * Display cost breakdown
 */
async function showCosts(timeRange = '24h') {
  console.log(colors.bold('\n💰 Cost Analysis\n'));
  
  const startTime = getStartTime(timeRange);
  
  const { data: activities, error } = await supabase
    .from('agent_activity')
    .select('agent_role, model_used, cost, input_tokens, output_tokens')
    .gte('timestamp', startTime.getTime());
  
  if (error) {
    console.error(colors.error('Failed to fetch cost data'));
    return;
  }
  
  // Aggregate costs
  const costByAgent: Record<string, number> = {};
  const costByModel: Record<string, number> = {};
  let totalCost = 0;
  
  activities?.forEach(activity => {
    const cost = activity.cost || 0;
    totalCost += cost;
    
    costByAgent[activity.agent_role] = (costByAgent[activity.agent_role] || 0) + cost;
    costByModel[activity.model_used] = (costByModel[activity.model_used] || 0) + cost;
  });
  
  // Sort by cost
  const topAgents = Object.entries(costByAgent)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  
  const topModels = Object.entries(costByModel)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  
  // Create cost table
  const costTable = new Table({
    head: ['Category', 'Cost', 'Percentage'],
    colWidths: [30, 12, 12],
    style: { head: ['cyan'] }
  });
  
  costTable.push(
    [colors.bold('Total Cost'), colors.bold(`$${totalCost.toFixed(2)}`), '100%'],
    [colors.dim('─'.repeat(28)), colors.dim('─'.repeat(10)), colors.dim('─'.repeat(10))]
  );
  
  costTable.push([colors.bold('Top Agents'), '', '']);
  topAgents.forEach(([agent, cost]) => {
    const percentage = totalCost > 0 ? (cost / totalCost) * 100 : 0;
    costTable.push([
      `  ${agent}`,
      `$${cost.toFixed(2)}`,
      `${percentage.toFixed(1)}%`
    ]);
  });
  
  costTable.push(['', '', '']);
  costTable.push([colors.bold('Top Models'), '', '']);
  topModels.forEach(([model, cost]) => {
    const percentage = totalCost > 0 ? (cost / totalCost) * 100 : 0;
    costTable.push([
      `  ${model.substring(0, 25)}...`,
      `$${cost.toFixed(2)}`,
      `${percentage.toFixed(1)}%`
    ]);
  });
  
  console.log(costTable.toString());
}

/**
 * Display recent operations
 */
async function showRecent(limit = 10) {
  console.log(colors.bold('\n📜 Recent Operations\n'));
  
  const { data: activities, error } = await supabase
    .from('agent_activity')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error(colors.error('Failed to fetch recent operations'));
    return;
  }
  
  const recentTable = new Table({
    head: ['Time', 'Agent', 'Operation', 'Model', 'Duration', 'Status'],
    colWidths: [12, 15, 20, 20, 10, 10],
    style: { head: ['cyan'] }
  });
  
  activities?.forEach(activity => {
    const time = new Date(activity.timestamp).toLocaleTimeString();
    const model = activity.is_fallback 
      ? colors.warning(`${activity.model_used.substring(0, 15)}... (F)`)
      : activity.model_used.substring(0, 18) + '...';
    const status = activity.success 
      ? colors.success('✓')
      : colors.error('✗');
    
    recentTable.push([
      time,
      activity.agent_role,
      activity.operation.substring(0, 18),
      model,
      `${activity.duration_ms}ms`,
      status
    ]);
  });
  
  console.log(recentTable.toString());
}

/**
 * Helper functions
 */
function getStartTime(timeRange: string): Date {
  const now = new Date();
  const ms = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  }[timeRange] || 60 * 60 * 1000;
  
  return new Date(now.getTime() - ms);
}

function formatSuccessRate(rate: number): string {
  if (rate >= 95) return colors.success(`${rate.toFixed(1)}%`);
  if (rate >= 85) return colors.warning(`${rate.toFixed(1)}%`);
  return colors.error(`${rate.toFixed(1)}%`);
}

function formatFallbackRate(rate: number): string {
  if (rate <= 5) return colors.success(`${rate.toFixed(1)}%`);
  if (rate <= 15) return colors.warning(`${rate.toFixed(1)}%`);
  return colors.error(`${rate.toFixed(1)}%`);
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

// CLI Commands
program
  .name('codequal-metrics')
  .description('CodeQual Performance Metrics CLI')
  .version('1.0.0');

program
  .command('summary')
  .description('Show summary metrics')
  .option('-t, --time <range>', 'Time range (1h, 6h, 24h, 7d)', '1h')
  .action((options) => {
    showSummary(options.time);
  });

program
  .command('agents')
  .description('Show agent performance metrics')
  .option('-t, --time <range>', 'Time range (1h, 6h, 24h, 7d)', '1h')
  .action((options) => {
    showAgents(options.time);
  });

program
  .command('costs')
  .description('Show cost analysis')
  .option('-t, --time <range>', 'Time range (1h, 6h, 24h, 7d, 30d)', '24h')
  .action((options) => {
    showCosts(options.time);
  });

program
  .command('recent')
  .description('Show recent operations')
  .option('-l, --limit <number>', 'Number of operations to show', '10')
  .action((options) => {
    showRecent(parseInt(options.limit));
  });

program
  .command('watch')
  .description('Watch metrics in real-time')
  .option('-i, --interval <seconds>', 'Refresh interval in seconds', '5')
  .action(async (options) => {
    const interval = parseInt(options.interval) * 1000;
    
    // Clear screen and show metrics
    const refresh = async () => {
      console.clear();
      await showSummary('1h');
      await showAgents('1h');
      console.log(colors.dim(`\nRefreshing every ${options.interval} seconds... Press Ctrl+C to exit`));
    };
    
    await refresh();
    setInterval(refresh, interval);
  });

// Default command - show summary
if (process.argv.length === 2) {
  showSummary('1h');
  showAgents('1h');
} else {
  program.parse();
}