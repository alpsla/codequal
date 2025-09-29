#!/usr/bin/env npx ts-node

import Redis from 'ioredis';
import crypto from 'crypto';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface BranchAnalysis {
  branch: string;
  commit: string;
  timestamp: string;
  files: string[];
  fileCount: number;
  violations: ViolationMap;
  totalViolations: number;
  duration: number;
  configuration: AnalysisConfig;
}

interface ViolationMap {
  [file: string]: Violation[];
}

interface Violation {
  line: number;
  rule: string;
  message: string;
  severity: string;
}

interface AnalysisConfig {
  parallel: number;
  batchSize: number;
  threads: number;
  tool: string;
}

export class TwoBranchCacheManager {
  private redis: Redis;
  private readonly CACHE_PREFIX = 'pmd:analysis:';
  private readonly TTL = 86400; // 24 hours

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Analyze main branch and cache results
   * Always analyzes 100% of files
   */
  async analyzeAndCacheMainBranch(
    repoPath: string,
    branch = 'main',
    config: AnalysisConfig
  ): Promise<BranchAnalysis> {
    console.log(`🔍 Analyzing main branch: ${branch}`);
    console.log('   Coverage: 100% of files');

    // Get current commit
    const commit = this.getCommit(repoPath, branch);

    // Check if we have cached results
    const cacheKey = this.getCacheKey(repoPath, branch, commit);
    const cached = await this.getCachedAnalysis(cacheKey);

    if (cached) {
      console.log(`✅ Using cached main branch analysis`);
      console.log(`   Commit: ${cached.commit}`);
      console.log(`   Files: ${cached.fileCount}`);
      console.log(`   Violations: ${cached.totalViolations}`);
      console.log(`   Cached at: ${cached.timestamp}`);
      return cached;
    }

    console.log(`📊 Running fresh analysis on main branch`);

    // Get all Java files (100% coverage)
    const files = this.getAllJavaFiles(repoPath);
    console.log(`   Files to analyze: ${files.length}`);

    // Run PMD analysis
    const startTime = Date.now();
    const violations = await this.runPMDAnalysis(repoPath, files, config);
    const duration = (Date.now() - startTime) / 1000;

    // Create analysis result
    const analysis: BranchAnalysis = {
      branch,
      commit,
      timestamp: new Date().toISOString(),
      files,
      fileCount: files.length,
      violations,
      totalViolations: this.countTotalViolations(violations),
      duration,
      configuration: config
    };

    // Cache the results
    await this.cacheAnalysis(cacheKey, analysis);

    console.log(`✅ Main branch analysis complete`);
    console.log(`   Duration: ${duration.toFixed(2)}s`);
    console.log(`   Violations: ${analysis.totalViolations}`);
    console.log(`   Cached for 24 hours`);

    return analysis;
  }

