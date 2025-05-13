import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '@codequal/core/logging';
import { RepositoryContext } from './DeepWikiClient';
import { AnalysisResult } from './ThreeTierAnalysisService';

/**
 * Cache status information
 */
export interface CacheStatus {
  /**
   * Is the cache valid?
   */
  isValid: boolean;
  
  /**
   * Latest commit hash for the analysis
   */
  latestCommitHash?: string;
  
  /**
   * Timestamp of the latest analysis
   */
  latestAnalysisTimestamp?: Date;
  
  /**
   * Number of commits since the analysis
   */
  commitsSinceAnalysis?: number;
  
  /**
   * Whether significant changes were detected
   */
  significantChangesDetected?: boolean;
  
  /**
   * When the cache expires
   */
  cacheExpiry?: Date;
}

/**
 * Cache invalidation options
 */
export interface CacheInvalidationOptions {
  /**
   * Maximum commits before invalidation
   */
  maxCommitsBeforeInvalidation?: number;
  
  /**
   * Maximum age in milliseconds before invalidation
   */
  maxAgeMs?: number;
  
  /**
   * Whether to automatically invalidate on significant changes
   */
  invalidateOnSignificantChanges?: boolean;
}

/**
 * Default cache invalidation options
 */
const DEFAULT_CACHE_INVALIDATION_OPTIONS: CacheInvalidationOptions = {
  maxCommitsBeforeInvalidation: 20,
  maxAgeMs: 72 * 60 * 60 * 1000, // 72 hours
  invalidateOnSignificantChanges: true
};

/**
 * Repository analysis cache manager
 */
export class RepositoryCacheManager {
  private supabase: SupabaseClient;
  private logger: Logger;
  private invalidationOptions: CacheInvalidationOptions;
  
  /**
   * Constructor
   * @param supabaseUrl Supabase URL
   * @param supabaseKey Supabase key
   * @param logger Logger instance
   * @param invalidationOptions Optional cache invalidation options
   */
  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    logger: Logger,
    invalidationOptions?: CacheInvalidationOptions
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.logger = logger;
    this.invalidationOptions = invalidationOptions || DEFAULT_CACHE_INVALIDATION_OPTIONS;
    
