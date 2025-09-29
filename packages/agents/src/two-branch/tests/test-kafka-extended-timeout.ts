#!/usr/bin/env npx ts-node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

class KafkaExtendedTimeoutAnalyzer {
  private readonly repoPath = '/tmp/kafka-repo';
  private readonly PMD_THREADS = 4;
  private readonly EXTENDED_TIMEOUT = 600000; // 10 minutes

  async runFullAnalysis(): Promise<void> {
    console.log('🎯 Apache Kafka Full Analysis with Extended Timeout');
    console.log('=' .repeat(60));
    console.log(`📅 Date: ${new Date().toISOString()}`);
    console.log(`🔧 Configuration:`);
    console.log(`   PMD Threads: ${this.PMD_THREADS}`);
    console.log(`   Timeout: ${this.EXTENDED_TIMEOUT / 1000} seconds (${this.EXTENDED_TIMEOUT / 60000} minutes)`);
    console.log(`   Strategy: Single run on all files`);
    console.log('=' .repeat(60) + '\n');

    const overallStart = Date.now();

    // Step 1: Prepare repository
    await this.prepareRepository();

    // Step 2: Get all Java files (excluding tests)
    console.log('\n📊 Discovering Java files...');
    const javaFiles = await this.findJavaFiles();
    console.log(`   Found ${javaFiles.length} Java files (excluding tests)`);

    // Step 3: Run analysis with each tool
    const results: any = {};

    // PMD Analysis
    console.log('\n🔍 Running PMD Analysis...');
    results.pmd = await this.runPMD(javaFiles);

    // Checkstyle Analysis
    console.log('\n🔍 Running Checkstyle Analysis...');
    results.checkstyle = await this.runCheckstyle(javaFiles);

    // Semgrep Analysis
    console.log('\n🔍 Running Semgrep Analysis...');
    results.semgrep = await this.runSemgrep();

    // Step 4: Display results
    const totalDuration = (Date.now() - overallStart) / 1000;
    this.displayResults(results, totalDuration, javaFiles.length);

    // Step 5: Save performance metrics
    await this.savePerformanceMetrics(results, totalDuration, javaFiles.length);
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
      `find ${this.repoPath} -name "*.java" -type f | grep -v "/test/" | grep -v "/tests/" | grep -v "Test.java" | grep -v "Mock"`,
      { encoding: 'utf8' }
    );

