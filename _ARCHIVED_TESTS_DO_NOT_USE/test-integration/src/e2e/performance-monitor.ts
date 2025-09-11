#!/usr/bin/env node
/**
 * Real-time Performance Monitoring
 * 
 * This module provides real-time monitoring of:
 * - Token usage per agent/tool
 * - API rate limiting
 * - Memory and CPU usage
 * - Cost accumulation
 * - Execution bottlenecks
 */

import { EventEmitter } from 'events';
import chalk from 'chalk';
import ora from 'ora';

interface TokenUsageEvent {
  timestamp: Date;
  component: string; // agent or tool name
  promptTokens: number;
  completionTokens: number;
  cost: number;
}

interface ApiCallEvent {
  timestamp: Date;
  service: string;
  endpoint: string;
  responseTime: number;
  rateLimited: boolean;
}

interface PerformanceEvent {
  timestamp: Date;
  component: string;
  phase: string;
  duration: number;
  memory: number;
}

export class PerformanceMonitor extends EventEmitter {
  private tokenUsage: Map<string, { prompt: number; completion: number; cost: number }> = new Map();
  private apiCalls: Map<string, { count: number; rateLimited: number; totalTime: number }> = new Map();
  private performanceData: Map<string, number[]> = new Map();
  private startTime: number = Date.now();
  private costAccumulator = 0;
  private spinner?: ora.Ora;

  // Pricing configuration
  private pricing = {
    claude3Opus: {
      prompt: 15.00 / 1_000_000,    // $15 per million tokens
      completion: 75.00 / 1_000_000  // $75 per million tokens
    },
    claude3Sonnet: {
      prompt: 3.00 / 1_000_000,      // $3 per million tokens
      completion: 15.00 / 1_000_000  // $15 per million tokens
    },
    claude3Haiku: {
      prompt: 0.25 / 1_000_000,      // $0.25 per million tokens
      completion: 1.25 / 1_000_000   // $1.25 per million tokens
    }
  };

  // Real-time metrics for API testing
  private apiMetrics: Map<string, { success: number; failure: number; avgLatency: number }> = new Map();

  constructor() {
    super();
    this.setupEventHandlers();
  }

  /**
   * Start monitoring session
   */
  startSession(sessionName: string): void {
    console.log(chalk.bold.blue('\n🚀 Performance Monitoring Started'));
    console.log(chalk.gray(`Session: ${sessionName}`));
    console.log(chalk.gray(`Started: ${new Date().toLocaleString()}`));
    console.log(chalk.gray('─'.repeat(60)));
    
    this.startTime = Date.now();
    this.resetCounters();
    
    // Start real-time display
    this.startRealTimeDisplay();
  }

  /**
   * Start monitoring (alias for startSession with default name)
   */
  startMonitoring(): void {
    this.startSession('Default Session');
  }

  /**
   * Stop monitoring and return collected data
   */
  stopMonitoring(): any {
    // Stop any active spinners
    if (this.spinner) {
      this.spinner.stop();
    }
    
    // Calculate final metrics
    const duration = Date.now() - this.startTime;
    
    return {
      totalExecutionTime: duration,
      totalCost: this.costAccumulator,
      tokenUsage: Object.fromEntries(this.tokenUsage),
      apiCalls: Object.fromEntries(this.apiCalls),
      performanceData: Object.fromEntries(this.performanceData),
      apiMetrics: Object.fromEntries(this.apiMetrics)
    };
  }

  /**
   * Record token usage
   */
  recordTokenUsage(component: string, promptTokens: number, completionTokens: number, model: 'opus' | 'sonnet' | 'haiku' = 'sonnet'): void {
    const pricing = model === 'opus' ? this.pricing.claude3Opus : 
                   model === 'haiku' ? this.pricing.claude3Haiku : 
                   this.pricing.claude3Sonnet;
    
    const cost = (promptTokens * pricing.prompt) + (completionTokens * pricing.completion);
    
    // Update component totals
    const current = this.tokenUsage.get(component) || { prompt: 0, completion: 0, cost: 0 };
    current.prompt += promptTokens;
    current.completion += completionTokens;
    current.cost += cost;
    this.tokenUsage.set(component, current);
    
    // Update total cost
    this.costAccumulator += cost;
    
    // Emit event
    this.emit('tokenUsage', {
      timestamp: new Date(),
      component,
      promptTokens,
      completionTokens,
      cost
    } as TokenUsageEvent);
  }

