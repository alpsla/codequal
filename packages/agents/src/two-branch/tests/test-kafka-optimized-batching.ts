#!/usr/bin/env npx ts-node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { FileBatcher, FileBatch, createFileBatcher } from '../utils/file-batcher';

interface OptimizationStrategy {
  name: string;
  concurrentBatches: number;
  threadsPerBatch: number;
  cpusPerBatch: string;
  memoryPerBatch: string;
  batchSize: number;
}

class OptimizedKafkaBatchAnalyzer {
  private batcher: FileBatcher;
  private repoPath = '/tmp/kafka-repo';

  // Test different optimization strategies
  private strategies: OptimizationStrategy[] = [
    {
      name: 'Conservative (Original)',
      concurrentBatches: 2,
      threadsPerBatch: 4,
      cpusPerBatch: '2',
      memoryPerBatch: '3g',
      batchSize: 500
    },
    {
      name: 'Balanced',
      concurrentBatches: 3,
      threadsPerBatch: 2,
      cpusPerBatch: '1.3',
      memoryPerBatch: '2g',
      batchSize: 400
    },
    {
      name: 'Aggressive',
      concurrentBatches: 4,
      threadsPerBatch: 2,
      cpusPerBatch: '1',
      memoryPerBatch: '1.5g',
      batchSize: 350
    },
    {
      name: 'Ultra-Parallel',
      concurrentBatches: 6,
      threadsPerBatch: 1,
      cpusPerBatch: '0.66',
      memoryPerBatch: '1g',
      batchSize: 250
    },
    {
      name: 'Optimal (Recommended)',
      concurrentBatches: 4,
      threadsPerBatch: 3,
      cpusPerBatch: '1',
      memoryPerBatch: '2g',
      batchSize: 300
    }
  ];

