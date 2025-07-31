import { CacheService } from '@codequal/core/services/cache/RedisCacheService';
import { DeepWikiAnalysisResult } from '../types/deepwiki';
import { createLogger } from '@codequal/core/utils';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('deepwiki-cache-integration');

export interface CachedDeepWikiReport {
  id: string;
  repositoryUrl: string;
  branch: string;
  analysis: DeepWikiAnalysisResult;
  createdAt: string;
  expiresAt: string;
}

/**
 * Service to integrate DeepWiki with Redis cache
 * Handles storing and retrieving DeepWiki analysis reports
 */
export class DeepWikiCacheIntegration {
  private cache: CacheService;
  private defaultTTL = 1800; // 30 minutes

  constructor(cache: CacheService) {
    this.cache = cache;
  }

  /**
   * Generate cache key for a repository analysis
   */
  private getCacheKey(repositoryUrl: string, branch?: string, prId?: string): string {
    // Normalize repository URL
    const normalizedUrl = repositoryUrl.toLowerCase().replace(/\.git$/, '').replace(/\/$/, '');
    
    if (prId) {
      return `deepwiki:pr:${normalizedUrl}:${prId}`;
    }
    
    if (branch && branch !== 'main' && branch !== 'master') {
      return `deepwiki:branch:${normalizedUrl}:${branch}`;
    }
    
    return `deepwiki:repo:${normalizedUrl}`;
  }

