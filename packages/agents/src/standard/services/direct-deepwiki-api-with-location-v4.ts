/**
 * Direct DeepWiki API with Parallel Indexing v4
 * 
 * Major enhancements:
 * 1. Parallel repository indexing during DeepWiki analysis (zero overhead)
 * 2. O(1) validation lookups using repository index
 * 3. Automatic code snippet recovery for mislocated issues
 * 4. Performance metrics tracking
 */

import { EnhancedLocationFinder, IssueToLocate } from './enhanced-location-finder';
import { CodeSnippetExtractor } from './code-snippet-extractor';
import { UnifiedDeepWikiParser } from './unified-deepwiki-parser';
import { DeepWikiDataValidatorIndexed } from './deepwiki-data-validator-indexed';
import { RepositoryIndexer, RepositoryIndex } from './repository-indexer';
import { getDeepWikiCache } from './deepwiki-data-cache';
import { getEnvConfig } from '../utils/env-loader';
import { IDeepWikiApi } from './deepwiki-api-wrapper';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import Redis from 'ioredis';
import crypto from 'crypto';

export interface DeepWikiAnalysisResponse {
  issues: any[];
  scores: any;
  metadata: any;
  validation?: {
    totalIssues: number;
    validIssues: number;
    filteredIssues: number;
    recoveredIssues: number;
    avgConfidence: number;
  };
  performance?: {
    deepWikiTime: number;
    indexingTime: number;
    validationTime: number;
    totalTime: number;
    speedup: number;
  };
  [key: string]: any;
}

export class DirectDeepWikiApiWithLocationV4 implements IDeepWikiApi {
  private apiUrl: string;
  private apiKey: string;
  private locationFinder: EnhancedLocationFinder;
  private snippetExtractor: CodeSnippetExtractor;
  private unifiedParser: UnifiedDeepWikiParser;
  private validatorIndexed: DeepWikiDataValidatorIndexed;
  private indexer: RepositoryIndexer;
  private maxIterations = 10;
  private repoCache = '/tmp/codequal-repos';
  
  // Cache properties
  private redis?: Redis;
  private memoryCache: Map<string, any> = new Map();
  
  // Performance tracking
  private performanceMetrics = {
    deepWikiTime: 0,
    indexingTime: 0,
    validationTime: 0,
    totalAnalyses: 0,
    totalRecovered: 0
  };

