/**
 * Cache Pre-warming Strategy
 *
 * Proactively warms the Redis cache with common issue patterns and fixes
 * to achieve 70%+ cache hit rate on first analysis
 */

import axios from 'axios';
import Redis from 'ioredis';
import crypto from 'crypto';
import { createLogger } from '@codequal/core/utils/logger';

const logger = createLogger('cache-prewarmer');

interface PatternTemplate {
  language: string;
  tool: string;
  category: string;
  patterns: Array<{
    type: string;
    message: string;
    fix: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
}

export class CachePrewarmer {
  private redis: Redis;
  private hybridAgentUrl: string;
  private patterns: Map<string, PatternTemplate>;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.hybridAgentUrl = process.env.HYBRID_AGENT_URL || 'http://129.212.136.24';
    this.patterns = new Map();
    this.initializePatterns();
  }

  /**
   * Initialize common issue patterns for pre-warming
   */
  private initializePatterns() {
    // Java patterns
    this.patterns.set('java-spotbugs', {
      language: 'java',
      tool: 'spotbugs',
      category: 'quality',
      patterns: [
        {
          type: 'NP_NULL_ON_SOME_PATH',
          message: 'Possible null pointer dereference',
          fix: 'Add null check: if (object != null) { object.method(); }',
          confidence: 'high'
        },
        {
          type: 'DLS_DEAD_LOCAL_STORE',
          message: 'Dead store to local variable',
          fix: 'Remove unused variable assignment or use the variable',
          confidence: 'high'
        },
        {
          type: 'RCN_REDUNDANT_NULLCHECK_OF_NONNULL_VALUE',
          message: 'Redundant null check',
          fix: 'Remove unnecessary null check',
          confidence: 'high'
        }
      ]
    });

    // Python patterns
    this.patterns.set('python-pylint', {
      language: 'python',
      tool: 'pylint',
      category: 'quality',
      patterns: [
        {
          type: 'missing-docstring',
          message: 'Missing module docstring',
          fix: '"""Add module docstring here."""',
          confidence: 'high'
        },
        {
          type: 'line-too-long',
          message: 'Line too long',
          fix: 'Break line into multiple lines using parentheses or backslash',
          confidence: 'medium'
        },
        {
          type: 'unused-import',
          message: 'Unused import',
          fix: 'Remove unused import statement',
          confidence: 'high'
        }
      ]
    });

    // JavaScript patterns
    this.patterns.set('javascript-eslint', {
      language: 'javascript',
      tool: 'eslint',
      category: 'quality',
      patterns: [
        {
          type: 'no-unused-vars',
          message: 'Unused variable',
          fix: 'Remove unused variable or use it',
          confidence: 'high'
        },
        {
          type: 'semi',
          message: 'Missing semicolon',
          fix: 'Add semicolon at the end of statement',
          confidence: 'high'
        },
        {
          type: 'no-console',
          message: 'Unexpected console statement',
          fix: 'Remove console.log or use proper logging',
          confidence: 'medium'
        }
      ]
    });

    // Security patterns (cross-language)
    this.patterns.set('security-common', {
      language: 'all',
      tool: 'semgrep',
      category: 'security',
      patterns: [
        {
          type: 'sql-injection',
          message: 'Possible SQL injection',
          fix: 'Use parameterized queries or prepared statements',
          confidence: 'high'
        },
        {
          type: 'hardcoded-secret',
          message: 'Hard-coded credentials',
          fix: 'Use environment variables or secure secret management',
          confidence: 'high'
        },
        {
          type: 'path-traversal',
          message: 'Path traversal vulnerability',
          fix: 'Validate and sanitize file paths',
          confidence: 'high'
        }
      ]
    });

    logger.info(`Initialized ${this.patterns.size} pattern templates`);
  }

  /**
   * Pre-warm cache for a specific repository
   */
  async prewarmForRepository(repoUrl: string, language: string): Promise<void> {
    logger.info(`Pre-warming cache for ${repoUrl} (${language})`);

    const relevantPatterns = this.getRelevantPatterns(language);
    const prewarmPromises: Promise<void>[] = [];

    for (const pattern of relevantPatterns) {
      prewarmPromises.push(this.warmPattern(pattern, repoUrl));
    }

    await Promise.all(prewarmPromises);
    logger.info(`Pre-warmed ${prewarmPromises.length} patterns for ${language}`);
  }

  /**
   * Get patterns relevant to a language
   */
  private getRelevantPatterns(language: string): PatternTemplate[] {
    const patterns: PatternTemplate[] = [];

    for (const template of this.patterns.values()) {
      if (template.language === language || template.language === 'all') {
        patterns.push(template);
      }
    }

    return patterns;
  }

  /**
   * Warm a specific pattern in cache
   */
  private async warmPattern(template: PatternTemplate, repoUrl: string): Promise<void> {
    for (const pattern of template.patterns) {
      const issue = {
        tool: template.tool,
        type: pattern.type,
        category: template.category,
        message: pattern.message,
        file: 'prewarm/file.ext',
        line: 1,
        language: template.language
      };

      const cacheKey = this.generateCacheKey(issue);
      const cachedFix = {
        suggestion: pattern.fix,
        confidence: pattern.confidence,
        cached: true,
        timestamp: Date.now(),
        prewarmed: true
      };

      await this.redis.setex(
        cacheKey,
        604800, // 7 days TTL
        JSON.stringify(cachedFix)
      );
    }
  }