    this.logger.info('RepositoryCacheManager initialized', {
      invalidationOptions: this.invalidationOptions
    });
  }
  
  /**
   * Check if a valid cached analysis exists for a repository
   * @param repository Repository context
   * @param branch Repository branch
   * @returns Cache status
   */
  async checkCacheStatus(repository: RepositoryContext, branch: string): Promise<CacheStatus> {
    try {
      this.logger.info('Checking cache status', { repository, branch });
      
      // Query cache status from database
      const { data, error } = await this.supabase
        .from('repository_cache_status')
        .select(`
          is_cache_valid,
          latest_commit_hash,
          latest_analysis_timestamp,
          commits_since_analysis,
          significant_changes_detected,
          cache_expiry
        `)
        .eq('repository_owner', repository.owner)
        .eq('repository_name', repository.repo)
        .eq('branch', branch)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No cache status found
          this.logger.info('No cache status found', { repository, branch });
          return { isValid: false };
        }
        
        throw error;
      }
      
      if (!data) {
        return { isValid: false };
      }
      
      // Check if cache should be invalidated
      if (data.is_cache_valid) {
        const shouldInvalidate = this.shouldInvalidateCache(data);
        
        if (shouldInvalidate) {
          // Cache should be invalidated
          this.logger.info('Cache should be invalidated', { 
            repository, 
            branch,
            reason: shouldInvalidate.reason
          });
          
          // Update cache status in database
          await this.invalidateCache(repository, branch, shouldInvalidate.reason);
          
          return { isValid: false };
        }
      }
      
      // Return cache status
      return {
        isValid: data.is_cache_valid,
        latestCommitHash: data.latest_commit_hash,
        latestAnalysisTimestamp: new Date(data.latest_analysis_timestamp),
        commitsSinceAnalysis: data.commits_since_analysis,
        significantChangesDetected: data.significant_changes_detected,
        cacheExpiry: data.cache_expiry ? new Date(data.cache_expiry) : undefined
      };
    } catch (error) {
      this.logger.error('Error checking cache status', { repository, branch, error });
      throw new Error(`Failed to check cache status: ${error.message}`);
    }
  }
  
  /**
   * Get cached repository analysis
   * @param repository Repository context
   * @param branch Repository branch
   * @returns Cached analysis or null if not found
   */
  async getCachedAnalysis(repository: RepositoryContext, branch: string): Promise<any | null> {
    try {
      this.logger.info('Getting cached analysis', { repository, branch });
      
      // Check cache status first
      const cacheStatus = await this.checkCacheStatus(repository, branch);
      
      if (!cacheStatus.isValid) {
        this.logger.info('No valid cache available', { repository, branch });
        return null;
      }
      
      // Get cache status to find latest analysis ID
      const { data: cacheData, error: cacheError } = await this.supabase
        .from('repository_cache_status')
        .select('latest_analysis_id')
        .eq('repository_owner', repository.owner)
        .eq('repository_name', repository.repo)
        .eq('branch', branch)
        .single();
      
      if (cacheError || !cacheData) {
        this.logger.error('Error retrieving cache status', { repository, branch, error: cacheError });
        return null;
      }
      
      // Get repository analysis
      const { data, error } = await this.supabase
        .from('repository_analyses')
        .select('content, provider, model')
        .eq('id', cacheData.latest_analysis_id)
        .single();
      
      if (error || !data) {
        this.logger.error('Error retrieving cached analysis', { 
          repository, 
          branch, 
          analysisId: cacheData.latest_analysis_id,
          error
        });
        return null;
      }
      
      // Update cache hit metrics
      await this.updateCacheHitMetrics(repository, branch);
      
      this.logger.info('Retrieved cached analysis', { 
        repository,
        branch,
        provider: data.provider,
        model: data.model
      });
      
      return data.content;
    } catch (error) {
      this.logger.error('Error getting cached analysis', { repository, branch, error });
      throw new Error(`Failed to get cached analysis: ${error.message}`);
    }
  }
  
  /**
   * Store repository analysis in cache
   * @param repository Repository context
   * @param branch Repository branch
   * @param commitHash Commit hash for the analysis
   * @param result Analysis result
   * @param provider Provider used for the analysis
   * @param model Model used for the analysis
   * @returns Success status
   */
  async storeAnalysis(
    repository: RepositoryContext,
    branch: string,
    commitHash: string,
    result: any,
    provider: string,
    model: string
  ): Promise<boolean> {
    try {
      this.logger.info('Storing analysis in cache', { 
        repository, 
        branch, 
        commitHash,
        provider,
        model
      });
      
      // Calculate expiry date
      const cacheExpiry = new Date();
      cacheExpiry.setTime(cacheExpiry.getTime() + (this.invalidationOptions.maxAgeMs || 72 * 60 * 60 * 1000));
      
      // Insert repository analysis
      const { data: analysisData, error: analysisError } = await this.supabase
        .from('repository_analyses')
        .insert({
          repository_owner: repository.owner,
          repository_name: repository.repo,
          repository_url: this.buildRepositoryUrl(repository),
          repository_type: repository.repoType,
          branch,
          commit_hash: commitHash,
          provider,
          model,
          content_format: 'json',
          content_size_bytes: JSON.stringify(result).length,
          content: result,
          primary_language: result.primaryLanguage || null
        })
        .select('id')
        .single();
      
      if (analysisError || !analysisData) {
        this.logger.error('Error storing repository analysis', { repository, branch, error: analysisError });
        return false;
      }
      
      // Check if cache status exists
      const { data: existingCache, error: cacheCheckError } = await this.supabase
        .from('repository_cache_status')
        .select('id')
        .eq('repository_owner', repository.owner)
        .eq('repository_name', repository.repo)
        .eq('branch', branch)
        .maybeSingle();
      
      if (cacheCheckError && cacheCheckError.code !== 'PGRST116') {
        this.logger.error('Error checking existing cache status', { repository, branch, error: cacheCheckError });
        return false;
      }
      
      if (existingCache) {
        // Update existing cache status
        const { error: updateError } = await this.supabase
          .from('repository_cache_status')
          .update({
            latest_analysis_id: analysisData.id,
            latest_commit_hash: commitHash,
            latest_analysis_timestamp: new Date().toISOString(),
            is_cache_valid: true,
            cache_expiry: cacheExpiry.toISOString(),
            commits_since_analysis: 0,
            significant_changes_detected: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCache.id);
        
        if (updateError) {
          this.logger.error('Error updating cache status', { repository, branch, error: updateError });
          return false;
        }
      } else {
        // Insert new cache status
        const { error: insertError } = await this.supabase
          .from('repository_cache_status')
          .insert({
            repository_owner: repository.owner,
            repository_name: repository.repo,
            branch,
            latest_analysis_id: analysisData.id,
            latest_commit_hash: commitHash,
            latest_analysis_timestamp: new Date().toISOString(),
            is_cache_valid: true,
            cache_expiry: cacheExpiry.toISOString(),
            commits_since_analysis: 0,
            significant_changes_detected: false
          });
        
        if (insertError) {
          this.logger.error('Error creating cache status', { repository, branch, error: insertError });
          return false;
        }
      }
      
      this.logger.info('Successfully stored analysis in cache', { 
        repository, 
        branch,
        analysisId: analysisData.id
      });
      
      return true;
    } catch (error) {
      this.logger.error('Error storing analysis in cache', { repository, branch, error });
      throw new Error(`Failed to store analysis in cache: ${error.message}`);
    }
  }
  
  /**
   * Invalidate repository cache
   * @param repository Repository context
   * @param branch Repository branch
   * @param reason Reason for invalidation
   * @returns Success status
   */
  async invalidateCache(repository: RepositoryContext, branch: string, reason: string): Promise<boolean> {
    try {
      this.logger.info('Invalidating cache', { repository, branch, reason });
      
      // Call PostgreSQL function to invalidate cache
      const { error } = await this.supabase.rpc('invalidate_repository_cache', {
        p_repository_owner: repository.owner,
        p_repository_name: repository.repo,
        p_branch: branch,
        p_reason: reason
      });
      
      if (error) {
        this.logger.error('Error invalidating cache', { repository, branch, error });
        return false;
      }
      
      this.logger.info('Successfully invalidated cache', { repository, branch });
      
      return true;
    } catch (error) {
      this.logger.error('Error invalidating cache', { repository, branch, error });
      throw new Error(`Failed to invalidate cache: ${error.message}`);
    }
  }
  
  /**
   * Update commit count for a repository
   * @param repository Repository context
   * @param branch Repository branch
   * @param commitCount Number of new commits
   * @param significantChanges Whether significant changes were detected
   * @returns Updated cache status
   */
  async updateCommitCount(
    repository: RepositoryContext,
    branch: string,
    commitCount: number,
    significantChanges: boolean
  ): Promise<CacheStatus> {
    try {
      this.logger.info('Updating commit count', {
        repository,
        branch,
        commitCount,
        significantChanges
      });
      
      // Get current cache status
      const { data, error } = await this.supabase
        .from('repository_cache_status')
        .select(`
          id,
          is_cache_valid,
          commits_since_analysis,
          significant_changes_detected
        `)
        .eq('repository_owner', repository.owner)
        .eq('repository_name', repository.repo)
        .eq('branch', branch)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        this.logger.error('Error getting cache status', { repository, branch, error });
        throw error;
      }
      
      if (!data) {
        // No cache status, return invalid
        return { isValid: false };
      }
      
      // Update commit count
      const newCommitCount = data.commits_since_analysis + commitCount;
      const newSignificantChanges = data.significant_changes_detected || significantChanges;
      
      // Check if cache should be invalidated
      let shouldInvalidate = false;
      let invalidationReason = '';
      
      if (this.invalidationOptions.maxCommitsBeforeInvalidation && 
          newCommitCount >= this.invalidationOptions.maxCommitsBeforeInvalidation) {
        shouldInvalidate = true;
        invalidationReason = `Exceeded maximum commit count (${newCommitCount} >= ${this.invalidationOptions.maxCommitsBeforeInvalidation})`;
      } else if (this.invalidationOptions.invalidateOnSignificantChanges && newSignificantChanges) {
        shouldInvalidate = true;
        invalidationReason = 'Significant changes detected';
      }
      
      // Update cache status
      const { error: updateError } = await this.supabase
        .from('repository_cache_status')
        .update({
          commits_since_analysis: newCommitCount,
          significant_changes_detected: newSignificantChanges,
          last_commit_check_timestamp: new Date().toISOString(),
          is_cache_valid: data.is_cache_valid && !shouldInvalidate,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id);
      
      if (updateError) {
        this.logger.error('Error updating cache status', { repository, branch, error: updateError });
        throw updateError;
      }
      
      // If cache should be invalidated, invalidate it
      if (shouldInvalidate && data.is_cache_valid) {
        await this.invalidateCache(repository, branch, invalidationReason);
      }
      
      // Return updated cache status
      return {
        isValid: data.is_cache_valid && !shouldInvalidate,
        commitsSinceAnalysis: newCommitCount,
        significantChangesDetected: newSignificantChanges
      };
    } catch (error) {
      this.logger.error('Error updating commit count', { repository, branch, error });
      throw new Error(`Failed to update commit count: ${error.message}`);
    }
  }
  
  /**
   * Update cache hit metrics
   * @param repository Repository context
   * @param branch Repository branch
   */
  private async updateCacheHitMetrics(repository: RepositoryContext, branch: string): Promise<void> {
    try {
      // Update cache hit metrics
      const { error } = await this.supabase
        .from('repository_cache_status')
        .update({
          cache_hit_count: this.supabase.rpc('increment', { row_id: 1 }),
          last_cache_hit: new Date().toISOString()
        })
        .eq('repository_owner', repository.owner)
        .eq('repository_name', repository.repo)
        .eq('branch', branch);
      
      if (error) {
        this.logger.error('Error updating cache hit metrics', { repository, branch, error });
        // Don't throw, just log the error
      }
    } catch (error) {
      this.logger.error('Error updating cache hit metrics', { repository, branch, error });
      // Don't throw, just log the error
    }
  }
  
  /**
   * Check if cache should be invalidated
   * @param cacheData Cache data
   * @returns Whether cache should be invalidated and reason
   */
  private shouldInvalidateCache(cacheData: any): { invalidate: boolean, reason: string } | false {
    // Check commit count
    if (this.invalidationOptions.maxCommitsBeforeInvalidation && 
        cacheData.commits_since_analysis >= this.invalidationOptions.maxCommitsBeforeInvalidation) {
      return {
        invalidate: true,
        reason: `Exceeded maximum commit count (${cacheData.commits_since_analysis} >= ${this.invalidationOptions.maxCommitsBeforeInvalidation})`
      };
    }
    
    // Check significant changes
    if (this.invalidationOptions.invalidateOnSignificantChanges && 
        cacheData.significant_changes_detected) {
      return {
        invalidate: true,
        reason: 'Significant changes detected'
      };
    }
    
    // Check age
    if (this.invalidationOptions.maxAgeMs) {
      const analysisTimestamp = new Date(cacheData.latest_analysis_timestamp).getTime();
      const currentTime = new Date().getTime();
      const ageMs = currentTime - analysisTimestamp;
      
      if (ageMs >= this.invalidationOptions.maxAgeMs) {
        return {
          invalidate: true,
          reason: `Exceeded maximum age (${Math.round(ageMs / (60 * 60 * 1000))} hours >= ${Math.round(this.invalidationOptions.maxAgeMs / (60 * 60 * 1000))} hours)`
        };
      }
    }
    
    // Check expiry
    if (cacheData.cache_expiry) {
      const expiryTimestamp = new Date(cacheData.cache_expiry).getTime();
      const currentTime = new Date().getTime();
      
      if (currentTime >= expiryTimestamp) {
        return {
          invalidate: true,
          reason: 'Cache expired'
        };
      }
    }
    
    return false;
  }
  
  /**
   * Build repository URL from context
   * @param repository Repository context
   * @returns Repository URL
   */
  private buildRepositoryUrl(repository: RepositoryContext): string {
    const baseUrl = repository.repoType === 'github' 
      ? 'https://github.com' 
      : repository.repoType === 'gitlab'
        ? 'https://gitlab.com'
        : 'https://bitbucket.org';
    
    return `${baseUrl}/${repository.owner}/${repository.repo}`;
  }
  
  /**
   * Update invalidation options
   * @param options New invalidation options
   */
  updateInvalidationOptions(options: CacheInvalidationOptions): void {
    this.invalidationOptions = {
      ...this.invalidationOptions,
      ...options
    };
    
    this.logger.info('Cache invalidation options updated', { options: this.invalidationOptions });
  }
}