  /**
   * Record API call
   */
  recordApiCall(service: string, endpoint: string, responseTime: number, rateLimited = false): void {
    const current = this.apiCalls.get(service) || { count: 0, rateLimited: 0, totalTime: 0 };
    current.count++;
    current.totalTime += responseTime;
    if (rateLimited) current.rateLimited++;
    this.apiCalls.set(service, current);
    
    // Update API metrics
    const metrics = this.apiMetrics.get(service) || { success: 0, failure: 0, avgLatency: 0 };
    if (!rateLimited) {
      metrics.success++;
      metrics.avgLatency = ((metrics.avgLatency * (metrics.success - 1)) + responseTime) / metrics.success;
    } else {
      metrics.failure++;
    }
    this.apiMetrics.set(service, metrics);
    
    this.emit('apiCall', {
      timestamp: new Date(),
      service,
      endpoint,
      responseTime,
      rateLimited
    } as ApiCallEvent);
    
    // Alert on rate limiting
    if (rateLimited) {
      console.log(chalk.yellow(`\n⚠️  Rate limited on ${service}: ${endpoint}`));
    }
  }

  /**
   * Record performance metric
   */
  recordPerformance(component: string, phase: string, duration: number): void {
    const key = `${component}:${phase}`;
    const durations = this.performanceData.get(key) || [];
    durations.push(duration);
    this.performanceData.set(key, durations);
    
    const memory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
    
    this.emit('performance', {
      timestamp: new Date(),
      component,
      phase,
      duration,
      memory
    } as PerformanceEvent);
  }

