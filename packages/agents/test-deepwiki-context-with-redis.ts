#!/usr/bin/env npx ts-node

import axios from 'axios';
import { createClient } from 'redis';
import { setTimeout } from 'timers/promises';

const DEEPWIKI_URL = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
const DEEPWIKI_API_KEY = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

interface ContextTestResult {
  testName: string;
  repository: string;
  success: boolean;
  hasContext: boolean;
  issuesFound?: number;
  cacheHit?: boolean;
  duration: number;
  error?: string;
}

class DeepWikiContextTester {
  private redisClient: any;
  private results: ContextTestResult[] = [];
  
  constructor() {
    // Initialize Redis
    this.redisClient = createClient({ url: REDIS_URL });
    this.redisClient.on('error', (err: any) => console.warn('Redis Error:', err));
  }
  
  async initialize() {
    try {
      await this.redisClient.connect();
      console.log('✅ Redis connected');
    } catch (error) {
      console.warn('⚠️ Redis connection failed, tests will continue without cache');
    }
  }
  
  /**
   * Pre-warm repository on DeepWiki pod
   */
  async prewarmRepository(repoUrl: string): Promise<boolean> {
    console.log(`\n🔥 Pre-warming repository: ${repoUrl}`);
    
    try {
      // First, trigger an analysis to make DeepWiki clone the repo
      const response = await axios.post(
        `${DEEPWIKI_URL}/chat/completions/stream`,
        {
          repo_url: repoUrl,
          messages: [{
            role: 'user',
            content: 'Initialize repository analysis. List main files.'
          }],
          stream: false,
          provider: 'openrouter',
          model: 'openai/gpt-4o-mini', // Use smaller model for prewarm
          temperature: 0.1,
          max_tokens: 500
        },
        {
          headers: {
            'Authorization': `Bearer ${DEEPWIKI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );
      
      console.log('   ✅ Repository pre-warmed successfully');
      
      // Cache the repository metadata in Redis
      if (this.redisClient && this.redisClient.isOpen) {
        const cacheKey = `deepwiki:context:${this.sanitizeKey(repoUrl)}`;
        await this.redisClient.setEx(cacheKey, 1800, JSON.stringify({
          repository: repoUrl,
          initialized: true,
          timestamp: Date.now()
        }));
        console.log('   ✅ Context cached in Redis');
      }
      
      return true;
    } catch (error: any) {
      console.log(`   ❌ Pre-warm failed: ${error.message}`);
      
      // If it's a git auth error, we'll need to use a different approach
      if (error.response?.status === 500) {
        console.log('   ℹ️ DeepWiki cannot clone this repo (likely auth issue)');
      }
      
      return false;
    }
  }
  
  /**
   * Test context availability
   */
  async testContext(
    repoUrl: string,
    testName: string,
    query: string,
    expectContext: boolean = true
  ): Promise<ContextTestResult> {
    const startTime = Date.now();
    console.log(`\n🔬 Test: ${testName}`);
    console.log(`   Repo: ${repoUrl}`);
    console.log(`   Query: ${query.substring(0, 100)}...`);
    
    // Check Redis cache first
    let cacheHit = false;
    if (this.redisClient && this.redisClient.isOpen) {
      const cacheKey = `deepwiki:analysis:${this.sanitizeKey(repoUrl)}:${this.hashQuery(query)}`;
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          console.log('   📦 Cache hit in Redis');
          cacheHit = true;
        }
      } catch (error) {
        // Ignore cache errors
      }
    }
    
    try {
      // Make the API call with structured prompt
      const response = await axios.post(
        `${DEEPWIKI_URL}/chat/completions/stream`,
        {
          repo_url: repoUrl,
          messages: [{
            role: 'user',
            content: query
          }],
          stream: false,
          provider: 'openrouter',
          model: 'openai/gpt-4o',
          temperature: 0.1,
          max_tokens: 4000,
          response_format: { type: "json_object" }
        },
        {
          headers: {
            'Authorization': `Bearer ${DEEPWIKI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );
      
      const content = response.data?.choices?.[0]?.message?.content || '';
      
      // Check if response has repository context
      const hasContext = this.checkForContext(content);
      let issuesFound = 0;
      
      // Try to parse JSON response
      try {
        const parsed = JSON.parse(content);
        issuesFound = parsed.issues?.length || 0;
        console.log(`   ✅ Valid JSON with ${issuesFound} issues`);
      } catch (e) {
        console.log('   ⚠️ Response is not valid JSON');
      }
      
      // Cache successful response
      if (this.redisClient && this.redisClient.isOpen && !cacheHit) {
        const cacheKey = `deepwiki:analysis:${this.sanitizeKey(repoUrl)}:${this.hashQuery(query)}`;
        await this.redisClient.setEx(cacheKey, 600, content); // Cache for 10 minutes
      }
      
      const duration = Date.now() - startTime;
      console.log(`   Context available: ${hasContext ? 'YES' : 'NO'}`);
      console.log(`   Duration: ${duration}ms`);
      
      const result: ContextTestResult = {
        testName,
        repository: repoUrl,
        success: true,
        hasContext,
        issuesFound,
        cacheHit,
        duration
      };
      
      this.results.push(result);
      return result;
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(`   ❌ Error: ${error.message}`);
      
      const result: ContextTestResult = {
        testName,
        repository: repoUrl,
        success: false,
        hasContext: false,
        duration,
        error: error.message
      };
      
      this.results.push(result);
      return result;
    }
  }
  
  /**
   * Check if response contains repository context
   */
  private checkForContext(content: string): boolean {
    const contextIndicators = [
      'file',
      'line',
      'src/',
      'lib/',
      'index.',
      'package.json',
      '.ts',
      '.js',
      '.tsx',
      '.jsx',
      'function',
      'class',
      'const',
      'import',
      'export'
    ];
    
    const lowerContent = content.toLowerCase();
    return contextIndicators.some(indicator => lowerContent.includes(indicator));
  }
  
  /**
   * Sanitize key for Redis
   */
  private sanitizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9_-]/g, '_');
  }
  
