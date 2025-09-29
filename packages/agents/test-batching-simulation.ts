#!/usr/bin/env npx ts-node

import { createFileBatcher } from './src/two-branch/utils/file-batcher';
import { execSync } from 'child_process';
import * as fs from 'fs';

async function simulateBatchedAnalysis() {
  console.log('🎯 Apache Kafka Batched Analysis Simulation');
  console.log('=' .repeat(60));
  console.log('📅 Date:', new Date().toISOString());
  console.log('🔧 Simulating Oracle A1.Flex environment (4 CPUs, 24GB RAM)');
  console.log('=' .repeat(60) + '\n');

  // Get all Java files
  const allFiles = execSync(
    'find /tmp/kafka-repo -name "*.java" -type f | grep -v "/test/" | grep -v "Test.java"',
    { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
  ).trim().split('\n').filter(f => f.length > 0);

  console.log(`📊 Repository Statistics:`);
  console.log(`   Total Java files (non-test): ${allFiles.length}`);
  console.log(`   Estimated total size: ${(allFiles.length * 10 / 1024).toFixed(1)} MB\n`);

  // Test configurations
  const configs = [
    {
      name: 'Conservative (2 parallel)',
      concurrent: 2,
      size: 500,
      threads: 4,
      cpuPerBatch: 2
    },
    {
      name: 'Balanced (4 parallel)',
      concurrent: 4,
      size: 300,
      threads: 3,
      cpuPerBatch: 1
    },
    {
      name: 'Aggressive (6 parallel)',
      concurrent: 6,
      size: 250,
      threads: 2,
      cpuPerBatch: 0.66
    },
    {
      name: 'Maximum (8 parallel)',
      concurrent: 8,
      size: 200,
      threads: 2,
      cpuPerBatch: 0.5
    },
    {
      name: 'Extreme (12 parallel)',
      concurrent: 12,
      size: 150,
      threads: 1,
      cpuPerBatch: 0.33
    }
  ];

  console.log('📋 Testing Configurations:\n');

  for (const config of configs) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔧 ${config.name}`);
    console.log(`${'='.repeat(60)}`);

    const batcher = createFileBatcher({
      maxFilesPerBatch: config.size,
      concurrentBatches: config.concurrent
    });

    const batches = await batcher.createBatches(allFiles);

    console.log(`Configuration:`);
    console.log(`  Concurrent batches: ${config.concurrent}`);
    console.log(`  Files per batch: ${config.size}`);
    console.log(`  PMD threads per batch: ${config.threads}`);
    console.log(`  CPUs per batch: ${config.cpuPerBatch}`);
    console.log(`  Total CPU usage: ${(config.concurrent * config.cpuPerBatch).toFixed(1)} CPUs`);

    console.log(`\nBatch Distribution:`);
    console.log(`  Total batches: ${batches.length}`);
    console.log(`  Parallel rounds: ${Math.ceil(batches.length / config.concurrent)}`);

    // Simulate timing
    const baseTimePerFile = 0.05; // seconds per file with 1 thread
    const threadSpeedup = Math.log2(config.threads) + 1; // Diminishing returns
    const timePerBatch = (config.size * baseTimePerFile) / threadSpeedup;
    const parallelRounds = Math.ceil(batches.length / config.concurrent);
    const totalTime = parallelRounds * timePerBatch;

    // Add overhead for context switching
    const overhead = config.concurrent > 4 ? 1.1 + (config.concurrent - 4) * 0.05 : 1.0;
    const adjustedTime = totalTime * overhead;

    console.log(`\nPerformance Estimate:`);
    console.log(`  Time per batch: ${timePerBatch.toFixed(1)}s`);
    console.log(`  Parallel rounds: ${parallelRounds}`);
    console.log(`  Base time: ${totalTime.toFixed(1)}s`);
    console.log(`  With overhead: ${adjustedTime.toFixed(1)}s`);

    // Performance metrics
    const throughput = allFiles.length / adjustedTime;
    const efficiency = (totalTime / adjustedTime) * 100;

    console.log(`\n📊 Metrics:`);
    console.log(`  Throughput: ${throughput.toFixed(1)} files/sec`);
    console.log(`  Efficiency: ${efficiency.toFixed(1)}%`);
    console.log(`  Memory usage: ~${(config.concurrent * 1.5).toFixed(1)}GB`);

    if (adjustedTime < 30) {
      console.log(`  🎉 SUB-30 SECOND ANALYSIS ACHIEVED!`);
    } else if (adjustedTime < 60) {
      console.log(`  ✅ SUB-MINUTE ANALYSIS ACHIEVED!`);
    }

    // Warnings
    if (config.concurrent * config.cpuPerBatch > 4) {
      console.log(`  ⚠️  CPU oversubscription: ${((config.concurrent * config.cpuPerBatch / 4) * 100).toFixed(0)}%`);
    }
    if (config.concurrent * 1.5 > 20) {
      console.log(`  ⚠️  High memory usage - monitor for OOM`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SIMULATION SUMMARY');
  console.log('='.repeat(60));

  const bestConfig = configs.reduce((best, current) => {
    const currentTime = Math.ceil(allFiles.length / current.size / current.concurrent) *
                       (current.size * 0.05 / (Math.log2(current.threads) + 1)) *
                       (current.concurrent > 4 ? 1.1 + (current.concurrent - 4) * 0.05 : 1.0);
    const bestTime = Math.ceil(allFiles.length / best.size / best.concurrent) *
                    (best.size * 0.05 / (Math.log2(best.threads) + 1)) *
                    (best.concurrent > 4 ? 1.1 + (best.concurrent - 4) * 0.05 : 1.0);

    return currentTime < bestTime ? current : best;
  });

  console.log(`\n✅ RECOMMENDED CONFIGURATION: ${bestConfig.name}`);
  console.log(`   - ${bestConfig.concurrent} parallel batches`);
  console.log(`   - ${bestConfig.size} files per batch`);
  console.log(`   - ${bestConfig.threads} PMD threads per batch`);

  // Next steps
  console.log('\n📝 Next Steps:');
  console.log('1. Run actual PMD test with recommended configuration');
  console.log('2. If > 30s, try Extreme (12 parallel) despite CPU oversubscription');
  console.log('3. If still > 30s, scale to 8 CPUs on Oracle A1.Flex');
  console.log('4. Implement two-branch caching for 5-10s PR analysis');

  // Save results
  const results = {
    timestamp: new Date().toISOString(),
    repository: 'apache/kafka',
    totalFiles: allFiles.length,
    configurations: configs.map(c => ({
      name: c.name,
      concurrent: c.concurrent,
      batchSize: c.size,
      estimatedTime: Math.ceil(allFiles.length / c.size / c.concurrent) *
                    (c.size * 0.05 / (Math.log2(c.threads) + 1)) *
                    (c.concurrent > 4 ? 1.1 + (c.concurrent - 4) * 0.05 : 1.0)
    })),
    recommendation: bestConfig.name
  };

  const resultsPath = '/tmp/batching-simulation-results.json';
  await fs.promises.writeFile(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Results saved to: ${resultsPath}`);
}

// Run simulation
simulateBatchedAnalysis().catch(error => {
  console.error('❌ Simulation failed:', error);
  process.exit(1);
});