  /**
   * Pre-warm cache with popular repositories
   */
  async prewarmPopularRepositories(): Promise<void> {
    const popularRepos = [
      { url: 'https://github.com/apache/kafka', language: 'java' },
      { url: 'https://github.com/django/django', language: 'python' },
      { url: 'https://github.com/facebook/react', language: 'javascript' },
      { url: 'https://github.com/kubernetes/kubernetes', language: 'go' },
      { url: 'https://github.com/rust-lang/rust', language: 'rust' },
      { url: 'https://github.com/rails/rails', language: 'ruby' },
      { url: 'https://github.com/laravel/laravel', language: 'php' }
    ];

    logger.info('Pre-warming cache for popular repositories...');

    for (const repo of popularRepos) {
      await this.prewarmForRepository(repo.url, repo.language);
    }

    logger.info('Popular repositories pre-warming complete');
  }

  /**
   * Analyze cache effectiveness and suggest optimizations
   */
  async analyzeCacheEffectiveness(): Promise<any> {
    try {
      const response = await axios.get(`${this.hybridAgentUrl}/stats`);
      const stats = response.data;

      const effectiveness = {
        currentHitRate: stats.cacheHitRate,
        totalRequests: stats.total,
        hits: stats.hits,
        misses: stats.misses,
        recommendations: [] as string[]
      };

      // Analyze and provide recommendations
      const hitRate = (stats.hits / stats.total) * 100;

      if (hitRate < 30) {
        effectiveness.recommendations.push(
          'Cache hit rate is low. Consider pre-warming more patterns.',
          'Analyze miss patterns to identify common issues.'
        );
      } else if (hitRate < 70) {
        effectiveness.recommendations.push(
          'Cache hit rate is moderate. Pre-warm repository-specific patterns.',
          'Consider increasing cache TTL for stable patterns.'
        );
      } else {
        effectiveness.recommendations.push(
          'Cache hit rate is good. Maintain current warming strategy.',
          'Monitor for new pattern opportunities.'
        );
      }

      return effectiveness;
    } catch (error) {
      logger.error('Failed to analyze cache effectiveness', error);
      return null;
    }
  }

  /**
   * Learn from cache misses and update patterns
   */
  async learnFromMisses(): Promise<void> {
    // In production, this would analyze cache misses and create new patterns
    logger.info('Analyzing cache misses for pattern learning...');

    // Get recent cache misses (mock implementation)
    const recentMisses = await this.getRecentCacheMisses();

    // Identify patterns in misses
    const newPatterns = this.identifyPatterns(recentMisses);

    // Add new patterns to cache
    for (const pattern of newPatterns) {
      await this.addNewPattern(pattern);
    }

    logger.info(`Learned ${newPatterns.length} new patterns from cache misses`);
  }

  /**
   * Get recent cache misses (mock implementation)
   */
  private async getRecentCacheMisses(): Promise<any[]> {
    // In production, this would query actual miss data
    return [];
  }

  /**
   * Identify patterns in cache misses
   */
  private identifyPatterns(misses: any[]): any[] {
    // Pattern identification logic
    return [];
  }

  /**
   * Add a new pattern to the cache
   */
  private async addNewPattern(pattern: any): Promise<void> {
    const cacheKey = this.generateCacheKey(pattern.issue);
    await this.redis.setex(
      cacheKey,
      604800,
      JSON.stringify(pattern.fix)
    );
  }

  /**
   * Generate cache key for an issue
   */
  private generateCacheKey(issue: any): string {
    const keyData = {
      tool: issue.tool,
      type: issue.type,
      category: issue.category,
      message: issue.message?.substring(0, 100)
    };
    return `fix:${crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex')}`;
  }

  /**
   * Scheduled pre-warming task
   */
  async scheduledPrewarm(): Promise<void> {
    logger.info('Starting scheduled cache pre-warming...');

    // Pre-warm popular repositories
    await this.prewarmPopularRepositories();

    // Learn from recent misses
    await this.learnFromMisses();

    // Analyze effectiveness
    const effectiveness = await this.analyzeCacheEffectiveness();
    if (effectiveness) {
      logger.info('Cache effectiveness analysis:', effectiveness);
    }

    logger.info('Scheduled pre-warming complete');
  }

  /**
   * Clear expired cache entries
   */
  async cleanupExpiredEntries(): Promise<void> {
    logger.info('Cleaning up expired cache entries...');
    // Redis handles TTL automatically, but we can add custom cleanup logic here
  }

  /**
   * Get cache statistics
   */
  async getStatistics(): Promise<any> {
    const dbSize = await this.redis.dbsize();
    const info = await this.redis.info('memory');

    return {
      totalKeys: dbSize,
      memoryInfo: info,
      patterns: this.patterns.size,
      prewarmStatus: 'active'
    };
  }
}

// Export singleton instance
export const cachePrewarmer = new CachePrewarmer();

// CLI runner function
async function runCLI(prewarmer: CachePrewarmer, command: string, args: string[]) {
  switch (command) {
    case 'prewarm-all':
      await prewarmer.prewarmPopularRepositories();
      break;
    case 'prewarm-repo':
      if (args.length < 2) {
        console.error('Usage: prewarm-repo <repo-url> <language>');
        process.exit(1);
      }
      await prewarmer.prewarmForRepository(args[0], args[1]);
      break;
    case 'analyze': {
      const effectiveness = await prewarmer.analyzeCacheEffectiveness();
      console.log('Cache Effectiveness:', effectiveness);
      break;
    }
    case 'learn':
      await prewarmer.learnFromMisses();
      break;
    case 'stats': {
      const stats = await prewarmer.getStatistics();
      console.log('Cache Statistics:', stats);
      break;
    }
    default:
      console.log('Commands: prewarm-all, prewarm-repo, analyze, learn, stats');
  }
  process.exit(0);
}

// CLI for manual pre-warming
if (require.main === module) {
  const prewarmer = new CachePrewarmer();
  const command = process.argv[2];
  const args = process.argv.slice(3);

  runCLI(prewarmer, command, args).catch(console.error);
}