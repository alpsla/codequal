#!/usr/bin/env npx ts-node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import Redis from 'ioredis';
import crypto from 'crypto';

interface RepoIndex {
  repository: string;
  branch: string;
  commit: string;
  indexedAt: string;
  fileCount: number;
  totalSize: number;
  fileTree: FileNode[];
  languageStats: Record<string, number>;
  criticalPaths: string[];
  testPaths: string[];
  lastAnalysis?: AnalysisCache;
}

interface FileNode {
  path: string;
  size: number;
  hash: string;
  type: 'java' | 'kotlin' | 'scala' | 'groovy' | 'other';
  isTest: boolean;
  complexity?: number;
  dependencies?: string[];
}

interface AnalysisCache {
  timestamp: string;
  tools: {
    pmd?: ToolResult;
    checkstyle?: ToolResult;
    semgrep?: ToolResult;
  };
  totalViolations: number;
  criticalIssues: number;
}

interface ToolResult {
  violations: number;
  duration: number;
  output?: string;
}

export class IndexedRepoCache {
  private redis: Redis;
  private readonly INDEX_PREFIX = 'repo:index:';
  private readonly ANALYSIS_PREFIX = 'repo:analysis:';
  private readonly FILE_CACHE_PREFIX = 'repo:files:';
  private readonly TTL = 86400; // 24 hours

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async indexRepository(repoPath: string, repoUrl: string, branch = 'main'): Promise<RepoIndex> {
    console.log('📋 Indexing repository for caching...');
    const startTime = Date.now();

    // Get current commit
    const commit = execSync(`cd ${repoPath} && git rev-parse HEAD`, { encoding: 'utf8' }).trim();

    // Check if we already have this index
    const cacheKey = this.getCacheKey(repoUrl, branch, commit);
    const existingIndex = await this.getIndex(cacheKey);

    if (existingIndex) {
      console.log('✅ Using cached repository index');
      console.log(`   Files: ${existingIndex.fileCount}`);
      console.log(`   Indexed: ${existingIndex.indexedAt}`);
      return existingIndex;
    }

    console.log('🔍 Building new repository index...');

    // Find all relevant files
    const javaFiles = await this.findFiles(repoPath, '*.java');
    const kotlinFiles = await this.findFiles(repoPath, '*.kt');
    const scalaFiles = await this.findFiles(repoPath, '*.scala');
    const groovyFiles = await this.findFiles(repoPath, '*.groovy');

    // Build file tree with metadata
    const fileTree: FileNode[] = [];
    let totalSize = 0;

    // Process Java files (most common)
    for (const file of javaFiles) {
      const node = await this.createFileNode(file, 'java');
      fileTree.push(node);
      totalSize += node.size;
    }

    // Process other JVM language files
    for (const file of kotlinFiles) {
      const node = await this.createFileNode(file, 'kotlin');
      fileTree.push(node);
      totalSize += node.size;
    }

    for (const file of scalaFiles) {
      const node = await this.createFileNode(file, 'scala');
      fileTree.push(node);
      totalSize += node.size;
    }

    for (const file of groovyFiles) {
      const node = await this.createFileNode(file, 'groovy');
      fileTree.push(node);
      totalSize += node.size;
    }

    // Identify critical paths
    const criticalPaths = this.identifyCriticalPaths(fileTree);
    const testPaths = fileTree.filter(f => f.isTest).map(f => f.path);

    // Calculate language statistics
    const languageStats = this.calculateLanguageStats(fileTree);

    // Create index
    const index: RepoIndex = {
      repository: repoUrl,
      branch,
      commit,
      indexedAt: new Date().toISOString(),
      fileCount: fileTree.length,
      totalSize,
      fileTree,
      languageStats,
      criticalPaths,
      testPaths
    };

    // Cache the index
    await this.saveIndex(cacheKey, index);

    const duration = (Date.now() - startTime) / 1000;
    console.log(`✅ Repository indexed in ${duration.toFixed(2)}s`);
    console.log(`   Total files: ${fileTree.length}`);
    console.log(`   Total size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`   Critical paths: ${criticalPaths.length}`);
    console.log(`   Test files: ${testPaths.length}`);

    return index;
  }

  async getOrCreateBatchedAnalysis(
    repoPath: string,
    repoUrl: string,
    branch: string,
    batchSize = 300
  ): Promise<{ index: RepoIndex; batches: string[][] }> {
    // Get or create index
    const index = await this.indexRepository(repoPath, repoUrl, branch);

    // Check if we have cached analysis
    if (index.lastAnalysis) {
      const age = Date.now() - new Date(index.lastAnalysis.timestamp).getTime();
      const ageMinutes = age / (1000 * 60);

      if (ageMinutes < 30) {
        console.log(`✅ Using cached analysis from ${ageMinutes.toFixed(1)} minutes ago`);
        console.log(`   Violations: ${index.lastAnalysis.totalViolations}`);
        console.log(`   Critical issues: ${index.lastAnalysis.criticalIssues}`);
      }
    }

    // Create optimized batches based on index
    const batches = this.createOptimizedBatches(index, batchSize);

    console.log(`📦 Created ${batches.length} optimized batches`);
    batches.forEach((batch, i) => {
      const isCritical = batch.some(f => index.criticalPaths.includes(f));
      const label = isCritical ? '🔴 Critical' : '🟢 Standard';
      console.log(`   Batch ${i + 1}: ${batch.length} files ${label}`);
    });

    return { index, batches };
  }

  private createOptimizedBatches(index: RepoIndex, batchSize: number): string[][] {
    const batches: string[][] = [];

    // Sort files by priority
    const criticalFiles = index.fileTree
      .filter(f => index.criticalPaths.includes(f.path) && !f.isTest)
      .map(f => f.path);

    const regularFiles = index.fileTree
      .filter(f => !index.criticalPaths.includes(f.path) && !f.isTest)
      .map(f => f.path);

    const testFiles = index.fileTree
      .filter(f => f.isTest)
      .map(f => f.path);

    // Create critical batches first (smaller for faster feedback)
    const criticalBatchSize = Math.min(batchSize, 200);
    for (let i = 0; i < criticalFiles.length; i += criticalBatchSize) {
      batches.push(criticalFiles.slice(i, i + criticalBatchSize));
    }

    // Create regular batches
    for (let i = 0; i < regularFiles.length; i += batchSize) {
      batches.push(regularFiles.slice(i, i + batchSize));
    }

    // Create test batches (optional, lower priority)
    if (testFiles.length > 0) {
      for (let i = 0; i < testFiles.length; i += batchSize) {
        batches.push(testFiles.slice(i, i + batchSize));
      }
    }

    return batches;
  }

  async cacheAnalysisResults(
    repoUrl: string,
    branch: string,
    commit: string,
    results: AnalysisCache
  ): Promise<void> {
    const cacheKey = this.getCacheKey(repoUrl, branch, commit);
    const index = await this.getIndex(cacheKey);

    if (index) {
      index.lastAnalysis = results;
      await this.saveIndex(cacheKey, index);
      console.log('✅ Analysis results cached');
    }
  }

  async getDiffFiles(
    repoPath: string,
    baseBranch = 'main',
    prBranch = 'HEAD'
  ): Promise<string[]> {
    console.log('📝 Getting diff files for PR analysis...');

    const command = `cd ${repoPath} && git diff --name-only ${baseBranch}...${prBranch} | grep -E "\\.(java|kt|scala|groovy)$" || true`;
    const output = execSync(command, { encoding: 'utf8' });

    const files = output.trim().split('\n').filter(f => f.length > 0);
    console.log(`   Found ${files.length} changed files in PR`);

    return files.map(f => path.join(repoPath, f));
  }

  async getSmartFileSelection(
    index: RepoIndex,
    prFiles: string[],
    maxFiles = 500
  ): Promise<string[]> {
    console.log('🧠 Smart file selection for PR analysis...');

    const selected = new Set<string>();

    // 1. Always include PR files
    prFiles.forEach(f => selected.add(f));
    console.log(`   PR files: ${prFiles.length}`);

    // 2. Add files that depend on PR files
    const dependencies = await this.findDependencies(index, prFiles);
    dependencies.forEach(f => selected.add(f));
    console.log(`   Dependencies: ${dependencies.length}`);

    // 3. Add critical paths if room
    const remaining = maxFiles - selected.size;
    if (remaining > 0) {
      const critical = index.criticalPaths.slice(0, remaining);
      critical.forEach(f => selected.add(f));
      console.log(`   Critical paths: ${critical.length}`);
    }

    console.log(`✅ Selected ${selected.size} files for analysis`);
    return Array.from(selected);
  }

  private async findDependencies(index: RepoIndex, files: string[]): Promise<string[]> {
    const deps = new Set<string>();

    // Simple implementation - find files that import the changed files
    for (const file of files) {
      const className = path.basename(file, path.extname(file));

      // Find files that might import this class
      const potentialDeps = index.fileTree
        .filter(f => f.path !== file)
        .filter(f => {
          // Very simplified - in reality would parse imports
          return f.path.includes(className) ||
                 f.dependencies?.includes(className);
        })
        .map(f => f.path);

      potentialDeps.forEach(d => deps.add(d));
    }

    return Array.from(deps);
  }

  private async createFileNode(filePath: string, type: string): Promise<FileNode> {
    const stats = await fs.promises.stat(filePath);
    const content = await fs.promises.readFile(filePath, 'utf8');
    const hash = crypto.createHash('md5').update(content).digest('hex');

    // Detect if it's a test file
    const isTest = filePath.includes('/test/') ||
                   filePath.includes('/tests/') ||
                   filePath.includes('Test.') ||
                   filePath.includes('Spec.');

    return {
      path: filePath,
      size: stats.size,
      hash,
      type: type as any,
      isTest,
      complexity: this.estimateComplexity(content),
      dependencies: this.extractDependencies(content, type)
    };
  }

  private estimateComplexity(content: string): number {
    // Simple complexity estimation based on code patterns
    let complexity = 1;

    // Count control flow statements
    complexity += (content.match(/\bif\b/g) || []).length;
    complexity += (content.match(/\bfor\b/g) || []).length * 2;
    complexity += (content.match(/\bwhile\b/g) || []).length * 2;
    complexity += (content.match(/\bswitch\b/g) || []).length * 3;
    complexity += (content.match(/\bcatch\b/g) || []).length;

    return complexity;
  }

  private extractDependencies(content: string, type: string): string[] {
    const deps: string[] = [];

    if (type === 'java') {
      // Extract import statements
      const imports = content.match(/import\s+[\w.]+\.([\w]+);/g) || [];
      imports.forEach(imp => {
        const match = imp.match(/import\s+[\w.]+\.([\w]+);/);
        if (match) deps.push(match[1]);
      });
    }

    return deps;
  }

  private identifyCriticalPaths(fileTree: FileNode[]): string[] {
    // Identify critical paths based on patterns
    const criticalPatterns = [
      '/core/',
      '/server/',
      '/controller/',
      '/security/',
      '/auth/',
      '/api/',
      'Config',
      'Manager',
      'Service',
      'Controller',
      'Handler'
    ];

    return fileTree
      .filter(f => !f.isTest)
      .filter(f => {
        return criticalPatterns.some(pattern => f.path.includes(pattern));
      })
      .sort((a, b) => (b.complexity || 0) - (a.complexity || 0))
      .slice(0, 500)
      .map(f => f.path);
  }

  private calculateLanguageStats(fileTree: FileNode[]): Record<string, number> {
    const stats: Record<string, number> = {};

    fileTree.forEach(f => {
      stats[f.type] = (stats[f.type] || 0) + 1;
    });

    return stats;
  }

  private async findFiles(repoPath: string, pattern: string): Promise<string[]> {
    try {
      const output = execSync(
        `find ${repoPath} -name "${pattern}" -type f 2>/dev/null | head -10000`,
        { encoding: 'utf8' }
      );
      return output.trim().split('\n').filter(f => f.length > 0);
    } catch {
      return [];
    }
  }

  private getCacheKey(repoUrl: string, branch: string, commit: string): string {
    return `${this.INDEX_PREFIX}${repoUrl.replace(/[^\w]/g, '_')}:${branch}:${commit}`;
  }

  private async getIndex(cacheKey: string): Promise<RepoIndex | null> {
    try {
      const data = await this.redis.get(cacheKey);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private async saveIndex(cacheKey: string, index: RepoIndex): Promise<void> {
    await this.redis.setex(cacheKey, this.TTL, JSON.stringify(index));
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}

// Export convenience functions
export async function createIndexedCache(redisUrl?: string): Promise<IndexedRepoCache> {
  return new IndexedRepoCache(redisUrl);
}

export async function testIndexing(): Promise<void> {
  console.log('🧪 Testing Repository Indexing with Caching');
  console.log('=' .repeat(60));

  const cache = new IndexedRepoCache();

  try {
    // Test with Kafka repo
    const repoPath = '/tmp/kafka-repo';
    const repoUrl = 'https://github.com/apache/kafka';

    // First run - will build index
    console.log('\n1️⃣ First run - Building index...');
    const index1 = await cache.indexRepository(repoPath, repoUrl, 'trunk');

    // Second run - should use cache
    console.log('\n2️⃣ Second run - Using cache...');
    const index2 = await cache.indexRepository(repoPath, repoUrl, 'trunk');

    // Get batched analysis
    console.log('\n3️⃣ Creating optimized batches...');
    const { batches } = await cache.getOrCreateBatchedAnalysis(
      repoPath,
      repoUrl,
      'trunk',
      300
    );

    console.log('\n✅ Test completed successfully!');
    console.log(`   Index cached: ${index1 === index2 ? 'No (different run)' : 'Yes'}`);
    console.log(`   Total batches: ${batches.length}`);

  } finally {
    await cache.close();
  }
}

// Run test if executed directly
if (require.main === module) {
  testIndexing().catch(console.error);
}