  /**
   * Store DeepWiki analysis in cache
   */
  async storeAnalysis(
    repositoryUrl: string,
    analysis: DeepWikiAnalysisResult,
    options?: {
      branch?: string;
      prId?: string;
      ttl?: number;
    }
  ): Promise<void> {
    const cacheKey = this.getCacheKey(repositoryUrl, options?.branch, options?.prId);
    const ttl = options?.ttl || this.defaultTTL;
    
    try {
      const report: CachedDeepWikiReport = {
        id: uuidv4(),
        repositoryUrl,
        branch: options?.branch || 'main',
        analysis,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + ttl * 1000).toISOString()
      };

      // Store using the cache service's setReport method
      await this.cache.setReport(cacheKey, report as any, ttl);
      
      logger.info(`Stored DeepWiki analysis in cache`, {
        key: cacheKey,
        repositoryUrl,
        branch: options?.branch,
        prId: options?.prId,
        ttl
      });
    } catch (error) {
      logger.error('Failed to store analysis in cache', {
        error,
        repositoryUrl,
        cacheKey
      });
      throw error;
    }
  }

  /**
   * Retrieve DeepWiki analysis from cache
   */
  async getAnalysis(
    repositoryUrl: string,
    options?: {
      branch?: string;
      prId?: string;
    }
  ): Promise<DeepWikiAnalysisResult | null> {
    const cacheKey = this.getCacheKey(repositoryUrl, options?.branch, options?.prId);
    
    try {
      const cachedReport = await this.cache.getReport(cacheKey);
      
      if (!cachedReport) {
        logger.debug('Cache miss for DeepWiki analysis', {
          key: cacheKey,
          repositoryUrl,
          branch: options?.branch,
          prId: options?.prId
        });
        return null;
      }

      logger.info('Cache hit for DeepWiki analysis', {
        key: cacheKey,
        repositoryUrl
      });

      // Extract the analysis from the cached report
      const report = cachedReport as unknown as CachedDeepWikiReport;
      return report.analysis;
    } catch (error) {
      logger.error('Failed to retrieve analysis from cache', {
        error,
        repositoryUrl,
        cacheKey
      });
      return null;
    }
  }

  /**
   * Check if analysis exists in cache
   */
  async hasAnalysis(
    repositoryUrl: string,
    options?: {
      branch?: string;
      prId?: string;
    }
  ): Promise<boolean> {
    const cacheKey = this.getCacheKey(repositoryUrl, options?.branch, options?.prId);
    
    try {
      return await this.cache.isReportAvailable(cacheKey);
    } catch (error) {
      logger.error('Failed to check cache availability', {
        error,
        repositoryUrl,
        cacheKey
      });
      return false;
    }
  }

  /**
   * Delete analysis from cache
   */
  async deleteAnalysis(
    repositoryUrl: string,
    options?: {
      branch?: string;
      prId?: string;
    }
  ): Promise<void> {
    const cacheKey = this.getCacheKey(repositoryUrl, options?.branch, options?.prId);
    
    try {
      await this.cache.delete(cacheKey);
      logger.info('Deleted analysis from cache', {
        key: cacheKey,
        repositoryUrl
      });
    } catch (error) {
      logger.error('Failed to delete analysis from cache', {
        error,
        repositoryUrl,
        cacheKey
      });
    }
  }

  /**
   * Get both main and feature branch analyses for comparison
   */
  async getAnalysesForComparison(
    repositoryUrl: string,
    mainBranch = 'main',
    featureBranch: string
  ): Promise<{
    main: DeepWikiAnalysisResult | null;
    feature: DeepWikiAnalysisResult | null;
  }> {
    const [mainAnalysis, featureAnalysis] = await Promise.all([
      this.getAnalysis(repositoryUrl, { branch: mainBranch }),
      this.getAnalysis(repositoryUrl, { branch: featureBranch })
    ]);

    return {
      main: mainAnalysis,
      feature: featureAnalysis
    };
  }

  /**
   * Store both main and feature branch analyses
   */
  async storeAnalysesForComparison(
    repositoryUrl: string,
    mainAnalysis: DeepWikiAnalysisResult,
    featureAnalysis: DeepWikiAnalysisResult,
    featureBranch: string,
    options?: {
      prId?: string;
      ttl?: number;
    }
  ): Promise<void> {
    await Promise.all([
      this.storeAnalysis(repositoryUrl, mainAnalysis, {
        branch: 'main',
        ttl: options?.ttl
      }),
      this.storeAnalysis(repositoryUrl, featureAnalysis, {
        branch: featureBranch,
        prId: options?.prId,
        ttl: options?.ttl
      })
    ]);

    logger.info('Stored both analyses for comparison', {
      repositoryUrl,
      mainBranch: 'main',
      featureBranch,
      prId: options?.prId
    });
  }

  /**
   * Warm cache for active PRs
   */
  async warmCacheForPR(
    repositoryUrl: string,
    prId: string,
    branches: { main: string; feature: string },
    analysisProvider: (branch: string) => Promise<DeepWikiAnalysisResult>
  ): Promise<void> {
    try {
      // Check what's missing
      const [hasMain, hasFeature] = await Promise.all([
        this.hasAnalysis(repositoryUrl, { branch: branches.main }),
        this.hasAnalysis(repositoryUrl, { branch: branches.feature, prId })
      ]);

      const analysesToGenerate: Promise<void>[] = [];

      if (!hasMain) {
        analysesToGenerate.push(
          analysisProvider(branches.main).then(analysis =>
            this.storeAnalysis(repositoryUrl, analysis, { branch: branches.main })
          )
        );
      }

      if (!hasFeature) {
        analysesToGenerate.push(
          analysisProvider(branches.feature).then(analysis =>
            this.storeAnalysis(repositoryUrl, analysis, { 
              branch: branches.feature, 
              prId 
            })
          )
        );
      }

      if (analysesToGenerate.length > 0) {
        await Promise.all(analysesToGenerate);
        logger.info('Cache warmed for PR', {
          repositoryUrl,
          prId,
          generatedAnalyses: analysesToGenerate.length
        });
      } else {
        logger.info('Cache already warm for PR', {
          repositoryUrl,
          prId
        });
      }
    } catch (error) {
      logger.error('Failed to warm cache for PR', {
        error,
        repositoryUrl,
        prId
      });
      throw error;
    }
  }
}