#!/usr/bin/env npx ts-node

/**
 * Cache Setup Test Script
 * Verifies that caching infrastructure is properly configured
 * Run this before using the system to ensure cache is ready
 */

import { OptimizedRepoManager } from './src/two-branch/utils/optimized-repo-manager';
import Redis from 'ioredis';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

interface TestResult {
  component: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

class CacheSetupTest {
  private results: TestResult[] = [];
  private redis: Redis | null = null;
  
  /**
   * Run all cache setup tests
   */
  async runAllTests(): Promise<boolean> {
    console.log(chalk.bold.blue('\n🔍 CodeQual Cache Setup Verification\n'));
    console.log(chalk.gray('=' .repeat(60)));
    
    // Test 1: Check environment variables
    await this.testEnvironmentVariables();
    
    // Test 2: Check Redis connection
    await this.testRedisConnection();
    
    // Test 3: Check cache directories
    await this.testCacheDirectories();
    
    // Test 4: Test repository caching
    await this.testRepositoryCaching();
    
    // Test 5: Test TTL functionality
    await this.testTTLFunctionality();
    
    // Display results
    this.displayResults();
    
    // Cleanup
    if (this.redis) {
      await this.redis.quit();
    }
    
    // Return overall status
    return !this.results.some(r => r.status === 'fail');
  }
  
  /**
   * Test 1: Environment Variables
   */
  private async testEnvironmentVariables() {
    console.log(chalk.yellow('\n📋 Testing Environment Variables...'));
    
    const required = ['REDIS_URL'];
    const optional = ['CACHE_DIR', 'WORKSPACE_DIR', 'GITHUB_TOKEN'];
    
    // Check required variables
    for (const varName of required) {
      if (process.env[varName]) {
        this.results.push({
          component: `ENV: ${varName}`,
          status: 'pass',
          message: `Set to: ${this.maskSensitive(process.env[varName]!)}`
        });
      } else {
        this.results.push({
          component: `ENV: ${varName}`,
          status: 'fail',
          message: 'Not set (required)'
        });
      }
    }
    
    // Check optional variables
    for (const varName of optional) {
      if (process.env[varName]) {
        this.results.push({
          component: `ENV: ${varName}`,
          status: 'pass',
          message: `Set to: ${this.maskSensitive(process.env[varName]!)}`
        });
      } else {
        this.results.push({
          component: `ENV: ${varName}`,
          status: 'warning',
          message: 'Not set (optional, using defaults)'
        });
      }
    }
  }
  
