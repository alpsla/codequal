/**
 * Direct DeepWiki API with Integrated Location Search v3
 * 
 * Enhanced with:
 * 1. Structured prompting for better data quality
 * 2. Fake data detection and filtering
 * 3. Validation of file paths and code snippets
 * 4. Only verified issues included in reports
 */

import { EnhancedLocationFinder, IssueToLocate } from './enhanced-location-finder';
import { CodeSnippetExtractor } from './code-snippet-extractor';
import { StructuredDeepWikiParser } from './structured-deepwiki-parser';
import { DeepWikiDataValidator } from './deepwiki-data-validator';
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
    avgConfidence: number;
  };
  [key: string]: any;
}

export class DirectDeepWikiApiWithLocationV3 implements IDeepWikiApi {
  private apiUrl: string;
  private apiKey: string;
  private locationFinder: EnhancedLocationFinder;
  private snippetExtractor: CodeSnippetExtractor;
  private structuredParser: StructuredDeepWikiParser;
  private validator: DeepWikiDataValidator;
  private maxIterations = 10;
  private repoCache = '/tmp/codequal-repos';
  
  // Cache properties
  private redis?: Redis;
  private memoryCache: Map<string, any> = new Map();
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor() {
    // Load environment configuration
    const envConfig = getEnvConfig();
    
    this.apiUrl = envConfig.deepWikiApiUrl || 'http://localhost:8001';
    this.apiKey = envConfig.deepWikiApiKey || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
    
    // Initialize services
    this.locationFinder = new EnhancedLocationFinder();
    this.snippetExtractor = new CodeSnippetExtractor();
    this.structuredParser = new StructuredDeepWikiParser();
    this.validator = new DeepWikiDataValidator();
    
    // Initialize cache
    const redisUrl = envConfig.redisUrlPublic || envConfig.redisUrl;
    if (redisUrl && process.env.DISABLE_REDIS !== 'true') {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => Math.min(times * 100, 3000),
          enableReadyCheck: true,
          lazyConnect: true
        });
        console.log(`🔌 Redis configured: ${redisUrl.includes('157.230') ? 'Public' : 'Internal'}`);
      } catch (error) {
        console.log('⚠️ Redis initialization failed, using memory cache');
      }
    }
    
    // Ensure cache directory exists
    if (!fs.existsSync(this.repoCache)) {
      fs.mkdirSync(this.repoCache, { recursive: true });
    }
  }
  
  async analyzeRepository(
    repositoryUrl: string,
    options?: any
  ): Promise<DeepWikiAnalysisResponse> {
    console.log(`\n🚀 Starting DeepWiki Analysis v3 with Data Validation`);
    console.log(`📡 Repository: ${repositoryUrl}`);
    console.log(`🎯 Branch/PR: ${options?.branch || options?.prId || 'main'}`);
    
    const analysisStartTime = Date.now();
    
    try {
      // Step 1: Clone/update repository for validation
      const repoPath = await this.ensureRepositoryCloned(repositoryUrl, options);
      console.log(`📂 Repository available at: ${repoPath}`);
      
      // Step 2: Get structured prompt
      const structuredPrompt = this.structuredParser.getStructuredPrompt();
      console.log(`📝 Using structured prompt format for better data quality`);
      
      // Step 3: Call DeepWiki with structured prompt
      console.log(`🔍 Requesting analysis from DeepWiki...`);
      
      const response = await this.callWithRetry(async () => {
        return await axios.post(
          `${this.apiUrl}/chat/completions/stream`,
          {
            repo_url: repositoryUrl,
            messages: [{
              role: 'user',
              content: structuredPrompt
            }],
            stream: false,
            provider: 'openrouter',
            model: 'openai/gpt-4o-mini',
            temperature: 0.0, // Zero temperature for consistent format
            max_tokens: 3000
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`
            },
            timeout: parseInt(process.env.DEEPWIKI_TIMEOUT || '120000')
          }
        );
      }, 3);
      
      // Step 4: Parse structured response
      console.log(`\n📋 Parsing structured response...`);
      const parsedIssues = this.structuredParser.parseStructured(response.data);
      const standardIssues = this.structuredParser.toStandardFormat(parsedIssues);
      console.log(`  ✅ Parsed ${standardIssues.length} issues from DeepWiki`);
      
      // Step 5: Validate and filter fake data
      console.log(`\n🔍 Validating issues against repository...`);
      const validationResult = await this.validator.validateAndFilter(standardIssues, repoPath);
      
      // Step 6: Enhance valid issues with real code snippets
      console.log(`\n📝 Enhancing valid issues with real code snippets...`);
      const enhancedIssues = this.snippetExtractor.enhanceIssuesWithRealCode(
        repoPath,
        validationResult.valid
      );
      
      // Step 7: Add location information
      console.log(`\n📍 Adding precise location information...`);
      const issuesToLocate: IssueToLocate[] = enhancedIssues.map((issue, idx) => ({
        id: `issue-${idx}`,
        title: issue.title || issue.description,
        description: issue.description,
        type: issue.type || 'code-quality',
        severity: issue.severity || 'medium',
        category: issue.category || 'best-practice',
        existingLocation: issue.location
      }));
      
      const locatedIssues = await this.locationFinder.findLocations(
        repoPath,
        issuesToLocate
      );
      
      // Merge location data back
      enhancedIssues.forEach((issue, idx) => {
        const located = locatedIssues[idx];
        if (located && 'file' in located && 'line' in located) {
          issue.location = {
            file: located.file,
            line: located.line
          };
          // Add confidence from location finding
          issue.locationConfidence = located.confidence;
        }
      });
      
      // Step 8: Calculate scores based on valid issues only
      const scores = this.calculateScores(enhancedIssues);
      
      // Step 9: Generate validation report
      const validationReport = this.validator.generateValidationReport(
        validationResult.valid,
        validationResult.invalid,
        validationResult.stats
      );
      
      // Save validation report
      const reportPath = path.join(
        process.cwd(),
        `validation-report-${Date.now()}.md`
      );
      fs.writeFileSync(reportPath, validationReport);
      console.log(`\n📄 Validation report saved to: ${reportPath}`);
      
      // Step 10: Prepare final response
      const finalResponse: DeepWikiAnalysisResponse = {
        issues: enhancedIssues,
        scores,
        metadata: {
          timestamp: new Date().toISOString(),
          tool_version: 'deepwiki-v3-validated',
          duration_ms: Date.now() - analysisStartTime,
          repository: repositoryUrl,
          branch: options?.branch || 'main',
          files_analyzed: new Set(enhancedIssues.map(i => i.location?.file)).size
        },
        validation: {
          totalIssues: validationResult.stats.total,
          validIssues: validationResult.stats.valid,
          filteredIssues: validationResult.stats.invalid,
          avgConfidence: validationResult.stats.avgConfidence
        }
      };
      
      // Display summary
      console.log('\n' + '=' .repeat(70));
      console.log('📊 ANALYSIS SUMMARY:');
      console.log(`  Total issues found: ${validationResult.stats.total}`);
      console.log(`  ✅ Valid issues: ${validationResult.stats.valid}`);
      console.log(`  ❌ Filtered (fake): ${validationResult.stats.invalid}`);
      console.log(`  📈 Confidence: ${validationResult.stats.avgConfidence.toFixed(1)}%`);
      console.log(`  ⏱️  Duration: ${Date.now() - analysisStartTime}ms`);
      console.log('=' .repeat(70) + '\n');
      
      // Cache the result
      await this.cacheResult(repositoryUrl, options?.branch || 'main', finalResponse);
      
      return finalResponse;
      
    } catch (error: any) {
      console.error('❌ Analysis failed:', error.message);
      
      return {
        issues: [],
        scores: {
          overall: 0,
          security: 0,
          performance: 0,
          maintainability: 0,
          testing: 0
        },
        metadata: {
          timestamp: new Date().toISOString(),
          tool_version: 'deepwiki-v3-validated',
          duration_ms: Date.now() - analysisStartTime,
          error: error.message
        },
        validation: {
          totalIssues: 0,
          validIssues: 0,
          filteredIssues: 0,
          avgConfidence: 0
        }
      };
    }
  }
  
  /**
   * Ensure repository is cloned and up to date
   */
  private async ensureRepositoryCloned(repositoryUrl: string, options?: any): Promise<string> {
    const repoName = repositoryUrl.replace('https://github.com/', '').replace('/', '-');
    const branchName = options?.branch || 'main';
    const repoPath = path.join(this.repoCache, `${repoName}-${branchName}`);
    
    if (fs.existsSync(repoPath)) {
      // Update existing clone
      try {
        execSync(`cd "${repoPath}" && git fetch && git checkout ${branchName} && git pull`, {
          stdio: 'ignore'
        });
      } catch {
        // If update fails, remove and re-clone
        execSync(`rm -rf "${repoPath}"`, { stdio: 'ignore' });
      }
    }
    
    if (!fs.existsSync(repoPath)) {
      // Clone repository
      console.log(`  📥 Cloning repository to ${repoPath}...`);
      execSync(`git clone -b ${branchName} ${repositoryUrl} "${repoPath}"`, {
        stdio: 'ignore'
      });
    }
    
    return repoPath;
  }
  
  /**
   * Call with retry logic
   */
  private async callWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        console.log(`  ⚠️ Attempt ${i + 1} failed: ${error.message}`);
        
        if (i < maxRetries - 1) {
          const delay = Math.pow(2, i) * 1000;
          console.log(`  ⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * Calculate scores based on issues
   */
  private calculateScores(issues: any[]): any {
    const severityWeights = {
      critical: 10,
      high: 5,
      medium: 2,
      low: 1
    };
    
    let securityScore = 100;
    let performanceScore = 100;
    let maintainabilityScore = 100;
    
    for (const issue of issues) {
      const weight = severityWeights[issue.severity as keyof typeof severityWeights] || 1;
      const penalty = weight * 2;
      
      switch (issue.type || issue.category) {
        case 'security':
          securityScore -= penalty;
          break;
        case 'performance':
          performanceScore -= penalty;
          break;
        default:
          maintainabilityScore -= penalty;
      }
    }
    
    // Ensure scores don't go below 0
    securityScore = Math.max(0, securityScore);
    performanceScore = Math.max(0, performanceScore);
    maintainabilityScore = Math.max(0, maintainabilityScore);
    
    const overallScore = Math.round(
      (securityScore + performanceScore + maintainabilityScore) / 3
    );
    
    return {
      overall: overallScore,
      security: securityScore,
      performance: performanceScore,
      maintainability: maintainabilityScore,
      testing: 100 // Default for now
    };
  }
  
  /**
   * Cache analysis result
   */
  private async cacheResult(repo: string, branch: string, result: any): Promise<void> {
    const key = `${repo}:${branch}`;
    
    // Try Redis first
    if (this.redis) {
      try {
        await this.redis.setex(
          `deepwiki:${key}`,
          1800, // 30 minutes
          JSON.stringify(result)
        );
        console.log(`  📾 Cached in Redis`);
        return;
      } catch {}
    }
    
    // Fall back to memory cache
    this.memoryCache.set(key, result);
    console.log(`  📾 Cached in memory`);
    
    // Clean up old entries if too large
    if (this.memoryCache.size > 50) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) this.memoryCache.delete(firstKey);
    }
  }
  
  // Implement other required methods from IDeepWikiApi
  async clearCache(repositoryUrl: string): Promise<void> {
    const repoKey = repositoryUrl.replace('https://github.com/', '');
    
    // Clear from memory
    for (const key of this.memoryCache.keys()) {
      if (key.includes(repoKey)) {
        this.memoryCache.delete(key);
      }
    }
    
    // Clear from Redis
    if (this.redis) {
      try {
        const keys = await this.redis.keys(`deepwiki:*${repoKey}*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch {}
    }
    
    console.log(`🗑️ Cache cleared for ${repositoryUrl}`);
  }
  
  async clearAllCaches(repositoryUrl: string): Promise<void> {
    await this.clearCache(repositoryUrl);
  }
}