  async testAllStrategies(): Promise<void> {
    console.log('🚀 Oracle A1.Flex Optimization Test');
    console.log('=' .repeat(60));
    console.log('💻 Hardware: 4 OCPUs, 24GB RAM');
    console.log('💾 With Redis caching reducing I/O bottlenecks');
    console.log('=' .repeat(60) + '\n');

    // Prepare repository
    await this.prepareRepository();

    // Get Java files
    const javaFiles = await this.findJavaFiles();
    console.log(`📊 Total Java files: ${javaFiles.length}\n`);

    const results: any[] = [];

    for (const strategy of this.strategies) {
      console.log(`\n🔧 Testing Strategy: ${strategy.name}`);
      console.log('-'.repeat(40));

      const result = await this.testStrategy(strategy, javaFiles);
      results.push(result);

      // Add a small delay between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Display comparison
    this.displayComparison(results);

    // Save detailed report
    await this.saveOptimizationReport(results, javaFiles.length);
  }

  async testStrategy(strategy: OptimizationStrategy, javaFiles: string[]): Promise<any> {
    console.log(`Configuration:`);
    console.log(`  Concurrent batches: ${strategy.concurrentBatches}`);
    console.log(`  Threads per batch: ${strategy.threadsPerBatch}`);
    console.log(`  CPUs per batch: ${strategy.cpusPerBatch}`);
    console.log(`  Memory per batch: ${strategy.memoryPerBatch}`);
    console.log(`  Files per batch: ${strategy.batchSize}`);

    // Create batcher with strategy config
    const batcher = createFileBatcher({
      maxFilesPerBatch: strategy.batchSize,
      concurrentBatches: strategy.concurrentBatches,
      prioritizeBySize: true
    });

    const batches = await batcher.createBatches(javaFiles);
    console.log(`  Total batches: ${batches.length}`);

    const startTime = Date.now();

    try {
      // Simulate batch processing
      const results = await this.processBatchesWithStrategy(
        batches,
        strategy,
        batcher
      );

      const duration = (Date.now() - startTime) / 1000;

      const successCount = results.filter(r => r.success).length;
      const totalViolations = results.reduce((sum, r) => sum + (r.violations || 0), 0);

      console.log(`\nResults:`);
      console.log(`  ✅ Total time: ${duration.toFixed(2)}s`);
      console.log(`  ✅ Successful batches: ${successCount}/${batches.length}`);
      console.log(`  ✅ Total violations: ${totalViolations}`);

      // Calculate efficiency metrics
      const cpuEfficiency = this.calculateCPUEfficiency(strategy, duration, batches.length);
      const throughput = javaFiles.length / duration;

      console.log(`  📊 CPU efficiency: ${cpuEfficiency.toFixed(1)}%`);
      console.log(`  📊 Throughput: ${throughput.toFixed(1)} files/sec`);

      return {
        strategy: strategy.name,
        config: strategy,
        duration,
        batches: batches.length,
        successCount,
        totalViolations,
        cpuEfficiency,
        throughput,
        filesAnalyzed: javaFiles.length
      };

    } catch (error) {
      console.error(`  ❌ Strategy failed:`, error);
      return {
        strategy: strategy.name,
        config: strategy,
        error: error.message,
        filesAnalyzed: javaFiles.length
      };
    }
  }

  private async processBatchesWithStrategy(
    batches: FileBatch[],
    strategy: OptimizationStrategy,
    batcher: FileBatcher
  ): Promise<any[]> {
    // Process with the specified concurrency
    return await batcher.processBatchesInParallel(
      batches,
      async (batch) => await this.runPMDWithStrategy(batch, strategy)
    );
  }

  private async runPMDWithStrategy(
    batch: FileBatch,
    strategy: OptimizationStrategy
  ): Promise<any> {
    const startTime = Date.now();

    // Create file list
    const tmpDir = '/tmp/pmd-optimization';
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const fileListPath = path.join(tmpDir, `${batch.id}-files.txt`);
    await fs.promises.writeFile(fileListPath, batch.files.join('\n'), 'utf8');

    try {
      const command = [
        'docker', 'run', '--rm',
        '--platform=linux/arm64',
        '-v', `${this.repoPath}:/workspace`,
        '-v', `${fileListPath}:/filelist.txt`,
        '-w', '/workspace',
        `--cpus=${strategy.cpusPerBatch}`,
        `--memory=${strategy.memoryPerBatch}`,
        'iad.ocir.io/idzaw9ddo1h5/codequal-analyzers/analyzer:lang-java-v5.1-arm',
        'pmd', 'pmd',
        '--file-list', '/filelist.txt',
        '-R', 'category/java/errorprone.xml',
        '-f', 'text',
        '-t', strategy.threadsPerBatch.toString(),
        '--no-cache'
      ].join(' ');

      const output = execSync(command, {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 120000
      });

      const duration = (Date.now() - startTime) / 1000;
      const violations = (output.match(/\.java:\d+:/g) || []).length;

      return {
        batchId: batch.id,
        violations,
        duration,
        success: true,
        fileCount: batch.fileCount
      };

    } catch (error: any) {
      const duration = (Date.now() - startTime) / 1000;

      if (error.stdout) {
        const violations = (error.stdout.match(/\.java:\d+:/g) || []).length;
        return {
          batchId: batch.id,
          violations,
          duration,
          success: true,
          fileCount: batch.fileCount
        };
      }

      return {
        batchId: batch.id,
        violations: 0,
        duration,
        success: false,
        error: error.message,
        fileCount: batch.fileCount
      };
    } finally {
      if (fs.existsSync(fileListPath)) {
        fs.unlinkSync(fileListPath);
      }
    }
  }

  private calculateCPUEfficiency(
    strategy: OptimizationStrategy,
    actualDuration: number,
    batchCount: number
  ): number {
    // Theoretical minimum time if perfectly parallel
    const theoreticalMinTime = (batchCount / strategy.concurrentBatches) * 20; // Assume 20s per batch baseline

    // Calculate efficiency
    const efficiency = (theoreticalMinTime / actualDuration) * 100;

    // Cap at 100%
    return Math.min(efficiency, 100);
  }

  private displayComparison(results: any[]): void {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 STRATEGY COMPARISON');
    console.log('=' .repeat(60));

    // Sort by throughput
    const sorted = results
      .filter(r => !r.error)
      .sort((a, b) => b.throughput - a.throughput);

    console.log('\n🏆 Performance Ranking:');
    sorted.forEach((result, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      console.log(`${medal} ${result.strategy}:`);
      console.log(`     Time: ${result.duration.toFixed(2)}s`);
      console.log(`     Throughput: ${result.throughput.toFixed(1)} files/sec`);
      console.log(`     CPU Efficiency: ${result.cpuEfficiency.toFixed(1)}%`);
      console.log(`     Config: ${result.config.concurrentBatches} parallel, ${result.config.threadsPerBatch} threads/batch`);
    });

    // Find optimal
    const optimal = sorted[0];
    if (optimal) {
      console.log('\n✅ RECOMMENDED CONFIGURATION:');
      console.log(`   Strategy: ${optimal.strategy}`);
      console.log(`   Concurrent batches: ${optimal.config.concurrentBatches}`);
      console.log(`   Threads per batch: ${optimal.config.threadsPerBatch}`);
      console.log(`   Expected time for 3,489 files: ${optimal.duration.toFixed(2)}s`);

      // Calculate improvement over conservative
      const conservative = results.find(r => r.strategy === 'Conservative (Original)');
      if (conservative && conservative !== optimal) {
        const improvement = ((conservative.duration - optimal.duration) / conservative.duration) * 100;
        console.log(`   Improvement: ${improvement.toFixed(1)}% faster than conservative approach`);
      }
    }
  }

  private async saveOptimizationReport(results: any[], fileCount: number): Promise<void> {
    const reportDir = path.join(__dirname, '..', 'test-results', 'optimization-reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportDir, `kafka-optimization-${timestamp}.json`);

    const report = {
      timestamp: new Date().toISOString(),
      hardware: {
        cpus: 4,
        memory: '24GB',
        platform: 'Oracle A1.Flex ARM64'
      },
      repository: 'apache/kafka',
      totalFiles: fileCount,
      strategies: results,
      recommendations: this.generateRecommendations(results)
    };

    await fs.promises.writeFile(
      reportPath,
      JSON.stringify(report, null, 2),
      'utf8'
    );

    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  private generateRecommendations(results: any[]): string[] {
    const recommendations: string[] = [];

    const successful = results.filter(r => !r.error);
    if (successful.length === 0) {
      recommendations.push('All strategies failed - check Docker and registry connectivity');
      return recommendations;
    }

    const best = successful.sort((a, b) => b.throughput - a.throughput)[0];

    recommendations.push(`Use ${best.strategy} strategy for optimal performance`);
    recommendations.push(`Configure ${best.config.concurrentBatches} concurrent batches with ${best.config.threadsPerBatch} threads each`);

    if (best.duration < 60) {
      recommendations.push('Performance is excellent - suitable for CI/CD pipelines');
    } else if (best.duration < 120) {
      recommendations.push('Performance is good - consider two-branch caching for further optimization');
    } else {
      recommendations.push('Performance needs improvement - implement progressive analysis');
    }

    // Memory recommendations
    const totalMemoryUsed = best.config.concurrentBatches *
      parseFloat(best.config.memoryPerBatch.replace('g', ''));

    if (totalMemoryUsed > 20) {
      recommendations.push(`High memory usage (${totalMemoryUsed}GB) - monitor for OOM issues`);
    }

    return recommendations;
  }

  private async prepareRepository(): Promise<void> {
    if (!fs.existsSync(this.repoPath)) {
      console.log('📦 Cloning Apache Kafka repository...');
      execSync(
        `git clone --depth 1 https://github.com/apache/kafka.git ${this.repoPath}`,
        { stdio: 'inherit' }
      );
    } else {
      console.log('📦 Using existing Kafka repository clone');
    }
  }

  private async findJavaFiles(): Promise<string[]> {
    const output = execSync(
      `find ${this.repoPath} -name "*.java" -type f | grep -v "/test/" | grep -v "Test.java"`,
      { encoding: 'utf8' }
    );

    return output.trim().split('\n').filter(f => f.length > 0);
  }
}

// Quick test with just the recommended configuration
export async function testOptimalConfiguration(): Promise<void> {
  console.log('⚡ Testing Optimal Configuration Only');
  console.log('=' .repeat(60));

  const strategy: OptimizationStrategy = {
    name: 'Optimal-4-Parallel',
    concurrentBatches: 4,
    threadsPerBatch: 3,
    cpusPerBatch: '1',
    memoryPerBatch: '2g',
    batchSize: 300
  };

  const analyzer = new OptimizedKafkaBatchAnalyzer();
  await analyzer.testStrategy(strategy, await analyzer.findJavaFiles());
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--quick')) {
    await testOptimalConfiguration();
  } else {
    const analyzer = new OptimizedKafkaBatchAnalyzer();
    await analyzer.testAllStrategies();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}