  /**
   * Get current statistics
   */
  getStatistics(): any {
    const elapsed = (Date.now() - this.startTime) / 1000; // seconds
    
    // Calculate totals
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalCost = 0;
    
    this.tokenUsage.forEach(usage => {
      totalPromptTokens += usage.prompt;
      totalCompletionTokens += usage.completion;
      totalCost += usage.cost;
    });
    
    // Calculate API statistics
    let totalApiCalls = 0;
    let totalRateLimited = 0;
    let avgResponseTime = 0;
    
    this.apiCalls.forEach(data => {
      totalApiCalls += data.count;
      totalRateLimited += data.rateLimited;
      avgResponseTime += data.totalTime;
    });
    
    if (totalApiCalls > 0) {
      avgResponseTime = avgResponseTime / totalApiCalls;
    }
    
    // Performance bottlenecks
    const bottlenecks = this.identifyBottlenecks();
    
    // API service breakdown
    const apiServiceMetrics: Record<string, any> = {};
    this.apiMetrics.forEach((metrics, service) => {
      apiServiceMetrics[service] = {
        successRate: metrics.success > 0 ? (metrics.success / (metrics.success + metrics.failure)) * 100 : 0,
        avgLatency: metrics.avgLatency,
        totalCalls: metrics.success + metrics.failure
      };
    });
    
    return {
      elapsed,
      tokens: {
        prompt: totalPromptTokens,
        completion: totalCompletionTokens,
        total: totalPromptTokens + totalCompletionTokens,
        tokensPerSecond: (totalPromptTokens + totalCompletionTokens) / elapsed
      },
      cost: {
        total: totalCost,
        costPerMinute: (totalCost / elapsed) * 60,
        projectedHourly: (totalCost / elapsed) * 3600
      },
      api: {
        totalCalls: totalApiCalls,
        rateLimited: totalRateLimited,
        rateLimitPercentage: totalApiCalls > 0 ? (totalRateLimited / totalApiCalls) * 100 : 0,
        avgResponseTime,
        serviceMetrics: apiServiceMetrics
      },
      memory: {
        current: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        peak: process.memoryUsage().heapTotal / 1024 / 1024
      },
      bottlenecks,
      components: this.getComponentBreakdown()
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const stats = this.getStatistics();
    const report: string[] = [];
    
    report.push(chalk.bold('\n📊 Performance Report'));
    report.push(chalk.gray('─'.repeat(60)));
    
    // Execution summary
    report.push(chalk.bold('\n⏱️  Execution Summary:'));
    report.push(`  Total Time: ${this.formatDuration(stats.elapsed)}`);
    report.push(`  Memory Usage: ${stats.memory.current.toFixed(2)} MB (peak: ${stats.memory.peak.toFixed(2)} MB)`);
    
    // Token usage
    report.push(chalk.bold('\n📝 Token Usage:'));
    report.push(`  Prompt Tokens: ${stats.tokens.prompt.toLocaleString()}`);
    report.push(`  Completion Tokens: ${stats.tokens.completion.toLocaleString()}`);
    report.push(`  Total Tokens: ${stats.tokens.total.toLocaleString()}`);
    report.push(`  Rate: ${stats.tokens.tokensPerSecond.toFixed(2)} tokens/second`);
    
    // Cost analysis
    report.push(chalk.bold('\n💰 Cost Analysis:'));
    report.push(`  Total Cost: ${chalk.green('$' + stats.cost.total.toFixed(4))}`);
    report.push(`  Cost/Minute: $${stats.cost.costPerMinute.toFixed(4)}`);
    report.push(`  Projected Hourly: $${stats.cost.projectedHourly.toFixed(2)}`);
    
    // API usage
    report.push(chalk.bold('\n🔌 API Usage:'));
    report.push(`  Total Calls: ${stats.api.totalCalls}`);
    report.push(`  Rate Limited: ${stats.api.rateLimited} (${stats.api.rateLimitPercentage.toFixed(1)}%)`);
    report.push(`  Avg Response Time: ${stats.api.avgResponseTime.toFixed(2)}ms`);
    
    // API service breakdown
    if (Object.keys(stats.api.serviceMetrics).length > 0) {
      report.push('\n  Service Breakdown:');
      Object.entries(stats.api.serviceMetrics).forEach(([service, metrics]: [string, any]) => {
        report.push(`    ${service}:`);
        report.push(`      Success Rate: ${metrics.successRate.toFixed(1)}%`);
        report.push(`      Avg Latency: ${metrics.avgLatency.toFixed(2)}ms`);
        report.push(`      Total Calls: ${metrics.totalCalls}`);
      });
    }
    
    // Component breakdown
    report.push(chalk.bold('\n🔧 Component Breakdown:'));
    stats.components.forEach((component: any) => {
      const costColor = component.cost > 1 ? chalk.red : component.cost > 0.5 ? chalk.yellow : chalk.green;
      report.push(`  ${component.name}:`);
      report.push(`    Tokens: ${component.tokens.toLocaleString()}`);
      report.push(`    Cost: ${costColor('$' + component.cost.toFixed(4))}`);
      report.push(`    Time: ${component.avgTime.toFixed(2)}s`);
    });
    
    // Bottlenecks
    if (stats.bottlenecks.length > 0) {
      report.push(chalk.bold('\n⚠️  Performance Bottlenecks:'));
      stats.bottlenecks.forEach((bottleneck: any) => {
        report.push(`  ${chalk.yellow(bottleneck.component)}: ${bottleneck.avgTime.toFixed(2)}s average`);
      });
    }
    
    // Recommendations
    report.push(chalk.bold('\n💡 Recommendations:'));
    report.push(...this.generateRecommendations(stats));
    
    return report.join('\n');
  }

  /**
   * Private helper methods
   */
  private setupEventHandlers(): void {
    this.on('tokenUsage', (event: TokenUsageEvent) => {
      if (event.cost > 0.10) { // Alert on expensive operations
        console.log(chalk.yellow(`\n💸 High cost operation: ${event.component} - $${event.cost.toFixed(4)}`));
      }
    });
    
    this.on('performance', (event: PerformanceEvent) => {
      if (event.duration > 30000) { // Alert on slow operations (>30s)
        console.log(chalk.red(`\n🐌 Slow operation: ${event.component}/${event.phase} - ${(event.duration / 1000).toFixed(2)}s`));
      }
    });
  }

  private resetCounters(): void {
    this.tokenUsage.clear();
    this.apiCalls.clear();
    this.performanceData.clear();
    this.apiMetrics.clear();
    this.costAccumulator = 0;
  }

  private startRealTimeDisplay(): void {
    // Update display every second
    const updateInterval = setInterval(() => {
      this.updateDisplay();
    }, 1000);
    
    // Clean up on exit
    process.on('SIGINT', () => {
      clearInterval(updateInterval);
      if (this.spinner) this.spinner.stop();
      console.log(this.generateReport());
      process.exit(0);
    });
  }

  private updateDisplay(): void {
    const stats = this.getStatistics();
    const elapsed = this.formatDuration(stats.elapsed);
    
    const displayText = [
      `⏱️  ${elapsed}`,
      `📝 ${stats.tokens.total.toLocaleString()} tokens`,
      `💰 $${stats.cost.total.toFixed(4)}`,
      `🔌 ${stats.api.totalCalls} API calls`,
      `💾 ${stats.memory.current.toFixed(0)} MB`
    ].join(' | ');
    
    if (!this.spinner) {
      this.spinner = ora(displayText).start();
    } else {
      this.spinner.text = displayText;
    }
  }

  private identifyBottlenecks(): any[] {
    const bottlenecks: any[] = [];
    
    this.performanceData.forEach((durations, key) => {
      const [component, phase] = key.split(':');
      const avgTime = durations.reduce((a, b) => a + b, 0) / durations.length / 1000; // seconds
      
      if (avgTime > 10) { // Operations taking more than 10 seconds
        bottlenecks.push({
          component,
          phase,
          avgTime,
          count: durations.length
        });
      }
    });
    
    return bottlenecks.sort((a, b) => b.avgTime - a.avgTime).slice(0, 5);
  }

  private getComponentBreakdown(): any[] {
    const components: any[] = [];
    
    this.tokenUsage.forEach((usage, name) => {
      const performanceKey = Array.from(this.performanceData.keys()).find(k => k.startsWith(name + ':'));
      const durations = performanceKey ? this.performanceData.get(performanceKey) || [] : [];
      const avgTime = durations.length > 0 ? 
        durations.reduce((a, b) => a + b, 0) / durations.length / 1000 : 0;
      
      components.push({
        name,
        tokens: usage.prompt + usage.completion,
        cost: usage.cost,
        avgTime
      });
    });
    
    return components.sort((a, b) => b.cost - a.cost);
  }

  private generateRecommendations(stats: any): string[] {
    const recommendations: string[] = [];
    
    // Cost recommendations
    if (stats.cost.projectedHourly > 100) {
      recommendations.push(`  ${chalk.red('•')} Consider using Claude 3 Haiku for non-critical analysis (80% cost reduction)`);
    }
    
    // Token usage recommendations
    if (stats.tokens.tokensPerSecond < 100) {
      recommendations.push(`  ${chalk.yellow('•')} Token processing is slow - check network latency`);
    }
    
    // API recommendations
    if (stats.api.rateLimitPercentage > 10) {
      recommendations.push(`  ${chalk.yellow('•')} High rate limiting detected - implement request queuing`);
    }
    
    // Memory recommendations
    if (stats.memory.current > 1024) {
      recommendations.push(`  ${chalk.yellow('•')} High memory usage - consider streaming large responses`);
    }
    
    // Component-specific recommendations
    const expensiveComponents = stats.components.filter((c: any) => c.cost > 0.50);
    if (expensiveComponents.length > 0) {
      recommendations.push(`  ${chalk.yellow('•')} Optimize prompts for: ${expensiveComponents.map((c: any) => c.name).join(', ')}`);
    }
    
    return recommendations;
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Example usage and testing
if (require.main === module) {
  const monitor = new PerformanceMonitor();
  
  // Start monitoring
  monitor.startSession('Test Performance Monitoring');
  
  // Simulate various operations
  const simulateOperations = async () => {
    // Simulate agent operations
    const agents = ['security', 'performance', 'architecture', 'codeQuality', 'dependencies'];
    
    for (const agent of agents) {
      const startTime = Date.now();
      
      // Simulate token usage
      monitor.recordTokenUsage(agent, 
        Math.floor(Math.random() * 5000) + 1000,
        Math.floor(Math.random() * 8000) + 2000,
        'sonnet'
      );
      
      // Simulate API calls
      monitor.recordApiCall('github', `/repos/analyze`, Math.random() * 500, Math.random() < 0.1);
      monitor.recordApiCall('openai', `/completions`, Math.random() * 2000, Math.random() < 0.05);
      
      // Record performance
      const duration = Date.now() - startTime + Math.random() * 10000;
      monitor.recordPerformance(agent, 'analysis', duration);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Simulate tools
    const tools = ['eslint', 'npm-audit', 'madge', 'dependency-cruiser'];
    
    for (const tool of tools) {
      const startTime = Date.now();
      
      monitor.recordTokenUsage(tool,
        Math.floor(Math.random() * 1000) + 500,
        Math.floor(Math.random() * 2000) + 500,
        'haiku'
      );
      
      monitor.recordApiCall('mcp', `/tools/${tool}`, Math.random() * 1000, false);
      
      const duration = Date.now() - startTime + Math.random() * 5000;
      monitor.recordPerformance(tool, 'execution', duration);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Generate final report
    setTimeout(() => {
      console.log(monitor.generateReport());
      process.exit(0);
    }, 2000);
  };
  
  simulateOperations().catch(console.error);
}