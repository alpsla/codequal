import { getSupabase } from '../supabase/client';
import type { Tables } from '../supabase/client';

/**
 * Repository analyzer type
 */
export enum RepositoryAnalyzer {
  DEEPWIKI = 'deepwiki',
  STATIC_ANALYZER = 'static_analyzer'
}

/**
 * Interface for repository analysis
 */
export interface RepositoryAnalysis {
  id: string;
  repositoryId: string;
  analyzer: RepositoryAnalyzer;
  analysisData: Record<string, any>;
  metadata?: Record<string, any>;
  cachedUntil: Date;
  executionTimeMs?: number;
  tokenCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Repository analysis model for database operations
 */
export class RepositoryAnalysisModel {
  /**
   * Get latest repository analysis by repository ID and analyzer
   * @param repositoryId Repository ID
   * @param analyzer Repository analyzer
   * @returns Repository analysis or null if not found
   */
  static async getLatest(
    repositoryId: string,
    analyzer: RepositoryAnalyzer
  ): Promise<RepositoryAnalysis | null> {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('repository_analysis')
      .select()
      .eq('repository_id', repositoryId)
      .eq('analyzer', analyzer)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      throw new Error(`Error getting repository analysis: ${error.message}`);
    }
    
    if (!data) {
      return null;
    }
    
    return this.mapToRepositoryAnalysis(data as Tables['repository_analysis']);
  }
  
  /**
   * Get valid cached repository analysis by repository ID and analyzer
   * @param repositoryId Repository ID
   * @param analyzer Repository analyzer
   * @returns Repository analysis or null if no valid cache exists
   */
  static async getValidCache(
    repositoryId: string,
    analyzer: RepositoryAnalyzer
  ): Promise<RepositoryAnalysis | null> {
    const supabase = getSupabase();
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('repository_analysis')
      .select()
      .eq('repository_id', repositoryId)
      .eq('analyzer', analyzer)
      .gt('cached_until', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      throw new Error(`Error getting repository analysis cache: ${error.message}`);
    }
    
    if (!data) {
      return null;
    }
    
    return this.mapToRepositoryAnalysis(data as Tables['repository_analysis']);
  }
  
  /**
   * Store repository analysis
   * @param repositoryId Repository ID
   * @param analyzer Repository analyzer
   * @param analysisData Analysis data
   * @param cacheTTL Cache time-to-live in seconds (default: 24 hours)
   * @param metadata Metadata (optional)
   * @param executionTimeMs Execution time in milliseconds (optional)
   * @param tokenCount Token count (optional)
   * @returns Created repository analysis
   */
  static async store(
    repositoryId: string,
    analyzer: RepositoryAnalyzer,
    analysisData: Record<string, any>,
    cacheTTL: number = 24 * 60 * 60, // 24 hours in seconds
    metadata?: Record<string, any>,
    executionTimeMs?: number,
    tokenCount?: number
  ): Promise<RepositoryAnalysis> {
    const supabase = getSupabase();
    
    // Calculate cache expiration time
    const cachedUntil = new Date();
    cachedUntil.setSeconds(cachedUntil.getSeconds() + cacheTTL);
    
    const { data, error } = await supabase
      .from('repository_analysis')
      .insert({
        repository_id: repositoryId,
        analyzer: analyzer,
        analysis_data: analysisData,
        metadata: metadata || {},
        cached_until: cachedUntil.toISOString(),
        execution_time_ms: executionTimeMs,
        token_count: tokenCount
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Error storing repository analysis: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('Failed to store repository analysis: No data returned');
    }
    
    return this.mapToRepositoryAnalysis(data as Tables['repository_analysis']);
  }
  
  /**
   * Invalidate cache for repository analysis
   * @param repositoryId Repository ID
   * @param analyzer Repository analyzer (optional)
   */
  static async invalidateCache(
    repositoryId: string,
    analyzer?: RepositoryAnalyzer
  ): Promise<void> {
    const supabase = getSupabase();
    const now = new Date().toISOString();
    
    let query = supabase
      .from('repository_analysis')
      .update({ cached_until: now })
      .eq('repository_id', repositoryId);
    
    if (analyzer) {
      query = query.eq('analyzer', analyzer);
    }
    
    const { error } = await query;
    
    if (error) {
      throw new Error(`Error invalidating repository analysis cache: ${error.message}`);
    }
  }
  
  /**
   * Map database record to repository analysis
   * @param data Database record
   * @returns Repository analysis
   */
  private static mapToRepositoryAnalysis(data: Tables['repository_analysis']): RepositoryAnalysis {
    return {
      id: data.id,
      repositoryId: data.repository_id,
      analyzer: data.analyzer as RepositoryAnalyzer,
      analysisData: data.analysis_data,
      metadata: data.metadata,
      cachedUntil: new Date(data.cached_until),
      executionTimeMs: data.execution_time_ms,
      tokenCount: data.token_count,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}