    return output.trim().split('\n').filter(f => f.length > 0);
  }

  private async runPMD(javaFiles: string[]): Promise<any> {
    const startTime = Date.now();
    console.log(`   Processing ${javaFiles.length} files with ${this.PMD_THREADS} threads`);
    console.log(`   Timeout: ${this.EXTENDED_TIMEOUT / 60000} minutes`);
    console.log(`   This may take a while...`);

    // Create file list
    const fileListPath = '/tmp/pmd-files.txt';
    await fs.promises.writeFile(fileListPath, javaFiles.join('\n'), 'utf8');

    try {
      const command = [
        'docker', 'run', '--rm',
        '--platform=linux/arm64',
        '-v', `${this.repoPath}:/workspace`,
        '-v', `${fileListPath}:/filelist.txt`,
        '-w', '/workspace',
        '--cpus=4', // Use all 4 CPUs
        '--memory=8g', // Generous memory
        'iad.ocir.io/idzaw9ddo1h5/codequal-analyzers/analyzer:lang-java-v5.1-arm',
        'pmd', 'pmd',
        '--file-list', '/filelist.txt',
        '-R', 'category/java/errorprone.xml,category/java/bestpractices.xml',
        '-f', 'text',
        '-t', this.PMD_THREADS.toString(),
        '--no-cache'
      ].join(' ');

      const output = execSync(command, {
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
        timeout: this.EXTENDED_TIMEOUT
      });

      const duration = (Date.now() - startTime) / 1000;
      const violations = (output.match(/\.java:\d+:/g) || []).length;

      console.log(`   ✅ PMD completed in ${duration.toFixed(2)}s`);
      console.log(`   Found ${violations} violations`);

      return {
        tool: 'PMD',
        duration,
        violations,
        filesAnalyzed: javaFiles.length,
        success: true,
        output: output.substring(0, 5000)
      };

    } catch (error: any) {
      const duration = (Date.now() - startTime) / 1000;

      // PMD exits with non-zero on violations
      if (error.stdout) {
        const violations = (error.stdout.match(/\.java:\d+:/g) || []).length;
        console.log(`   ✅ PMD completed in ${duration.toFixed(2)}s`);
        console.log(`   Found ${violations} violations`);

        return {
          tool: 'PMD',
          duration,
          violations,
          filesAnalyzed: javaFiles.length,
          success: true,
          output: error.stdout.substring(0, 5000)
        };
      }

      // Real error or timeout
      console.error(`   ❌ PMD failed after ${duration.toFixed(2)}s`);
      console.error(`   Error: ${error.message}`);

      return {
        tool: 'PMD',
        duration,
        violations: 0,
        filesAnalyzed: javaFiles.length,
        success: false,
        error: error.message
      };
    } finally {
      if (fs.existsSync(fileListPath)) {
        fs.unlinkSync(fileListPath);
      }
    }
  }

  private async runCheckstyle(javaFiles: string[]): Promise<any> {
    const startTime = Date.now();
    console.log(`   Processing ${javaFiles.length} files`);

    try {
      const command = [
        'docker', 'run', '--rm',
        '--platform=linux/arm64',
        '-v', `${this.repoPath}:/workspace`,
        '-w', '/workspace',
        '--cpus=2',
        '--memory=4g',
        'iad.ocir.io/idzaw9ddo1h5/codequal-analyzers/analyzer:lang-java-v5.1-arm',
        'java', '-jar', '/tools/checkstyle.jar',
        '-c', '/tools/google_checks.xml',
        '**/*.java'
      ].join(' ');

      const output = execSync(command, {
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024,
        timeout: this.EXTENDED_TIMEOUT
      });

      const duration = (Date.now() - startTime) / 1000;
      const violations = (output.match(/\[ERROR\]/g) || []).length;

      console.log(`   ✅ Checkstyle completed in ${duration.toFixed(2)}s`);
      console.log(`   Found ${violations} violations`);

      return {
        tool: 'Checkstyle',
        duration,
        violations,
        filesAnalyzed: javaFiles.length,
        success: true
      };

    } catch (error: any) {
      const duration = (Date.now() - startTime) / 1000;

      if (error.stdout) {
        const violations = (error.stdout.match(/\[ERROR\]/g) || []).length;
        console.log(`   ✅ Checkstyle completed in ${duration.toFixed(2)}s`);
        console.log(`   Found ${violations} violations`);

        return {
          tool: 'Checkstyle',
          duration,
          violations,
          filesAnalyzed: javaFiles.length,
          success: true
        };
      }

      console.error(`   ❌ Checkstyle failed after ${duration.toFixed(2)}s`);
      return {
        tool: 'Checkstyle',
        duration,
        violations: 0,
        filesAnalyzed: javaFiles.length,
        success: false,
        error: error.message
      };
    }
  }

  private async runSemgrep(): Promise<any> {
    const startTime = Date.now();
    console.log(`   Running security scan on full repository`);

    try {
      const command = [
        'docker', 'run', '--rm',
        '--platform=linux/arm64',
        '-v', `${this.repoPath}:/workspace`,
        '-w', '/workspace',
        '--cpus=2',
        '--memory=4g',
        'iad.ocir.io/idzaw9ddo1h5/codequal-analyzers/analyzer:lang-java-v5.1-arm',
        'semgrep',
        '--config=auto',
        '--json',
        '--timeout=300',
        '.'
      ].join(' ');

      const output = execSync(command, {
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024,
        timeout: this.EXTENDED_TIMEOUT
      });

      const duration = (Date.now() - startTime) / 1000;

      let findings = 0;
      try {
        const json = JSON.parse(output);
        findings = json.results?.length || 0;
      } catch {
        findings = (output.match(/"findings":\s*\d+/g) || []).length;
      }

      console.log(`   ✅ Semgrep completed in ${duration.toFixed(2)}s`);
      console.log(`   Found ${findings} security findings`);

      return {
        tool: 'Semgrep',
        duration,
        findings,
        success: true
      };

    } catch (error: any) {
      const duration = (Date.now() - startTime) / 1000;
      console.error(`   ❌ Semgrep failed after ${duration.toFixed(2)}s`);

      return {
        tool: 'Semgrep',
        duration,
        findings: 0,
        success: false,
        error: error.message
      };
    }
  }

  private displayResults(results: any, totalDuration: number, fileCount: number): void {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 Full Analysis Results');
    console.log('=' .repeat(60));

    console.log('\n📈 Overall Performance:');
    console.log(`   Total duration: ${totalDuration.toFixed(2)}s (${(totalDuration / 60).toFixed(2)} minutes)`);
    console.log(`   Files analyzed: ${fileCount}`);
    console.log(`   Avg time per file: ${(totalDuration / fileCount).toFixed(3)}s`);

    console.log('\n🔧 Tool Performance:');

    if (results.pmd) {
      console.log(`\n   PMD:`);
      console.log(`     Duration: ${results.pmd.duration.toFixed(2)}s`);
      console.log(`     Success: ${results.pmd.success ? '✅' : '❌'}`);
      console.log(`     Violations: ${results.pmd.violations}`);
      console.log(`     Files/sec: ${(fileCount / results.pmd.duration).toFixed(1)}`);
    }

    if (results.checkstyle) {
      console.log(`\n   Checkstyle:`);
      console.log(`     Duration: ${results.checkstyle.duration.toFixed(2)}s`);
      console.log(`     Success: ${results.checkstyle.success ? '✅' : '❌'}`);
      console.log(`     Violations: ${results.checkstyle.violations}`);
      console.log(`     Files/sec: ${(fileCount / results.checkstyle.duration).toFixed(1)}`);
    }

    if (results.semgrep) {
      console.log(`\n   Semgrep:`);
      console.log(`     Duration: ${results.semgrep.duration.toFixed(2)}s`);
      console.log(`     Success: ${results.semgrep.success ? '✅' : '❌'}`);
      console.log(`     Findings: ${results.semgrep.findings}`);
    }

    // Calculate bottlenecks
    const toolDurations = [
      results.pmd?.duration || 0,
      results.checkstyle?.duration || 0,
      results.semgrep?.duration || 0
    ].filter(d => d > 0);

    if (toolDurations.length > 0) {
      const maxDuration = Math.max(...toolDurations);
      const minDuration = Math.min(...toolDurations);

      console.log('\n⚡ Performance Insights:');
      console.log(`   Slowest tool takes ${maxDuration.toFixed(2)}s`);
      console.log(`   Fastest tool takes ${minDuration.toFixed(2)}s`);
      console.log(`   Imbalance ratio: ${(maxDuration / minDuration).toFixed(2)}x`);

      // Optimization suggestions
      console.log('\n💡 Optimization Opportunities:');
      if (results.pmd && results.pmd.duration > 60) {
        console.log(`   - PMD took ${results.pmd.duration.toFixed(0)}s, consider file batching`);
      }
      if (results.checkstyle && results.checkstyle.duration > 60) {
        console.log(`   - Checkstyle took ${results.checkstyle.duration.toFixed(0)}s, consider parallel processing`);
      }
      if (results.semgrep && results.semgrep.duration > 60) {
        console.log(`   - Semgrep took ${results.semgrep.duration.toFixed(0)}s, consider rule optimization`);
      }
    }
  }

  private async savePerformanceMetrics(results: any, totalDuration: number, fileCount: number): Promise<void> {
    const metricsDir = path.join(__dirname, '..', 'test-results', 'performance-metrics');
    if (!fs.existsSync(metricsDir)) {
      fs.mkdirSync(metricsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const metricsPath = path.join(metricsDir, `kafka-extended-timeout-${timestamp}.json`);

    const metrics = {
      timestamp: new Date().toISOString(),
      repository: 'apache/kafka',
      configuration: {
        timeout: this.EXTENDED_TIMEOUT,
        pmdThreads: this.PMD_THREADS,
        strategy: 'extended-timeout-single-run'
      },
      summary: {
        totalDuration,
        totalFiles: fileCount,
        avgTimePerFile: totalDuration / fileCount
      },
      tools: results,
      recommendations: this.generateRecommendations(results, totalDuration, fileCount)
    };

    await fs.promises.writeFile(
      metricsPath,
      JSON.stringify(metrics, null, 2),
      'utf8'
    );

    console.log(`\n📄 Metrics saved to: ${metricsPath}`);
  }

  private generateRecommendations(results: any, totalDuration: number, fileCount: number): string[] {
    const recommendations: string[] = [];

    // Check if batching is needed
    if (totalDuration > 120) {
      recommendations.push('Implement file batching to reduce analysis time below 2 minutes');
    }

    // Check PMD performance
    if (results.pmd && results.pmd.duration > 60) {
      const filesPerSecond = fileCount / results.pmd.duration;
      if (filesPerSecond < 50) {
        recommendations.push(`PMD processing only ${filesPerSecond.toFixed(1)} files/sec - consider batching with 500 files per batch`);
      }
    }

    // Check for timeout issues
    if (results.pmd && !results.pmd.success) {
      recommendations.push('PMD failed to complete - implement progressive batching with smaller file sets');
    }

    // Memory recommendations
    if (fileCount > 2000) {
      recommendations.push('Large codebase detected - consider streaming processing or memory-mapped approaches');
    }

    // Parallel execution
    if (results.pmd && results.checkstyle && results.semgrep) {
      const maxTime = Math.max(
        results.pmd.duration || 0,
        results.checkstyle.duration || 0,
        results.semgrep.duration || 0
      );
      const totalTime = (results.pmd.duration || 0) +
                       (results.checkstyle.duration || 0) +
                       (results.semgrep.duration || 0);
      const potentialSpeedup = totalTime / maxTime;

      if (potentialSpeedup > 1.5) {
        recommendations.push(`Parallel execution could provide ${potentialSpeedup.toFixed(2)}x speedup`);
      }
    }

    return recommendations;
  }
}

// Run the analysis
async function main() {
  const analyzer = new KafkaExtendedTimeoutAnalyzer();

  try {
    console.log('⚠️  WARNING: This analysis may take 5-10 minutes to complete');
    console.log('   Running with extended timeout to gather baseline metrics\n');

    await analyzer.runFullAnalysis();

    console.log('\n✅ Full analysis completed!');
    console.log('   Check the metrics file for detailed performance data');
    console.log('   Use this baseline to optimize batching strategies');

  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}