  /**
   * Test 2: Redis Connection
   */
  private async testRedisConnection() {
    console.log(chalk.yellow('\n🔴 Testing Redis Connection...'));
    
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redis = new Redis(redisUrl);
      
      // Test basic operations
      const testKey = 'cache:test:ping';
      await this.redis.set(testKey, 'pong', 'EX', 10);
      const result = await this.redis.get(testKey);
      
      if (result === 'pong') {
        // Get Redis info
        const info = await this.redis.info('memory');
        const memoryUsed = info.match(/used_memory_human:(.+)/)?.[1];
        const maxMemory = info.match(/maxmemory_human:(.+)/)?.[1] || 'unlimited';
        
        this.results.push({
          component: 'Redis Connection',
          status: 'pass',
          message: `Connected to ${redisUrl}`,
          details: {
            memoryUsed,
            maxMemory,
            db: this.redis.options.db || 0
          }
        });
        
        // Check if we're using the test database
        if (process.env.NODE_ENV !== 'production' && this.redis.options.db === 0) {
          this.results.push({
            component: 'Redis Database',
            status: 'warning',
            message: 'Using DB 0 - consider using DB 1 for testing'
          });
        }
      } else {
        throw new Error('Redis read/write test failed');
      }
      
      // Cleanup test key
      await this.redis.del(testKey);
      
    } catch (error) {
      this.results.push({
        component: 'Redis Connection',
        status: 'fail',
        message: `Failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
  
  /**
   * Test 3: Cache Directories
   */
  private async testCacheDirectories() {
    console.log(chalk.yellow('\n📁 Testing Cache Directories...'));
    
    const cacheDir = process.env.CACHE_DIR || '/tmp/codequal-test/cache';
    const workspaceDir = process.env.WORKSPACE_DIR || '/tmp/codequal-test/workspaces';
    
    for (const dir of [cacheDir, workspaceDir]) {
      try {
        // Check if directory exists
        if (!fs.existsSync(dir)) {
          // Try to create it
          fs.mkdirSync(dir, { recursive: true });
          this.results.push({
            component: `Directory: ${dir}`,
            status: 'pass',
            message: 'Created successfully'
          });
        } else {
          // Check permissions
          fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
          
          // Get directory stats
          const stats = fs.statSync(dir);
          const files = fs.readdirSync(dir);
          
          this.results.push({
            component: `Directory: ${dir}`,
            status: 'pass',
            message: 'Exists with read/write permissions',
            details: {
              fileCount: files.length,
              created: stats.birthtime
            }
          });
        }
        
        // Check available space
        const { stdout } = require('child_process').execSync(`df -h "${dir}" | tail -1`);
        const [, , , used, available] = stdout.toString().trim().split(/\s+/);
        
        this.results.push({
          component: `Disk Space: ${dir}`,
          status: available.includes('G') ? 'pass' : 'warning',
          message: `Used: ${used}, Available: ${available}`
        });
        
      } catch (error) {
        this.results.push({
          component: `Directory: ${dir}`,
          status: 'fail',
          message: `Error: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }
  }
  
  /**
   * Test 4: Repository Caching
   */
  private async testRepositoryCaching() {
    console.log(chalk.yellow('\n🚀 Testing Repository Caching...'));
    
    try {
      const cacheDir = process.env.CACHE_DIR || '/tmp/codequal-test/cache';
      const workspaceDir = process.env.WORKSPACE_DIR || '/tmp/codequal-test/workspaces';
      
      const repoManager = new OptimizedRepoManager(
        cacheDir,
        workspaceDir,
        process.env.REDIS_URL
      );
      
      // Test with a small repository
      const testRepo = {
        owner: 'octocat',
        repo: 'Hello-World',  // GitHub's example repo, very small
        defaultBranch: 'master',
        shallowDepth: 10
      };
      
      console.log(chalk.gray(`  Testing with ${testRepo.owner}/${testRepo.repo}...`));
      
      // Test setup
      const setupStart = Date.now();
      const metrics = await repoManager.setupRepo(testRepo);
      const setupTime = Date.now() - setupStart;
      
      this.results.push({
        component: 'Repository Cache',
        status: 'pass',
        message: `Cached ${testRepo.owner}/${testRepo.repo} in ${setupTime}ms`,
        details: {
          isInitialClone: metrics.isInitialClone,
          size: `${(metrics.repoSize / 1024).toFixed(2)}KB`,
          commits: metrics.commitCount
        }
      });
      
      // Test workspace creation
      const workspaceStart = Date.now();
      const workspace = await repoManager.createPRWorkspace(
        testRepo.owner,
        testRepo.repo,
        1  // PR number
      );
      const workspaceTime = Date.now() - workspaceStart;
      
      this.results.push({
        component: 'Workspace Creation',
        status: 'pass',
        message: `Created workspace in ${workspaceTime}ms`,
        details: {
          path: workspace.path,
          changedFiles: workspace.changedFiles.length
        }
      });
      
      // Cleanup
      await repoManager.cleanupWorkspace(testRepo.owner, testRepo.repo, 1);
      await repoManager.close();
      
    } catch (error) {
      this.results.push({
        component: 'Repository Cache',
        status: 'fail',
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
  
  /**
   * Test 5: TTL Functionality
   */
  private async testTTLFunctionality() {
    console.log(chalk.yellow('\n⏱️  Testing TTL Functionality...'));
    
    if (!this.redis) {
      this.results.push({
        component: 'TTL Test',
        status: 'fail',
        message: 'Redis not connected'
      });
      return;
    }
    
    try {
      const testKey = 'cache:test:ttl';
      const ttl = 60; // 60 seconds
      
      // Set key with TTL
      await this.redis.setex(testKey, ttl, 'test-value');
      
      // Check TTL
      const remainingTTL = await this.redis.ttl(testKey);
      
      if (remainingTTL > 0 && remainingTTL <= ttl) {
        this.results.push({
          component: 'TTL Functionality',
          status: 'pass',
          message: `TTL working correctly (${remainingTTL}s remaining)`
        });
      } else {
        this.results.push({
          component: 'TTL Functionality',
          status: 'warning',
          message: `Unexpected TTL value: ${remainingTTL}`
        });
      }
      
      // Test TTL reset
      await this.redis.expire(testKey, 120); // Reset to 120 seconds
      const newTTL = await this.redis.ttl(testKey);
      
      if (newTTL > ttl) {
        this.results.push({
          component: 'TTL Reset',
          status: 'pass',
          message: `TTL reset working (extended to ${newTTL}s)`
        });
      }
      
      // Cleanup
      await this.redis.del(testKey);
      
    } catch (error) {
      this.results.push({
        component: 'TTL Test',
        status: 'fail',
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
  
  /**
   * Display test results
   */
  private displayResults() {
    console.log(chalk.bold.blue('\n📊 Test Results\n'));
    console.log(chalk.gray('=' .repeat(60)));
    
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    
    // Display each result
    for (const result of this.results) {
      const icon = result.status === 'pass' ? '✅' : 
                   result.status === 'fail' ? '❌' : '⚠️';
      const color = result.status === 'pass' ? chalk.green :
                    result.status === 'fail' ? chalk.red : chalk.yellow;
      
      console.log(`${icon} ${color(result.component)}: ${result.message}`);
      
      if (result.details) {
        for (const [key, value] of Object.entries(result.details)) {
          console.log(chalk.gray(`   ${key}: ${value}`));
        }
      }
    }
    
    // Summary
    console.log(chalk.gray('\n' + '=' .repeat(60)));
    console.log(chalk.bold('\n📈 Summary:'));
    console.log(chalk.green(`  ✅ Passed: ${passed}`));
    if (warnings > 0) console.log(chalk.yellow(`  ⚠️  Warnings: ${warnings}`));
    if (failed > 0) console.log(chalk.red(`  ❌ Failed: ${failed}`));
    
    // Overall status
    if (failed === 0) {
      console.log(chalk.bold.green('\n✅ Cache setup is ready for use!'));
      if (warnings > 0) {
        console.log(chalk.yellow('   (Some warnings detected - review above)'));
      }
    } else {
      console.log(chalk.bold.red('\n❌ Cache setup has issues - please fix before proceeding'));
    }
    
    // Recommendations
    console.log(chalk.bold.blue('\n💡 Recommendations:'));
    if (!process.env.GITHUB_TOKEN) {
      console.log(chalk.yellow('  • Set GITHUB_TOKEN for better API rate limits'));
    }
    if (process.env.NODE_ENV !== 'production' && (!this.redis || this.redis.options.db === 0)) {
      console.log(chalk.yellow('  • Use Redis DB 1 for testing (add /1 to REDIS_URL)'));
    }
    if (!process.env.CACHE_DIR) {
      console.log(chalk.yellow('  • Set CACHE_DIR for persistent cache location'));
    }
  }
  
  /**
   * Mask sensitive information
   */
  private maskSensitive(value: string): string {
    // Mask tokens and passwords
    if (value.includes('token') || value.includes('pass') || value.includes('key')) {
      return value.substring(0, 10) + '***';
    }
    return value;
  }
}

/**
 * Main entry point
 */
async function main() {
  const test = new CacheSetupTest();
  const success = await test.runAllTests();
  
  // Provide setup commands if not configured
  if (!process.env.REDIS_URL) {
    console.log(chalk.bold.cyan('\n📝 Quick Setup Commands:\n'));
    console.log(chalk.white('# For testing:'));
    console.log(chalk.gray('export REDIS_URL=redis://localhost:6379/1'));
    console.log(chalk.gray('export CACHE_DIR=/tmp/codequal-test/cache'));
    console.log(chalk.gray('export WORKSPACE_DIR=/tmp/codequal-test/workspaces\n'));
    
    console.log(chalk.white('# Start Redis locally:'));
    console.log(chalk.gray('# macOS: brew services start redis'));
    console.log(chalk.gray('# Linux: sudo systemctl start redis'));
  }
  
  process.exit(success ? 0 : 1);
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { CacheSetupTest };