  /**
   * Analyze PR branch (100% coverage) and compare with main
   */
  async analyzePRBranch(
    repoPath: string,
    prBranch: string,
    mainBranch = 'main',
    config: AnalysisConfig
  ): Promise<{
    pr: BranchAnalysis;
    main: BranchAnalysis;
    comparison: ComparisonResult;
  }> {
    console.log(`\n🔍 Two-Branch Analysis`);
    console.log(`   Main: ${mainBranch}`);
    console.log(`   PR: ${prBranch}`);

    // Step 1: Analyze main branch (uses cache if available)
    const mainAnalysis = await this.analyzeAndCacheMainBranch(
      repoPath,
      mainBranch,
      config
    );

    // Step 2: Checkout PR branch
    console.log(`\n📝 Switching to PR branch: ${prBranch}`);
    execSync(`cd ${repoPath} && git checkout ${prBranch}`, { stdio: 'pipe' });

    // Step 3: Get PR commit
    const prCommit = this.getCommit(repoPath, 'HEAD');

    // Step 4: Check if PR is cached
    const prCacheKey = this.getCacheKey(repoPath, prBranch, prCommit);
    let prAnalysis = await this.getCachedAnalysis(prCacheKey);

    if (!prAnalysis) {
      console.log(`📊 Running fresh analysis on PR branch`);

      // Get all files (100% coverage for PR too)
      const prFiles = this.getAllJavaFiles(repoPath);
      console.log(`   Files to analyze: ${prFiles.length}`);

      // Run PMD analysis
      const startTime = Date.now();
      const prViolations = await this.runPMDAnalysis(repoPath, prFiles, config);
      const duration = (Date.now() - startTime) / 1000;

      prAnalysis = {
        branch: prBranch,
        commit: prCommit,
        timestamp: new Date().toISOString(),
        files: prFiles,
        fileCount: prFiles.length,
        violations: prViolations,
        totalViolations: this.countTotalViolations(prViolations),
        duration,
        configuration: config
      };

      // Cache PR results too (useful for re-runs)
      await this.cacheAnalysis(prCacheKey, prAnalysis);

      console.log(`✅ PR branch analysis complete`);
      console.log(`   Duration: ${duration.toFixed(2)}s`);
      console.log(`   Violations: ${prAnalysis.totalViolations}`);
    } else {
      console.log(`✅ Using cached PR branch analysis`);
      console.log(`   Violations: ${prAnalysis.totalViolations}`);
    }

    // Step 5: Compare results (V9 Comparator will handle categorization)
    const comparison = this.compareAnalyses(mainAnalysis, prAnalysis);

    return {
      pr: prAnalysis,
      main: mainAnalysis,
      comparison
    };
  }

  /**
   * Compare two analyses
   * Note: Actual categorization (new/resolved/existing) is done by V9 Comparator
   */
  private compareAnalyses(main: BranchAnalysis, pr: BranchAnalysis): ComparisonResult {
    const changedFiles = this.getChangedFiles(main, pr);

    return {
      filesAdded: pr.files.filter(f => !main.files.includes(f)).length,
      filesRemoved: main.files.filter(f => !pr.files.includes(f)).length,
      filesModified: changedFiles.length,
      mainViolations: main.totalViolations,
      prViolations: pr.totalViolations,
      violationDelta: pr.totalViolations - main.totalViolations,
      timeImprovement: main.duration > 0 ?
        ((main.duration - pr.duration) / main.duration * 100).toFixed(1) + '%' :
        'N/A'
    };
  }

  /**
   * Run PMD analysis with batching
   */
  private async runPMDAnalysis(
    repoPath: string,
    files: string[],
    config: AnalysisConfig
  ): Promise<ViolationMap> {
    const violations: ViolationMap = {};

    // Create batches
    const batches: string[][] = [];
    for (let i = 0; i < files.length; i += config.batchSize) {
      batches.push(files.slice(i, i + config.batchSize));
    }

    console.log(`   Processing ${batches.length} batches...`);

    // Process batches in parallel
    const batchPromises = batches.map((batch, index) =>
      this.processBatch(repoPath, batch, index + 1, config)
    );

    // Wait for all batches with controlled parallelism
    const results = await this.runWithParallelism(
      batchPromises,
      config.parallel
    );

    // Merge results
    results.forEach(batchViolations => {
      Object.assign(violations, batchViolations);
    });

    return violations;
  }

