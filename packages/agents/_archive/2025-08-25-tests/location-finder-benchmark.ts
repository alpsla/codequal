/**
 * Performance Benchmark Test for Location Finding Services
 * 
 * Compares the performance of:
 * 1. Original location finder (sequential)
 * 2. Optimized location finder (parallel, cached, timeout-enabled)
 * 
 * Run with: npx ts-node src/standard/tests/performance/location-finder-benchmark.ts
 */

import { OptimizedLocationFinder } from '../../services/optimized-location-finder';
import { LocationFinderService } from '../../services/location-finder';
import { EnhancedLocationFinder } from '../../services/enhanced-location-finder';
import { IssueToLocate } from '../../services/optimized-location-finder';
import * as path from 'path';
import * as fs from 'fs/promises';
import { execSync } from 'child_process';

// Test data - simulate real issues from DeepWiki
const generateTestIssues = (count: number): IssueToLocate[] => {
  const issues: IssueToLocate[] = [];
  
  const categories = ['security', 'performance', 'error-handling', 'memory', 'async'];
  const severities = ['critical', 'high', 'medium', 'low'];
  
  for (let i = 0; i < count; i++) {
    issues.push({
      id: `issue-${i}`,
      title: `Test Issue ${i}: ${categories[i % categories.length]} problem`,
      description: `This is a test issue for benchmarking location finding performance`,
      category: categories[i % categories.length],
      severity: severities[i % severities.length],
      file: i % 3 === 0 ? 'src/index.ts' : undefined, // Some issues have file hints
      codeSnippet: i % 2 === 0 ? 'const result = await' : undefined, // Some have snippets
      message: `Issue detected in code`
    });
  }
  
  return issues;
};

/**
 * Create a test repository with multiple files
 */
async function createTestRepository(): Promise<string> {
  const testRepoPath = '/tmp/test-repo-' + Date.now();
  
  // Create directory structure
  await fs.mkdir(testRepoPath, { recursive: true });
  await fs.mkdir(path.join(testRepoPath, 'src'), { recursive: true });
  await fs.mkdir(path.join(testRepoPath, 'tests'), { recursive: true });
  await fs.mkdir(path.join(testRepoPath, 'lib'), { recursive: true });
  
  // Create test files with searchable content
  const files = [
    {
      path: 'src/index.ts',
      content: `
export async function main() {
  const result = await fetchData();
  console.log('Processing data');
  return processData(result);
}

async function fetchData() {
  const response = await fetch('https://api.example.com');
  return response.json();
}

function processData(data: any) {
  // Memory leak potential
  const cache = [];
  for (let item of data) {
    cache.push(item);
  }
  return cache;
}
      `
    },
    {
      path: 'src/utils.ts',
      content: `
export function validateInput(input: string): boolean {
  // Security issue: no validation
  return true;
}

export async function timeout(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function handleError(error: Error) {
  // Error handling issue
  throw error;
}
      `
    },
    {
      path: 'tests/index.test.ts',
      content: `
import { main } from '../src/index';

describe('Main function', () => {
  it('should process data', async () => {
    const result = await main();
    expect(result).toBeDefined();
  });
});
      `
    }
  ];
  
  // Write files
  for (const file of files) {
    await fs.writeFile(
      path.join(testRepoPath, file.path),
      file.content
    );
  }
  
  // Initialize git repo (required for some search tools)
  execSync('git init', { cwd: testRepoPath });
  execSync('git add .', { cwd: testRepoPath });
  execSync('git commit -m "Initial commit"', { cwd: testRepoPath });
  
  return testRepoPath;
}

/**
 * Benchmark original location finder
 */
async function benchmarkOriginalFinder(
  repoPath: string,
  issues: IssueToLocate[]
): Promise<number> {
  const finder = new LocationFinderService();
  const startTime = Date.now();
  
  const results = [];
  for (const issue of issues) {
    const location = await finder.findExactLocation(issue, repoPath);
    results.push(location);
  }
  
  const duration = Date.now() - startTime;
  const foundCount = results.filter(r => r !== null).length;
  
  /* eslint-disable no-console */
  console.log(`
📊 Original Location Finder Results:
   Duration: ${duration}ms
   Average per issue: ${(duration / issues.length).toFixed(0)}ms
   Found: ${foundCount}/${issues.length} (${((foundCount/issues.length)*100).toFixed(1)}%)
  `);
  /* eslint-enable no-console */
  
  return duration;
}

/**
 * Benchmark enhanced location finder
 */