  /**
   * Hash query for cache key
   */
  private hashQuery(query: string): string {
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
  
  /**
   * Generate summary report
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Context Test Results Summary');
    console.log('='.repeat(60));
    
    // Summary stats
    const successful = this.results.filter(r => r.success);
    const withContext = successful.filter(r => r.hasContext);
    const cacheHits = successful.filter(r => r.cacheHit);
    
    console.log(`\nTotal tests: ${this.results.length}`);
    console.log(`Successful: ${successful.length}`);
    console.log(`With context: ${withContext.length}`);
    console.log(`Cache hits: ${cacheHits.length}`);
    console.log(`Average duration: ${Math.round(successful.reduce((a, r) => a + r.duration, 0) / successful.length)}ms`);
    
    // Individual test results
    console.log('\nTest Details:');
    this.results.forEach(r => {
      const status = r.success ? '✅' : '❌';
      const context = r.hasContext ? 'Has Context' : 'No Context';
      const cache = r.cacheHit ? ' (cached)' : '';
      console.log(`${status} ${r.testName}: ${context}${cache} - ${r.duration}ms`);
      if (r.issuesFound) {
        console.log(`   Issues found: ${r.issuesFound}`);
      }
    });
    
    // Key findings
    console.log('\n🎯 Key Findings:');
    
    // Check context persistence
    const timeBasedTests = this.results.filter(r => 
      r.testName.includes('after') || r.testName.includes('Follow')
    );
    
    if (timeBasedTests.length > 0) {
      const persistentContext = timeBasedTests.every(r => r.hasContext);
      console.log(`1. Context persistence: ${persistentContext ? 'PERSISTENT' : 'EXPIRES'}`);
    }
    
    // Check cache effectiveness
    if (cacheHits.length > 0) {
      console.log(`2. Redis cache working: YES (${cacheHits.length} hits)`);
    } else {
      console.log('2. Redis cache working: NO HITS');
    }
    
    // Check issue detection
    const avgIssues = successful
      .filter(r => r.issuesFound !== undefined)
      .reduce((a, r) => a + (r.issuesFound || 0), 0) / successful.length || 0;
    console.log(`3. Average issues detected: ${avgIssues.toFixed(1)}`);
  }
  
  async cleanup() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

/**
 * Run context tests
 */
async function runContextTests() {
  const tester = new DeepWikiContextTester();
  await tester.initialize();
  
  // Test repository - use one we know works or can be cached
  const testRepo = 'https://github.com/vercel/swr'; // Known to work
  
  console.log('🚀 DeepWiki Context Testing with Redis Cache');
  console.log('='.repeat(60));
  
  // Structured prompt for better results
  const analysisPrompt = `Analyze this repository and return a JSON object with the following structure:
{
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "category": "security|performance|code-quality|best-practice",
      "title": "Issue title",
      "description": "Detailed description",
      "file": "path/to/file.ts",
      "line": 123
    }
  ],
  "summary": "Brief analysis summary",
  "filesAnalyzed": ["list", "of", "files"]
}

Focus on finding actual code issues with specific file locations.`;

  // Test 1: Initial analysis (may fail if repo needs auth)
  await tester.testContext(
    testRepo,
    'Initial Analysis',
    analysisPrompt,
    true
  );
  
  // Wait a bit
  await setTimeout(2000);
  
  // Test 2: Follow-up query (should use context if available)
  await tester.testContext(
    testRepo,
    'Follow-up Query',
    'Based on the previous analysis, what are the most critical issues? Return as JSON with issues array.',
    true
  );
  
  // Test 3: Same query again (should hit cache)
  await tester.testContext(
    testRepo,
    'Cached Query',
    analysisPrompt,
    true
  );
  
  // Test 4: Different query on same repo
  await tester.testContext(
    testRepo,
    'Different Query',
    'Find performance bottlenecks in this codebase. Return as JSON.',
    true
  );
  
  // Generate report
  tester.generateReport();
  
  // Save results
  const fs = require('fs');
  const reportPath = './test-results/deepwiki-context-redis-results.json';
  
  fs.mkdirSync('./test-results', { recursive: true });
  fs.writeFileSync(
    reportPath,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      results: tester['results'],
      redisConnected: tester['redisClient']?.isOpen || false
    }, null, 2)
  );
  
  console.log(`\n💾 Results saved to: ${reportPath}`);
  
  await tester.cleanup();
}

// Main execution
(async () => {
  try {
    await runContextTests();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
})();