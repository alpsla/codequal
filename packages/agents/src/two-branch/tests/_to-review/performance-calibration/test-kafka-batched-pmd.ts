#!/usr/bin/env npx ts-node

import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawn } from 'child_process';
import { FileBatcher, FileBatch, createFileBatcher } from '../utils/file-batcher';

interface PMDResult {
  batchId: string;
  violations: number;
  duration: number;
  output: string;
}

class KafkaBatchedPMDAnalyzer {
  private batcher: FileBatcher;
  private repoPath = '/tmp/kafka-repo';
  private readonly PMD_THREADS = 4; // Optimal from testing

  constructor() {
    // Configure batcher for PMD analysis
    this.batcher = createFileBatcher({
      maxFilesPerBatch: 500, // Manageable batch size
      maxBatchSizeBytes: 25 * 1024 * 1024, // 25MB per batch
      concurrentBatches: 2, // Run 2 batches in parallel on Oracle A1
      prioritizeBySize: true,
      excludePatterns: ['test/', 'tests/', 'Test.java', 'Mock']
    });
  }

  async runAnalysis(): Promise<void> {
    console.log('🎯 Apache Kafka Batched PMD Analysis');
    console.log('=' .repeat(60));
    console.log(`📅 Date: ${new Date().toISOString()}`);
    console.log(`🔧 Configuration:`);
    console.log(`   PMD Threads: ${this.PMD_THREADS}`);
    console.log(`   Files per batch: 500 max`);
    console.log(`   Concurrent batches: 2`);
    console.log('=' .repeat(60) + '\n');

    const overallStart = Date.now();

    // Step 1: Prepare repository
    await this.prepareRepository();

    // Step 2: Get all Java files
    console.log('\n📊 Discovering Java files...');
    const javaFiles = await this.findJavaFiles();
    console.log(`   Found ${javaFiles.length} Java files`);

    // Step 3: Create batches
    const batches = await this.batcher.createBatches(javaFiles);

    // Step 4: Process batches
    console.log('\n🚀 Starting batch processing...');
    const results = await this.processBatches(batches);

    // Step 5: Aggregate results
    const totalDuration = (Date.now() - overallStart) / 1000;
    this.displayResults(results, totalDuration);

    // Step 6: Save detailed report
    await this.saveReport(results, batches, totalDuration);
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
      `find ${this.repoPath} -name "*.java" -type f | grep -v "/test/" | grep -v "/tests/" | grep -v "Test.java"`,
      { encoding: 'utf8' }
    );