async function benchmarkEnhancedFinder(
  repoPath: string,
  issues: IssueToLocate[]
): Promise<number> {
  const finder = new EnhancedLocationFinder();
  const startTime = Date.now();
  
  const results = await finder.findLocations(repoPath, issues);
  
  const duration = Date.now() - startTime;
  
  /* eslint-disable no-console */
  console.log(`
📊 Enhanced Location Finder Results:
   Duration: ${duration}ms
   Average per issue: ${(duration / issues.length).toFixed(0)}ms
   Found: ${results.length}/${issues.length} (${((results.length/issues.length)*100).toFixed(1)}%)
  `);
  /* eslint-enable no-console */
  
  return duration;
}

/**
 * Benchmark optimized location finder
 */
async function benchmarkOptimizedFinder(
  repoPath: string,
  issues: IssueToLocate[]
): Promise<number> {
  const finder = OptimizedLocationFinder.getInstance();
  
  // First run (cold cache)
  await finder.clearCache();
  const coldStartTime = Date.now();
  const coldResults = await finder.findLocations(repoPath, issues);
  const coldDuration = Date.now() - coldStartTime;
  
  // Second run (warm cache)
  const warmStartTime = Date.now();
  const warmResults = await finder.findLocations(repoPath, issues);
  const warmDuration = Date.now() - warmStartTime;
  
  const metrics = finder.getMetrics();
  
  /* eslint-disable no-console */
  console.log(`
📊 Optimized Location Finder Results:
   
   Cold Cache Run:
   Duration: ${coldDuration}ms
   Average per issue: ${(coldDuration / issues.length).toFixed(0)}ms
   Found: ${coldResults.length}/${issues.length} (${((coldResults.length/issues.length)*100).toFixed(1)}%)
   
   Warm Cache Run:
   Duration: ${warmDuration}ms
   Average per issue: ${(warmDuration / issues.length).toFixed(0)}ms
   Found: ${warmResults.length}/${issues.length} (${((warmResults.length/issues.length)*100).toFixed(1)}%)
   
   Performance Metrics:
   Cache Hits: ${metrics.cacheHits}
   Cache Misses: ${metrics.cacheMisses}
   Parallel Searches: ${metrics.parallelSearches}
   Timed Out: ${metrics.timedOutSearches}
   
   Cache Speedup: ${((coldDuration / warmDuration)).toFixed(1)}x faster
  `);
  /* eslint-enable no-console */
  
  return coldDuration;
}

/**
 * Run comprehensive performance benchmark
 */
async function runBenchmark() {
  /* eslint-disable no-console */
  console.log('🚀 Location Finder Performance Benchmark');
  console.log('=' .repeat(60));
  
  // Setup
  console.log('\n📁 Creating test repository...');
  const repoPath = await createTestRepository();
  console.log(`   Created at: ${repoPath}`);
  
  // Generate test issues
  const issueCounts = [10, 25, 50];
  
  for (const count of issueCounts) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 Testing with ${count} issues`);
    console.log('='.repeat(60));
    
    const issues = generateTestIssues(count);
    
    // Run benchmarks
    const originalTime = await benchmarkOriginalFinder(repoPath, issues);
    const enhancedTime = await benchmarkEnhancedFinder(repoPath, issues);
    const optimizedTime = await benchmarkOptimizedFinder(repoPath, issues);
    
    // Compare results
    console.log(`
⚡ Performance Comparison:
   
   Original → Enhanced: ${((originalTime / enhancedTime)).toFixed(1)}x speedup
   Original → Optimized: ${((originalTime / optimizedTime)).toFixed(1)}x speedup
   Enhanced → Optimized: ${((enhancedTime / optimizedTime)).toFixed(1)}x speedup
   
   Time Saved with Optimized:
   - vs Original: ${((originalTime - optimizedTime) / 1000).toFixed(1)}s
   - vs Enhanced: ${((enhancedTime - optimizedTime) / 1000).toFixed(1)}s
    `);
  }
  
  // Cleanup
  console.log('\n🧹 Cleaning up test repository...');
  await fs.rm(repoPath, { recursive: true, force: true });
  
  console.log('\n✅ Benchmark complete!');
  console.log('\n💡 Key Improvements in Optimized Finder:');
  console.log('   • Parallel processing (5 concurrent searches)');
  console.log('   • Redis + in-memory caching');
  console.log('   • 5-second timeout per issue');
  console.log('   • Batch grep operations');
  console.log('   • File indexing for faster searches');
  console.log('   • Performance monitoring integration');
  /* eslint-enable no-console */
}

// Run if called directly
if (require.main === module) {
  runBenchmark().catch(error => {
    /* eslint-disable no-console */
    console.error('Benchmark failed:', error);
    /* eslint-enable no-console */
    process.exit(1);
  });
}

export { runBenchmark };