  /**
   * Process a single batch
   */
  private async processBatch(
    repoPath: string,
    files: string[],
    batchNum: number,
    config: AnalysisConfig
  ): Promise<ViolationMap> {
    // Create file list
    const fileListPath = `/tmp/batch-${batchNum}.txt`;
    fs.writeFileSync(fileListPath, files.join('\n'));

    // Run PMD
    const command = `docker run --rm --entrypoint sh \
      -v "${repoPath}:/workspace" \
      -v "${fileListPath}:/filelist.txt" \
      -w /workspace \
      --cpus="1" --memory="2g" \
      iad.ocir.io/idzaw9ddo1h5/codequal-analyzers/analyzer:lang-java-v5.1-arm \
      -c "pmd pmd --file-list /filelist.txt -R category/java/errorprone.xml -f text -t ${config.threads} --no-cache"`;

    try {
      const output = execSync(command, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
      return this.parseViolations(output);
    } catch (error: any) {
      if (error.stdout) {
        return this.parseViolations(error.stdout);
      }
      return {};
    } finally {
      fs.unlinkSync(fileListPath);
    }
  }

  /**
   * Parse PMD output into violations
   */
  private parseViolations(output: string): ViolationMap {
    const violations: ViolationMap = {};
    const lines = output.split('\n');

    lines.forEach(line => {
      const match = line.match(/^(.+\.java):(\d+):\s+(\w+):\s+(.+)$/);
      if (match) {
        const [, file, lineNum, rule, message] = match;
        if (!violations[file]) {
          violations[file] = [];
        }
        violations[file].push({
          line: parseInt(lineNum),
          rule,
          message,
          severity: 'medium' // PMD doesn't provide severity in text format
        });
      }
    });

    return violations;
  }

  /**
   * Helper methods
   */
  private getAllJavaFiles(repoPath: string): string[] {
    const output = execSync(
      `find ${repoPath} -name "*.java" -type f | grep -v test`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
    return output.trim().split('\n').filter(f => f.length > 0);
  }

  private getCommit(repoPath: string, branch: string): string {
    return execSync(
      `cd ${repoPath} && git rev-parse ${branch}`,
      { encoding: 'utf8' }
    ).trim();
  }

  private getCacheKey(repoPath: string, branch: string, commit: string): string {
    const repoName = path.basename(repoPath);
    return `${this.CACHE_PREFIX}${repoName}:${branch}:${commit}`;
  }

  private async getCachedAnalysis(key: string): Promise<BranchAnalysis | null> {
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private async cacheAnalysis(key: string, analysis: BranchAnalysis): Promise<void> {
    await this.redis.setex(key, this.TTL, JSON.stringify(analysis));
  }

  private countTotalViolations(violations: ViolationMap): number {
    return Object.values(violations).reduce((sum, v) => sum + v.length, 0);
  }

  private getChangedFiles(main: BranchAnalysis, pr: BranchAnalysis): string[] {
    // Files that exist in both but might have changed
    return pr.files.filter(f => main.files.includes(f));
  }

  private async runWithParallelism<T>(
    promises: Promise<T>[],
    parallel: number
  ): Promise<T[]> {
    const results: T[] = [];
    for (let i = 0; i < promises.length; i += parallel) {
      const batch = promises.slice(i, i + parallel);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
    }
    return results;
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}

interface ComparisonResult {
  filesAdded: number;
  filesRemoved: number;
  filesModified: number;
  mainViolations: number;
  prViolations: number;
  violationDelta: number;
  timeImprovement: string;
}

// Export for use in V9 workflow
export async function runTwoBranchAnalysis(
  repoPath: string,
  prBranch: string,
  mainBranch = 'main',
  config?: Partial<AnalysisConfig>
): Promise<any> {
  const defaultConfig: AnalysisConfig = {
    parallel: 6,  // Optimized from testing
    batchSize: 200,
    threads: 2,
    tool: 'pmd'
  };

  const finalConfig = { ...defaultConfig, ...config };
  const manager = new TwoBranchCacheManager();

  try {
    const result = await manager.analyzePRBranch(
      repoPath,
      prBranch,
      mainBranch,
      finalConfig
    );

    console.log('\n📊 Two-Branch Analysis Summary');
    console.log('================================');
    console.log(`Main branch (${mainBranch}):`);
    console.log(`  Files: ${result.main.fileCount}`);
    console.log(`  Violations: ${result.main.totalViolations}`);
    console.log(`  Time: ${result.main.duration.toFixed(2)}s`);
    console.log(`\nPR branch (${prBranch}):`);
    console.log(`  Files: ${result.pr.fileCount}`);
    console.log(`  Violations: ${result.pr.totalViolations}`);
    console.log(`  Time: ${result.pr.duration.toFixed(2)}s`);
    console.log(`\nComparison:`);
    console.log(`  Violation delta: ${result.comparison.violationDelta}`);
    console.log(`  Files modified: ${result.comparison.filesModified}`);
    console.log(`  Cache benefit: ${result.comparison.timeImprovement}`);

    return result;
  } finally {
    await manager.close();
  }
}