    return output.trim().split('\n').filter(f => f.length > 0);
  }

  private async processBatches(batches: FileBatch[]): Promise<PMDResult[]> {
    // Process batches with parallelism
    return await this.batcher.processBatchesInParallel(
      batches,
      async (batch) => await this.runPMDOnBatch(batch)
    );
  }

  private async runPMDOnBatch(batch: FileBatch): Promise<PMDResult> {
    const startTime = Date.now();

    // Create temporary file list for this batch
    const tmpDir = '/tmp/pmd-batches';
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const fileListPath = path.join(tmpDir, `${batch.id}-files.txt`);
    await fs.promises.writeFile(fileListPath, batch.files.join('\n'), 'utf8');

    try {
      // Run PMD with Docker
      const command = [
        'docker', 'run', '--rm',
        '--platform=linux/arm64',
        '-v', `${this.repoPath}:/workspace`,
        '-v', `${fileListPath}:/filelist.txt`,
        '-w', '/workspace',
        '--cpus=2', // 2 CPUs per batch
        '--memory=3g',
        'iad.ocir.io/idzaw9ddo1h5/codequal-analyzers/analyzer:lang-java-v5.1-arm',
        'pmd', 'pmd',
        '--file-list', '/filelist.txt',
        '-R', 'category/java/errorprone.xml',
        '-f', 'text',
        '-t', this.PMD_THREADS.toString(),
        '--no-cache'
      ].join(' ');

      console.log(`   Running: PMD on ${batch.fileCount} files with ${this.PMD_THREADS} threads`);

      const output = execSync(command, {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        timeout: 120000 // 2 minute timeout per batch
      });

      const duration = (Date.now() - startTime) / 1000;

      // Count violations
      const violations = (output.match(/\.java:\d+:/g) || []).length;

      return {
        batchId: batch.id,
        violations,
        duration,
        output: output.substring(0, 1000) // Store sample output
      };

    } catch (error: any) {
      const duration = (Date.now() - startTime) / 1000;

      // PMD exits with non-zero on violations, which is expected
      if (error.stdout) {
        const violations = (error.stdout.match(/\.java:\d+:/g) || []).length;
        return {
          batchId: batch.id,
          violations,
          duration,
          output: error.stdout.substring(0, 1000)
        };
      }

      // Real error
      console.error(`   ❌ Batch ${batch.id} failed:`, error.message);
      return {
        batchId: batch.id,
        violations: 0,
        duration,
        output: `Error: ${error.message}`
      };
    } finally {
      // Clean up file list
      if (fs.existsSync(fileListPath)) {
        fs.unlinkSync(fileListPath);
      }
    }
  }

  private displayResults(results: PMDResult[], totalDuration: number): void {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 Analysis Complete');
    console.log('=' .repeat(60));

    // Aggregate stats
    const totalViolations = results.reduce((sum, r) => sum + r.violations, 0);
    const avgBatchTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const maxBatchTime = Math.max(...results.map(r => r.duration));
    const minBatchTime = Math.min(...results.map(r => r.duration));

    console.log('\n📈 Performance Metrics:');
    console.log(`   Total duration: ${totalDuration.toFixed(2)}s`);
    console.log(`   Batches processed: ${results.length}`);
    console.log(`   Avg batch time: ${avgBatchTime.toFixed(2)}s`);
    console.log(`   Max batch time: ${maxBatchTime.toFixed(2)}s`);
    console.log(`   Min batch time: ${minBatchTime.toFixed(2)}s`);

    console.log('\n🔍 Analysis Results:');
    console.log(`   Total violations found: ${totalViolations}`);
    console.log(`   Avg violations per batch: ${(totalViolations / results.length).toFixed(1)}`);

    console.log('\n📦 Batch Details:');
    results.forEach((result, i) => {
      console.log(`   Batch ${i + 1}: ${result.violations} violations in ${result.duration.toFixed(2)}s`);
    });

    // Calculate efficiency
    const theoreticalSequentialTime = results.reduce((sum, r) => sum + r.duration, 0);
    const speedup = theoreticalSequentialTime / totalDuration;
    console.log('\n⚡ Efficiency:');
    console.log(`   Theoretical sequential time: ${theoreticalSequentialTime.toFixed(2)}s`);
    console.log(`   Actual parallel time: ${totalDuration.toFixed(2)}s`);
    console.log(`   Speedup: ${speedup.toFixed(2)}x`);
  }

  private async saveReport(
    results: PMDResult[],
    batches: FileBatch[],
    totalDuration: number
  ): Promise<void> {
    const reportDir = path.join(__dirname, '..', 'test-results', 'batch-reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportDir, `kafka-batched-pmd-${timestamp}.json`);

    const report = {
      timestamp: new Date().toISOString(),
      repository: 'apache/kafka',
      configuration: {
        pmdThreads: this.PMD_THREADS,
        maxFilesPerBatch: 500,
        concurrentBatches: 2
      },
      summary: {
        totalDuration,
        totalBatches: batches.length,
        totalFiles: batches.reduce((sum, b) => sum + b.fileCount, 0),
        totalViolations: results.reduce((sum, r) => sum + r.violations, 0)
      },
      batches: batches.map((batch, i) => ({
        ...batch,
        result: results[i]
      })),
      results
    };

    await fs.promises.writeFile(
      reportPath,
      JSON.stringify(report, null, 2),
      'utf8'
    );

    console.log(`\n📄 Report saved to: ${reportPath}`);
  }
}

// Alternative: Smart progressive batching
export class ProgressiveBatcher {
  async analyzeWithProgressiveBatching(files: string[]): Promise<void> {
    console.log('\n🎯 Progressive Batching Strategy');

    // Start with critical files
    const criticalPatterns = ['core/', 'server/', 'client/', 'controller/'];
    const criticalFiles = files.filter(f =>
      criticalPatterns.some(pattern => f.includes(pattern))
    );

    const otherFiles = files.filter(f => !criticalFiles.includes(f));

    console.log(`   Critical files: ${criticalFiles.length}`);
    console.log(`   Other files: ${otherFiles.length}`);

    // Process in priority order
    console.log('\n1️⃣ Processing critical files first...');
    // Process critical files with smaller batches for faster feedback

    console.log('\n2️⃣ Processing remaining files...');
    // Process other files in larger batches
  }
}

// Run the analysis
async function main() {
  const analyzer = new KafkaBatchedPMDAnalyzer();

  try {
    await analyzer.runAnalysis();
    console.log('\n✅ Analysis completed successfully!');
  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}