  constructor() {
    // Load environment configuration
    const envConfig = getEnvConfig();
    
    this.apiUrl = envConfig.deepWikiApiUrl || 'http://localhost:8001';
    this.apiKey = envConfig.deepWikiApiKey || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
    
    // Initialize services
    this.locationFinder = new EnhancedLocationFinder();
    this.snippetExtractor = new CodeSnippetExtractor();
    this.unifiedParser = new UnifiedDeepWikiParser();
    this.validatorIndexed = new DeepWikiDataValidatorIndexed();
    
    // Initialize Redis
    const redisUrl = envConfig.redisUrlPublic || envConfig.redisUrl;
    if (redisUrl && process.env.DISABLE_REDIS !== 'true') {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => Math.min(times * 100, 3000),
          enableReadyCheck: true,
          lazyConnect: true
        });
        console.log(`🔌 Redis configured for indexing cache`);
      } catch (error) {
        console.log('⚠️ Redis initialization failed, using memory cache');
      }
    }
    
    // Initialize indexer with Redis support
    this.indexer = new RepositoryIndexer(this.redis);
    
    // Ensure cache directory exists
    if (!fs.existsSync(this.repoCache)) {
      fs.mkdirSync(this.repoCache, { recursive: true });
    }
  }

  async analyzeRepository(
    repoUrl: string, 
    options?: { 
      branch?: string; 
      prNumber?: number;
      useCache?: boolean;
      forceRefresh?: boolean;
    }
  ): Promise<DeepWikiAnalysisResponse> {
    const startTime = Date.now();
    const branch = options?.branch || 'main';
    
    console.log(`\n🚀 DirectDeepWikiApiWithLocationV4 - Starting analysis`);
    console.log(`   Repository: ${repoUrl}`);
    console.log(`   Branch: ${branch}`);
    
    try {
      // Clone repository (cached)
      const repoPath = await this.ensureRepositoryCloned(repoUrl, branch);
      
      // Run DeepWiki analysis and indexing in parallel
      const [deepWikiResult, index] = await Promise.all([
        this.callWithRetry(async () => {
          const deepWikiStart = Date.now();
          
          console.log(`📊 Calling DeepWiki API...`);
          const response = await axios.post(
            `${this.apiUrl}/chat/completions/stream`,
            {
              repo_url: repoUrl,
              messages: [{
                role: 'user',
                content: `Analyze this repository for code quality, security vulnerabilities, and performance issues. 
                         For each issue found, provide:
                         Issue: <title>
                         Severity: <critical|high|medium|low>
                         Category: <security|performance|code-quality|bug>
                         File: <exact file path>
                         Line: <line number>
                         Code snippet: <relevant code>
                         Suggestion: <how to fix>`
              }],
              stream: false,
              provider: 'openrouter',
              model: 'openai/gpt-4o-mini',
              temperature: 0.1,
              max_tokens: 4000
            },
            {
              headers: { 'Content-Type': 'application/json' },
              timeout: 120000
            }
          );
          
          this.performanceMetrics.deepWikiTime += Date.now() - deepWikiStart;
          console.log(`   DeepWiki response received in ${Date.now() - deepWikiStart}ms`);
          
          // Parse with unified parser
          const parseResult = this.unifiedParser.parse(response.data);
          console.log(`   Parsed ${parseResult.issues.length} issues (format: ${parseResult.format})`);
          
          if (parseResult.warnings?.length) {
            console.log(`   ⚠️ Parser warnings: ${parseResult.warnings.join(', ')}`);
          }
          
          return parseResult.issues;
        }),
        
        this.indexer.buildIndex(repoPath, repoUrl).then(index => {
          console.log(`   📚 Index built: ${index.fileSet.size} files indexed`);
          return index;
        })
      ]);
      
      // Validate and enhance issues using index
      const validationStart = Date.now();
      console.log(`\n🔍 Validating ${deepWikiResult.length} issues with repository index...`);
      
      const validatedIssues: any[] = [];
      let recoveredCount = 0;
      let filteredCount = 0;
      
      for (const issue of deepWikiResult) {
        const validationResult = await this.validatorIndexed.validateIssueWithIndex(
          issue,
          index,
          repoPath
        );
        
        if (validationResult.isValid) {
          // Enhance issue with validation data
          const enhancedIssue = {
            ...issue,
            confidence: validationResult.confidence,
            validation: {
              fileExists: validationResult.isValid,
              lineValid: validationResult.isValid,
              snippetMatched: validationResult.isValid,
              wasRecovered: validationResult.recovered || false
            }
          };
          
          // Add code snippet if recovered
          if (validationResult.recovered && validationResult.validatedData) {
            enhancedIssue.location = validationResult.validatedData.location || enhancedIssue.location;
            enhancedIssue.codeSnippet = validationResult.validatedData.snippet || enhancedIssue.codeSnippet;
            recoveredCount++;
          }
          
          validatedIssues.push(enhancedIssue);
        } else {
          filteredCount++;
          console.log(`   ❌ Filtered fake issue: ${issue.title} (confidence: ${validationResult.confidence.toFixed(2)})`);
        }
      }
      
      this.performanceMetrics.validationTime += Date.now() - validationStart;
      this.performanceMetrics.totalRecovered += recoveredCount;
      
      console.log(`\n✅ Validation complete:`);
      console.log(`   Valid issues: ${validatedIssues.length}/${deepWikiResult.length}`);
      console.log(`   Recovered issues: ${recoveredCount}`);
      console.log(`   Filtered fake issues: ${filteredCount}`);
      
      // Calculate scores
      const scores = this.calculateScores(validatedIssues);
      
      // Prepare response
      const response: DeepWikiAnalysisResponse = {
        issues: validatedIssues,
        scores,
        metadata: {
          repository: repoUrl,
          branch,
          prNumber: options?.prNumber,
          timestamp: new Date().toISOString(),
          indexSize: index.fileSet.size
        },
        validation: {
          totalIssues: deepWikiResult.length,
          validIssues: validatedIssues.length,
          filteredIssues: filteredCount,
          recoveredIssues: recoveredCount,
          avgConfidence: validatedIssues.reduce((sum, i) => sum + i.confidence, 0) / validatedIssues.length
        },
        performance: {
          deepWikiTime: this.performanceMetrics.deepWikiTime,
          indexingTime: this.performanceMetrics.indexingTime,
          validationTime: Date.now() - validationStart,
          totalTime: Date.now() - startTime,
          speedup: this.performanceMetrics.deepWikiTime / (Date.now() - startTime)
        }
      };
      
      // Cache result if enabled
      if (options?.useCache !== false) {
        await this.cacheResult(repoUrl, branch, response);
      }
      
      this.performanceMetrics.totalAnalyses++;
      
      return response;
      
    } catch (error: any) {
      console.error(`❌ Analysis failed: ${error.message}`);
      
      // Return empty result on error
      return {
        issues: [],
        scores: this.getEmptyScores(),
        metadata: {
          repository: repoUrl,
          branch,
          error: error.message,
          timestamp: new Date().toISOString()
        },
        validation: {
          totalIssues: 0,
          validIssues: 0,
          filteredIssues: 0,
          recoveredIssues: 0,
          avgConfidence: 0
        }
      };
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const avgDeepWikiTime = this.performanceMetrics.totalAnalyses > 0 
      ? this.performanceMetrics.deepWikiTime / this.performanceMetrics.totalAnalyses
      : 0;
    
    const avgValidationTime = this.performanceMetrics.totalAnalyses > 0
      ? this.performanceMetrics.validationTime / this.performanceMetrics.totalAnalyses  
      : 0;
      
    return {
      totalAnalyses: this.performanceMetrics.totalAnalyses,
      totalRecovered: this.performanceMetrics.totalRecovered,
      avgDeepWikiTime: Math.round(avgDeepWikiTime),
      avgIndexingTime: Math.round(this.performanceMetrics.indexingTime / Math.max(1, this.performanceMetrics.totalAnalyses)),
      avgValidationTime: Math.round(avgValidationTime),
      avgRecoveryRate: this.performanceMetrics.totalAnalyses > 0
        ? (this.performanceMetrics.totalRecovered / this.performanceMetrics.totalAnalyses).toFixed(2)
        : '0.00'
    };
  }

  /**
   * Ensure repository is cloned locally
   */
  private async ensureRepositoryCloned(repoUrl: string, branch: string): Promise<string> {
    const repoName = repoUrl.split('/').slice(-2).join('-');
    const repoPath = path.join(this.repoCache, repoName);
    
    if (fs.existsSync(repoPath)) {
      console.log(`   📁 Using cached repository at ${repoPath}`);
      // Update to latest
      try {
        execSync(`git fetch origin`, { cwd: repoPath });
        execSync(`git checkout ${branch}`, { cwd: repoPath });
        execSync(`git pull origin ${branch}`, { cwd: repoPath });
      } catch (error) {
        console.log(`   ⚠️ Could not update repository, using cached version`);
      }
    } else {
      console.log(`   📥 Cloning repository to ${repoPath}...`);
      execSync(`git clone ${repoUrl} ${repoPath}`, { stdio: 'inherit' });
      if (branch !== 'main' && branch !== 'master') {
        execSync(`git checkout ${branch}`, { cwd: repoPath });
      }
    }
    
    return repoPath;
  }

  /**
   * Call with retry logic
   */
  private async callWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        if (i === maxRetries - 1) throw error;
        
        const delay = Math.min(Math.pow(2, i) * 1000, 10000);
        console.log(`   ⚠️ Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries exceeded');
  }

  /**
   * Calculate analysis scores
   */
  private calculateScores(issues: any[]): any {
    const categories = {
      security: 0,
      performance: 0,
      codeQuality: 0,
      maintainability: 0,
      reliability: 0
    };
    
    // Count issues by category and severity
    for (const issue of issues) {
      const penalty = this.calculateCategoryScore(issue);
      
      switch (issue.category) {
        case 'security':
          categories.security += penalty;
          break;
        case 'performance':
          categories.performance += penalty;
          break;
        case 'code-quality':
          categories.codeQuality += penalty;
          categories.maintainability += penalty * 0.5;
          break;
        case 'bug':
          categories.reliability += penalty;
          break;
        default:
          categories.codeQuality += penalty * 0.5;
      }
    }
    
    // Convert to scores (100 = perfect, 0 = worst)
    const maxPenalty = 50; // Cap total penalty
    return {
      overall: Math.max(0, 100 - Math.min(Object.values(categories).reduce((a, b) => a + b, 0), maxPenalty)),
      security: Math.max(0, 100 - Math.min(categories.security * 10, 100)),
      performance: Math.max(0, 100 - Math.min(categories.performance * 10, 100)),
      codeQuality: Math.max(0, 100 - Math.min(categories.codeQuality * 5, 100)),
      maintainability: Math.max(0, 100 - Math.min(categories.maintainability * 5, 100)),
      reliability: Math.max(0, 100 - Math.min(categories.reliability * 10, 100))
    };
  }

  private calculateCategoryScore(issue: any): number {
    const severityWeights = {
      critical: 10,
      high: 5,
      medium: 2,
      low: 1
    };
    
    const baseScore = severityWeights[issue.severity as keyof typeof severityWeights] || 1;
    
    // Adjust based on confidence
    const confidenceMultiplier = issue.confidence || 1;
    
    // Boost recovered issues slightly (they're real but mislocated)
    const recoveryBoost = issue.validation?.wasRecovered ? 1.2 : 1;
    
    return baseScore * confidenceMultiplier * recoveryBoost;
  }

  private getEmptyScores() {
    return {
      overall: 100,
      security: 100,
      performance: 100,
      codeQuality: 100,
      maintainability: 100,
      reliability: 100
    };
  }

  /**
   * Cache analysis result
   */
  private async cacheResult(repoUrl: string, branch: string, result: any): Promise<void> {
    const cacheKey = `${repoUrl}:${branch}`;
    const ttl = 300; // 5 minutes
    
    // Store in memory
    this.memoryCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    // Store in Redis if available
    if (this.redis) {
      try {
        await this.redis.setex(
          `analysis:${cacheKey}`,
          ttl,
          JSON.stringify(result)
        );
      } catch (error) {
        console.log('⚠️ Failed to cache in Redis');
      }
    }
  }
}