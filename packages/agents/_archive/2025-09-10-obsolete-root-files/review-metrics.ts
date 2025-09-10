#!/usr/bin/env npx ts-node

/**
 * Script to review analysis metrics and monitoring results
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { AnalysisMonitor } from './src/standard/deepwiki/services/analysis-monitor';

interface StoredMetric {
  repositoryUrl: string;
  prNumber?: string;
  iterations: number;
  duration: number;
  memoryUsed: number;
  cacheHit: boolean;
  issuesFound: number;
  timestamp: string;
  success: boolean;
  error?: string;
}

async function reviewMetrics() {
  console.log('📊 DeepWiki Analysis Metrics Review\n');
  console.log('='.repeat(60));

  // 1. Check if metrics file exists
  const metricsFile = '/tmp/codequal-metrics/analysis-metrics.jsonl';
  
  try {
    const exists = await fs.access(metricsFile).then(() => true).catch(() => false);
    
    if (exists) {
      console.log('\n📁 Historical Metrics from Disk:\n');
      
      // Read all metrics from file
      const content = await fs.readFile(metricsFile, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line);
      
      if (lines.length === 0) {
        console.log('No historical metrics found.');
      } else {
        const metrics: StoredMetric[] = lines.map(line => JSON.parse(line));
        
        // Group by repository
        const byRepo = new Map<string, StoredMetric[]>();
        metrics.forEach(m => {
          const key = m.repositoryUrl;
          if (!byRepo.has(key)) byRepo.set(key, []);
          byRepo.get(key)!.push(m);
        });
        
        console.log(`Total Analyses: ${metrics.length}`);
        console.log(`Unique Repositories: ${byRepo.size}\n`);
        
        // Show metrics by repository
        byRepo.forEach((repoMetrics, repo) => {
          const repoName = repo.split('/').slice(-2).join('/');
          console.log(`\n📦 ${repoName}:`);
          console.log(`   Analyses: ${repoMetrics.length}`);
          
          const successful = repoMetrics.filter(m => m.success);
          if (successful.length > 0) {
            const avgIterations = successful.reduce((sum, m) => sum + m.iterations, 0) / successful.length;
            const avgDuration = successful.reduce((sum, m) => sum + m.duration, 0) / successful.length;
            const avgIssues = successful.reduce((sum, m) => sum + m.issuesFound, 0) / successful.length;
            const avgMemory = successful.reduce((sum, m) => sum + m.memoryUsed, 0) / successful.length;
            
            console.log(`   Success Rate: ${((successful.length / repoMetrics.length) * 100).toFixed(1)}%`);
            console.log(`   Avg Iterations: ${avgIterations.toFixed(2)}`);
            console.log(`   Avg Duration: ${(avgDuration / 1000).toFixed(2)}s`);
            console.log(`   Avg Issues: ${avgIssues.toFixed(1)}`);
            console.log(`   Avg Memory: ${(avgMemory / 1024 / 1024).toFixed(2)}MB`);
          }
          
          // Show recent analyses
          const recent = repoMetrics.slice(-3);
          console.log(`   Recent Analyses:`);
          recent.forEach(m => {
            const date = new Date(m.timestamp);
            const status = m.success ? '✅' : '❌';
            console.log(`     ${status} ${date.toLocaleString()} - ${m.iterations} iter, ${(m.duration/1000).toFixed(1)}s${m.prNumber ? ` (PR #${m.prNumber})` : ''}`);
            if (m.error) {
              console.log(`        Error: ${m.error}`);
            }
          });
        });
        
        // Overall statistics
        console.log('\n' + '='.repeat(60));
        console.log('📈 OVERALL STATISTICS\n');
        
        const successful = metrics.filter(m => m.success);
        const failed = metrics.filter(m => !m.success);
        
        console.log(`Success Rate: ${((successful.length / metrics.length) * 100).toFixed(1)}%`);
        console.log(`Total Successful: ${successful.length}`);
        console.log(`Total Failed: ${failed.length}`);
        
        if (successful.length > 0) {
          const iterations = successful.map(m => m.iterations);
          const durations = successful.map(m => m.duration);
          const issues = successful.map(m => m.issuesFound);
          const memory = successful.map(m => m.memoryUsed);
          
          console.log('\nIteration Statistics:');
          console.log(`  Average: ${(iterations.reduce((a,b) => a+b, 0) / iterations.length).toFixed(2)}`);
          console.log(`  Min: ${Math.min(...iterations)}`);
          console.log(`  Max: ${Math.max(...iterations)}`);
          
          // Distribution
          const distribution = new Map<number, number>();
          iterations.forEach(i => {
            distribution.set(i, (distribution.get(i) || 0) + 1);
          });
          console.log('  Distribution:');
          Array.from(distribution.entries())
            .sort((a, b) => a[0] - b[0])
            .forEach(([iter, count]) => {
              const pct = ((count / iterations.length) * 100).toFixed(1);
              const bar = '█'.repeat(Math.round(count * 30 / iterations.length));
              console.log(`    ${iter} iterations: ${bar} ${count} (${pct}%)`);
            });
          
          console.log('\nPerformance:');
          console.log(`  Avg Duration: ${(durations.reduce((a,b) => a+b, 0) / durations.length / 1000).toFixed(2)}s`);
          console.log(`  Avg Memory: ${(memory.reduce((a,b) => a+b, 0) / memory.length / 1024 / 1024).toFixed(2)}MB`);
          console.log(`  Avg Issues Found: ${(issues.reduce((a,b) => a+b, 0) / issues.length).toFixed(1)}`);
        }
        
        // Time-based analysis
        console.log('\n' + '='.repeat(60));
        console.log('📅 TIME-BASED ANALYSIS\n');
        
        const now = new Date();
        const last24h = metrics.filter(m => {
          const time = new Date(m.timestamp);
          return (now.getTime() - time.getTime()) < 24 * 60 * 60 * 1000;
        });
        
        const last7d = metrics.filter(m => {
          const time = new Date(m.timestamp);
          return (now.getTime() - time.getTime()) < 7 * 24 * 60 * 60 * 1000;
        });
        
        console.log(`Last 24 hours: ${last24h.length} analyses`);
        if (last24h.length > 0) {
          const avgIter24h = last24h.filter(m => m.success).reduce((sum, m) => sum + m.iterations, 0) / last24h.filter(m => m.success).length || 0;
          console.log(`  Avg Iterations: ${avgIter24h.toFixed(2)}`);
        }
        
        console.log(`Last 7 days: ${last7d.length} analyses`);
        if (last7d.length > 0) {
          const avgIter7d = last7d.filter(m => m.success).reduce((sum, m) => sum + m.iterations, 0) / last7d.filter(m => m.success).length || 0;
          console.log(`  Avg Iterations: ${avgIter7d.toFixed(2)}`);
        }
        
        // Failure analysis
        if (failed.length > 0) {
          console.log('\n' + '='.repeat(60));
          console.log('❌ FAILURE ANALYSIS\n');
          
          const errorTypes = new Map<string, number>();
          failed.forEach(m => {
            const error = m.error || 'Unknown error';
            const type = error.includes('timeout') ? 'Timeout' :
                        error.includes('authentication') ? 'Auth' :
                        error.includes('network') ? 'Network' :
                        error.includes('parse') ? 'Parse Error' :
                        'Other';
            errorTypes.set(type, (errorTypes.get(type) || 0) + 1);
          });
          
          console.log('Error Types:');
          Array.from(errorTypes.entries())
            .sort((a, b) => b[1] - a[1])
            .forEach(([type, count]) => {
              console.log(`  ${type}: ${count} (${((count / failed.length) * 100).toFixed(1)}%)`);
            });
          
          console.log('\nRecent Failures:');
          failed.slice(-5).forEach(m => {
            const date = new Date(m.timestamp);
            console.log(`  ${date.toLocaleString()} - ${m.repositoryUrl.split('/').slice(-2).join('/')}`);
            console.log(`    Error: ${m.error}`);
          });
        }
      }
    } else {
      console.log('No metrics file found at:', metricsFile);
      console.log('Run some analyses first to generate metrics.');
    }
    
  } catch (error) {
    console.error('Error reading metrics:', error);
  }
  
  // 2. Get current in-memory metrics
  console.log('\n' + '='.repeat(60));
  console.log('💾 CURRENT IN-MEMORY METRICS\n');
  
  const monitor = AnalysisMonitor.getInstance();
  const currentMetrics = monitor.getAggregatedMetrics();
  
  if (currentMetrics.totalAnalyses > 0) {
    console.log('Current Session:');
    console.log(`  Total Analyses: ${currentMetrics.totalAnalyses}`);
    console.log(`  Average Iterations: ${currentMetrics.averageIterations.toFixed(2)}`);
    console.log(`  Success Rate: ${(currentMetrics.successRate * 100).toFixed(1)}%`);
    console.log(`  Cache Hit Rate: ${(currentMetrics.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`  Avg Duration: ${(currentMetrics.averageDuration / 1000).toFixed(2)}s`);
    console.log(`  Avg Memory: ${(currentMetrics.averageMemoryUsed / 1024 / 1024).toFixed(2)}MB`);
  } else {
    console.log('No analyses in current session.');
  }
  
  // 3. Generate report
  const report = await monitor.generateReport();
  console.log('\n' + '='.repeat(60));
  console.log('📄 GENERATED REPORT\n');
  console.log(report);
  
  console.log('\n✅ Metrics review completed!');
  console.log('\nTip: Run analyses to generate more metrics, then review again.');
}

// Run the review
reviewMetrics().catch(error => {
  console.error('Review failed:', error);
  process.exit(1);
});